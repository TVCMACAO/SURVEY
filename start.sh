#!/bin/bash
set -e

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
python -c "import django; print(f'Django version: {django.get_version()}')" || {
    echo "ERROR: Django no está instalado"
    exit 1
}

python -c "import gunicorn; print('Gunicorn instalado')" || {
    echo "ERROR: Gunicorn no está instalado"
    exit 1
}

# Verificar configuración de Django
echo "=== Verificando configuración de Django ==="
python manage.py check --deploy || {
    echo "WARNING: Django check encontró problemas, pero continuando..."
}

# Collect static files (continuar aunque falle)
echo "=== Recopilando archivos estáticos ==="
python manage.py collectstatic --noinput || {
    echo "WARNING: collectstatic falló, pero continuando..."
}

# Verificar que el directorio staticfiles existe
if [ ! -d "staticfiles" ]; then
    echo "WARNING: Directorio staticfiles no existe, creándolo..."
    mkdir -p staticfiles
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
" || echo "WARNING: No se pudo verificar MongoDB"

# Iniciar Gunicorn
echo "=== Iniciando Gunicorn ==="
echo "Comando: gunicorn survey_project.wsgi:application --bind 0.0.0.0:8000"
exec gunicorn survey_project.wsgi:application --bind 0.0.0.0:8000 --access-logfile - --error-logfile - --log-level info

