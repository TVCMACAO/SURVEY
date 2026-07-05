import 'package:http/http.dart' as http;
import 'dart:convert';
import 'dart:math';
import 'package:crypto/crypto.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import '../models/user.dart';
import '../utils/constants.dart';
import '../utils/database_helper.dart';

class AuthService {
  static final AuthService instance = AuthService._init();
  final FlutterSecureStorage _secureStorage = const FlutterSecureStorage();
  User? _currentUser;

  AuthService._init();

  static const int _pbkdf2Iterations = 100000;

  String _deriveOfflineCredential(String password, String salt) {
    final passwordBytes = utf8.encode(password);
    final saltBytes = utf8.encode(salt);
    var block = Hmac(sha256, passwordBytes).convert([...saltBytes, 0, 0, 0, 1]).bytes;
    final result = List<int>.from(block);
    for (var i = 1; i < _pbkdf2Iterations; i++) {
      block = Hmac(sha256, passwordBytes).convert(block).bytes;
      for (var j = 0; j < result.length; j++) {
        result[j] ^= block[j];
      }
    }
    return 'pbkdf2:$_pbkdf2Iterations:$salt:${base64.encode(result)}';
  }

  Future<String> _getOrCreateOfflineSalt(String userId) async {
    final saltKey = 'offline_credential_salt_$userId';
    var salt = await _secureStorage.read(key: saltKey);
    if (salt == null || salt.isEmpty) {
      salt = base64.encode(List<int>.generate(16, (_) => Random.secure().nextInt(256)));
      await _secureStorage.write(key: saltKey, value: salt);
    }
    return salt;
  }

  Future<bool> _verifyOfflinePassword(String userId, String password, String stored) async {
    if (stored.startsWith('pbkdf2:')) {
      final salt = await _secureStorage.read(key: 'offline_credential_salt_$userId');
      if (salt == null || salt.isEmpty) return false;
      return stored == _deriveOfflineCredential(password, salt);
    }
    // Legacy SHA-256 (pre-migration)
    final legacy = sha256.convert(utf8.encode(password)).toString();
    return stored == legacy;
  }

  Future<String?> getAccessToken() async {
    return await _secureStorage.read(key: StorageKeys.accessToken);
  }

  Future<String?> getRefreshToken() async {
    return await _secureStorage.read(key: StorageKeys.refreshToken);
  }

