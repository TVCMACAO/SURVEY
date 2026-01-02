#!/bin/bash
set -e

echo "=========================================="
echo "Iniciando Survey App"
echo "=========================================="

# Verificar variables de entorno
echo "Verificando variables de entorno..."
if [ -z "$SECRET_KEY" ]; then
    echo "ERROR: SECRET_KEY no está definida"
    exit 1
fi
echo "SECRET_KEY: ${SECRET_KEY:0:20}..."
echo "DEBUG: ${DEBUG:-0}"
echo "ALLOWED_HOSTS: ${ALLOWED_HOSTS:-localhost}"
echo "MONGO_URI: ${MONGO_URI:0:50}..."
echo "MONGO_DB_NAME: ${MONGO_DB_NAME:-survey_db}"

# Exportar variables de entorno para que Django las use
export SECRET_KEY
export DEBUG=${DEBUG:-0}
export ALLOWED_HOSTS=${ALLOWED_HOSTS:-localhost}
export MONGO_URI=${MONGO_URI}
export MONGO_DB_NAME=${MONGO_DB_NAME:-survey_db}

# Crear directorio de staticfiles si no existe
mkdir -p /app/staticfiles
chmod 755 /app/staticfiles

# Recolectar archivos estáticos
echo "Recolectando archivos estáticos..."
cd /app
python manage.py collectstatic --noinput || echo "Advertencia: collectstatic falló, continuando..."

# Iniciar Django en background
echo "Iniciando Django/Gunicorn..."
gunicorn survey_project.wsgi:application \
    --bind 0.0.0.0:8000 \
    --workers 2 \
    --timeout 120 \
    --access-logfile - \
    --error-logfile - \
    --log-level info &
DJANGO_PID=$!

# Función para limpiar al salir
cleanup() {
    echo "Deteniendo servicios..."
    kill $DJANGO_PID 2>/dev/null || true
    exit 0
}
trap cleanup SIGTERM SIGINT

# Esperar a que Django esté listo
echo "Esperando a que Django esté listo..."
for i in {1..60}; do
    if curl -f -s http://localhost:8000/api/surveys/ > /dev/null 2>&1; then
        echo "✓ Django está listo y respondiendo!"
        break
    fi
    if [ $i -eq 60 ]; then
        echo "ERROR: Django no respondió después de 60 intentos"
        echo "Revisando logs de Gunicorn..."
        ps aux | grep gunicorn || echo "Gunicorn no está corriendo"
        exit 1
    fi
    if [ $((i % 5)) -eq 0 ]; then
        echo "Intento $i/60: Django aún no está listo, esperando..."
    fi
    sleep 1
done

# Verificar que Django sigue corriendo
if ! kill -0 $DJANGO_PID 2>/dev/null; then
    echo "ERROR: Django/Gunicorn se detuvo inesperadamente"
    exit 1
fi

# Iniciar Nginx en foreground
echo "Iniciando Nginx..."
exec nginx -g 'daemon off;'

