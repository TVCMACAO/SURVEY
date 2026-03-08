#!/bin/bash

echo "=== Iniciando aplicación Survey App ==="
echo "Fecha: $(date)"
echo "Directorio de trabajo: $(pwd)"
echo "Usuario: $(whoami)"

# Verificar que manage.py existe
if [ ! -f "manage.py" ]; then
    echo "ERROR: manage.py no encontrado en $(pwd)"
    ls -la
    exit 1
fi

# Verificar que las dependencias están instaladas
echo "=== Verificando dependencias ==="
if ! python -c "import django; print(f'Django version: {django.get_version()}')" 2>/dev/null; then
    echo "ERROR: Django no está instalado"
    exit 1
fi

if ! python -c "import gunicorn; print('Gunicorn instalado')" 2>/dev/null; then
    echo "ERROR: Gunicorn no está instalado"
    exit 1
fi

# Verificar configuración de Django (no bloquear si falla)
echo "=== Verificando configuración de Django ==="
python manage.py check --deploy 2>&1 || {
    echo "WARNING: Django check encontró problemas, pero continuando..."
}

# Collect static files (continuar aunque falle)
echo "=== Recopilando archivos estáticos ==="
if ! python manage.py collectstatic --noinput 2>&1; then
    echo "WARNING: collectstatic falló, pero continuando..."
fi

# Verificar que el directorio staticfiles existe
if [ ! -d "staticfiles" ]; then
    echo "WARNING: Directorio staticfiles no existe, creándolo..."
    mkdir -p staticfiles || true
fi

# Verificar conexión a MongoDB (opcional, no bloquear inicio)
echo "=== Verificando conexión a MongoDB ==="
python -c "
import os
import sys
sys.path.insert(0, '/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'survey_project.settings')
import django
django.setup()
from surveys.mongo_utils import get_mongo_db
try:
    db = get_mongo_db()
    db.command('ping')
    print('MongoDB: Conexión exitosa')
except Exception as e:
    print(f'WARNING: No se pudo conectar a MongoDB: {e}')
    print('La aplicación iniciará pero puede tener problemas de conexión')
" 2>&1 || echo "WARNING: No se pudo verificar MongoDB (continuando...)"

# Inicializar MongoDB (crear índices y usuario root)
echo "=== Inicializando MongoDB ==="
python /app/init_mongodb.py 2>&1 || echo "WARNING: No se pudo inicializar MongoDB completamente (continuando...)"

# Iniciar Gunicorn (usar set -e solo para Gunicorn)
echo "=== Iniciando Gunicorn ==="
echo "Comando: gunicorn survey_project.wsgi:application --bind 0.0.0.0:8000 --timeout 120 --workers 2"
set -e
exec gunicorn survey_project.wsgi:application --bind 0.0.0.0:8000 --timeout 120 --workers 2 --access-logfile - --error-logfile - --log-level info

