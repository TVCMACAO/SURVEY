#!/bin/bash
# Bump de versión (patch + versionCode), build release y publicación.
# Uso (desde survey_mobile/ o raíz del repo):
#   ./publish_apk.sh
#   survey_mobile/publish_apk.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PUBSPEC="$SCRIPT_DIR/pubspec.yaml"

if [ ! -f "$PUBSPEC" ]; then
  echo "No se encontró pubspec.yaml en $SCRIPT_DIR"
  exit 1
fi

RAW=$(grep -E "^version:" "$PUBSPEC" | head -1 | sed 's/version: *//;s/ .*//' | tr -d ' ' | tr -d '"' | tr -d "'")
VERSION_NAME="${RAW%%+*}"
VERSION_CODE="${RAW##*+}"
if [[ "$RAW" != *"+"* ]]; then
  VERSION_CODE="1"
fi

IFS='.' read -r MAJOR MINOR PATCH <<< "$VERSION_NAME"
MAJOR="${MAJOR:-0}"
MINOR="${MINOR:-0}"
PATCH="${PATCH:-0}"
PATCH=$((PATCH + 1))
VERSION_CODE=$((VERSION_CODE + 1))
NEW_VERSION="${MAJOR}.${MINOR}.${PATCH}+${VERSION_CODE}"

# Reemplazar solo la línea version: del pubspec
if grep -qE "^version:" "$PUBSPEC"; then
  sed -i -E "s/^version: .*/version: ${NEW_VERSION}/" "$PUBSPEC"
else
  echo "No hay línea version: en pubspec.yaml" >&2
  exit 1
fi

echo "Versión: ${RAW} → ${NEW_VERSION}"
echo "Compilando APK release…"
cd "$SCRIPT_DIR"
flutter build apk --release
"$SCRIPT_DIR/copy_apk_to_root.sh"
echo "Publicación completa: ${NEW_VERSION}"
