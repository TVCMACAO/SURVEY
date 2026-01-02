# Configuración de Variables de Entorno

Este documento describe las variables de entorno necesarias para ejecutar la aplicación Survey App.

## Variables Requeridas

### Django Settings

- **SECRET_KEY**: Clave secreta de Django. **DEBE ser cambiada en producción**.
  - Ejemplo: `SECRET_KEY=tu-clave-secreta-muy-segura-aqui`
  - Generar una nueva: `python -c 'from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())'`

- **DEBUG**: Modo de depuración. Debe ser `False` en producción.
  - Valores: `True`, `False`, `1`, `0`, `yes`, `no`
  - Ejemplo: `DEBUG=False`

- **ALLOWED_HOSTS**: Lista de hosts permitidos separados por comas.
  - Ejemplo: `ALLOWED_HOSTS=192.168.0.248,localhost,127.0.0.1,tu-dominio.com`
  - **IMPORTANTE**: No usar `*` en producción por seguridad.

### MongoDB Settings

- **MONGO_USERNAME**: Usuario de MongoDB
  - Ejemplo: `MONGO_USERNAME=root`

- **MONGO_PASSWORD**: Contraseña de MongoDB. **DEBE ser segura en producción**.
  - Ejemplo: `MONGO_PASSWORD=tu-contraseña-segura`

- **MONGO_HOST**: Host de MongoDB
  - Ejemplo: `MONGO_HOST=mongo` (para Docker) o `MONGO_HOST=localhost` (local)

- **MONGO_PORT**: Puerto de MongoDB
  - Ejemplo: `MONGO_PORT=27017`

- **MONGO_DB_NAME**: Nombre de la base de datos
  - Ejemplo: `MONGO_DB_NAME=survey_db`

## Configuración con Docker Compose

Las variables de entorno pueden ser configuradas de dos formas:

### 1. Archivo .env (Recomendado)

Crear un archivo `.env` en la raíz del proyecto:

```bash
# Django Settings
SECRET_KEY=tu-clave-secreta-aqui
DEBUG=False
ALLOWED_HOSTS=192.168.0.248,localhost,127.0.0.1

# MongoDB Settings
MONGO_USERNAME=root
MONGO_PASSWORD=tu-contraseña-segura
MONGO_HOST=mongo
MONGO_PORT=27017
MONGO_DB_NAME=survey_db
```

Docker Compose leerá automáticamente este archivo.

### 2. Variables de Entorno del Sistema

Exportar las variables antes de ejecutar docker-compose:

```bash
export SECRET_KEY="tu-clave-secreta"
export DEBUG="False"
export ALLOWED_HOSTS="192.168.0.248,localhost"
export MONGO_PASSWORD="tu-contraseña-segura"
docker-compose up
```

## Valores por Defecto

Si no se proporcionan las variables de entorno, se usarán estos valores por defecto (NO recomendados para producción):

- `SECRET_KEY`: Clave insegura de desarrollo
- `DEBUG`: `False` (pero puede ser sobrescrito)
- `ALLOWED_HOSTS`: `192.168.0.248,localhost,127.0.0.1`
- `MONGO_USERNAME`: `root`
- `MONGO_PASSWORD`: `surveypass123`
- `MONGO_HOST`: `mongo`
- `MONGO_PORT`: `27017`
- `MONGO_DB_NAME`: `survey_db`

## Seguridad en Producción

⚠️ **IMPORTANTE**: Antes de desplegar en producción:

1. Generar una nueva `SECRET_KEY` segura
2. Establecer `DEBUG=False`
3. Configurar `ALLOWED_HOSTS` con solo los dominios permitidos (sin `*`)
4. Usar contraseñas fuertes para MongoDB
5. No commitear el archivo `.env` al repositorio (ya está en `.gitignore`)

