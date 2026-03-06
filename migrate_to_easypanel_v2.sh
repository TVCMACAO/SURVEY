#!/bin/bash

# Configuración
LOCAL_MONGO_CONTAINER="survey-mongo"
LOCAL_MONGO_USER="root"
LOCAL_MONGO_PASS="surveypass123"
REMOTE_MONGO_HOST="easypanel.clinicamaicao.com"
REMOTE_MONGO_PORT="27017"
REMOTE_MONGO_USER="root"
REMOTE_MONGO_PASS="1b20629a87ea780a63aa"
DB_NAME="survey_db"
TEMP_DIR="/tmp/mongo_migration_$$"

echo "=========================================="
echo "Migrando base de datos a EasyPanel MongoDB"
echo "Fecha: $(date)"
echo "Incluye: surveys, responses, groups, attachments, attachments_fs (GridFS)"
echo "=========================================="
echo ""
echo "Origen: MongoDB local (contenedor: $LOCAL_MONGO_CONTAINER)"
echo "Destino: $REMOTE_MONGO_HOST:$REMOTE_MONGO_PORT"
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

# Intentar diferentes métodos de conexión
echo "4. Verificando conexión a MongoDB remoto (EasyPanel)..."

# Método 1: Con authenticationDatabase=admin
echo "   Intentando conexión con authenticationDatabase=admin..."
docker exec $LOCAL_MONGO_CONTAINER mongosh \
  --host=$REMOTE_MONGO_HOST \
  --port=$REMOTE_MONGO_PORT \
  --username=$REMOTE_MONGO_USER \
  --password=$REMOTE_MONGO_PASS \
  --authenticationDatabase=admin \
  --eval "db.adminCommand('ping')" > /dev/null 2>&1

if [ $? -eq 0 ]; then
    echo "   ✓ Conexión exitosa con authenticationDatabase=admin"
    AUTH_DB="admin"
else
    # Método 2: Sin authenticationDatabase (usa la BD por defecto)
    echo "   Intentando conexión sin authenticationDatabase..."
    docker exec $LOCAL_MONGO_CONTAINER mongosh \
      --host=$REMOTE_MONGO_HOST \
      --port=$REMOTE_MONGO_PORT \
      --username=$REMOTE_MONGO_USER \
      --password=$REMOTE_MONGO_PASS \
      --eval "db.adminCommand('ping')" > /dev/null 2>&1
    
    if [ $? -eq 0 ]; then
        echo "   ✓ Conexión exitosa sin authenticationDatabase"
        AUTH_DB=""
    else
        echo "ERROR: No se pudo conectar al servidor remoto"
        echo ""
        echo "Verifica:"
        echo "  - Que el servidor esté accesible desde este contenedor"
        echo "  - Que las credenciales sean correctas"
        echo "  - Que el puerto 27017 esté abierto"
        docker exec $LOCAL_MONGO_CONTAINER rm -rf /data/backup/dump_$$
        rm -rf $TEMP_DIR
        exit 1
    fi
fi

# Restaurar en el servidor remoto
echo "5. Restaurando en servidor remoto (EasyPanel)..."
echo "   (Esto puede tomar unos momentos...)"

if [ -n "$AUTH_DB" ]; then
    docker exec $LOCAL_MONGO_CONTAINER mongorestore \
      --host=$REMOTE_MONGO_HOST \
      --port=$REMOTE_MONGO_PORT \
      --username=$REMOTE_MONGO_USER \
      --password=$REMOTE_MONGO_PASS \
      --authenticationDatabase=$AUTH_DB \
      --db=$DB_NAME \
      --dir=/data/backup/dump_$$/$DB_NAME \
      --drop
else
    docker exec $LOCAL_MONGO_CONTAINER mongorestore \
      --host=$REMOTE_MONGO_HOST \
      --port=$REMOTE_MONGO_PORT \
      --username=$REMOTE_MONGO_USER \
      --password=$REMOTE_MONGO_PASS \
      --db=$DB_NAME \
      --dir=/data/backup/dump_$$/$DB_NAME \
      --drop
fi

if [ $? -eq 0 ]; then
    echo "=========================================="
    echo "Migración completada exitosamente!"
    echo "=========================================="
    
    # Verificar datos en el servidor remoto
    echo "6. Verificando datos migrados en EasyPanel..."
    if [ -n "$AUTH_DB" ]; then
        docker exec $LOCAL_MONGO_CONTAINER mongosh \
          --host=$REMOTE_MONGO_HOST \
          --port=$REMOTE_MONGO_PORT \
          --username=$REMOTE_MONGO_USER \
          --password=$REMOTE_MONGO_PASS \
          --authenticationDatabase=$AUTH_DB \
          $DB_NAME \
          --quiet \
          --eval "
            print('\\n=== Resumen de datos migrados ===');
            print('Encuestas (surveys): ' + db.surveys.countDocuments());
            print('Respuestas (responses): ' + db.responses.countDocuments());
            print('Grupos (groups): ' + db.groups.countDocuments());
            print('\\n=== Colecciones disponibles ===');
            db.getCollectionNames().forEach(function(c) { print('  - ' + c); });
          "
    else
        docker exec $LOCAL_MONGO_CONTAINER mongosh \
          --host=$REMOTE_MONGO_HOST \
          --port=$REMOTE_MONGO_PORT \
          --username=$REMOTE_MONGO_USER \
          --password=$REMOTE_MONGO_PASS \
          $DB_NAME \
          --quiet \
          --eval "
            print('\\n=== Resumen de datos migrados ===');
            print('Encuestas (surveys): ' + db.surveys.countDocuments());
            print('Respuestas (responses): ' + db.responses.countDocuments());
            print('Grupos (groups): ' + db.groups.countDocuments());
            print('\\n=== Colecciones disponibles ===');
            db.getCollectionNames().forEach(function(c) { print('  - ' + c); });
          "
    fi
    
    echo "=========================================="
    echo "Proceso completado!"
    echo "=========================================="
    echo ""
    echo "Connection string para usar en la aplicación:"
    if [ -n "$AUTH_DB" ]; then
        echo "mongodb://$REMOTE_MONGO_USER:$REMOTE_MONGO_PASS@$REMOTE_MONGO_HOST:$REMOTE_MONGO_PORT/?authSource=$AUTH_DB&tls=false"
    else
        echo "mongodb://$REMOTE_MONGO_USER:$REMOTE_MONGO_PASS@$REMOTE_MONGO_HOST:$REMOTE_MONGO_PORT/?tls=false"
    fi
    echo ""
    echo "Base de datos: $DB_NAME"
else
    echo "ERROR: Falló la restauración en el servidor remoto"
    echo ""
    echo "Posibles causas:"
    echo "  - El servidor remoto no es accesible desde este contenedor"
    echo "  - Las credenciales son incorrectas"
    echo "  - El firewall está bloqueando la conexión"
    echo "  - La base de datos de autenticación es diferente"
fi

# Limpiar
echo "7. Limpiando archivos temporales..."
docker exec $LOCAL_MONGO_CONTAINER rm -rf /data/backup/dump_$$
rm -rf $TEMP_DIR

echo "Limpieza completada"



