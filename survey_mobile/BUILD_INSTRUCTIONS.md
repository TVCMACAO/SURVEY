# Instrucciones para Compilar el APK

## Problema Resuelto: Android Embedding v2

El error "Build failed due to use of deleted Android v1 embedding" ha sido corregido. La aplicación ahora está configurada para usar el Android embedding v2.

## Cambios Realizados

1. ✅ **MainActivity.kt** creado con `FlutterActivity` (v2 embedding)
2. ✅ **AndroidManifest.xml** actualizado con:
   - `flutterEmbedding` value="2"
   - Nombre completo de MainActivity: `com.example.survey_mobile.MainActivity`
   - Permisos de Internet y Network State
3. ✅ **Estructura de Android** generada por Flutter

## Requisitos para Compilar

### Opción 1: Instalar Android SDK en Linux

```bash
# Instalar Android SDK Command Line Tools
mkdir -p ~/Android/Sdk
cd ~/Android/Sdk
wget https://dl.google.com/android/repository/commandlinetools-linux-9477386_latest.zip
unzip commandlinetools-linux-9477386_latest.zip
mkdir -p cmdline-tools/latest
mv cmdline-tools/* cmdline-tools/latest/ 2>/dev/null || true

# Configurar variables de entorno
export ANDROID_HOME=$HOME/Android/Sdk
export PATH=$PATH:$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools

# Instalar componentes necesarios
sdkmanager "platform-tools" "platforms;android-33" "build-tools;33.0.0"
```

### Opción 2: Usar Android Studio (Recomendado)

1. Descargar Android Studio desde https://developer.android.com/studio
2. Instalar Android Studio
3. Abrir Android Studio y configurar el SDK
4. Aceptar las licencias:
   ```bash
   flutter doctor --android-licenses
   ```

### Opción 3: Compilar en Windows/Mac con Android Studio

Si tienes acceso a una máquina Windows o Mac con Android Studio instalado:

1. Copiar el proyecto `survey_mobile` a esa máquina
2. Abrir el proyecto en Android Studio
3. Ejecutar: `flutter build apk --release`

## Verificar Configuración

```bash
cd /home/vps/Documentos/survey-app/survey_mobile
flutter doctor
```

Deberías ver:
- ✅ Flutter (instalado)
- ✅ Android toolchain (si tienes SDK instalado)
- ⚠️ Android toolchain (si no tienes SDK - esto es normal en servidor Linux)

## Compilar APK (cuando tengas Android SDK)

```bash
cd /home/vps/Documentos/survey-app/survey_mobile

# Configurar URL del backend (si no lo has hecho)
# Editar lib/utils/constants.dart y cambiar BASE_URL

# Compilar
flutter build apk --release
```

El APK se generará en: `build/app/outputs/flutter-apk/app-release.apk`

## Notas

- El error de "Android v1 embedding" está resuelto
- La aplicación está lista para compilar cuando tengas el Android SDK
- Si estás en un servidor Linux sin interfaz gráfica, considera compilar en otra máquina o usar un CI/CD
- El tamaño del APK será aproximadamente 20-30 MB

## Alternativa: Compilar en Docker (Limitaciones)

⚠️ **Nota Importante**: La imagen `cirrusci/flutter:stable` usa Flutter 3.7.7 (muy antigua) que no detecta correctamente el Android embedding v2. 

**Solución**: Usa una de estas opciones:

### Opción A: Compilar localmente con Flutter instalado
```bash
cd /home/vps/Documentos/survey-app/survey_mobile
flutter build apk --release
```

### Opción B: Usar una imagen Docker más reciente
Busca imágenes Docker con Flutter 3.10+ que soporten correctamente el embedding v2:
```bash
# Ejemplo con imagen actualizada (verificar disponibilidad)
docker run -v $(pwd):/app -w /app <imagen-flutter-reciente> flutter build apk --release
```

### Opción C: Compilar en Windows/Mac con Android Studio
1. Copiar el proyecto `survey_mobile` a una máquina con Android Studio
2. Abrir el proyecto
3. Ejecutar: `flutter build apk --release`

### Opción D: Usar GitHub Actions o CI/CD
Configurar un pipeline de CI/CD que use una versión reciente de Flutter.

