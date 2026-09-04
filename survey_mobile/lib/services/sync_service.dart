import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'package:http/http.dart' as http;
import '../models/survey.dart';
import '../utils/constants.dart';
import '../utils/database_helper.dart';
import 'attachment_service.dart';
import 'auth_service.dart';
import 'network_service.dart';

class SyncState {
  final bool isSyncing;
  final int pendingCount;
  final String? lastError;
  final DateTime? lastSyncAt;

  SyncState({
    this.isSyncing = false,
    this.pendingCount = 0,
    this.lastError,
    this.lastSyncAt,
  });

  SyncState copyWith({
    bool? isSyncing,
    int? pendingCount,
    String? lastError,
    DateTime? lastSyncAt,
    bool clearError = false,
  }) {
    return SyncState(
      isSyncing: isSyncing ?? this.isSyncing,
      pendingCount: pendingCount ?? this.pendingCount,
      lastError: clearError ? null : (lastError ?? this.lastError),
      lastSyncAt: lastSyncAt ?? this.lastSyncAt,
    );
  }
}

class SyncService {
  static final SyncService instance = SyncService._init();
  SyncService._init();

  final _stateController = StreamController<SyncState>.broadcast();
  Stream<SyncState> get stateStream => _stateController.stream;

  SyncState _state = SyncState();
  bool _initialized = false;
  bool _syncInProgress = false;
  StreamSubscription<dynamic>? _connectivitySub;

  void init() {
    if (_initialized) return;
    _initialized = true;
    _refreshPendingCount();
    _connectivitySub = NetworkService.instance.connectivityStream.listen((_) async {
      if (await NetworkService.instance.isConnected()) {
        await syncPendingResponses();
      }
    });
  }

  void dispose() {
    _connectivitySub?.cancel();
    _stateController.close();
  }

  SyncState get currentState => _state;

  void _emit(SyncState state) {
    _state = state;
    if (!_stateController.isClosed) {
      _stateController.add(state);
    }
  }

  Future<void> _refreshPendingCount() async {
    final stats = await DatabaseHelper.instance.getSyncStats();
    _emit(_state.copyWith(pendingCount: stats.pending, clearError: true));
  }

  Future<void> trySyncNow() async {
    if (await NetworkService.instance.isConnected()) {
      await syncPendingResponses();
    }
  }

  /// Resuelve pending:<uuid> en answers a IDs de servidor.
  Future<Map<String, dynamic>> _resolveAnswersForSync(
    String localResponseId,
    Map<String, dynamic> answers,
    Survey? survey,
  ) async {
    final resolved = Map<String, dynamic>.from(answers);
    final pending = await DatabaseHelper.instance.getPendingAttachmentsForResponse(localResponseId);

    String? docEmpleado;
    String? docVotante;
    if (survey != null) {
      if (survey.documentoEmpleadoQuestionId != null) {
        docEmpleado = resolved[survey.documentoEmpleadoQuestionId]?.toString();
      }
      if (survey.documentoVotanteQuestionId != null) {
        docVotante = resolved[survey.documentoVotanteQuestionId]?.toString();
      }
    }

    for (final att in pending) {
      String serverId = att.uploadedAttachmentId ?? '';
      if (serverId.isEmpty) {
        final file = File(att.localPath);
        if (!await file.exists()) {
          throw Exception('Archivo pendiente no encontrado: ${att.localPath}');
        }
        final result = await AttachmentService.instance.uploadFile(
          file,
          documentoEmpleado: docEmpleado,
          documentoVotante: docVotante,
        );
        serverId = result.id;
        await DatabaseHelper.instance.markAttachmentUploaded(att.id, serverId);
      }

      final placeholder = 'pending:${att.id}';
      for (final entry in resolved.entries.toList()) {
        final value = entry.value;
        if (value is List) {
          resolved[entry.key] = value.map((v) {
            if (v.toString() == placeholder) return serverId;
            return v;
          }).toList();
        }
      }
    }

    return resolved;
  }

  Future<void> syncPendingResponses() async {
    if (_syncInProgress) return;
    if (!await NetworkService.instance.isConnected()) return;

    final token = await AuthService.instance.getAccessToken();
    if (token == null || token.isEmpty) return;

    _syncInProgress = true;
    _emit(_state.copyWith(isSyncing: true, clearError: true));

    try {
      final unsynced = await DatabaseHelper.instance.getUnsyncedResponses();
      if (unsynced.isEmpty) {
        _emit(_state.copyWith(isSyncing: false, pendingCount: 0, lastSyncAt: DateTime.now()));
        return;
      }

      final batch = <Map<String, dynamic>>[];
      final localIds = <String>[];

      for (final response in unsynced) {
        final localId = response.localId ?? '';
        if (localId.isEmpty) continue;

        final survey = await DatabaseHelper.instance.getSurveyById(response.surveyId);
        final resolvedAnswers = await _resolveAnswersForSync(
          localId,
          response.answers,
          survey,
        );

        await DatabaseHelper.instance.updateResponseAnswers(localId, resolvedAnswers);

        batch.add({
          'local_id': localId,
          'survey': response.surveyId.trim().replaceAll(' ', ''),
          if (response.surveyorId != null) 'surveyor_id': response.surveyorId,
          if (response.deviceId != null) 'device_id': response.deviceId,
          'answers': resolvedAnswers,
          'synced': false,
        });
        localIds.add(localId);
      }

      if (batch.isEmpty) {
        _emit(_state.copyWith(isSyncing: false, lastSyncAt: DateTime.now()));
        return;
      }

      final headers = await AuthService.instance.getAuthHeaders();
      final httpResponse = await http
          .post(
            Uri.parse('${ApiConstants.baseUrl}${ApiConstants.syncResponses}'),
            headers: headers,
            body: jsonEncode({'responses': batch}),
          )
          .timeout(const Duration(seconds: 120));

      if (httpResponse.statusCode == 401) {
        try {
          await AuthService.instance.refreshAccessToken();
          _syncInProgress = false;
          await syncPendingResponses();
          return;
        } catch (_) {
          throw Exception('Sesión expirada');
        }
      }

      if (httpResponse.statusCode != 200) {
        throw Exception('Sync falló: ${httpResponse.statusCode} ${httpResponse.body}');
      }

      final data = jsonDecode(httpResponse.body) as Map<String, dynamic>;
      final results = data['results'] as List? ?? [];

      for (final r in results) {
        if (r is! Map) continue;
        if (r['status'] == 'success') {
          final localId = r['local_id']?.toString() ?? '';
          final serverId = r['server_id']?.toString() ?? '';
          if (localId.isNotEmpty && serverId.isNotEmpty) {
            await DatabaseHelper.instance.markResponseSynced(localId, serverId);
            await DatabaseHelper.instance.dequeueSync(localId);
          }
        }
      }

      final stats = await DatabaseHelper.instance.getSyncStats();
      _emit(_state.copyWith(
        isSyncing: false,
        pendingCount: stats.pending,
        lastSyncAt: DateTime.now(),
        clearError: true,
      ));
    } catch (e) {
      _emit(_state.copyWith(
        isSyncing: false,
        lastError: e.toString().replaceAll('Exception: ', ''),
      ));
      await _refreshPendingCount();
    } finally {
      _syncInProgress = false;
    }
  }
}
