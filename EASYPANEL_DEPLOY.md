# Guía de Despliegue en EasyPanel

Esta guía te ayudará a desplegar la aplicación Survey App directamente en EasyPanel, sin necesidad de conexión SSH desde tu servidor local.

## Opciones de Despliegue

EasyPanel ofrece dos métodos principales para desplegar esta aplicación:

1. **Repositorio Git** (Recomendado) - EasyPanel clona y construye automáticamente
2. **Subida Directa de Archivos** - Subes un paquete comprimido

## Opción 1: Despliegue desde Repositorio Git (Recomendado)

### Paso 1: Preparar el Repositorio

1. Asegúrate de que tu código esté en un repositorio Git (GitHub, GitLab, Bitbucket, etc.)
2. Verifica que todos los archivos necesarios estén incluidos:
   - `docker-compose-easypanel.yml`
   - `backend/` (directorio completo)
   - `frontend/survey-ui/` (directorio completo)
   - `nginx/` (directorio completo)
   - `.gitignore`

### Paso 2: Configurar Servicio en EasyPanel

1. **Inicia sesión en EasyPanel**
   - Accede a tu panel de EasyPanel

2. **Crear Nuevo Servicio**
   - Haz clic en "Nuevo Servicio" o "Add Service"
   - Selecciona "Docker Compose" o "Git Repository"

3. **Configurar Repositorio Git**
   - **Tipo**: Git Repository
   - **URL del Repositorio**: `https://github.com/tu-usuario/tu-repositorio.git`
   - **Rama**: `main` o `master`
   - **Docker Compose File**: `docker-compose-easypanel.yml`
   - **Build Context**: `.` (raíz del repositorio)

4. **Configurar Variables de Entorno**
   
   En la sección de Variables de Entorno, agrega:

   ```bash
   SECRET_KEY=tu-clave-secreta-generada-aqui
   DEBUG=0
   ALLOWED_HOSTS=easypanel.clinicamaicao.com,www.clinicamaicao.com
   MONGO_URI=mongodb://root:tu-password@easypanel.clinicamaicao.com:27017/?authSource=admin&tls=false
   MONGO_DB_NAME=survey_db
   ```

   **Para generar SECRET_KEY:**
   ```bash
   python3 -c 'from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())'
   ```

5. **Configurar Puertos**
   - Puerto Público: `80` (HTTP) o `443` (HTTPS si tienes SSL)
   - Puerto del Contenedor: `80`

6. **Guardar y Desplegar**
   - Haz clic en "Save" o "Deploy"
   - EasyPanel comenzará a clonar el repositorio y construir los contenedores

### Paso 3: Verificar el Despliegue

1. **Ver Logs**
   - En EasyPanel, ve a la sección de Logs del servicio
   - Verifica que no haya errores
   - Deberías ver mensajes de Django y Nginx iniciando

2. **Verificar Acceso**
   - Abre tu navegador en: `http://tu-dominio` o `https://tu-dominio`
   - Deberías ver la aplicación funcionando

## Opción 2: Subida Directa de Archivos

### Paso 1: Crear Paquete

En tu servidor local, ejecuta:

```bash
cd /home/vps/Documentos/survey-app
./package_for_easypanel.sh
```

Esto creará un archivo `survey-app-easypanel-YYYYMMDD_HHMMSS.tar.gz`

### Paso 2: Subir a EasyPanel

1. **Acceder a EasyPanel**
   - Inicia sesión en tu panel de EasyPanel

2. **Crear Nuevo Servicio**
   - Selecciona "Docker Compose" o "File Upload"

3. **Subir Archivos**
   - Si EasyPanel tiene opción de subida de archivos, sube el `.tar.gz`
   - O extrae el contenido y súbelo vía SFTP/FileZilla al directorio del servicio

4. **Estructura de Directorios en EasyPanel**
   ```
   /ruta/del/servicio/
   ├── docker-compose-easypanel.yml
   ├── backend/
   │   ├── Dockerfile
   │   ├── requirements.txt
   │   └── ...
   ├── frontend/
   │   └── survey-ui/
   │       ├── Dockerfile
   │       ├── package.json
   │       └── ...
   └── nginx/
       ├── Dockerfile
       └── nginx.conf
   ```

5. **Configurar Variables de Entorno**
   - Mismas variables que en la Opción 1

6. **Configurar Docker Compose**
   - Ruta del archivo: `docker-compose-easypanel.yml`
   - Contexto de build: `.` (directorio raíz del servicio)

7. **Iniciar Servicio**
   - Haz clic en "Start" o "Deploy"

## Configuración Detallada de Variables de Entorno

### Variables Requeridas

