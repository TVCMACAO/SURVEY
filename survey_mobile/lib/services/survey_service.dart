import 'package:http/http.dart' as http;
import 'dart:convert';
import '../models/survey.dart';
import '../utils/constants.dart';
import '../utils/database_helper.dart';
import 'auth_service.dart';
import 'network_service.dart';

class SurveyService {
  static final SurveyService instance = SurveyService._init();
  final DatabaseHelper _db = DatabaseHelper.instance;
  final AuthService _auth = AuthService.instance;
  final NetworkService _network = NetworkService.instance;

  SurveyService._init();

  /// Descargar todas las encuestas desde el servidor.
  /// El backend filtra automáticamente las encuestas según el grupo del usuario.
  Future<List<Survey>> downloadSurveys() async {
    if (!await _network.isConnected()) {
      throw Exception('No hay conexión a internet');
    }

    final headers = await _auth.getAuthHeaders();
    final response = await http.get(
      Uri.parse('${ApiConstants.baseUrl}${ApiConstants.surveys}'),
      headers: headers,
    ).timeout(const Duration(seconds: 30));

    if (response.statusCode == 200) {
      final List<dynamic> data = jsonDecode(response.body);
      final List<Survey> surveys = data.map((json) => Survey.fromJson(json)).toList();

      // Obtener IDs de encuestas locales antes de actualizar
      final localSurveyIds = await _db.getAllSurveyIds(includeDeleted: true);
      final cleanLocalSurveyIds = localSurveyIds.map((id) => id.trim().replaceAll(' ', '')).toSet();

      // Guardar/actualizar encuestas del servidor
      final serverSurveyIds = surveys.map((s) => s.id.trim().replaceAll(' ', '')).toSet();
      for (var survey in surveys) {
        await _db.insertSurvey(survey);
      }

      // Crear mapa para encontrar IDs originales
      final cleanToOriginalId = <String, String>{};
      for (var localId in localSurveyIds) {
        final cleanLocalId = localId.trim().replaceAll(' ', '');
        cleanToOriginalId[cleanLocalId] = localId;
      }

      // Encontrar y marcar como eliminadas las encuestas que ya no están en el servidor
      for (var cleanLocalId in cleanLocalSurveyIds) {
        if (!serverSurveyIds.contains(cleanLocalId)) {
          final originalId = cleanToOriginalId[cleanLocalId];
          if (originalId != null) {
            await _db.deleteSurvey(originalId);
          }
        }
      }

      return surveys;
    } else if (response.statusCode == 401) {
      // Intentar refrescar token
      try {
        await _auth.refreshAccessToken();
        return await downloadSurveys(); // Reintentar
      } catch (e) {
        throw Exception('Sesión expirada. Por favor, inicia sesión nuevamente.');
      }
    } else {
      throw Exception('Error al descargar encuestas: ${response.statusCode} - ${response.body}');
    }
  }

  /// Obtener encuestas desde base de datos local
  Future<List<Survey>> getLocalSurveys() async {
    return await _db.getAllSurveys();
  }

  /// Obtener encuesta por ID (local primero, luego servidor si hay conexión)
  Future<Survey?> getSurveyById(String id) async {
    // Intentar obtener de local primero
    final localSurvey = await _db.getSurveyById(id);
    if (localSurvey != null) {
      return localSurvey;
    }

    // Si no está en local y hay conexión, descargar del servidor
    if (await _network.isConnected()) {
      try {
        final headers = await _auth.getAuthHeaders();
        final response = await http.get(
          Uri.parse('${ApiConstants.baseUrl}${ApiConstants.surveys}$id/'),
          headers: headers,
        );

        if (response.statusCode == 200) {
          final data = jsonDecode(response.body);
          final survey = Survey.fromJson(data);
          await _db.insertSurvey(survey);
          return survey;
        }
      } catch (e) {
        // Si falla, retornar null
        return null;
      }
    }

    return null;
  }

  /// Sincronizar encuestas (descargar actualizaciones)
  Future<void> syncSurveys() async {
    if (await _network.isConnected()) {
      await downloadSurveys();
    }
  }
}
