import 'package:sqflite/sqflite.dart';
import 'package:path/path.dart';
import '../models/survey.dart';
import 'constants.dart';

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

  // ---------- clearAllData (mantiene local_users) ----------
  Future<void> clearAllData() async {
    final db = await database;
    await db.delete(DatabaseConstants.tableSession);
    await db.delete(DatabaseConstants.tableSurveys);
    await db.delete(DatabaseConstants.tableResponses);
    await db.delete(DatabaseConstants.tableSyncQueue);
    // No borrar tableLocalUsers para permitir login offline
  }
}
