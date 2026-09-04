#!/bin/bash
# Script para instalar Android SDK Command Line Tools

set -e

echo "🚀 Instalando Android SDK Command Line Tools..."

# Verificar e instalar Java si es necesario
echo "☕ Verificando Java..."
if ! command -v java &> /dev/null; then
    echo "📦 Java no encontrado. Instalando OpenJDK 17..."
    sudo apt-get update -qq
    sudo apt-get install -y openjdk-17-jdk
    echo "✅ Java instalado"
else
    echo "✅ Java ya está instalado"
    java -version
fi

# Configurar JAVA_HOME
if [ -z "$JAVA_HOME" ]; then
    JAVA_HOME=$(readlink -f /usr/bin/java | sed "s:bin/java::")
    if [ ! -d "$JAVA_HOME" ]; then
        # Intentar encontrar JAVA_HOME de otra manera
        JAVA_HOME=$(dirname $(dirname $(readlink -f $(which java))))
    fi
    export JAVA_HOME
    echo "⚙️  JAVA_HOME configurado: $JAVA_HOME"
    
    # Agregar a .bashrc si no está
    if ! grep -q "JAVA_HOME" ~/.bashrc 2>/dev/null; then
        echo "" >> ~/.bashrc
        echo "# Java" >> ~/.bashrc
        echo "export JAVA_HOME=$JAVA_HOME" >> ~/.bashrc
        echo "✅ JAVA_HOME agregado a ~/.bashrc"
    fi
else
    echo "✅ JAVA_HOME ya está configurado: $JAVA_HOME"
fi

# Crear directorio para Android SDK
ANDROID_HOME="$HOME/Android/Sdk"
mkdir -p "$ANDROID_HOME"
cd "$ANDROID_HOME"

# Descargar Command Line Tools
echo "📥 Descargando Android SDK Command Line Tools..."
if [ ! -f "commandlinetools-linux.zip" ]; then
    wget -q https://dl.google.com/android/repository/commandlinetools-linux-11076708_latest.zip -O commandlinetools-linux.zip
fi

# Extraer
echo "📦 Extrayendo..."
if [ ! -d "cmdline-tools" ]; then
    unzip -q commandlinetools-linux.zip
    mkdir -p cmdline-tools/latest
    mv cmdline-tools/* cmdline-tools/latest/ 2>/dev/null || true
    # Si los archivos están en el directorio actual, moverlos
    if [ -d "bin" ] || [ -f "NOTICE.txt" ]; then
        mv bin lib NOTICE.txt source.properties cmdline-tools/latest/ 2>/dev/null || true
    fi
fi

# Configurar variables de entorno
echo "⚙️  Configurando variables de entorno..."
export ANDROID_HOME="$HOME/Android/Sdk"
export PATH="$PATH:$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools"

# Agregar a .bashrc si no está
if ! grep -q "ANDROID_HOME" ~/.bashrc 2>/dev/null; then
    echo "" >> ~/.bashrc
    echo "# Android SDK" >> ~/.bashrc
    echo "export ANDROID_HOME=\$HOME/Android/Sdk" >> ~/.bashrc
    echo "export PATH=\$PATH:\$ANDROID_HOME/cmdline-tools/latest/bin:\$ANDROID_HOME/platform-tools" >> ~/.bashrc
    echo "✅ Variables agregadas a ~/.bashrc"
fi

# Instalar componentes necesarios
echo "📦 Instalando componentes de Android SDK..."
yes | "$ANDROID_HOME/cmdline-tools/latest/bin/sdkmanager" --sdk_root="$ANDROID_HOME" \
    "platform-tools" \
    "platforms;android-34" \
    "build-tools;34.0.0" \
    "cmdline-tools;latest" || {
    echo "⚠️  Error al instalar componentes. Intentando con licencias..."
    "$ANDROID_HOME/cmdline-tools/latest/bin/sdkmanager" --sdk_root="$ANDROID_HOME" --licenses || true
    yes | "$ANDROID_HOME/cmdline-tools/latest/bin/sdkmanager" --sdk_root="$ANDROID_HOME" \
        "platform-tools" \
        "platforms;android-34" \
        "build-tools;34.0.0"
}

echo ""
echo "✅ Android SDK instalado en: $ANDROID_HOME"
echo ""
echo "📝 Para usar en esta sesión, ejecuta:"
echo "   export ANDROID_HOME=\$HOME/Android/Sdk"
echo "   export PATH=\$PATH:\$ANDROID_HOME/cmdline-tools/latest/bin:\$ANDROID_HOME/platform-tools"
echo ""
echo "📝 O recarga tu shell:"
echo "   source ~/.bashrc"
echo ""
echo "🔍 Verificar instalación:"
echo "   flutter doctor"

