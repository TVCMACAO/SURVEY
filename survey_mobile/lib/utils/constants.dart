class ApiConstants {
  // URL de producción en EasyPanel
  static const String baseUrl = 'https://chat-survey-app.rhfh8t.easypanel.host/api';
  
  // Endpoints
  static const String login = '/token/';
  static const String refreshToken = '/token/refresh/';
  static const String surveys = '/surveys/';
  static const String responses = '/responses/';
  static const String syncResponses = '/responses/sync/';
  static const String syncStatus = '/responses/sync-status/';
  static const String currentUser = '/me/';
}

class StorageKeys {
  static const String accessToken = 'access_token';
  static const String refreshToken = 'refresh_token';
  static const String deviceId = 'device_id';
  static const String userId = 'user_id';
}

class DatabaseConstants {
  static const String databaseName = 'survey_mobile.db';
  static const int databaseVersion = 4;  // v4: signature_consent_at para Ley 1581/2012 Colombia
  
  // Tablas
  static const String tableSurveys = 'surveys';
  static const String tableResponses = 'responses';
  static const String tableSyncQueue = 'sync_queue';
}