  Future<User> login(String username, String password) async {
    final response = await http.post(
      Uri.parse('${ApiConstants.baseUrl}${ApiConstants.login}'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({
        'username': username,
        'password': password,
      }),
    );

    if (response.statusCode == 200) {
      final data = jsonDecode(response.body);
      final accessToken = data['access'];
      final refreshToken = data['refresh'];

      await _secureStorage.write(
        key: StorageKeys.accessToken,
        value: accessToken,
      );
      await _secureStorage.write(
        key: StorageKeys.refreshToken,
        value: refreshToken,
      );

      final userResponse = await http.get(
        Uri.parse('${ApiConstants.baseUrl}${ApiConstants.currentUser}'),
        headers: {
          'Authorization': 'Bearer $accessToken',
        },
      );

      if (userResponse.statusCode == 200) {
        final userData = jsonDecode(userResponse.body);
        _currentUser = User.fromJson(userData);
        final now = DateTime.now();
        await DatabaseHelper.instance.saveSession(
          userId: _currentUser!.id,
          username: _currentUser!.username,
          firstName: _currentUser!.firstName,
          lastName: _currentUser!.lastName,
          email: _currentUser!.email,
          role: _currentUser!.role,
          userGroupId: _currentUser!.userGroupId,
          loggedInAt: now,
          lastActivityAt: now,
        );
        // Credencial offline con PBKDF2-HMAC-SHA256 + salt por dispositivo
        final salt = await _getOrCreateOfflineSalt(_currentUser!.id);
        final credential = _deriveOfflineCredential(password, salt);
        await _secureStorage.write(
          key: 'offline_credential_${_currentUser!.id}',
          value: credential,
        );
        // Guardar usuario actual en local_users
        await DatabaseHelper.instance.upsertLocalUser(
          id: _currentUser!.id,
          username: _currentUser!.username,
          firstName: _currentUser!.firstName,
          lastName: _currentUser!.lastName,
          email: _currentUser!.email,
          role: _currentUser!.role,
          userGroupId: _currentUser!.userGroupId,
        );
        // Descargar toda la lista de usuarios y guardarla en la BD local para login offline
        await _syncAllUsersToLocal(accessToken);
        return _currentUser!;
      } else {
        throw Exception('Error al obtener información del usuario');
      }
    } else {
      final error = jsonDecode(response.body);
      throw Exception(error['detail'] ?? 'Error al iniciar sesión');
    }
  }

  /// Descarga toda la base de usuarios del servidor y la guarda en local_users (BD Android).
  /// Se llama tras cada login con internet para que cualquier usuario pueda iniciar sesión sin red.
  Future<void> _syncAllUsersToLocal(String accessToken) async {
    try {
      final response = await http.get(
        Uri.parse('${ApiConstants.baseUrl}${ApiConstants.users}'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $accessToken',
        },
      ).timeout(const Duration(seconds: 30));
      if (response.statusCode != 200) return;
      final list = jsonDecode(response.body);
      if (list is! List) return;
      for (final item in list) {
        if (item is! Map<String, dynamic>) continue;
        final id = item['id']?.toString();
        final username = item['username']?.toString();
        if (id == null || username == null) continue;
        await DatabaseHelper.instance.upsertLocalUser(
          id: id,
          username: username,
          firstName: item['first_name']?.toString(),
          lastName: item['last_name']?.toString(),
          email: item['email']?.toString(),
          role: item['role']?.toString(),
          userGroupId: item['user_group_id']?.toString(),
        );
      }
    } catch (_) {
      // No bloquear el login si falla la descarga de usuarios
    }
  }

  Future<User> loginOffline(String username, String password) async {
    final userMap = await DatabaseHelper.instance.getLocalUserByUsername(username);
    if (userMap == null) {
      throw Exception('Usuario no sincronizado. Conéctate a WiFi para sincronizar.');
    }
    final userId = userMap['id']?.toString() ?? '';
    final storedHash = await _secureStorage.read(key: 'offline_credential_$userId');
    if (storedHash == null || storedHash.isEmpty) {
      throw Exception('Inicia sesión con WiFi al menos una vez para usar sin conexión.');
    }
    if (!await _verifyOfflinePassword(userId, password, storedHash)) {
      throw Exception('Contraseña incorrecta.');
    }
    final user = User.fromJson(userMap);
    final now = DateTime.now();
    await DatabaseHelper.instance.saveSession(
      userId: user.id,
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
      userGroupId: user.userGroupId,
      loggedInAt: now,
      lastActivityAt: now,
    );
    _currentUser = user;
    return user;
  }

  Future<String> refreshAccessToken() async {
    final refreshToken = await getRefreshToken();
    if (refreshToken == null) {
      throw Exception('No hay token de refresh disponible');
    }
    final response = await http.post(
      Uri.parse('${ApiConstants.baseUrl}${ApiConstants.refreshToken}'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({'refresh': refreshToken}),
    );
    if (response.statusCode == 200) {
      final data = jsonDecode(response.body);
      final newAccessToken = data['access'];
      await _secureStorage.write(
        key: StorageKeys.accessToken,
        value: newAccessToken,
      );
      return newAccessToken;
    } else {
      throw Exception('Error al refrescar token');
    }
  }

  Future<bool> isAuthenticated() async {
    final token = await getAccessToken();
    return token != null && token.isNotEmpty;
  }

  User? getCurrentUser() => _currentUser;

  Future<void> logout() async {
    await _secureStorage.delete(key: StorageKeys.accessToken);
    await _secureStorage.delete(key: StorageKeys.refreshToken);
    _currentUser = null;
    try {
      await DatabaseHelper.instance.clearAllData();
    } catch (_) {
      // Ignorar fallos al limpiar
    }
  }

  Future<Map<String, String>> getAuthHeaders() async {
    final token = await getAccessToken();
    return {
      'Content-Type': 'application/json',
      if (token != null) 'Authorization': 'Bearer $token',
    };
  }

  Future<String?> getUserId() async {
    if (_currentUser != null) return _currentUser!.id;
    final session = await DatabaseHelper.instance.getPersistedSession();
    if (session != null) {
      _currentUser = User.fromJson(session);
      return _currentUser!.id;
    }
    return null;
  }

  Future<User?> loadPersistedSession() async {
    final session = await DatabaseHelper.instance.getPersistedSession();
    if (session != null) {
      _currentUser = User.fromJson(session);
      return _currentUser;
    }
    return null;
  }

  Future<void> updateLastActivity() async {
    await DatabaseHelper.instance.updateSessionLastActivity(DateTime.now());
  }
}
