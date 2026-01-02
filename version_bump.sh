#!/bin/bash
# Script para incrementar la versión antes de hacer commit
# Uso: ./version_bump.sh [major|minor|patch]
# Si no se especifica, incrementa patch por defecto

set -e

VERSION_FILE="VERSION"
MOBILE_PUBSPEC="survey_mobile/pubspec.yaml"
FRONTEND_PACKAGE="frontend/survey-ui/package.json"

# Leer versión actual
if [ -f "$VERSION_FILE" ]; then
    CURRENT_VERSION=$(cat "$VERSION_FILE" | tr -d ' \n\r')
else
    CURRENT_VERSION="1.0.0"
    echo "$CURRENT_VERSION" > "$VERSION_FILE"
fi

# Parsear versión (formato: MAJOR.MINOR.PATCH)
IFS='.' read -ra VERSION_PARTS <<< "$CURRENT_VERSION"
MAJOR=${VERSION_PARTS[0]:-1}
MINOR=${VERSION_PARTS[1]:-0}
PATCH=${VERSION_PARTS[2]:-0}

# Determinar qué parte incrementar
BUMP_TYPE=${1:-patch}

case $BUMP_TYPE in
    major)
        MAJOR=$((MAJOR + 1))
        MINOR=0
        PATCH=0
        ;;
    minor)
        MINOR=$((MINOR + 1))
        PATCH=0
        ;;
    patch)
        PATCH=$((PATCH + 1))
        ;;
    *)
        echo "❌ Tipo de incremento inválido: $BUMP_TYPE"
        echo "Uso: $0 [major|minor|patch]"
        exit 1
        ;;
esac

NEW_VERSION="$MAJOR.$MINOR.$PATCH"

echo "=========================================="
echo "Incrementando versión"
echo "=========================================="
echo "Versión actual: $CURRENT_VERSION"
echo "Nueva versión:  $NEW_VERSION"
echo "Tipo:           $BUMP_TYPE"
echo ""

# Actualizar archivo VERSION
echo "$NEW_VERSION" > "$VERSION_FILE"
echo "✅ Actualizado: $VERSION_FILE"

# Actualizar pubspec.yaml de Flutter (formato: version+buildNumber)
if [ -f "$MOBILE_PUBSPEC" ]; then
    # Obtener build number actual
    CURRENT_VERSION_LINE=$(grep "^version:" "$MOBILE_PUBSPEC" | head -1 | tr -d ' ')
    if echo "$CURRENT_VERSION_LINE" | grep -q '+'; then
        CURRENT_BUILD=$(echo "$CURRENT_VERSION_LINE" | sed 's/.*+//')
        # Incrementar build number
        CURRENT_BUILD=$((CURRENT_BUILD + 1))
    else
        # No hay build number, empezar en 1
        CURRENT_BUILD=1
    fi
    
    # Actualizar versión en pubspec.yaml usando Python para mayor robustez
    python3 -c "
import re
import sys
new_version = '$NEW_VERSION'
build_number = '$CURRENT_BUILD'
file_path = '$MOBILE_PUBSPEC'
with open(file_path, 'r') as f:
    content = f.read()
content = re.sub(r'^version:\s*[^\n]+', f'version: {new_version}+{build_number}', content, flags=re.MULTILINE)
with open(file_path, 'w') as f:
    f.write(content)
"
    echo "✅ Actualizado: $MOBILE_PUBSPEC (versión: $NEW_VERSION+$CURRENT_BUILD)"
fi

# Actualizar package.json del frontend (si existe)
if [ -f "$FRONTEND_PACKAGE" ]; then
    # Usar Python para actualizar JSON de forma segura
    python3 -c "
import json
import sys
new_version = '$NEW_VERSION'
file_path = '$FRONTEND_PACKAGE'
with open(file_path, 'r') as f:
    pkg = json.load(f)
pkg['version'] = new_version
with open(file_path, 'w') as f:
    json.dump(pkg, f, indent=2)
"
    echo "✅ Actualizado: $FRONTEND_PACKAGE"
fi

echo ""
echo "=========================================="
echo "✅ Versión actualizada a: $NEW_VERSION"
echo "=========================================="
echo ""
echo "Ahora puedes hacer commit con:"
echo "  git add $VERSION_FILE $MOBILE_PUBSPEC $FRONTEND_PACKAGE"
echo "  git commit -m \"v$NEW_VERSION: [tu mensaje de commit]\""

