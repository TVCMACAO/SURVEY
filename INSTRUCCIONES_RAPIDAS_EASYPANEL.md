# Instrucciones Rápidas para Desplegar en EasyPanel

## ⚡ Pasos Rápidos (5 minutos)

### 1. Crear Servicio en EasyPanel

1. **Inicia sesión en EasyPanel**
   - Ve a tu panel de EasyPanel

2. **Crear Nuevo Servicio**
   - Haz clic en "Nuevo Servicio" o "Add Service"
   - Selecciona **"Git Repository"** o **"Docker Compose"**

### 2. Configurar Repositorio Git

Si EasyPanel tiene opción de Git Repository:

- **Tipo**: Git Repository
- **URL**: `https://github.com/TVCMACAO/SURVEY.git`
- **Rama**: `main`
- **Docker Compose File**: `docker-compose-easypanel.yml`
- **Build Context**: `.` (punto, raíz del repositorio)

### 3. Configurar Variables de Entorno

En la sección de **Environment Variables** o **Variables de Entorno**, agrega estas variables:

```bash
SECRET_KEY=GENERA_UNA_CLAVE_AQUI
DEBUG=0
ALLOWED_HOSTS=easypanel.clinicamaicao.com,www.clinicamaicao.com
MONGO_URI=mongodb://root:1b20629a87ea780a63aa@easypanel.clinicamaicao.com:27017/?authSource=admin&tls=false
MONGO_DB_NAME=survey_db
```

**Para generar SECRET_KEY, ejecuta en tu terminal:**
```bash
python3 -c 'from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())'
```

### 4. Configurar Puertos

- **Puerto Público**: `80` (HTTP) o `443` (HTTPS)
- **Puerto del Contenedor**: `80`

### 5. Guardar y Desplegar

- Haz clic en **"Save"** o **"Deploy"**
- EasyPanel comenzará a clonar y construir automáticamente

### 6. Verificar

- Espera 2-3 minutos mientras construye
- Revisa los logs en EasyPanel
- Accede a: `http://tu-dominio` o `https://tu-dominio`

---

## 🔧 Si EasyPanel NO tiene opción Git

### Opción Alternativa: Subir Archivos

1. **Ejecuta el script de empaquetado** (ya está ejecutado):
   ```bash
   ./package_for_easypanel.sh
   ```

2. **Sube el archivo `.tar.gz` a EasyPanel**:
   - Vía SFTP/FileZilla al directorio del servicio
   - O usa la interfaz de subida de archivos de EasyPanel

3. **Extrae el contenido**:
   ```bash
   tar -xzf survey-app-easypanel-*.tar.gz
   ```

4. **Configura el servicio**:
   - Tipo: Docker Compose
   - Archivo: `docker-compose-easypanel.yml`
   - Variables de entorno: (mismas que arriba)

---

## ✅ Checklist Pre-Despliegue

- [ ] MongoDB está configurado y accesible en EasyPanel
- [ ] Tienes las credenciales de MongoDB
- [ ] Has generado el SECRET_KEY
- [ ] Has configurado las variables de entorno
- [ ] El puerto 80 está disponible

---

## 🆘 Si Algo Sale Mal

1. **Revisa los logs** en EasyPanel
2. **Verifica las variables de entorno**
3. **Asegúrate que MongoDB esté accesible**
4. Consulta `EASYPANEL_DEPLOY.md` para troubleshooting detallado

---

**¡Listo para desplegar!** 🚀

