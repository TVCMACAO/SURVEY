# Guía de Despliegue en EasyPanel

Esta guía te ayudará a desplegar la aplicación Survey App en EasyPanel.

## Prerequisitos

- Acceso a un servidor con EasyPanel instalado
- Docker y Docker Compose instalados en el servidor
- Acceso a MongoDB (ya configurado en EasyPanel)
- Credenciales de MongoDB de EasyPanel

## Paso 1: Preparar la Aplicación Localmente

### 1.1 Compilar el Frontend

```bash
cd frontend/survey-ui
npm ci
npm run build
cd ../..
```

### 1.2 Ejecutar Script de Preparación

```bash
./deploy_to_easypanel.sh
```

Este script:
- Verifica dependencias
- Compila el frontend
- Verifica archivos necesarios
- Crea/verifica archivo .env
- Genera instrucciones de despliegue

## Paso 2: Configurar Variables de Entorno

Crea un archivo `.env` en la raíz del proyecto con las siguientes variables:

```bash
# Django Settings
SECRET_KEY=tu-clave-secreta-generada-aqui
DEBUG=0
ALLOWED_HOSTS=easypanel.clinicamaicao.com,www.clinicamaicao.com

# MongoDB Settings (desde EasyPanel)
MONGO_URI=mongodb://root:tu-password@easypanel.clinicamaicao.com:27017/?authSource=admin&tls=false
MONGO_DB_NAME=survey_db
```

### Generar SECRET_KEY

```bash
python -c 'from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())'
```

## Paso 3: Subir Archivos a EasyPanel

Sube los siguientes archivos/directorios a tu servidor EasyPanel:

### Archivos Necesarios

```
survey-app/
├── docker-compose-easypanel.yml
├── .env
├── backend/
│   ├── Dockerfile
│   ├── requirements.txt
│   ├── manage.py
│   └── survey_project/
│       └── ...
├── nginx/
│   └── nginx.conf
└── frontend/
    └── survey-ui/
        └── dist/
            ├── index.html
            └── assets/
                └── ...
```

### Métodos de Subida

#### Opción 1: SCP/SFTP

```bash
scp -r survey-app/ usuario@easypanel.clinicamaicao.com:/ruta/destino/
```

#### Opción 2: FileZilla

1. Conecta a tu servidor EasyPanel vía SFTP
2. Navega al directorio de destino
3. Sube los archivos y directorios mencionados

#### Opción 3: Git (si tienes repositorio)

```bash
git clone tu-repositorio
cd survey-app
# Configurar .env
```

## Paso 4: Configurar en EasyPanel

### 4.1 Crear Servicio Django

En EasyPanel:

1. Crea un nuevo servicio
2. Selecciona "Docker Compose"
3. Configura las variables de entorno desde el archivo `.env`
4. Asegúrate de que el servicio tenga acceso a la red de MongoDB

### 4.2 Variables de Entorno en EasyPanel

Configura estas variables en la interfaz de EasyPanel:

- `SECRET_KEY`: Tu clave secreta de Django
- `DEBUG`: `0`
- `ALLOWED_HOSTS`: `easypanel.clinicamaicao.com,www.clinicamaicao.com`
- `MONGO_URI`: Tu connection string de MongoDB
- `MONGO_DB_NAME`: `survey_db`

## Paso 5: Desplegar

### 5.1 Desplegar con Docker Compose

En el servidor EasyPanel, ejecuta:

```bash
cd /ruta/a/survey-app
docker-compose -f docker-compose-easypanel.yml up -d
```

### 5.2 Verificar Despliegue

```bash
# Verificar contenedores
docker ps

# Ver logs
docker-compose -f docker-compose-easypanel.yml logs -f

# Ver logs específicos
docker-compose -f docker-compose-easypanel.yml logs django
docker-compose -f docker-compose-easypanel.yml logs nginx
```

## Paso 6: Verificar Funcionamiento

### 6.1 Verificar Backend

```bash
# Health check (si está implementado)
curl http://localhost:8000/api/health/

# O verificar que el contenedor responda
curl http://localhost:8000/api/surveys/
```

### 6.2 Verificar Frontend

Accede a la aplicación en tu navegador:
- `http://easypanel.clinicamaicao.com` o
- `https://easypanel.clinicamaicao.com` (si tienes SSL configurado)

