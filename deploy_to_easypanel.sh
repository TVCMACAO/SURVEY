#!/bin/bash

# Script de despliegue para EasyPanel
# Este script prepara la aplicación para ser desplegada en EasyPanel

set -e  # Exit on error

echo "=========================================="
echo "Preparando aplicación para EasyPanel"
echo "=========================================="

# Colores para output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Verificar que estamos en el directorio correcto
if [ ! -f "docker-compose-easypanel.yml" ]; then
    echo -e "${RED}ERROR: No se encontró docker-compose-easypanel.yml${NC}"
    echo "Asegúrate de ejecutar este script desde la raíz del proyecto"
    exit 1
fi

echo ""
echo "1. Verificando dependencias..."

# Verificar Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}ERROR: Node.js no está instalado${NC}"
    exit 1
fi
echo "   ✓ Node.js encontrado: $(node --version)"

# Verificar npm
if ! command -v npm &> /dev/null; then
    echo -e "${RED}ERROR: npm no está instalado${NC}"
    exit 1
fi
echo "   ✓ npm encontrado: $(npm --version)"

# Verificar Docker
if ! command -v docker &> /dev/null; then
    echo -e "${YELLOW}ADVERTENCIA: Docker no está instalado (necesario para build local)${NC}"
else
    echo "   ✓ Docker encontrado: $(docker --version)"
fi

echo ""
echo "2. Compilando frontend..."

cd frontend/survey-ui

# Instalar dependencias si no existen
if [ ! -d "node_modules" ]; then
    echo "   Instalando dependencias de npm..."
    npm ci
fi

# Compilar el frontend
echo "   Compilando aplicación React..."
npm run build

# Verificar que el build fue exitoso
if [ ! -d "dist" ] || [ -z "$(ls -A dist)" ]; then
    echo -e "${RED}ERROR: El build del frontend falló o el directorio dist está vacío${NC}"
    exit 1
fi

echo "   ✓ Frontend compilado exitosamente"
echo "   ✓ Archivos en: frontend/survey-ui/dist"

cd ../..

echo ""
echo "3. Verificando archivos necesarios..."

# Verificar archivos necesarios
REQUIRED_FILES=(
    "docker-compose-easypanel.yml"
    "backend/Dockerfile"
    "nginx/nginx.conf"
    "frontend/survey-ui/dist/index.html"
)

for file in "${REQUIRED_FILES[@]}"; do
    if [ ! -f "$file" ] && [ ! -d "$file" ]; then
        echo -e "${RED}ERROR: Archivo/directorio requerido no encontrado: $file${NC}"
        exit 1
    fi
    echo "   ✓ $file"
done

echo ""
echo "4. Verificando variables de entorno..."

# Verificar si existe .env
if [ ! -f ".env" ]; then
    echo -e "${YELLOW}ADVERTENCIA: No se encontró archivo .env${NC}"
    echo "   Creando .env desde env.example..."
    
    if [ -f "env.example" ]; then
        cp env.example .env
        echo -e "${YELLOW}   IMPORTANTE: Edita el archivo .env con tus valores de producción${NC}"
    else
        echo -e "${RED}ERROR: No se encontró env.example${NC}"
        echo "   Por favor, crea un archivo .env manualmente con las siguientes variables:"
        echo "   - SECRET_KEY"
        echo "   - DEBUG=0"
        echo "   - ALLOWED_HOSTS"
        echo "   - MONGO_URI"
        echo "   - MONGO_DB_NAME"
        exit 1
    fi
else
    echo "   ✓ Archivo .env encontrado"
    echo -e "${YELLOW}   Verifica que las variables estén configuradas correctamente${NC}"
fi

echo ""
echo "5. Preparando instrucciones de despliegue..."

# Crear archivo con instrucciones
cat > DEPLOY_INSTRUCTIONS.txt << 'INSTRUCTIONS'
==========================================
INSTRUCCIONES PARA DESPLEGAR EN EASYPANEL
==========================================

1. SUBIR ARCHIVOS A EASYPANEL
   ----------------------------
   Sube los siguientes archivos/directorios a tu servidor EasyPanel:
   
   - docker-compose-easypanel.yml
   - backend/ (directorio completo)
   - nginx/ (directorio completo)
   - frontend/survey-ui/dist/ (directorio completo con archivos compilados)
   - .env (archivo con tus variables de entorno)

2. CONFIGURAR VARIABLES DE ENTORNO
   --------------------------------
   En EasyPanel, configura las siguientes variables de entorno:
   
   SECRET_KEY=tu-clave-secreta-generada
   DEBUG=0
   ALLOWED_HOSTS=easypanel.clinicamaicao.com,www.clinicamaicao.com
   MONGO_URI=mongodb://root:password@easypanel.clinicamaicao.com:27017/?authSource=admin&tls=false
   MONGO_DB_NAME=survey_db

3. DESPLEGAR CON DOCKER COMPOSE
   ------------------------------
   En EasyPanel, ejecuta:
   
   docker-compose -f docker-compose-easypanel.yml up -d

4. VERIFICAR DESPLIEGUE
   ---------------------
   - Verifica que los contenedores estén corriendo: docker ps
   - Verifica los logs: docker-compose -f docker-compose-easypanel.yml logs
   - Accede a la aplicación en: http://tu-dominio

5. TROUBLESHOOTING
   ----------------
   - Si hay errores, revisa los logs: docker-compose -f docker-compose-easypanel.yml logs django
   - Verifica que MongoDB esté accesible desde el contenedor
   - Verifica que el puerto 80 esté abierto en EasyPanel
   - Revisa DEPLOY_EASYPANEL.md para más detalles

==========================================
INSTRUCTIONS

echo "   ✓ Instrucciones guardadas en DEPLOY_INSTRUCTIONS.txt"

echo ""
echo "=========================================="
echo -e "${GREEN}✓ Preparación completada exitosamente${NC}"
echo "=========================================="
echo ""
echo "Próximos pasos:"
echo "1. Revisa y edita el archivo .env con tus valores de producción"
echo "2. Lee DEPLOY_INSTRUCTIONS.txt para instrucciones detalladas"
echo "3. Sube los archivos a EasyPanel"
echo "4. Despliega usando docker-compose"
echo ""
echo "Para más información, consulta DEPLOY_EASYPANEL.md"


