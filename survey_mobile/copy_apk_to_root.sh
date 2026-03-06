#!/bin/bash
# Copia el APK de release a la raíz del proyecto con nombre versionado.
# Uso: desde survey_mobile/ ejecutar: ./copy_apk_to_root.sh
# O desde la raíz: survey_mobile/copy_apk_to_root.sh

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
APK_SRC="$SCRIPT_DIR/build/app/outputs/flutter-apk/app-release.apk"

if [ ! -f "$APK_SRC" ]; then
  echo "No se encontró el APK. Ejecuta antes: flutter build apk"
  exit 1
fi

VERSION="1.0.0"
if [ -f "$SCRIPT_DIR/pubspec.yaml" ]; then
  VERSION=$(grep -E "^version:" "$SCRIPT_DIR/pubspec.yaml" | sed 's/version: *//;s/+.*//;s/ .*//' | tr -d ' ')
fi

DEST="$ROOT_DIR/survey-app-v${VERSION}-release.apk"
cp "$APK_SRC" "$DEST"
echo "APK copiado a: $DEST"
ls -la "$DEST"
