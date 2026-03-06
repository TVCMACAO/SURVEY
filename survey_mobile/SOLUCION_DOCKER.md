# Solución al Problema de Docker con Flutter Embedding v2

## Problema

La imagen Docker `cirrusci/flutter:stable` usa Flutter 3.7.7 (muy antigua) que no detecta correctamente el Android embedding v2 cuando el `AndroidManifest.xml` está en la ubicación moderna (`android/app/src/main/AndroidManifest.xml`).

## Estado Actual

✅ **El proyecto está correctamente configurado para embedding v2:**
- `MainActivity.kt` usa `FlutterActivity` (v2)
- `AndroidManifest.xml` tiene `flutterEmbedding` value="2"
- Estructura de Android moderna

❌ **El contenedor Docker antiguo no lo detecta:**
- Flutter 3.7.7 busca `AndroidManifest.xml` en ubicación antigua
- No reconoce la estructura moderna

## Soluciones

### 1. Compilar Localmente (Recomendado)

Si tienes Flutter 3.10+ instalado localmente:

```bash
cd /home/vps/Documentos/survey-app/survey_mobile
flutter build apk --release
```

### 2. Instalar Android SDK y Flutter Localmente

```bash
# Instalar Flutter (ya lo tienes)
# Instalar Android SDK
export ANDROID_HOME=$HOME/Android/Sdk
# Seguir instrucciones en BUILD_INSTRUCTIONS.md
```

### 3. Usar Otra Imagen Docker (Más Reciente)

Buscar imágenes Docker con Flutter 3.10+:

```bash
# Ejemplo (verificar disponibilidad)
docker run -v $(pwd):/app -w /app <imagen-flutter-reciente> flutter build apk --release
```

### 4. Compilar en Máquina con Android Studio

1. Copiar `survey_mobile` a Windows/Mac con Android Studio
2. Abrir proyecto
3. `flutter build apk --release`

### 5. Usar GitHub Actions

Crear un workflow de GitHub Actions que use Flutter 3.10+:

```yaml
name: Build APK
on: [push]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: subosito/flutter-action@v2
        with:
          flutter-version: '3.10.0'
      - run: flutter build apk --release
```

## Verificación

Para verificar que tu proyecto está correcto:

```bash
cd /home/vps/Documentos/survey-app/survey_mobile

# Verificar estructura
ls -la android/app/src/main/AndroidManifest.xml
grep "flutterEmbedding" android/app/src/main/AndroidManifest.xml

# Verificar MainActivity
cat android/app/src/main/kotlin/com/example/survey_mobile/MainActivity.kt
```

Deberías ver:
- ✅ `flutterEmbedding` value="2" en AndroidManifest.xml
- ✅ `FlutterActivity` en MainActivity.kt

## Conclusión

El proyecto está **correctamente configurado**. El problema es la versión antigua de Flutter en el contenedor Docker. La mejor solución es compilar localmente con Flutter 3.10+ o usar una máquina con Android Studio.

