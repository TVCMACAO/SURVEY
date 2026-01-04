#!/bin/bash
# Script para hacer commit con incremento automático de versión
# Uso: ./git-commit.sh [major|minor|patch] "mensaje del commit"

set -e

REPO_ROOT=$(git rev-parse --show-toplevel 2>/dev/null || pwd)
cd "$REPO_ROOT"

# Determinar tipo de incremento y mensaje
BUMP_TYPE="patch"
COMMIT_MSG=""

if [ "$1" = "major" ] || [ "$1" = "minor" ] || [ "$1" = "patch" ]; then
    BUMP_TYPE="$1"
    shift
fi

# El resto de los argumentos son el mensaje del commit
COMMIT_MSG="$*"

if [ -z "$COMMIT_MSG" ]; then
    echo "❌ Error: Debes proporcionar un mensaje de commit"
    echo ""
    echo "Uso: $0 [major|minor|patch] \"mensaje del commit\""
    echo ""
    echo "Ejemplos:"
    echo "  $0 \"Agregar nueva funcionalidad\""
    echo "  $0 minor \"Cambios importantes en la API\""
    echo "  $0 major \"Refactorización completa\""
    exit 1
fi

# Incrementar versión
echo "🔄 Incrementando versión ($BUMP_TYPE)..."
"$REPO_ROOT/version_bump.sh" "$BUMP_TYPE"

# Leer nueva versión
NEW_VERSION=$(cat "$REPO_ROOT/VERSION" | tr -d ' \n\r')

# Agregar archivos de versión
git add VERSION survey_mobile/pubspec.yaml frontend/survey-ui/package.json 2>/dev/null || true

# Hacer commit con mensaje que incluye la versión
FULL_COMMIT_MSG="v$NEW_VERSION: $COMMIT_MSG"

echo ""
echo "📝 Creando commit..."
git commit -m "$FULL_COMMIT_MSG" "$@"

echo ""
echo "✅ Commit creado: v$NEW_VERSION"
echo "   Mensaje: $COMMIT_MSG"


