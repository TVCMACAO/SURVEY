import 'dart:convert';
import 'package:sqflite/sqflite.dart';
import 'package:path/path.dart';
import '../models/response.dart';
import '../models/survey.dart';
import 'constants.dart';

class SyncStats {
  final int pending;
  final int synced;
  final int total;

  SyncStats({required this.pending, required this.synced, required this.total});
}

class PendingAttachment {
  final String id;
  final String localResponseId;
  final String questionId;
  final String localPath;
  final String mimeType;
  final String? uploadedAttachmentId;
  final DateTime createdAt;

  PendingAttachment({
    required this.id,
    required this.localResponseId,
    required this.questionId,
    required this.localPath,
    required this.mimeType,
    this.uploadedAttachmentId,
    required this.createdAt,
  });

  Map<String, dynamic> toMap() => {
        'id': id,
        'local_response_id': localResponseId,
        'question_id': questionId,
        'local_path': localPath,
        'mime_type': mimeType,
        'uploaded_attachment_id': uploadedAttachmentId,
        'created_at': createdAt.toIso8601String(),
      };

  factory PendingAttachment.fromMap(Map<String, dynamic> m) => PendingAttachment(
        id: m['id'] as String,
        localResponseId: m['local_response_id'] as String,
        questionId: m['question_id'] as String,
        localPath: m['local_path'] as String,
        mimeType: m['mime_type'] as String? ?? 'application/octet-stream',
        uploadedAttachmentId: m['uploaded_attachment_id'] as String?,
        createdAt: DateTime.parse(m['created_at'] as String),
      );
}

class DatabaseHelper {
  static final DatabaseHelper instance = DatabaseHelper._init();
  static Database? _database;

  DatabaseHelper._init();

  Future<Database> get database async {
    if (_database != null) return _database!;
    _database = await _initDb();
    return _database!;
  }

  Future<Database> _initDb() async {
    final dbPath = await getDatabasesPath();
    final path = join(dbPath, DatabaseConstants.databaseName);
    return await openDatabase(
      path,
      version: DatabaseConstants.databaseVersion,
      onCreate: _onCreate,
      onUpgrade: _onUpgrade,
    );
  }

  Future<void> _onCreate(Database db, int version) async {
    await _createTables(db);
  }

  Future<void> _onUpgrade(Database db, int oldVersion, int newVersion) async {
    if (oldVersion < 9) {
      await _createTables(db);
    }
    if (oldVersion < 10) {
      await db.execute('''
        CREATE TABLE IF NOT EXISTS ${DatabaseConstants.tablePendingAttachments} (
          id TEXT PRIMARY KEY,
          local_response_id TEXT,
          question_id TEXT,
          local_path TEXT,
          mime_type TEXT,
          uploaded_attachment_id TEXT,
          created_at TEXT
        )
      ''');
    }
  }

  Future<void> _createTables(Database db) async {
    await db.execute('''
      CREATE TABLE IF NOT EXISTS ${DatabaseConstants.tableSession} (
        user_id TEXT,
        username TEXT,
        first_name TEXT,
        last_name TEXT,
        email TEXT,
        role TEXT,
        user_group_id TEXT,
        logged_in_at TEXT,
        last_activity_at TEXT
      )
    ''');
    await db.execute('''
      CREATE TABLE IF NOT EXISTS ${DatabaseConstants.tableLocalUsers} (
        id TEXT PRIMARY KEY,
        username TEXT,
        first_name TEXT,
        last_name TEXT,
        email TEXT,
        role TEXT,
        user_group_id TEXT,
        synced_at TEXT
      )
    ''');
    await db.execute('''
      CREATE TABLE IF NOT EXISTS ${DatabaseConstants.tableSurveys} (
        id TEXT PRIMARY KEY,
        data TEXT
      )
    ''');
    await db.execute('''
      CREATE TABLE IF NOT EXISTS ${DatabaseConstants.tableResponses} (
        local_id TEXT PRIMARY KEY,
        server_id TEXT,
        survey_id TEXT,
        surveyor_id TEXT,
        device_id TEXT,
        answers_json TEXT,
        synced INTEGER,
        created_at TEXT,
        synced_at TEXT,
        signature_consent_at TEXT
      )
    ''');
    await db.execute('''
      CREATE TABLE IF NOT EXISTS ${DatabaseConstants.tableSyncQueue} (
        local_id TEXT PRIMARY KEY,
        payload TEXT,
        created_at TEXT
      )
    ''');
    await db.execute('''
      CREATE TABLE IF NOT EXISTS ${DatabaseConstants.tablePendingAttachments} (
        id TEXT PRIMARY KEY,
        local_response_id TEXT,
        question_id TEXT,
        local_path TEXT,
        mime_type TEXT,
        uploaded_attachment_id TEXT,
        created_at TEXT
      )
    ''');
  }

