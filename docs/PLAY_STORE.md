# Publicación Google Play — Survey App

Package / applicationId: `com.clinicamaicao.survey`

## Objetivo

Que los dispositivos confíen en la app (instalación y updates vía Play, sin “orígenes desconocidos”).

## Pasos en Console

1. Crear o usar cuenta de desarrollador de la organización.
2. Nueva app → Android → nombre “Survey App”.
3. Completar ficha (descripción, icono 512, feature graphic, capturas, política de privacidad).
4. App signing: subir el keystore actual de upload (`survey_mobile/android/survey-release.jks`) o dejar que Play gestione la app signing key.
5. Build:
   ```bash
   cd survey_mobile
   # Subir version: name+code en pubspec.yaml
   flutter build appbundle --release
   ```
6. Play Console → Producción o testing interno → crear release → subir `app-release.aab`.
7. Revisar políticas y enviar a revisión.
8. Cuando la URL pública exista (ej. `https://play.google.com/store/apps/details?id=com.clinicamaicao.survey`), guardar en:
   - `releases/apk/version.json` → campo `play_store_url`
   - Redeploy / publicar version.json (el botón web y el APK usarán Play primero).

## Sideload vs Play

| Canal | Confianza del sistema | Update |
|-------|----------------------|--------|
| Web APK (`/releases/apk/`) | Requiere permitir origen | Diálogo en app + instalador |
| Google Play | Alta | Automático / un toque vía Play |

Mantener el APK web como respaldo interno es válido; con `play_store_url` relleno, la UX prioriza Play.
