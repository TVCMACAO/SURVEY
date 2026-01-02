#!/bin/bash
# #region agent log
LOG_FILE="/var/log/startup.log"
mkdir -p /var/log
touch "$LOG_FILE"
chmod 644 "$LOG_FILE"
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG_FILE"
    # Write to debug log in NDJSON format (only if file exists, optional)
    DEBUG_LOG="/home/vps/Documentos/survey-app/.cursor/debug.log"
    if [ -f "$DEBUG_LOG" ] || [ -d "$(dirname "$DEBUG_LOG")" ]; then
        echo "{\"timestamp\":$(date +%s000),\"location\":\"start.sh\",\"message\":\"$*\",\"data\":{},\"sessionId\":\"debug-session\",\"runId\":\"startup\",\"hypothesisId\":\"A\"}" >> "$DEBUG_LOG" 2>/dev/null || true
    fi
}
# #endregion

log "=========================================="
log "Iniciando Survey App (Django/Gunicorn)"
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

# Ejecutar migraciones de Django
log "Ejecutando migraciones de Django..."
cd /app
# #region agent log
log "HYPOTHESIS B: Ejecutando migraciones de Django..."
# #endregion
if ! python manage.py migrate --noinput 2>&1 | tee -a "$LOG_FILE"; then
    log "ERROR: Las migraciones fallaron"
    exit 1
fi
log "✅ Migraciones completadas exitosamente!"

# Recolectar archivos estáticos
log "Recolectando archivos estáticos..."
# #region agent log
log "HYPOTHESIS C: Ejecutando collectstatic..."
# #endregion
if ! python manage.py collectstatic --noinput 2>&1 | tee -a "$LOG_FILE"; then
    log "Advertencia: collectstatic falló, continuando..."
fi

# Verificar que Python y Django están disponibles
log "Verificando instalación de Django..."
# #region agent log
log "HYPOTHESIS D: Verificando que Django está instalado..."
# #endregion
if ! python -c "import django; print(django.get_version())" 2>&1 | tee -a "$LOG_FILE"; then
    log "ERROR: Django no está instalado o no es accesible"
    exit 1
fi

# Verificar que el frontend existe
log "Verificando que el frontend está disponible..."
FRONTEND_PATH="/app/frontend/survey-ui/dist/index.html"
if [ ! -f "$FRONTEND_PATH" ]; then
    log "ADVERTENCIA: Frontend no encontrado en $FRONTEND_PATH"
    log "Buscando en otras ubicaciones..."
    find /app -name "index.html" -type f 2>/dev/null | head -5 | tee -a "$LOG_FILE"
else
    log "✓ Frontend encontrado en $FRONTEND_PATH"
fi

# Verificar conexión a MongoDB antes de iniciar Django
log "Verificando conexión a MongoDB..."
# #region agent log
log "HYPOTHESIS E: Verificando conexión a MongoDB..."
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

# Iniciar Django/Gunicorn
log "Iniciando Django/Gunicorn en 0.0.0.0:8000..."
# #region agent log
log "HYPOTHESIS F: Iniciando Gunicorn en 0.0.0.0:8000 para EasyPanel..."
# #endregion
log "EasyPanel's Nginx se conectará a este puerto"
exec gunicorn survey_project.wsgi:application \
    --bind 0.0.0.0:8000 \
    --workers 4 \
    --timeout 120 \
    --access-logfile - \
    --error-logfile - \
    --log-level info \
    --capture-output
