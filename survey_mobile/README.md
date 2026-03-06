# Survey Mobile - Aplicación Flutter para Encuestas Offline

Aplicación móvil Flutter que permite responder encuestas sin conexión a internet y sincronizar automáticamente cuando se detecte conectividad.

## Características

- ✅ Login con autenticación JWT
- ✅ Descarga de encuestas para uso offline
- ✅ Respuesta de encuestas sin conexión
- ✅ Sincronización automática cuando se detecta internet
- ✅ Sincronización manual en lote
- ✅ Dashboard de estado de sincronización
- ✅ Indicadores visuales de estado online/offline

## Requisitos

- Flutter SDK 3.0.0 o superior
- Dart 3.0.0 o superior
- Android Studio / Xcode (para desarrollo móvil)

## Instalación

1. Instalar Flutter: https://flutter.dev/docs/get-started/install

2. Instalar dependencias:
```bash
cd survey_mobile
flutter pub get
```

3. Configurar la URL del backend en `lib/utils/constants.dart`:
```dart
static const String baseUrl = 'http://TU_IP:8085/api';
```

## Ejecución

### Android
```bash
flutter run
```

### Generar APK
```bash
flutter build apk --release
```

El APK se generará en `build/app/outputs/flutter-apk/app-release.apk`

## Estructura del Proyecto

```
lib/
├── main.dart                 # Punto de entrada
├── models/                   # Modelos de datos
│   ├── survey.dart
│   ├── question.dart
│   ├── response.dart
│   └── user.dart
├── services/                 # Servicios de negocio
│   ├── auth_service.dart    # Autenticación JWT
│   ├── survey_service.dart  # Gestión de encuestas
│   ├── sync_service.dart    # Sincronización
│   └── network_service.dart # Monitoreo de red
├── screens/                  # Pantallas de la UI
│   ├── login_screen.dart
│   ├── surveys_list_screen.dart
│   ├── response_form_screen.dart
│   └── sync_status_screen.dart
└── utils/                    # Utilidades
    ├── constants.dart       # Constantes y configuración
    └── database_helper.dart # Base de datos SQLite
```

## Funcionalidades

### Autenticación
- Login con usuario y contraseña
- Almacenamiento seguro de tokens JWT
- Refresh automático de tokens

### Encuestas
- Descarga automática de todas las encuestas cuando hay conexión
- Almacenamiento local en SQLite
- Visualización offline de encuestas disponibles

### Respuestas
- Formulario dinámico según tipo de pregunta
- Guardado local inmediato
- Intento de sincronización inmediata si hay conexión
- Cola de sincronización para respuestas pendientes

### Sincronización
- Detección automática de cambios de conectividad
- Sincronización en lote de respuestas pendientes
- Dashboard de estado de sincronización
- Sincronización manual forzada

## Base de Datos Local

La aplicación usa SQLite para almacenar:
- **surveys**: Encuestas descargadas
- **questions**: Preguntas de las encuestas
- **responses**: Respuestas guardadas localmente
- **sync_queue**: Cola de sincronización

## API Backend

La aplicación se conecta a los siguientes endpoints:

- `POST /api/token/` - Login
- `POST /api/token/refresh/` - Refresh token
- `GET /api/surveys/` - Listar encuestas
- `GET /api/surveys/{id}/` - Obtener encuesta específica
- `POST /api/responses/` - Crear respuesta individual
- `POST /api/responses/sync/` - Sincronizar respuestas en lote
- `POST /api/responses/sync-status/` - Verificar estado de sincronización
- `GET /api/me/` - Información del usuario actual

## Notas

- La aplicación requiere permisos de internet en Android/iOS
- Los tokens se almacenan de forma segura usando Flutter Secure Storage
- La base de datos local se crea automáticamente en el primer uso
- Las respuestas se sincronizan automáticamente cuando se detecta conexión

