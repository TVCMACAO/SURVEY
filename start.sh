#!/bin/bash
# #region agent log
LOG_FILE="/var/log/startup.log"
mkdir -p /var/log
touch "$LOG_FILE"
chmod 644 "$LOG_FILE"
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG_FILE"
    # Write to debug log in NDJSON format
    echo "{\"timestamp\":$(date +%s000),\"location\":\"start.sh\",\"message\":\"$*\",\"data\":{},\"sessionId\":\"debug-session\",\"runId\":\"startup\",\"hypothesisId\":\"A\"}" >> /home/vps/Documentos/survey-app/.cursor/debug.log 2>/dev/null || true
}
# #endregion

log "=========================================="
log "Iniciando Survey App"
log "=========================================="

# Verificar variables de entorno
log "Verificando variables de entorno..."
if [ -z "$SECRET_KEY" ]; then
    log "ERROR: SECRET_KEY no está definida"
    exit 1
fi
log "SECRET_KEY: ${SECRET_KEY:0:20}..."
log "DEBUG: ${DEBUG:-0}"
log "ALLOWED_HOSTS: ${ALLOWED_HOSTS:-localhost}"
log "MONGO_URI: ${MONGO_URI:0:50}..."
log "MONGO_DB_NAME: ${MONGO_DB_NAME:-survey_db}"

# #region agent log
log "HYPOTHESIS A: Verificando variables de entorno - SECRET_KEY=${SECRET_KEY:+SET}, MONGO_URI=${MONGO_URI:+SET}"
# #endregion

# Exportar variables de entorno para que Django las use
export SECRET_KEY
export DEBUG=${DEBUG:-0}
export ALLOWED_HOSTS=${ALLOWED_HOSTS:-localhost}
export MONGO_URI=${MONGO_URI}
export MONGO_DB_NAME=${MONGO_DB_NAME:-survey_db}

# Crear directorio de staticfiles si no existe
log "Creando directorio de staticfiles..."
mkdir -p /app/staticfiles
chmod 755 /app/staticfiles

# Recolectar archivos estáticos
log "Recolectando archivos estáticos..."
cd /app
# #region agent log
log "HYPOTHESIS B: Ejecutando collectstatic..."
# #endregion
if ! python manage.py collectstatic --noinput 2>&1 | tee -a "$LOG_FILE"; then
    log "Advertencia: collectstatic falló, continuando..."
fi

# Verificar que Python y Django están disponibles
log "Verificando instalación de Django..."
# #region agent log
log "HYPOTHESIS C: Verificando que Django está instalado..."
# #endregion
if ! python -c "import django; print(django.get_version())" 2>&1 | tee -a "$LOG_FILE"; then
    log "ERROR: Django no está instalado o no es accesible"
    exit 1
fi

# Verificar conexión a MongoDB antes de iniciar Django
log "Verificando conexión a MongoDB..."
# #region agent log
log "HYPOTHESIS D: Verificando conexión a MongoDB..."
# #endregion
if ! python -c "
import pymongo
import os
try:
    client = pymongo.MongoClient(os.environ.get('MONGO_URI', ''), serverSelectionTimeoutMS=5000)
    client.admin.command('ismaster')
    print('MongoDB connection successful')
except Exception as e:
    print(f'MongoDB connection failed: {e}')
    exit(1)
" 2>&1 | tee -a "$LOG_FILE"; then
    log "ERROR: No se pudo conectar a MongoDB"
    exit 1
fi

# Iniciar Django en background
log "Iniciando Django/Gunicorn..."
# #region agent log
log "HYPOTHESIS E: Iniciando Gunicorn en 127.0.0.1:8000..."
# #endregion
gunicorn survey_project.wsgi:application \
    --bind 127.0.0.1:8000 \
    --workers 2 \
    --timeout 120 \
    --access-logfile - \
    --error-logfile - \
    --log-level info \
    --capture-output \
    2>&1 | tee -a "$LOG_FILE" &
DJANGO_PID=$!
log "Gunicorn iniciado con PID: $DJANGO_PID"

# Esperar un momento para que Gunicorn inicie
sleep 2

# Verificar que el proceso está corriendo
if ! kill -0 $DJANGO_PID 2>/dev/null; then
    log "ERROR: Gunicorn no se inició correctamente (PID $DJANGO_PID no existe)"
    log "Últimas líneas del log:"
    tail -20 "$LOG_FILE"
    exit 1
fi
log "Gunicorn está corriendo (PID: $DJANGO_PID)"

# Verificar que el puerto está escuchando
log "Verificando que el puerto 8000 está escuchando..."
# #region agent log
log "HYPOTHESIS F: Verificando que 127.0.0.1:8000 está escuchando..."
# #endregion
for i in {1..30}; do
    if netstat -tuln 2>/dev/null | grep -q ":8000 " || ss -tuln 2>/dev/null | grep -q ":8000 "; then
        log "✓ Puerto 8000 está escuchando"
        break
    fi
    if [ $i -eq 30 ]; then
        log "ERROR: Puerto 8000 no está escuchando después de 30 intentos"
        log "Estado del proceso:"
        ps aux | grep gunicorn | grep -v grep || log "Gunicorn no está corriendo"
        log "Puertos en uso:"
        netstat -tuln 2>/dev/null || ss -tuln 2>/dev/null || log "No se pudo verificar puertos"
        exit 1
    fi
    sleep 1
done

# Esperar a que Django esté listo
log "Esperando a que Django responda..."
# #region agent log
log "HYPOTHESIS G: Probando endpoint /api/surveys/..."
# #endregion
for i in {1..60}; do
    if curl -f -s http://127.0.0.1:8000/api/surveys/ > /dev/null 2>&1; then
        log "✓ Django está listo y respondiendo!"
        break
    fi
    if [ $i -eq 60 ]; then
        log "ERROR: Django no respondió después de 60 intentos"
        log "Estado del proceso Gunicorn:"
        ps aux | grep gunicorn | grep -v grep || log "Gunicorn no está corriendo"
        log "Últimas líneas del log:"
        tail -30 "$LOG_FILE"
        log "Probando conexión directa:"
        curl -v http://127.0.0.1:8000/api/surveys/ 2>&1 | head -20 | tee -a "$LOG_FILE"
        exit 1
    fi
    if [ $((i % 5)) -eq 0 ]; then
        log "Intento $i/60: Django aún no está listo, esperando..."
    fi
    sleep 1
done

# Verificar que Django sigue corriendo
if ! kill -0 $DJANGO_PID 2>/dev/null; then
    log "ERROR: Django/Gunicorn se detuvo inesperadamente"
    log "Últimas líneas del log:"
    tail -30 "$LOG_FILE"
    exit 1
fi

# Verificar configuración de Nginx
log "Verificando configuración de Nginx..."
if ! nginx -t 2>&1 | tee -a "$LOG_FILE"; then
    log "ERROR: Configuración de Nginx inválida"
    exit 1
fi

# Iniciar Nginx en foreground
log "Iniciando Nginx..."
# #region agent log
log "HYPOTHESIS H: Iniciando Nginx en foreground..."
# #endregion
log "✓ Todos los servicios están listos. Nginx iniciando..."
exec nginx -g 'daemon off;'

