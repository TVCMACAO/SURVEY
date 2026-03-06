# Instrucciones de Instalación y Compilación

## Prerrequisitos

1. **Instalar Flutter SDK:**
   ```bash
   # En Linux
   sudo snap install flutter --classic
   # O descargar desde https://flutter.dev/docs/get-started/install/linux
   ```

2. **Verificar instalación:**
   ```bash
   flutter doctor
   ```

3. **Instalar dependencias del proyecto:**
   ```bash
   cd survey_mobile
   flutter pub get
   ```

## Configuración

1. **Editar la URL del backend** en `lib/utils/constants.dart`:
   ```dart
   static const String baseUrl = 'http://TU_IP:8085/api';
   ```
   Reemplazar `TU_IP` con la IP de tu servidor (ej: `192.168.0.248`)

## Compilar APK

### Para Android:

```bash
cd survey_mobile
flutter build apk --release
```

El APK se generará en: `build/app/outputs/flutter-apk/app-release.apk`

### Para instalar directamente en dispositivo conectado:

```bash
flutter install
```

## Ejecutar en modo desarrollo

```bash
flutter run
```

## Notas

- Asegúrate de que el backend esté corriendo y accesible desde el dispositivo móvil
- La IP debe ser accesible desde la red local del dispositivo
- Para producción, considera usar HTTPS y un dominio real
