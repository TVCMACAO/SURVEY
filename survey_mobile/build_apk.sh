#!/bin/bash
# Script para compilar APK de la aplicación Survey Mobile
# Conectada a: https://chat-survey-app.rhfh8t.easypanel.host/

set -e

echo "=========================================="
echo "Compilando APK para Survey Mobile"
echo "=========================================="
echo ""

# Verificar que Flutter está instalado
if ! command -v flutter &> /dev/null; then
    echo "❌ Flutter no está instalado"
    echo "Por favor, instala Flutter desde: https://flutter.dev/docs/get-started/install"
    exit 1
fi

echo "✅ Flutter encontrado"
flutter --version | head -1

# Navegar al directorio del proyecto
cd "$(dirname "$0")"

echo ""
echo "🔄 Limpiando builds anteriores..."
flutter clean

echo ""
echo "📦 Obteniendo dependencias..."
flutter pub get

echo ""
echo "🔍 Verificando configuración..."
echo "   - URL de API: https://chat-survey-app.rhfh8t.easypanel.host/api"
echo ""

# Verificar que la URL está configurada correctamente
if grep -q "chat-survey-app.rhfh8t.easypanel.host" lib/utils/constants.dart; then
    echo "✅ URL de API configurada correctamente"
else
    echo "⚠️  Advertencia: La URL de API podría no estar configurada correctamente"
    echo "   Verifica lib/utils/constants.dart"
fi

echo ""
echo "🔨 Compilando APK (esto puede tardar varios minutos)..."
flutter build apk --release

if [ $? -eq 0 ]; then
    echo ""
    echo "=========================================="
    echo "✅ APK compilado exitosamente!"
    echo "=========================================="
    echo ""
    APK_PATH="build/app/outputs/flutter-apk/app-release.apk"
    if [ -f "$APK_PATH" ]; then
        APK_SIZE=$(du -h "$APK_PATH" | awk '{print $1}')
        echo "📱 Archivo APK: $APK_PATH"
        echo "📦 Tamaño: $APK_SIZE"
        echo ""
        echo "Puedes instalar este APK en dispositivos Android."
        echo "Para instalar: adb install $APK_PATH"
    else
        echo "⚠️  El APK no se encontró en la ruta esperada"
    fi
else
    echo ""
    echo "=========================================="
    echo "❌ Error al compilar el APK"
    echo "=========================================="
    echo ""
    echo "Revisa los errores arriba para más información."
    exit 1
fi


