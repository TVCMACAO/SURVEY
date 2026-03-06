import 'dart:convert';

class SurveyResponse {
  final String? id; // ID del servidor (null si no está sincronizado)
  final String? localId; // ID local generado en el dispositivo
  final String surveyId;
  final String? surveyorId;  // MongoDB ObjectId es String
  final String? deviceId;
  final Map<String, dynamic> answers;
  final bool synced;
  final DateTime? createdAt;
  final DateTime? syncedAt;
  final DateTime? signatureConsentAt; // Fecha/hora del consentimiento de firma (Ley 1581/2012)

  SurveyResponse({
    this.id,
    this.localId,
    required this.surveyId,
    this.surveyorId,
    this.deviceId,
    required this.answers,
    this.synced = false,
    this.createdAt,
    this.syncedAt,
    this.signatureConsentAt,
  });

  factory SurveyResponse.fromJson(Map<String, dynamic> json) {
    return SurveyResponse(
      id: json['id']?.toString(),
      localId: json['local_id'],
      surveyId: json['survey']?.toString() ?? '',
      surveyorId: json['surveyor_id']?.toString(),  // Convertir a String
      deviceId: json['device_id'],
      answers: json['answers'] ?? {},
      synced: json['synced'] ?? false,
      createdAt: json['created_at'] != null 
          ? DateTime.parse(json['created_at']) 
          : null,
      syncedAt: json['synced_at'] != null 
          ? DateTime.parse(json['synced_at']) 
          : null,
      signatureConsentAt: json['signature_consent_at'] != null 
          ? DateTime.parse(json['signature_consent_at']) 
          : null,
    );
  }

  Map<String, dynamic> toJson() {
    // Limpiar surveyId antes de enviar (remover espacios)
    final cleanSurveyId = surveyId.trim().replaceAll(' ', '');
    
    return {
      if (id != null) 'id': id,
      if (localId != null) 'local_id': localId,
      'survey': cleanSurveyId,
      if (surveyorId != null) 'surveyor_id': surveyorId,
      if (deviceId != null) 'device_id': deviceId,
      'answers': answers,
      'synced': synced,
      if (signatureConsentAt != null) 'signature_consent_at': signatureConsentAt!.toIso8601String(),
    };
  }

  Map<String, dynamic> toDatabaseMap() {
    return {
      'local_id': localId ?? '',
      'server_id': id,
      'survey_id': surveyId,
      'surveyor_id': surveyorId,  // String ahora
      'device_id': deviceId ?? '',
      'answers_json': jsonEncode(answers), // JSON serializado
      'synced': synced ? 1 : 0,
      'created_at': createdAt?.toIso8601String() ?? DateTime.now().toIso8601String(),
      'synced_at': syncedAt?.toIso8601String(),
      'signature_consent_at': signatureConsentAt?.toIso8601String(),
    };
  }

  factory SurveyResponse.fromDatabaseMap(Map<String, dynamic> map) {
    // Limpiar surveyId (remover espacios y caracteres inválidos)
    final rawSurveyId = map['survey_id']?.toString() ?? '';
    final cleanSurveyId = rawSurveyId.trim().replaceAll(' ', '');
    
    return SurveyResponse(
      id: map['server_id']?.toString(),
      localId: map['local_id']?.toString(),
      surveyId: cleanSurveyId,
      surveyorId: map['surveyor_id']?.toString(),  // Convertir a String
      deviceId: map['device_id']?.toString(),
      answers: _parseAnswersJson(map['answers_json'] as String),
      synced: map['synced'] == 1,
      createdAt: map['created_at'] != null 
          ? DateTime.parse(map['created_at']) 
          : null,
      syncedAt: map['synced_at'] != null 
          ? DateTime.parse(map['synced_at']) 
          : null,
      signatureConsentAt: map['signature_consent_at'] != null 
          ? DateTime.parse(map['signature_consent_at']) 
          : null,
    );
  }

  static Map<String, dynamic> _parseAnswersJson(String jsonString) {
    try {
      return jsonDecode(jsonString) as Map<String, dynamic>;
    } catch (e) {
    return {};
    }
  }
}