### 6.3 Verificar MongoDB

```bash
# Desde el contenedor Django
docker exec -it survey-django python manage.py shell

# En el shell de Python:
from surveys.models import get_mongo_collection
collection = get_mongo_collection('surveys')
print(collection.count_documents({}))
```

## Troubleshooting

### Problema: Contenedor no inicia

**Solución:**
```bash
# Ver logs detallados
docker-compose -f docker-compose-easypanel.yml logs django

# Verificar variables de entorno
docker exec survey-django env | grep MONGO
```

### Problema: Error de conexión a MongoDB

**Solución:**
1. Verifica que `MONGO_URI` esté correctamente configurado
2. Verifica que MongoDB esté accesible desde el contenedor:
   ```bash
   docker exec survey-django ping easypanel.clinicamaicao.com
   ```
3. Verifica credenciales de MongoDB

### Problema: Frontend no carga

**Solución:**
1. Verifica que `frontend/survey-ui/dist` esté montado correctamente
2. Verifica permisos del directorio:
   ```bash
   ls -la frontend/survey-ui/dist
   ```
3. Verifica logs de Nginx:
   ```bash
   docker-compose -f docker-compose-easypanel.yml logs nginx
   ```

### Problema: Error 502 Bad Gateway

**Solución:**
1. Verifica que Django esté corriendo:
   ```bash
   docker ps | grep survey-django
   ```
2. Verifica que Django responda:
   ```bash
   docker exec survey-django curl http://localhost:8000/api/health/
   ```
3. Verifica la configuración de Nginx

### Problema: CORS Error

**Solución:**
1. Verifica que el dominio esté en `CORS_ALLOWED_ORIGINS` en `settings.py`
2. Verifica que `ALLOWED_HOSTS` incluya tu dominio
3. Reinicia el contenedor Django después de cambios

### Problema: Archivos estáticos no cargan

**Solución:**
```bash
# Recolectar archivos estáticos
docker exec survey-django python manage.py collectstatic --noinput

# Verificar que se crearon
docker exec survey-django ls -la /app/staticfiles
```

## Actualizar la Aplicación

### Proceso de Actualización

1. **Compilar nuevo frontend:**
   ```bash
   cd frontend/survey-ui
   npm run build
   cd ../..
   ```

2. **Subir archivos actualizados** a EasyPanel

3. **Reconstruir y reiniciar:**
   ```bash
   docker-compose -f docker-compose-easypanel.yml down
   docker-compose -f docker-compose-easypanel.yml build
   docker-compose -f docker-compose-easypanel.yml up -d
   ```

## Configuración de SSL/HTTPS

Para habilitar HTTPS en EasyPanel:

1. Configura un certificado SSL en EasyPanel
2. Actualiza `ALLOWED_HOSTS` para incluir el dominio HTTPS
3. Actualiza `CORS_ALLOWED_ORIGINS` en `settings.py`
4. Configura Nginx para redirigir HTTP a HTTPS (si es necesario)

## Monitoreo y Logs

### Ver Logs en Tiempo Real

```bash
docker-compose -f docker-compose-easypanel.yml logs -f
```

### Ver Logs de un Servicio Específico

```bash
docker-compose -f docker-compose-easypanel.yml logs -f django
docker-compose -f docker-compose-easypanel.yml logs -f nginx
```

### Limpiar Logs Antiguos

```bash
docker-compose -f docker-compose-easypanel.yml logs --tail=100
```

## Backup y Restauración

### Backup de MongoDB

Consulta `backup_mongodb.sh` para crear backups de la base de datos.

### Backup de Archivos

```bash
tar -czf survey-app-backup-$(date +%Y%m%d).tar.gz \
  backend/ \
  nginx/ \
  frontend/survey-ui/dist/ \
  docker-compose-easypanel.yml \
  .env
```

## Recursos Adicionales

- [Documentación de Docker Compose](https://docs.docker.com/compose/)
- [Documentación de EasyPanel](https://easypanel.io/docs)
- [Documentación de Django Deployment](https://docs.djangoproject.com/en/stable/howto/deployment/)

## Soporte

Si encuentras problemas:

1. Revisa los logs: `docker-compose -f docker-compose-easypanel.yml logs`
2. Verifica la configuración de variables de entorno
3. Consulta la sección de Troubleshooting arriba
4. Revisa la documentación de EasyPanel