  // ---------- Session ----------
  Future<void> saveSession({
    required String userId,
    required String username,
    String? firstName,
    String? lastName,
    String? email,
    required String role,
    String? userGroupId,
    required DateTime loggedInAt,
    required DateTime lastActivityAt,
  }) async {
    final db = await database;
    await db.delete(DatabaseConstants.tableSession);
    await db.insert(DatabaseConstants.tableSession, {
      'user_id': userId,
      'username': username,
      'first_name': firstName,
      'last_name': lastName,
      'email': email ?? '',
      'role': role,
      'user_group_id': userGroupId,
      'logged_in_at': loggedInAt.toIso8601String(),
      'last_activity_at': lastActivityAt.toIso8601String(),
    });
  }

  Future<Map<String, dynamic>?> getPersistedSession() async {
    final db = await database;
    final rows = await db.query(DatabaseConstants.tableSession, limit: 1);
    if (rows.isEmpty) return null;
    final r = rows.first;
    return {
      'id': r['user_id'],
      'username': r['username'],
      'first_name': r['first_name'],
      'last_name': r['last_name'],
      'email': r['email'],
      'role': r['role'],
      'user_group_id': r['user_group_id'],
    };
  }

  Future<void> updateSessionLastActivity(DateTime at) async {
    final db = await database;
    await db.update(
      DatabaseConstants.tableSession,
      {'last_activity_at': at.toIso8601String()},
    );
  }

  Future<void> clearSession() async {
    final db = await database;
    await db.delete(DatabaseConstants.tableSession);
  }

  // ---------- Local users ----------
  Future<void> upsertLocalUser({
    required String id,
    required String username,
    String? firstName,
    String? lastName,
    String? email,
    String? role,
    String? userGroupId,
  }) async {
    final db = await database;
    final now = DateTime.now().toIso8601String();
    await db.insert(
      DatabaseConstants.tableLocalUsers,
      {
        'id': id,
        'username': username,
        'first_name': firstName,
        'last_name': lastName,
        'email': email ?? '',
        'role': role ?? 'encuestador',
        'user_group_id': userGroupId,
        'synced_at': now,
      },
      conflictAlgorithm: ConflictAlgorithm.replace,
    );
  }

  Future<Map<String, dynamic>?> getLocalUserByUsername(String username) async {
    final db = await database;
    final rows = await db.query(
      DatabaseConstants.tableLocalUsers,
      where: 'username = ?',
      whereArgs: [username],
      limit: 1,
    );
    if (rows.isEmpty) return null;
    final r = rows.first;
    return {
      'id': r['id'],
      'username': r['username'],
      'first_name': r['first_name'],
      'last_name': r['last_name'],
      'email': r['email'] ?? '',
      'role': r['role'] ?? 'encuestador',
      'user_group_id': r['user_group_id'],
    };
  }

  // ---------- Surveys ----------
  Future<List<String>> getAllSurveyIds({bool includeDeleted = false}) async {
    final db = await database;
    final rows = await db.query(
      DatabaseConstants.tableSurveys,
      columns: ['id'],
    );
    return rows.map((r) => r['id'] as String).toList();
  }

  Future<void> insertSurvey(Survey survey) async {
    final db = await database;
    await db.insert(
      DatabaseConstants.tableSurveys,
      {'id': survey.id.trim(), 'data': survey.toJsonString()},
      conflictAlgorithm: ConflictAlgorithm.replace,
    );
  }

  Future<void> deleteSurvey(String id) async {
    final db = await database;
    await db.delete(
      DatabaseConstants.tableSurveys,
      where: 'id = ?',
      whereArgs: [id.trim()],
    );
  }

  Future<List<Survey>> getAllSurveys() async {
    final db = await database;
    final rows = await db.query(DatabaseConstants.tableSurveys);
    final list = <Survey>[];
    for (final r in rows) {
      final s = Survey.fromJsonString(r['data'] as String?);
      if (s != null) list.add(s);
    }
    return list;
  }

  Future<Survey?> getSurveyById(String id) async {
    final db = await database;
    final rows = await db.query(
      DatabaseConstants.tableSurveys,
      where: 'id = ?',
      whereArgs: [id.trim()],
      limit: 1,
    );
    if (rows.isEmpty) return null;
    return Survey.fromJsonString(rows.first['data'] as String?);
  }

  // ---------- Responses ----------
  Future<void> insertResponse(SurveyResponse response) async {
    final db = await database;
    await db.insert(
      DatabaseConstants.tableResponses,
      response.toDatabaseMap(),
      conflictAlgorithm: ConflictAlgorithm.replace,
    );
  }

  Future<SurveyResponse?> getResponseByLocalId(String localId) async {
    final db = await database;
    final rows = await db.query(
      DatabaseConstants.tableResponses,
      where: 'local_id = ?',
      whereArgs: [localId],
      limit: 1,
    );
    if (rows.isEmpty) return null;
    return SurveyResponse.fromDatabaseMap(rows.first);
  }

