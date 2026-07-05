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
  static const String attachments = '/attachments/';
  static const String health = '/health/';
  static const String currentUser = '/me/';
  static const String users = '/users/';
  static String referenceLookup(String surveyId, String key) =>
      '/public/surveys/$surveyId/reference-lookup/?key=${Uri.encodeComponent(key)}';
}

class StorageKeys {
  static const String accessToken = 'access_token';
  static const String refreshToken = 'refresh_token';
  static const String deviceId = 'device_id';
  static const String userId = 'user_id';
}

class DatabaseConstants {
  static const String databaseName = 'survey_mobile.db';
  static const int databaseVersion = 10;

  // Tablas
  static const String tableSurveys = 'surveys';
  static const String tableResponses = 'responses';
  static const String tableSyncQueue = 'sync_queue';
  static const String tableSession = 'session';
  static const String tableLocalUsers = 'local_users';
  static const String tablePendingAttachments = 'pending_attachments';
}
