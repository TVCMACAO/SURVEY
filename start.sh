#!/bin/bash
# #region agent log
LOG_FILE="/var/log/startup.log"
mkdir -p /var/log
touch "$LOG_FILE"
chmod 644 "$LOG_FILE"
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG_FILE"
    # Write to debug log in NDJSON format (only if file exists, optional)
    DEBUG_LOG="/app/debug.log"
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

# Crear directorio para datos persistentes (SQLite) si no existe
log "Creando directorio para datos persistentes..."
# #region agent log
DEBUG_LOG="/app/debug.log"
if [ -f "$DEBUG_LOG" ] || [ -d "$(dirname "$DEBUG_LOG")" ]; then
    echo "{\"timestamp\":$(date +%s000),\"location\":\"start.sh:49\",\"message\":\"Checking /app/data before creation\",\"data\":{\"/app/data exists\":$([ -d /app/data ] && echo true || echo false),\"hypothesisId\":\"C\"},\"sessionId\":\"debug-session\",\"runId\":\"run1\"}" >> "$DEBUG_LOG" 2>/dev/null || true
fi
# #endregion
mkdir -p /app/data
chmod 755 /app/data
# #region agent log
if [ -f "$DEBUG_LOG" ] || [ -d "$(dirname "$DEBUG_LOG")" ]; then
    echo "{\"timestamp\":$(date +%s000),\"location\":\"start.sh:54\",\"message\":\"Directory /app/data created/verified\",\"data\":{\"/app/data exists\":$([ -d /app/data ] && echo true || echo false),\"permissions\":\"$(stat -c '%a' /app/data 2>/dev/null || echo 'unknown')\",\"hypothesisId\":\"C\"},\"sessionId\":\"debug-session\",\"runId\":\"run1\"}" >> "$DEBUG_LOG" 2>/dev/null || true
fi
# #endregion

# Ejecutar migraciones de Django
log "Ejecutando migraciones de Django..."
cd /app
# #region agent log
log "HYPOTHESIS D: Ejecutando migraciones de Django..."
if [ -f "$DEBUG_LOG" ] || [ -d "$(dirname "$DEBUG_LOG")" ]; then
    DB_PATH=$(python3 -c "import os, django; os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'survey_project.settings'); django.setup(); from django.conf import settings; print(settings.DATABASES['default']['NAME'])" 2>/dev/null || echo "unknown")
    echo "{\"timestamp\":$(date +%s000),\"location\":\"start.sh:67\",\"message\":\"Before migrations - checking DB path\",\"data\":{\"db_path\":\"$DB_PATH\",\"db_exists\":$([ -f "$DB_PATH" ] && echo true || echo false),\"hypothesisId\":\"D\"},\"sessionId\":\"debug-session\",\"runId\":\"run1\"}" >> "$DEBUG_LOG" 2>/dev/null || true
fi
# #endregion
if ! python manage.py migrate --noinput 2>&1 | tee -a "$LOG_FILE"; then
    log "ERROR: Las migraciones fallaron"
    exit 1
fi
log "✅ Migraciones completadas exitosamente!"

# Asegurar que los usuarios por defecto existan
log "Verificando/creando usuarios por defecto..."
# #region agent log
if [ -f "$DEBUG_LOG" ] || [ -d "$(dirname "$DEBUG_LOG")" ]; then
    DB_PATH=$(python3 -c "import os, django; os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'survey_project.settings'); django.setup(); from django.conf import settings; print(settings.DATABASES['default']['NAME'])" 2>/dev/null || echo "unknown")
    USER_COUNT_BEFORE=$(python3 -c "import os, django; os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'survey_project.settings'); django.setup(); from surveys.models import User; print(User.objects.count())" 2>/dev/null || echo "unknown")
    echo "{\"timestamp\":$(date +%s000),\"location\":\"start.sh:75\",\"message\":\"Before ensuring users\",\"data\":{\"db_path\":\"$DB_PATH\",\"db_exists\":$([ -f "$DB_PATH" ] && echo true || echo false),\"user_count_before\":\"$USER_COUNT_BEFORE\",\"hypothesisId\":\"E\"},\"sessionId\":\"debug-session\",\"runId\":\"run1\"}" >> "$DEBUG_LOG" 2>/dev/null || true
fi
# #endregion
if python ensure_users.py 2>&1 | tee -a "$LOG_FILE"; then
    log "✅ Usuarios verificados/creados"
else
    log "⚠️  Advertencia: Error al verificar usuarios, continuando..."
fi
# #region agent log
if [ -f "$DEBUG_LOG" ] || [ -d "$(dirname "$DEBUG_LOG")" ]; then
    USER_COUNT_AFTER=$(python3 -c "import os, django; os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'survey_project.settings'); django.setup(); from surveys.models import User; print(User.objects.count())" 2>/dev/null || echo "unknown")
    echo "{\"timestamp\":$(date +%s000),\"location\":\"start.sh:82\",\"message\":\"After ensuring users\",\"data\":{\"user_count_after\":\"$USER_COUNT_AFTER\",\"hypothesisId\":\"E\"},\"sessionId\":\"debug-session\",\"runId\":\"run1\"}" >> "$DEBUG_LOG" 2>/dev/null || true
fi
# #endregion

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
