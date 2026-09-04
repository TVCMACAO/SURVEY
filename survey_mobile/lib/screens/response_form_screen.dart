import 'dart:convert';
import 'dart:io';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:path_provider/path_provider.dart';
import 'package:uuid/uuid.dart';
import '../models/question.dart';
import '../models/response.dart';
import '../models/survey.dart';
import '../services/auth_service.dart';
import '../services/device_service.dart';
import '../services/network_service.dart';
import '../services/sync_service.dart';
import '../utils/conditional_logic.dart';
import '../utils/constants.dart';
import '../utils/database_helper.dart';
import '../widgets/question_field.dart';

class ResponseFormScreen extends StatefulWidget {
  final Survey survey;

  const ResponseFormScreen({super.key, required this.survey});

  @override
  State<ResponseFormScreen> createState() => _ResponseFormScreenState();
}

class _ResponseFormScreenState extends State<ResponseFormScreen> {
  final _formKey = GlobalKey<FormState>();
  final Map<String, dynamic> _answers = {};
  final Map<String, Map<String, PendingFileRef>> _pendingFilesByQuestion = {};
  bool _consentAccepted = false;
  bool _saving = false;
  String? _error;
  int _currentSectionIndex = 0;

  List<Question> get _questions => widget.survey.parsedQuestions;

  List<Map<String, dynamic>> get _sections {
    final s = widget.survey.sections;
    if (s.isEmpty) {
      return [{'id': 'default', 'title': 'Preguntas', 'order': 0}];
    }
    return s;
  }

  String? get _referenceKeyQuestionId {
    final mapping = widget.survey.referenceMapping;
    final keyCol = widget.survey.referenceKeyColumn;
    if (mapping == null || keyCol == null) return null;
    for (final entry in mapping.entries) {
      if (entry.value?.toString() == keyCol) return entry.key.toString();
    }
    return null;
  }

