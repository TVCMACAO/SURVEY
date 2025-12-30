#!/bin/bash

# Script para empaquetar la aplicación para subida directa a EasyPanel
# Este script crea un archivo tar.gz con todos los archivos necesarios

set -e

echo "=========================================="
echo "Empaquetando aplicación para EasyPanel"
echo "=========================================="

# Colores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Verificar que estamos en el directorio correcto
if [ ! -f "docker-compose-easypanel.yml" ]; then
    echo -e "${RED}ERROR: No se encontró docker-compose-easypanel.yml${NC}"
    echo "Asegúrate de ejecutar este script desde la raíz del proyecto"
    exit 1
fi

# Nombre del paquete
DATE=$(date +%Y%m%d_%H%M%S)
PACKAGE_NAME="survey-app-easypanel-${DATE}.tar.gz"
TEMP_DIR="easypanel-package-temp"

echo ""
echo "1. Creando directorio temporal..."
rm -rf "$TEMP_DIR"
mkdir -p "$TEMP_DIR"

echo ""
echo "2. Copiando archivos esenciales..."

# Archivos de configuración
cp docker-compose-easypanel.yml "$TEMP_DIR/"
cp env.example "$TEMP_DIR/.env.example" 2>/dev/null || echo "  (env.example no encontrado, se puede crear manualmente)"

# Backend
echo "   Copiando backend..."
mkdir -p "$TEMP_DIR/backend"
cp -r backend/* "$TEMP_DIR/backend/" 2>/dev/null || true
# Excluir archivos no necesarios
rm -rf "$TEMP_DIR/backend/__pycache__" 2>/dev/null || true
rm -rf "$TEMP_DIR/backend/*/__pycache__" 2>/dev/null || true
rm -rf "$TEMP_DIR/backend/venv" 2>/dev/null || true
rm -rf "$TEMP_DIR/backend/.pytest_cache" 2>/dev/null || true
rm -rf "$TEMP_DIR/backend/*.pyc" 2>/dev/null || true
rm -rf "$TEMP_DIR/backend/db.sqlite3" 2>/dev/null || true

# Frontend (solo código fuente, se construirá en EasyPanel)
echo "   Copiando frontend (código fuente)..."
mkdir -p "$TEMP_DIR/frontend/survey-ui"
cp -r frontend/survey-ui/* "$TEMP_DIR/frontend/survey-ui/" 2>/dev/null || true
# Excluir node_modules y dist (se construirán en EasyPanel)
rm -rf "$TEMP_DIR/frontend/survey-ui/node_modules" 2>/dev/null || true
rm -rf "$TEMP_DIR/frontend/survey-ui/dist" 2>/dev/null || true
rm -rf "$TEMP_DIR/frontend/survey-ui/.vite" 2>/dev/null || true

# Nginx
echo "   Copiando nginx..."
mkdir -p "$TEMP_DIR/nginx"
cp -r nginx/* "$TEMP_DIR/nginx/" 2>/dev/null || true

# Documentación
echo "   Copiando documentación..."
cp README.md "$TEMP_DIR/" 2>/dev/null || true
cp EASYPANEL_DEPLOY.md "$TEMP_DIR/" 2>/dev/null || true
cp FEATURES_SECTIONS.md "$TEMP_DIR/" 2>/dev/null || true

# .gitignore
cp .gitignore "$TEMP_DIR/" 2>/dev/null || true

echo ""
echo "3. Verificando archivos esenciales..."

REQUIRED_FILES=(
    "docker-compose-easypanel.yml"
    "backend/Dockerfile"
    "backend/requirements.txt"
    "backend/manage.py"
    "frontend/survey-ui/package.json"
    "frontend/survey-ui/Dockerfile"
    "nginx/nginx.conf"
    "nginx/Dockerfile"
)

MISSING_FILES=()
for file in "${REQUIRED_FILES[@]}"; do
    if [ ! -f "$TEMP_DIR/$file" ]; then
        MISSING_FILES+=("$file")
    fi
done

if [ ${#MISSING_FILES[@]} -gt 0 ]; then
    echo -e "${RED}ERROR: Faltan archivos esenciales:${NC}"
    for file in "${MISSING_FILES[@]}"; do
        echo "  - $file"
    done
    rm -rf "$TEMP_DIR"
    exit 1
fi

echo "   ✓ Todos los archivos esenciales están presentes"

echo ""
echo "4. Creando archivo comprimido..."
cd "$TEMP_DIR"
tar -czf "../$PACKAGE_NAME" .
cd ..
rm -rf "$TEMP_DIR"

PACKAGE_SIZE=$(du -h "$PACKAGE_NAME" | cut -f1)

echo ""
echo "=========================================="
echo -e "${GREEN}✓ Paquete creado exitosamente${NC}"
echo "=========================================="
echo ""
echo "Archivo: $PACKAGE_NAME"
echo "Tamaño: $PACKAGE_SIZE"
echo ""
echo "Próximos pasos:"
echo "1. Sube el archivo $PACKAGE_NAME a EasyPanel"
echo "2. Extrae el contenido en el directorio del servicio"
echo "3. Configura las variables de entorno en EasyPanel"
echo "4. Inicia el servicio"
echo ""
echo "Para más detalles, consulta EASYPANEL_DEPLOY.md"

