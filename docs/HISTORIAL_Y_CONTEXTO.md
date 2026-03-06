# Historial y contexto del proyecto Survey App (mobile)

Documento para retomar conversaciones: estado del proyecto, decisiones tomadas y cómo seguir.

---

## 1. Objetivo de la app móvil

- Aplicación Flutter para **responder encuestas offline** y sincronizar con el backend.
- **Login con/sin internet:** primera vez con WiFi; después poder cerrar/abrir la app e **iniciar sesión sin red** usando usuarios ya sincronizados en el dispositivo.

---

## 2. Flujo de autenticación (resumen)

### Con internet

1. Usuario introduce usuario y contraseña.
2. `AuthService.login()`: POST `/api/token/`, GET `/api/me/`.
3. Se guardan tokens, sesión en SQLite (`session`) y **hash de la contraseña** en secure storage (`offline_credential_${userId}`).
4. Se guarda el usuario actual en `local_users` (tabla SQLite).
5. Se descarga **toda la lista de usuarios** (GET `/api/users/`) y se guarda en `local_users`.
6. Se descargan encuestas del grupo (GET `/api/surveys/`).

### Sin internet (login offline)

1. Usuario introduce usuario y contraseña.
2. `AuthService.loginOffline()`: busca usuario en `local_users` por username.
3. Si no está: mensaje "Usuario no sincronizado. Conéctate a WiFi para sincronizar."
4. Si está: lee el hash guardado (`offline_credential_${userId}`). Si no hay hash: "Inicia sesión con WiFi al menos una vez para usar sin conexión."
5. Verifica contraseña con SHA-256 contra el hash guardado.
6. Si coincide: escribe sesión en `session` y deja al usuario logueado (sin tokens; la app usa la sesión local).

### Persistencia

- **Tabla `session`:** una fila con el usuario actual (id, username, first_name, last_name, email, role, user_group_id, last_activity_at).
- **Tabla `local_users`:** copia de usuarios del servidor (sincronizada al hacer login con red y al llamar `_syncAllUsersToLocal`).
- **Secure storage:** `offline_credential_${userId}` = hash SHA-256 de la contraseña (solo para verificación local).
- **`clearAllData()` (logout):** borra session, surveys, responses, sync_queue; **no** borra `local_users` para seguir permitiendo login offline.

---

## 3. Estructura del proyecto móvil (`survey_mobile/`)

### Archivos principales

| Archivo | Función |
|---------|--------|
| `lib/main.dart` | Punto de entrada; `AuthGate` comprueba sesión persistida y redirige a Login o a lista de encuestas. |
| `lib/services/auth_service.dart` | Login online/offline, tokens, sesión, `upsertLocalUser`, `_syncAllUsersToLocal`, `loginOffline`. |
| `lib/services/survey_service.dart` | Descarga encuestas, `getLocalSurveys`, `getSurveyById`. |
| `lib/services/network_service.dart` | `isConnected()` (conectividad real). |
| `lib/utils/database_helper.dart` | SQLite: tablas `session`, `local_users`, `surveys`, `responses`, `sync_queue`; métodos de sesión, usuarios locales y encuestas. |
| `lib/utils/constants.dart` | `ApiConstants` (baseUrl, endpoints), `StorageKeys`, `DatabaseConstants`. |
| `lib/models/user.dart` | Modelo User (fromJson/toJson). |
| `lib/models/survey.dart` | Modelo Survey (id, title, questions, fromJson, toJsonString/fromJsonString). |
| `lib/models/response.dart` | Modelo SurveyResponse (respuestas a encuestas). |
| `lib/screens/login_screen.dart` | Pantalla login: con red `login()`, sin red `loginOffline()`; tras éxito descarga encuestas y navega a lista. |
| `lib/screens/surveys_list_screen.dart` | Lista de encuestas (local + descarga si hay red), botón actualizar y logout. |

### Dependencias relevantes (`pubspec.yaml`)

- `sqflite`, `path` (BD local).
- `http`, `dio` (API).
- `flutter_secure_storage` (tokens y hash offline).
- `connectivity_plus` (red).
- `crypto` (SHA-256 para credencial offline).
- `uuid`, `intl`, `cupertino_icons`.

---

## 4. Generar el APK

Desde la raíz del repo:

```bash
cd survey_mobile
flutter pub get
flutter build apk
./copy_apk_to_root.sh
```

- APK de release: `survey_mobile/build/app/outputs/flutter-apk/app-release.apk`
- Copia en la raíz del proyecto con versión: `survey-app-vX.Y.Z-release.apk` (X.Y.Z sale de `version:` en `pubspec.yaml`).

Versión actual en `pubspec.yaml`: `1.0.91+92`.

---

## 5. Backend (referencia rápida)

- API base: `https://chat-survey-app.rhfh8t.easypanel.host/api`
- Endpoints usados: `/token/`, `/token/refresh/`, `/me/`, `/users/`, `/surveys/`, `/responses/`, etc.
- Autenticación: JWT (access + refresh). Usuarios y encuestas en MongoDB; la app filtra por grupo.

---

## 6. Decisiones y notas

- **Login offline:** solo usuarios que hayan iniciado sesión **al menos una vez con WiFi en ese dispositivo** (para tener hash guardado). El resto de usuarios sincronizados en `local_users` evita el mensaje "Usuario no sincronizado" pero para entrar sin red siguen necesitando ese primer login con red.
- **Sincronización de usuarios:** en cada login con red se llama `_syncAllUsersToLocal(accessToken)` (GET `/api/users/`) y se hace `upsertLocalUser` por cada uno.
- **Seguridad:** el hash de contraseña solo se usa en el dispositivo para verificar; no se envía al servidor en el flujo offline.
- Documentación anterior del fix de "Usuario no sincronizado": `docs/FIX_LOGIN_OFFLINE_USUARIO_SINCRONIZADO.md`.

---

## 7. Próximos pasos posibles

- Añadir pantalla de respuesta a encuesta (formulario dinámico por preguntas).
- Sincronización de respuestas pendientes (cola y envío al tener red).
- Comprobación de inactividad (ej. 2 h) y cierre de sesión al reabrir.
- Ajustar modelo `Survey` al formato real del API si el backend devuelve más campos o otra estructura.

---

*Última actualización: feb 2026. Proyecto: survey-app, carpeta móvil: survey_mobile.*