  Future<void> _doReferenceLookup(String keyValue) async {
    if (keyValue.trim().isEmpty) return;
    final mapping = widget.survey.referenceMapping;
    if (mapping == null) return;

    Map<String, dynamic>? rowData;

    if (await NetworkService.instance.isConnected()) {
      try {
        final headers = await AuthService.instance.getAuthHeaders();
        final url =
            '${ApiConstants.baseUrl}${ApiConstants.referenceLookup(widget.survey.id, keyValue.trim())}';
        final response = await http.get(Uri.parse(url), headers: headers);
        if (response.statusCode == 200) {
          rowData = Map<String, dynamic>.from(jsonDecode(response.body) as Map);
        }
      } catch (_) {}
    }

    rowData ??= _lookupOffline(keyValue.trim());

    if (rowData == null || rowData.isEmpty) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('No se encontró el documento')),
        );
      }
      return;
    }

    setState(() {
      for (final entry in mapping.entries) {
        final qId = entry.key.toString();
        final col = entry.value?.toString();
        if (col == null || col == widget.survey.referenceKeyColumn) continue;
        if (rowData![col] != null) {
          _answers[qId] = rowData[col].toString();
        }
      }
    });

    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Datos actualizados correctamente')),
      );
    }
  }

  Map<String, dynamic>? _lookupOffline(String key) {
    final keyCol = widget.survey.referenceKeyColumn;
    if (keyCol == null) return null;
    for (final row in widget.survey.referenceData) {
      if (row[keyCol]?.toString().trim() == key.trim()) {
        return row;
      }
    }
    return null;
  }

  void _onAnswerChanged(String questionId, dynamic value) {
    setState(() => _answers[questionId] = value);
  }

  void _onFileAdded(String questionId, PendingFileRef ref) {
    setState(() {
      _pendingFilesByQuestion.putIfAbsent(questionId, () => {})[ref.id] = ref;
      final list = (_answers[questionId] is List)
          ? List<String>.from(_answers[questionId] as List)
          : <String>[];
      list.add('pending:${ref.id}');
      _answers[questionId] = list;
    });
  }

  void _onFileRemoved(String questionId, String pendingId) {
    setState(() {
      _pendingFilesByQuestion[questionId]?.remove(pendingId);
      if (_answers[questionId] is List) {
        _answers[questionId] = (_answers[questionId] as List)
            .where((e) => e.toString() != 'pending:$pendingId')
            .toList();
      }
    });
  }

  bool _validateRequired() {
    for (final q in _questions) {
      if (q.isTitle) continue;
      if (!isQuestionVisible(q.conditionalLogic, _answers)) continue;
      if (!q.required) continue;
      final val = _answers[q.id];
      if (q.questionType == 'file_upload') {
        final files = _pendingFilesByQuestion[q.id];
        if (files == null || files.isEmpty) {
          if (val == null || (val is List && val.isEmpty)) {
            setState(() => _error = 'Completa: ${q.questionText}');
            return false;
          }
        }
        continue;
      }
      if (val == null || val == '' || (val is List && val.isEmpty)) {
        setState(() => _error = 'Completa: ${q.questionText}');
        return false;
      }
    }
    return true;
  }

  Future<String> _copyFileToAppDir(File source, String localResponseId) async {
    final dir = await getApplicationDocumentsDirectory();
    final attachmentsDir = Directory('${dir.path}/attachments/$localResponseId');
    if (!await attachmentsDir.exists()) {
      await attachmentsDir.create(recursive: true);
    }
    final name = source.path.split('/').last;
    final dest = File('${attachmentsDir.path}/$name');
    await source.copy(dest.path);
    return dest.path;
  }

  Future<void> _saveResponse() async {
    if (!_validateRequired()) return;

    setState(() {
      _saving = true;
      _error = null;
    });

    try {
      final localId = const Uuid().v4();
      final userId = await AuthService.instance.getUserId();
      final deviceId = await DeviceService.instance.getDeviceId();
      final now = DateTime.now();

      for (final entry in _pendingFilesByQuestion.entries) {
        for (final ref in entry.value.values) {
          final copied = await _copyFileToAppDir(File(ref.localPath), localId);
          await DatabaseHelper.instance.insertPendingAttachment(
            PendingAttachment(
              id: ref.id,
              localResponseId: localId,
              questionId: entry.key,
              localPath: copied,
              mimeType: ref.mimeType,
              createdAt: now,
            ),
          );
        }
      }

      final response = SurveyResponse(
        localId: localId,
        surveyId: widget.survey.id,
        surveyorId: userId,
        deviceId: deviceId,
        answers: Map<String, dynamic>.from(_answers),
        synced: false,
        createdAt: now,
        signatureConsentAt: _consentAccepted ? now : null,
      );

      await DatabaseHelper.instance.insertResponse(response);
      await DatabaseHelper.instance.enqueueSync(localId, response.toJson());

      await SyncService.instance.trySyncNow();

      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            await NetworkService.instance.isConnected()
                ? 'Respuesta guardada y sincronizada'
                : 'Respuesta guardada offline. Se subirá al detectar internet.',
          ),
        ),
      );
      Navigator.of(context).pop(true);
    } catch (e) {
      setState(() => _error = e.toString().replaceAll('Exception: ', ''));
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  List<Question> _visibleQuestionsForSection(String? sectionId) {
    return _questions.where((q) {
      if (q.sectionId != null && sectionId != null && q.sectionId != sectionId) {
        if (sectionId != 'default') return false;
      }
      if (sectionId != null && sectionId != 'default' && q.sectionId != sectionId) {
        return false;
      }
      return isQuestionVisible(q.conditionalLogic, _answers);
    }).toList();
  }

  @override
  Widget build(BuildContext context) {
    final section = _sections[_currentSectionIndex.clamp(0, _sections.length - 1)];
    final sectionId = section['id']?.toString();
    final visible = _visibleQuestionsForSection(sectionId);
    final refKeyQId = _referenceKeyQuestionId;

    return Scaffold(
      appBar: AppBar(
        title: Text(widget.survey.title ?? 'Encuesta'),
        actions: [
          if (_sections.length > 1)
            Padding(
              padding: const EdgeInsets.only(right: 8),
              child: Center(
                child: Text('${_currentSectionIndex + 1}/${_sections.length}'),
              ),
            ),
        ],
      ),
      body: Form(
        key: _formKey,
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            if (widget.survey.description != null && widget.survey.description!.isNotEmpty)
              Padding(
                padding: const EdgeInsets.only(bottom: 16),
                child: Text(widget.survey.description!),
              ),
            if (_error != null)
              Padding(
                padding: const EdgeInsets.only(bottom: 12),
                child: Text(_error!, style: const TextStyle(color: Colors.red)),
              ),
            ...visible.map((q) {
              final widgets = <Widget>[
                QuestionField(
                  question: q,
                  value: _answers[q.id],
                  onChanged: (v) => _onAnswerChanged(q.id, v),
                  pendingFiles: _pendingFilesByQuestion[q.id] ?? {},
                  onFileAdded: _onFileAdded,
                  onFileRemoved: _onFileRemoved,
                ),
              ];
              if (refKeyQId == q.id) {
                widgets.add(
                  Padding(
                    padding: const EdgeInsets.only(bottom: 12),
                    child: OutlinedButton.icon(
                      onPressed: () {
                        final key = _answers[q.id]?.toString() ?? '';
                        _doReferenceLookup(key);
                      },
                      icon: const Icon(Icons.search),
                      label: const Text('Actualizar datos con este documento'),
                    ),
                  ),
                );
              }
              return Column(children: widgets);
            }),
            CheckboxListTile(
              title: const Text('Acepto el tratamiento de datos personales (Ley 1581/2012)'),
              value: _consentAccepted,
              onChanged: (v) => setState(() => _consentAccepted = v ?? false),
            ),
            const SizedBox(height: 16),
            Row(
              children: [
                if (_currentSectionIndex > 0)
                  Expanded(
                    child: OutlinedButton(
                      onPressed: () => setState(() => _currentSectionIndex--),
                      child: const Text('Anterior'),
                    ),
                  ),
                if (_currentSectionIndex > 0) const SizedBox(width: 8),
                Expanded(
                  flex: 2,
                  child: _currentSectionIndex < _sections.length - 1
                      ? ElevatedButton(
                          onPressed: () => setState(() => _currentSectionIndex++),
                          child: const Text('Siguiente'),
                        )
                      : ElevatedButton(
                          onPressed: _saving ? null : _saveResponse,
                          child: _saving
                              ? const SizedBox(
                                  height: 20,
                                  width: 20,
                                  child: CircularProgressIndicator(strokeWidth: 2),
                                )
                              : const Text('Guardar respuesta'),
                        ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