  Future<List<SurveyResponse>> getResponsesBySurveyId(String surveyId) async {
    final db = await database;
    final rows = await db.query(
      DatabaseConstants.tableResponses,
      where: 'survey_id = ?',
      whereArgs: [surveyId.trim()],
      orderBy: 'created_at DESC',
    );
    return rows.map((r) => SurveyResponse.fromDatabaseMap(r)).toList();
  }

  Future<List<SurveyResponse>> getUnsyncedResponses() async {
    final db = await database;
    final rows = await db.query(
      DatabaseConstants.tableResponses,
      where: 'synced = ?',
      whereArgs: [0],
      orderBy: 'created_at ASC',
    );
    return rows.map((r) => SurveyResponse.fromDatabaseMap(r)).toList();
  }

  Future<SyncStats> getSyncStats() async {
    final db = await database;
    final pending = Sqflite.firstIntValue(await db.rawQuery(
          'SELECT COUNT(*) FROM ${DatabaseConstants.tableResponses} WHERE synced = 0',
        )) ??
        0;
    final synced = Sqflite.firstIntValue(await db.rawQuery(
          'SELECT COUNT(*) FROM ${DatabaseConstants.tableResponses} WHERE synced = 1',
        )) ??
        0;
    return SyncStats(pending: pending, synced: synced, total: pending + synced);
  }

  Future<void> markResponseSynced(String localId, String serverId) async {
    final db = await database;
    await db.update(
      DatabaseConstants.tableResponses,
      {
        'synced': 1,
        'server_id': serverId,
        'synced_at': DateTime.now().toIso8601String(),
      },
      where: 'local_id = ?',
      whereArgs: [localId],
    );
  }

  Future<void> updateResponseAnswers(String localId, Map<String, dynamic> answers) async {
    final db = await database;
    await db.update(
      DatabaseConstants.tableResponses,
      {'answers_json': jsonEncode(answers)},
      where: 'local_id = ?',
      whereArgs: [localId],
    );
  }

  Future<void> deleteResponse(String localId) async {
    final db = await database;
    await db.delete(
      DatabaseConstants.tableResponses,
      where: 'local_id = ?',
      whereArgs: [localId],
    );
    await db.delete(
      DatabaseConstants.tablePendingAttachments,
      where: 'local_response_id = ?',
      whereArgs: [localId],
    );
  }

  // ---------- Sync queue ----------
  Future<void> enqueueSync(String localId, Map<String, dynamic> payload) async {
    final db = await database;
    await db.insert(
      DatabaseConstants.tableSyncQueue,
      {
        'local_id': localId,
        'payload': jsonEncode(payload),
        'created_at': DateTime.now().toIso8601String(),
      },
      conflictAlgorithm: ConflictAlgorithm.replace,
    );
  }

  Future<List<Map<String, dynamic>>> getAllSyncQueueItems() async {
    final db = await database;
    final rows = await db.query(
      DatabaseConstants.tableSyncQueue,
      orderBy: 'created_at ASC',
    );
    return rows.map((r) {
      return {
        'local_id': r['local_id'],
        'payload': jsonDecode(r['payload'] as String),
        'created_at': r['created_at'],
      };
    }).toList();
  }

  Future<int> getSyncQueueCount() async {
    final db = await database;
    return Sqflite.firstIntValue(
          await db.rawQuery('SELECT COUNT(*) FROM ${DatabaseConstants.tableSyncQueue}'),
        ) ??
        0;
  }

  Future<void> dequeueSync(String localId) async {
    final db = await database;
    await db.delete(
      DatabaseConstants.tableSyncQueue,
      where: 'local_id = ?',
      whereArgs: [localId],
    );
  }

  // ---------- Pending attachments ----------
  Future<void> insertPendingAttachment(PendingAttachment attachment) async {
    final db = await database;
    await db.insert(
      DatabaseConstants.tablePendingAttachments,
      attachment.toMap(),
      conflictAlgorithm: ConflictAlgorithm.replace,
    );
  }

  Future<List<PendingAttachment>> getPendingAttachmentsForResponse(String localResponseId) async {
    final db = await database;
    final rows = await db.query(
      DatabaseConstants.tablePendingAttachments,
      where: 'local_response_id = ?',
      whereArgs: [localResponseId],
    );
    return rows.map((r) => PendingAttachment.fromMap(r)).toList();
  }

  Future<void> markAttachmentUploaded(String id, String serverAttachmentId) async {
    final db = await database;
    await db.update(
      DatabaseConstants.tablePendingAttachments,
      {'uploaded_attachment_id': serverAttachmentId},
      where: 'id = ?',
      whereArgs: [id],
    );
  }

  // ---------- clearAllData (mantiene local_users) ----------
  Future<void> clearAllData() async {
    final db = await database;
    await db.delete(DatabaseConstants.tableSession);
    await db.delete(DatabaseConstants.tableSurveys);
    await db.delete(DatabaseConstants.tableResponses);
    await db.delete(DatabaseConstants.tableSyncQueue);
    await db.delete(DatabaseConstants.tablePendingAttachments);
  }
}
