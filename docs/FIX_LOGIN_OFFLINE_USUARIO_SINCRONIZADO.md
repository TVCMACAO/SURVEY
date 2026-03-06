# Fix: "Usuario no sincronizado. Conéctate a WiFi para sincronizar."

## Causa

Al iniciar sesión **con WiFi** no se guarda el usuario actual en la tabla `local_users`. Cuando luego intentas entrar **sin internet**, el login offline busca tu usuario en `local_users` y no lo encuentra.

## Solución

Tras un login online correcto, hay que **añadir el usuario actual a `local_users`** (igual que hace la sincronización de usuarios, pero al menos con el que acaba de entrar).

### En `lib/services/auth_service.dart`

Dentro del método **`login()`**, justo **después** de guardar la credencial offline y **antes** del `return _currentUser!;`, añade esta llamada:

```dart
        // Asegurar que el usuario actual está en local_users para login offline
        await DatabaseHelper.instance.upsertLocalUser(
          id: _currentUser!.id,
          username: _currentUser!.username,
          firstName: _currentUser!.firstName,
          lastName: _currentUser!.lastName,
          email: _currentUser!.email,
          role: _currentUser!.role,
          userGroupId: _currentUser!.userGroupId,
        );
```

Quedaría así el flujo (resumido):

```dart
        await DatabaseHelper.instance.saveSession(...);
        // Guardar hash de contraseña para login offline
        final hash = sha256.convert(utf8.encode(password)).toString();
        await _secureStorage.write(
          key: 'offline_credential_${_currentUser!.id}',
          value: hash,
        );
        // Asegurar que el usuario actual está en local_users para login offline
        await DatabaseHelper.instance.upsertLocalUser(
          id: _currentUser!.id,
          username: _currentUser!.username,
          firstName: _currentUser!.firstName,
          lastName: _currentUser!.lastName,
          email: _currentUser!.email,
          role: _currentUser!.role,
          userGroupId: _currentUser!.userGroupId,
        );
        return _currentUser!;
```

### Comprobar que existe `upsertLocalUser`

En `lib/utils/database_helper.dart` debe existir el método:

```dart
Future<void> upsertLocalUser({
  required String id,
  required String username,
  String? firstName,
  String? lastName,
  String? email,
  String? role,
  String? userGroupId,
}) async { ... }
```

y la tabla `local_users`. Si no está, hay que añadirlo (tabla + método).

---

Tras este cambio, al iniciar sesión con WiFi el usuario queda guardado en `local_users` y podrá iniciar sesión sin internet la próxima vez.
