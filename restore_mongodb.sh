#!/bin/bash

# Configuración
BACKUP_FILE="${1:-/tmp/backup/mongodb_backup_20251226_171505.tar.gz}"
MONGO_CONTAINER="survey-mongo"
MONGO_USER="${MONGO_USERNAME:-root}"
MONGO_PASS="${MONGO_PASSWORD:-surveypass123}"
MONGO_DB="${MONGO_DB_NAME:-survey_db}"

echo "=========================================="
echo "Restaurando backup de MongoDB..."
echo "Fecha: $(date)"
echo "=========================================="

# Verificar que el archivo existe
if [ ! -f "$BACKUP_FILE" ]; then
    echo "ERROR: Archivo de backup no encontrado: $BACKUP_FILE"
    echo ""
    echo "Uso: $0 [ruta_al_backup.tar.gz]"
    echo "Ejemplo: $0 /tmp/backup/mongodb_backup_20251226_171505.tar.gz"
    exit 1
fi

# Verificar que el contenedor está corriendo
if ! docker ps | grep -q $MONGO_CONTAINER; then
    echo "ERROR: Contenedor MongoDB no está corriendo"
    echo "Inicia el contenedor con: docker-compose -f docker-compose-mongo-only.yml up -d"
    exit 1
fi

# Esperar a que MongoDB esté listo
echo "1. Verificando que MongoDB está listo..."
sleep 3
docker exec $MONGO_CONTAINER mongosh \
  --username=$MONGO_USER \
  --password=$MONGO_PASS \
  --authenticationDatabase=admin \
  --eval "db.adminCommand('ping')" > /dev/null 2>&1

if [ $? -ne 0 ]; then
    echo "Esperando a que MongoDB esté completamente iniciado..."
    sleep 5
fi

# Crear directorio de backup en el contenedor
echo "2. Preparando directorio de backup..."
docker exec $MONGO_CONTAINER mkdir -p /data/backup

# Copiar archivo al contenedor
echo "3. Copiando backup al contenedor..."
docker cp "$BACKUP_FILE" $MONGO_CONTAINER:/data/backup/backup.archive

if [ $? -ne 0 ]; then
    echo "ERROR: Falló la copia del archivo al contenedor"
    exit 1
fi

# Restaurar
echo "4. Restaurando base de datos '$MONGO_DB'..."
echo "   (Esto puede tomar unos momentos...)"
docker exec $MONGO_CONTAINER mongorestore \
  --username=$MONGO_USER \
  --password=$MONGO_PASS \
  --authenticationDatabase=admin \
  --archive=/data/backup/backup.archive \
  --gzip \
  --drop

if [ $? -eq 0 ]; then
    echo "=========================================="
    echo "Restauración completada exitosamente!"
    echo "=========================================="
    
    # Verificar datos
    echo "5. Verificando datos restaurados..."
    docker exec $MONGO_CONTAINER mongosh \
      --username=$MONGO_USER \
      --password=$MONGO_PASS \
      --authenticationDatabase=admin \
      $MONGO_DB \
      --quiet \
      --eval "
        print('\\n=== Resumen de datos restaurados ===');
        print('Encuestas (surveys): ' + db.surveys.countDocuments());
        print('Respuestas (responses): ' + db.responses.countDocuments());
        print('Grupos (groups): ' + db.groups.countDocuments());
        print('\\n=== Colecciones disponibles ===');
        db.getCollectionNames().forEach(function(c) { print('  - ' + c); });
      "
    
    # Limpiar archivo temporal
    echo "6. Limpiando archivo temporal..."
    docker exec $MONGO_CONTAINER rm -f /data/backup/backup.archive
    
    echo "=========================================="
    echo "Proceso completado!"
    echo "=========================================="
else
    echo "ERROR: Falló la restauración"
    exit 1
fi



