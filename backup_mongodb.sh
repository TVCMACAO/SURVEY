#!/bin/bash

MONGO_CONTAINER="survey-mongo"
MONGO_USER="root"
MONGO_PASS="surveypass123"
MONGO_DB="survey_db"
BACKUP_DIR="/home/vps/Documentos/survey-app/backups"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/mongodb_backup_$DATE.tar.gz"

mkdir -p $BACKUP_DIR

echo "=========================================="
echo "Creando backup de MongoDB..."
echo "Fecha: $(date)"
echo "=========================================="

# Crear backup y comprimir directamente
echo "1. Creando directorio de backup en el contenedor..."
docker exec $MONGO_CONTAINER mkdir -p /data/backup

echo "2. Creando backup comprimido en el contenedor..."
docker exec $MONGO_CONTAINER mongodump \
  --username=$MONGO_USER \
  --password=$MONGO_PASS \
  --authenticationDatabase=admin \
  --db=$MONGO_DB \
  --archive=/data/backup/backup.archive \
  --gzip

if [ $? -ne 0 ]; then
    echo "ERROR: Falló la creación del backup"
    exit 1
fi

# Copiar archivo comprimido
echo "3. Copiando backup fuera del contenedor..."
docker cp $MONGO_CONTAINER:/data/backup/backup.archive $BACKUP_FILE

if [ $? -ne 0 ]; then
    echo "ERROR: Falló la copia del backup"
    exit 1
fi

# Limpiar archivo temporal dentro del contenedor
echo "4. Limpiando archivo temporal..."
docker exec $MONGO_CONTAINER rm -f /data/backup/backup.archive

# Permisos para descarga
chmod 644 $BACKUP_FILE

# Mostrar información del archivo
BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)

echo "=========================================="
echo "Backup completado exitosamente!"
echo "Archivo: $(basename $BACKUP_FILE)"
echo "Ubicación: $BACKUP_FILE"
echo "Tamaño: $BACKUP_SIZE"
echo "=========================================="
echo ""
echo "El archivo está listo para descargar por FileZilla desde:"
echo "$BACKUP_FILE"

