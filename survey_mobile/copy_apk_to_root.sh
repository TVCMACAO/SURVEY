#!/bin/bash
# Publica el APK de release en releases/apk/ (descarga web + updates) y copia versionada.
# Uso (desde survey_mobile/):
#   flutter build apk --release && ./copy_apk_to_root.sh
# Preferible: ./publish_apk.sh (bump + build + copy)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
APK_SRC="$SCRIPT_DIR/build/app/outputs/flutter-apk/app-release.apk"
RELEASES_DIR="$ROOT_DIR/releases/apk"
LATEST_APK="$RELEASES_DIR/survey-app-latest.apk"
VERSION_JSON="$RELEASES_DIR/version.json"

if [ ! -f "$APK_SRC" ]; then
  echo "No se encontró el APK. Ejecuta antes: flutter build apk --release"
  echo "O usa: ./publish_apk.sh"
  exit 1
fi

VERSION_NAME="1.0.0"
VERSION_CODE="1"
if [ -f "$SCRIPT_DIR/pubspec.yaml" ]; then
  RAW=$(grep -E "^version:" "$SCRIPT_DIR/pubspec.yaml" | head -1 | sed 's/version: *//;s/ .*//' | tr -d ' ' | tr -d '"' | tr -d "'")
  VERSION_NAME="${RAW%%+*}"
  if [[ "$RAW" == *"+"* ]]; then
    VERSION_CODE="${RAW##*+}"
  fi
fi

APK_FILENAME="survey-app-v${VERSION_NAME}-${VERSION_CODE}.apk"

mkdir -p "$RELEASES_DIR"
cp "$APK_SRC" "$LATEST_APK"
cp "$APK_SRC" "$RELEASES_DIR/$APK_FILENAME"

# version.json para web y chequeo de updates en la app
PLAY_URL=""
if [ -f "$VERSION_JSON" ]; then
  PLAY_URL=$(python3 -c "import json,sys; print(json.load(open(sys.argv[1])).get('play_store_url','') or '')" "$VERSION_JSON" 2>/dev/null || true)
fi
MIN_SUPPORTED=$(( VERSION_CODE > 10 ? VERSION_CODE - 10 : 1 ))

cat > "$VERSION_JSON" <<EOF
{
  "version": "${VERSION_NAME}",
  "versionCode": ${VERSION_CODE},
  "filename": "${APK_FILENAME}",
  "download_url": "/api/public/apk/download/",
  "min_supported_version_code": ${MIN_SUPPORTED},
  "release_notes": "Survey App Android ${VERSION_NAME} (${VERSION_CODE})",
  "play_store_url": "${PLAY_URL}"
}
EOF

# Copia para API Django (EasyPanel sirve /api por gunicorn)
BACKEND_APK_DIR="$ROOT_DIR/backend/apk_releases"
mkdir -p "$BACKEND_APK_DIR"
cp "$LATEST_APK" "$BACKEND_APK_DIR/survey-app-latest.apk"
cp "$VERSION_JSON" "$BACKEND_APK_DIR/version.json"
cp "$APK_SRC" "$BACKEND_APK_DIR/$APK_FILENAME"

# Copia también a la raíz pública del frontend (si existe dist en build local)
HTML_DIR="$ROOT_DIR/frontend/survey-ui/dist"
if [ -d "$HTML_DIR" ]; then
  cp "$LATEST_APK" "$HTML_DIR/survey-app-latest.apk"
  cp "$VERSION_JSON" "$HTML_DIR/apk-version.json"
  cp "$APK_SRC" "$HTML_DIR/$APK_FILENAME"
fi

DEST="$ROOT_DIR/$APK_FILENAME"
cp "$APK_SRC" "$DEST"

echo "APK publicado:"
echo "  $LATEST_APK"
echo "  $RELEASES_DIR/$APK_FILENAME"
echo "  $VERSION_JSON"
echo "  $DEST"
ls -lh "$LATEST_APK" "$DEST"
echo "Reinicia/recarga nginx si hace falta para servir /releases/apk/"
