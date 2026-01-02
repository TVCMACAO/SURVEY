# Guía de Restauración de MongoDB

Este documento explica cómo restaurar un backup de MongoDB en un nuevo servidor.

## Requisitos Previos

1. Docker y Docker Compose instalados
2. Archivo de backup descargado (`.tar.gz`)
3. Acceso al servidor donde se restaurará

## Paso 1: Preparar el Entorno

### 1.1. Copiar archivos necesarios al nuevo servidor

Necesitas estos archivos:
- `docker-compose-mongo-only.yml` - Configuración de MongoDB
- `restore_mongodb.sh` - Script de restauración
- Archivo de backup (ej: `mongodb_backup_20251226_171505.tar.gz`)

### 1.2. Configurar variables de entorno (opcional)

Crea un archivo `.env` si quieres cambiar las credenciales por defecto:

```bash
MONGO_USERNAME=root
MONGO_PASSWORD=surveypass123
MONGO_DB_NAME=survey_db
```

## Paso 2: Iniciar MongoDB

```bash
# Iniciar el contenedor de MongoDB
docker-compose -f docker-compose-mongo-only.yml up -d

# Verificar que está corriendo
docker ps | grep survey-mongo

# Ver logs (opcional)
docker logs survey-mongo
```

Espera 10-15 segundos a que MongoDB esté completamente iniciado.

## Paso 3: Restaurar el Backup

### Opción A: Usando el script (recomendado)

```bash
# Coloca el archivo de backup en /tmp/backup/ o especifica la ruta
./restore_mongodb.sh /ruta/al/backup/mongodb_backup_20251226_171505.tar.gz
```

### Opción B: Manualmente

```bash
# 1. Copiar backup al contenedor
docker cp /ruta/al/backup/mongodb_backup_20251226_171505.tar.gz survey-mongo:/data/backup/backup.archive

# 2. Restaurar
docker exec survey-mongo mongorestore \
  --username=root \
  --password=surveypass123 \
  --authenticationDatabase=admin \
  --archive=/data/backup/backup.archive \
  --gzip \
  --drop

# 3. Verificar
docker exec survey-mongo mongosh \
  --username=root \
  --password=surveypass123 \
  --authenticationDatabase=admin \
  survey_db \
  --eval "db.getCollectionNames()"
```

## Paso 4: Verificar la Restauración

```bash
# Conectar a MongoDB
docker exec -it survey-mongo mongosh \
  --username=root \
  --password=surveypass123 \
  --authenticationDatabase=admin

# Dentro de mongosh:
use survey_db
db.getCollectionNames()
db.surveys.countDocuments()
db.responses.countDocuments()
db.groups.countDocuments()
```

## Solución de Problemas

### Error: "Contenedor no está corriendo"
```bash
docker-compose -f docker-compose-mongo-only.yml up -d
```

### Error: "MongoDB no está listo"
Espera unos segundos más y vuelve a intentar:
```bash
docker logs survey-mongo
```

### Error: "Archivo de backup no encontrado"
Verifica la ruta del archivo:
```bash
ls -lh /ruta/al/backup/
```

### Error: "Authentication failed"
Verifica las credenciales en el archivo `.env` o en `docker-compose-mongo-only.yml`

## Comandos Útiles

```bash
# Detener MongoDB
docker-compose -f docker-compose-mongo-only.yml down

# Detener y eliminar volúmenes (CUIDADO: elimina datos)
docker-compose -f docker-compose-mongo-only.yml down -v

# Ver logs
docker logs -f survey-mongo

# Acceder al shell de MongoDB
docker exec -it survey-mongo mongosh \
  --username=root \
  --password=surveypass123 \
  --authenticationDatabase=admin
```

## Estructura del Backup

El backup contiene:
- **surveys**: Encuestas creadas
- **responses**: Respuestas de usuarios
- **groups**: Grupos de encuestas

## Notas Importantes

1. El flag `--drop` elimina datos existentes antes de restaurar. Úsalo con cuidado.
2. Las credenciales deben coincidir con las del servidor original.
3. El nombre de la base de datos por defecto es `survey_db`.
4. El puerto 27017 está expuesto para acceso externo (opcional).



