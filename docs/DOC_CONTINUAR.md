# Documentación para continuar el desarrollo

Documento de referencia para retomar el proyecto Survey App (web + APK).

---

## 1. Estructura del proyecto

```
survey-app/
├── backend/                    # Django REST API (MongoDB)
│   └── surveys/
│       ├── views.py            # API (ReferenceLookup, reference-file, etc.)
│       ├── serializers.py      # Survey/Response serializers
│       └── urls.py
├── frontend/
│   └── survey-ui/              # React + Vite (editor + vista pública)
│       └── src/App.jsx
├── survey_mobile/              # Flutter – app Android (APK)
│   ├── pubspec.yaml            # version: 1.0.86+87
│   ├── lib/
│   │   ├── models/survey.dart  # Survey con referenceKeyColumn, referenceMapping, referenceData
│   │   ├── screens/response_form_screen.dart  # Formulario respuesta + lookup + botón actualizar
│   │   ├── utils/
│   │   │   ├── database_helper.dart  # SQLite, migraciones v1–v8
│   │   │   └── constants.dart        # baseUrl, databaseVersion, referenceLookup()
│   │   └── services/           # sync, auth, network
│   └── build/app/outputs/flutter-apk/app-release.apk
└── docs/
    └── DOC_CONTINUAR.md        # Este archivo
```

**Nota:** `survey_mobile/` está en `.gitignore`; el código móvil no se sube a este repo. Si quieres versionarlo aquí, quita `survey_mobile/` del `.gitignore`.

---

## 2. Generar el APK

Requisitos: Flutter instalado y configurado.

```bash
cd survey_mobile
flutter build apk --release
```

- APK generado: `survey_mobile/build/app/outputs/flutter-apk/app-release.apk`
- Copia habitual a la raíz del proyecto con nombre versionado:
  ```bash
  cp survey_mobile/build/app/outputs/flutter-apk/app-release.apk survey-app-v1.0.XX-release.apk
  ```
- Versión actual en `survey_mobile/pubspec.yaml`: **1.0.86+87**. Al generar nuevo APK, subir `version` (p. ej. `1.0.87+88`).

---

## 3. Referenciación (autocompletado por documento)

### 3.1 Backend

- **Subir Excel:** `reference-file` (POST) – sube archivo y guarda `reference_data`, `reference_key_column` en la encuesta.
- **Lookup:** `GET /public/surveys/<id>/reference-lookup/?key=<documento>`
  - Encuestas públicas: sin auth.
  - Encuestas privadas (APK): requiere auth; el usuario debe tener acceso a la encuesta.
- **Datos para offline (APK):** al sincronizar encuestas con auth, el backend envía `reference_data` para que el APK haga lookup local sin red.

### 3.2 Frontend web (editor)

- En el editor: sección “Referenciación” arriba; botón “Referenciación” en el header.
- Se sube el Excel, se define la columna clave y el mapeo pregunta → columna.
- Vista pública: al escribir en el campo clave (documento), lookup con debounce; fechas del Excel formateadas para inputs date/datetime; Enter no envía el form; validación de obligatorios antes de enviar.

### 3.3 APK (Flutter)

- **Modelo:** `Survey.referenceKeyColumn`, `Survey.referenceMapping`, `Survey.referenceData` (lista de filas para offline).
- **Lookup:** `_doReferenceLookup(keyValue)` en `response_form_screen.dart`:
  - Con red: GET al endpoint con token.
  - Sin red: búsqueda en `survey.referenceData` por la columna clave.
- **Botón:** “Actualizar datos con este documento” debajo del campo de documento; llama `_formKey.currentState?.save()` y luego `_doReferenceLookup(...)`.
- **Keys de los campos:** el campo de documento (clave) usa key estable `ValueKey('q_$questionId')` para no perder foco al escribir; el resto de campos usan `ValueKey('q_${questionId}_${_answers[questionId]}')` para que al rellenar con el lookup se redibujen y muestren el valor.
- **Feedback:** Snackbar “Datos actualizados correctamente” / “No se encontró el documento” / mensajes de error de red o auth.

---

## 4. Base de datos móvil (SQLite)

- **Archivo:** `survey_mobile/lib/utils/database_helper.dart`
- **Nombre BD:** `survey_mobile.db`
- **Versión actual:** 8 (`DatabaseConstants.databaseVersion` en `constants.dart`).

### Tabla `surveys`

Debe incluir (para referenciación):

- `reference_key_column` (TEXT)
- `reference_mapping_json` (TEXT)
- `reference_data_json` (TEXT)

### Migraciones

- **onCreate:** crea la tabla `surveys` ya con las tres columnas de referenciación (evita error en instalaciones nuevas).
- **v6:** añade `reference_key_column`, `reference_mapping_json`.
- **v7:** añade `reference_data_json`.
- **v8:** reparación: añade las tres columnas si no existen (para dispositivos que tenían la tabla creada con esquema antiguo). Al actualizar el APK, se ejecuta la migración y la sincronización deja de dar `DatabaseException` por columnas faltantes.

Si en el futuro añades más columnas a `surveys`, sube `databaseVersion` y en `_upgradeDB` haz `if (oldVersion < N) { ALTER TABLE ... ADD COLUMN ... }` (con try/catch si la columna puede ya existir).

---

## 5. Archivos clave por tarea

| Tarea                    | Archivos principales |
|--------------------------|------------------------|
| API referenciación       | `backend/surveys/views.py` (ReferenceLookup, reference-file), `urls.py` |
| Editor referenciación    | `frontend/survey-ui/src/App.jsx` (sección Referenciación, mapeo) |
| Vista pública lookup     | `frontend/survey-ui/src/App.jsx` (lookup, debounce, validación) |
| Formulario respuesta APK | `survey_mobile/lib/screens/response_form_screen.dart` |
| Modelo Survey APK        | `survey_mobile/lib/models/survey.dart` |
| BD y migraciones APK     | `survey_mobile/lib/utils/database_helper.dart`, `constants.dart` |
| URL API y versión BD     | `survey_mobile/lib/utils/constants.dart` |

---

## 6. Cómo continuar

1. **Cambios solo web/backend:** editar en `backend/` y `frontend/survey-ui/`, commit y push (estos sí están en git).
2. **Cambios en el APK:** editar en `survey_mobile/`; recordar que no se sube a git salvo que quites `survey_mobile/` del `.gitignore`. Para distribuir: generar APK y copiarlo (o subirlo a otro repo/almacenamiento).
3. **Nueva migración de BD (APK):** en `constants.dart` subir `databaseVersion`; en `database_helper.dart` en `_upgradeDB` añadir bloque `if (oldVersion < N)` con los `ALTER TABLE` necesarios; y, si aplica, actualizar `_createDB` para que instalaciones nuevas tengan ya las columnas.
4. **Probar referenciación:** encuesta con archivo de referenciación subido y mapeo; en web probar enlace público; en APK probar con usuario logueado y encuesta sincronizada (lookup online y botón “Actualizar datos con este documento”; sin red, usar `referenceData`).

---

*Última actualización: feb 2026 (APK v1.0.86, BD v8, referenciación web + APK).*
