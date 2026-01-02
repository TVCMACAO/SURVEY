#!/bin/bash

# Configuración
LOCAL_MONGO_CONTAINER="survey-mongo"
LOCAL_MONGO_USER="root"
LOCAL_MONGO_PASS="surveypass123"
REMOTE_MONGO="mongodb://root:1b20629a87ea780a63aa@easypanel.clinicamaicao.com:27017/?tls=false"
DB_NAME="survey_db"
TEMP_DIR="/tmp/mongo_migration_$$"

echo "=========================================="
echo "Migrando base de datos a EasyPanel MongoDB"
echo "Fecha: $(date)"
echo "=========================================="
echo ""
echo "Origen: MongoDB local (contenedor: $LOCAL_MONGO_CONTAINER)"
echo "Destino: easypanel.clinicamaicao.com:27017"
echo "Base de datos: $DB_NAME"
echo ""

# Verificar que el contenedor local está corriendo
echo "1. Verificando contenedor MongoDB local..."
if ! docker ps | grep -q $LOCAL_MONGO_CONTAINER; then
    echo "ERROR: Contenedor '$LOCAL_MONGO_CONTAINER' no está corriendo"
    exit 1
fi
echo "   ✓ Contenedor local está corriendo"

# Crear directorio temporal
mkdir -p $TEMP_DIR

# Hacer dump desde el contenedor local
echo "2. Haciendo dump desde servidor local..."
docker exec $LOCAL_MONGO_CONTAINER mongodump \
  --username=$LOCAL_MONGO_USER \
  --password=$LOCAL_MONGO_PASS \
  --authenticationDatabase=admin \
  --db=$DB_NAME \
  --out=/data/backup/dump_$$

if [ $? -ne 0 ]; then
    echo "ERROR: Falló el dump desde el servidor local"
    rm -rf $TEMP_DIR
    exit 1
fi
echo "   ✓ Dump completado"

# Copiar dump fuera del contenedor
echo "3. Copiando dump fuera del contenedor..."
docker cp $LOCAL_MONGO_CONTAINER:/data/backup/dump_$$ $TEMP_DIR/

if [ $? -ne 0 ]; then
    echo "ERROR: Falló la copia del dump"
    docker exec $LOCAL_MONGO_CONTAINER rm -rf /data/backup/dump_$$
    rm -rf $TEMP_DIR
    exit 1
fi

# Verificar conexión remota usando el contenedor
echo "4. Verificando conexión a MongoDB remoto (EasyPanel)..."
docker exec $LOCAL_MONGO_CONTAINER mongosh \
  "$REMOTE_MONGO" \
  --eval "db.adminCommand('ping')" > /dev/null 2>&1

if [ $? -ne 0 ]; then
    echo "ADVERTENCIA: No se pudo verificar la conexión remota desde el contenedor"
    echo "Intentando restaurar de todas formas..."
else
    echo "   ✓ Conexión remota verificada"
fi

# Restaurar en el servidor remoto usando el contenedor
echo "5. Restaurando en servidor remoto (EasyPanel)..."
echo "   (Esto puede tomar unos momentos...)"

docker exec $LOCAL_MONGO_CONTAINER mongorestore \
  --uri="$REMOTE_MONGO" \
  --db=$DB_NAME \
  --dir=/data/backup/dump_$$/$DB_NAME \
  --drop

if [ $? -eq 0 ]; then
    echo "=========================================="
    echo "Migración completada exitosamente!"
    echo "=========================================="
    
    # Verificar datos en el servidor remoto
    echo "6. Verificando datos migrados en EasyPanel..."
    docker exec $LOCAL_MONGO_CONTAINER mongosh \
      "$REMOTE_MONGO/$DB_NAME" \
      --quiet \
      --eval "
        print('\\n=== Resumen de datos migrados ===');
        print('Encuestas (surveys): ' + db.surveys.countDocuments());
        print('Respuestas (responses): ' + db.responses.countDocuments());
        print('Grupos (groups): ' + db.groups.countDocuments());
        print('\\n=== Colecciones disponibles ===');
        db.getCollectionNames().forEach(function(c) { print('  - ' + c); });
      "
    
    echo "=========================================="
    echo "Proceso completado!"
    echo "=========================================="
    echo ""
    echo "Connection string para usar en la aplicación:"
    echo "$REMOTE_MONGO"
    echo ""
    echo "Base de datos: $DB_NAME"
else
    echo "ERROR: Falló la restauración en el servidor remoto"
    echo ""
    echo "Posibles causas:"
    echo "  - El servidor remoto no es accesible desde este contenedor"
    echo "  - Las credenciales son incorrectas"
    echo "  - El firewall está bloqueando la conexión"
fi

# Limpiar
echo "7. Limpiando archivos temporales..."
docker exec $LOCAL_MONGO_CONTAINER rm -rf /data/backup/dump_$$
rm -rf $TEMP_DIR

echo "Limpieza completada"
