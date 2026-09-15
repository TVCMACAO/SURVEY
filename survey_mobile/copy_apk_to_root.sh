#!/bin/bash
# Publica el APK de release en releases/apk/ (descarga web + updates) y copia versionada a la raíz.
# Uso (desde survey_mobile/):
#   flutter build apk --release && ./copy_apk_to_root.sh
# O desde la raíz:
#   survey_mobile/copy_apk_to_root.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
APK_SRC="$SCRIPT_DIR/build/app/outputs/flutter-apk/app-release.apk"
RELEASES_DIR="$ROOT_DIR/releases/apk"
LATEST_APK="$RELEASES_DIR/survey-app-latest.apk"
VERSION_JSON="$RELEASES_DIR/version.json"

if [ ! -f "$APK_SRC" ]; then
  echo "No se encontró el APK. Ejecuta antes: flutter build apk --release"
  exit 1
fi

VERSION_NAME="1.0.0"
VERSION_CODE="1"
if [ -f "$SCRIPT_DIR/pubspec.yaml" ]; then
  RAW=$(grep -E "^version:" "$SCRIPT_DIR/pubspec.yaml" | head -1 | sed 's/version: *//;s/ .*//' | tr -d ' ')
  VERSION_NAME="${RAW%%+*}"
  if [[ "$RAW" == *"+"* ]]; then
    VERSION_CODE="${RAW##*+}"
  fi
fi

mkdir -p "$RELEASES_DIR"
cp "$APK_SRC" "$LATEST_APK"

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
  "download_url": "/survey-app-latest.apk",
  "min_supported_version_code": ${MIN_SUPPORTED},
  "release_notes": "Survey App Android ${VERSION_NAME} (${VERSION_CODE})",
  "play_store_url": "${PLAY_URL}"
}
EOF

# Copia también a la raíz pública del frontend (si existe dist en build local)
HTML_DIR="$ROOT_DIR/frontend/survey-ui/dist"
if [ -d "$HTML_DIR" ]; then
  cp "$LATEST_APK" "$HTML_DIR/survey-app-latest.apk"
  cp "$VERSION_JSON" "$HTML_DIR/apk-version.json"
fi

DEST="$ROOT_DIR/survey-app-v${VERSION_NAME}-release.apk"
cp "$APK_SRC" "$DEST"

echo "APK publicado:"
echo "  $LATEST_APK"
echo "  $VERSION_JSON"
echo "  $DEST"
ls -lh "$LATEST_APK" "$DEST"
echo "Reinicia/recarga nginx si hace falta para servir /releases/apk/"