| Variable | Descripción | Ejemplo |
|----------|-------------|---------|
| `SECRET_KEY` | Clave secreta de Django | Generada automáticamente |
| `ALLOWED_HOSTS` | Hosts permitidos (separados por comas) | `easypanel.clinicamaicao.com,www.clinicamaicao.com` |
| `MONGO_URI` | URI de conexión a MongoDB | `mongodb://root:password@host:27017/?authSource=admin&tls=false` |

### Variables Opcionales

| Variable | Valor por Defecto | Descripción |
|----------|------------------|-------------|
| `DEBUG` | `0` | Modo debug (0=False, 1=True) |
| `MONGO_DB_NAME` | `survey_db` | Nombre de la base de datos |

## Verificación Post-Despliegue

### 1. Verificar Contenedores

En EasyPanel, verifica que los contenedores estén corriendo:
- `survey-django` - Backend Django
- `survey-nginx` - Servidor Nginx con Frontend

### 2. Verificar Logs

```bash
# En EasyPanel, ve a la sección de Logs
# O si tienes acceso SSH:
docker logs survey-django
docker logs survey-nginx
```

### 3. Verificar API

```bash
# Probar endpoint de API
curl http://tu-dominio/api/surveys/
```

### 4. Verificar Frontend

Abre en el navegador: `http://tu-dominio` o `https://tu-dominio`

Deberías ver:
- Página de login (si no estás autenticado)
- Dashboard de encuestas (si estás autenticado)

## Troubleshooting

### Problema: Contenedor no inicia

**Solución:**
1. Revisa los logs en EasyPanel
2. Verifica que las variables de entorno estén configuradas correctamente
3. Verifica que MongoDB esté accesible desde el contenedor

### Problema: Error 502 Bad Gateway

**Solución:**
1. Verifica que el contenedor `survey-django` esté corriendo
2. Revisa los logs de Django: `docker logs survey-django`
3. Verifica que el healthcheck esté pasando

### Problema: Frontend no carga

**Solución:**
1. Verifica que el build del frontend se haya completado
2. Revisa los logs de nginx: `docker logs survey-nginx`
3. Verifica que los archivos estén en `/usr/share/nginx/html`

### Problema: Error de conexión a MongoDB

**Solución:**
1. Verifica que `MONGO_URI` esté correctamente configurado
2. Verifica que MongoDB esté accesible desde el contenedor
3. Verifica credenciales y permisos de MongoDB

### Problema: CORS Error

**Solución:**
1. Verifica que `ALLOWED_HOSTS` incluya tu dominio
2. Verifica `CORS_ALLOWED_ORIGINS` en `backend/survey_project/settings.py`
3. Reinicia el contenedor Django después de cambios

## Actualizar la Aplicación

### Si usas Git:

1. Haz push de tus cambios al repositorio
2. En EasyPanel, haz clic en "Redeploy" o "Rebuild"
3. EasyPanel clonará los nuevos cambios y reconstruirá

### Si usas subida directa:

1. Crea un nuevo paquete con `./package_for_easypanel.sh`
2. Sube los archivos actualizados
3. En EasyPanel, haz clic en "Redeploy" o "Rebuild"

## Estructura del Proyecto en EasyPanel

```
/ruta/del/servicio/
├── docker-compose-easypanel.yml    # Configuración Docker Compose
├── .env                            # Variables de entorno (opcional, mejor usar UI de EasyPanel)
├── backend/                        # Backend Django
│   ├── Dockerfile
│   ├── requirements.txt
│   ├── manage.py
│   └── survey_project/
│       └── settings.py
├── frontend/                       # Frontend React
│   └── survey-ui/
│       ├── Dockerfile
│       ├── package.json
│       ├── src/
│       └── ...
└── nginx/                          # Configuración Nginx
    ├── Dockerfile
    └── nginx.conf
```

## Notas Importantes

1. **MongoDB**: Asegúrate de que MongoDB esté configurado y accesible antes de desplegar
2. **Variables de Entorno**: Nunca subas el archivo `.env` al repositorio. Usa la interfaz de EasyPanel
3. **Build Automático**: El frontend se construye automáticamente durante el build de nginx
4. **Puertos**: El puerto 80 debe estar disponible o configurar un puerto diferente
5. **SSL/HTTPS**: Para HTTPS, configura SSL en EasyPanel o usa un proxy reverso

## Recursos Adicionales

- [Documentación de EasyPanel](https://easypanel.io/docs)
- [README.md](README.md) - Documentación general del proyecto
- [FEATURES_SECTIONS.md](FEATURES_SECTIONS.md) - Funcionalidades de secciones

## Soporte

Si encuentras problemas:
1. Revisa los logs en EasyPanel
2. Consulta la sección de Troubleshooting
3. Verifica la documentación de EasyPanel
4. Contacta al equipo de desarrollo

---

**¡Listo para desplegar!** 🚀

