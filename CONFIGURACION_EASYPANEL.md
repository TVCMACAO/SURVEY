# Configuración Rápida en EasyPanel

## ✅ Cambios Realizados

- ✅ **Dockerfile creado en la raíz** del proyecto
- ✅ **Nginx configurado** para funcionar en contenedor único
- ✅ **Código actualizado en GitHub**

## 🚀 Configuración en EasyPanel

### Paso 1: Actualizar el Servicio

1. Ve a tu servicio en EasyPanel
2. Haz clic en **"Rebuild"** o **"Redeploy"** para que descargue los últimos cambios de GitHub

### Paso 2: Configurar el Build

En la configuración del servicio, asegúrate de tener:

```
Tipo: Dockerfile
Dockerfile: Dockerfile (o deja en blanco si busca automáticamente)
Build Context: . (punto, raíz del repositorio)
```

### Paso 3: Variables de Entorno

Configura estas variables de entorno en EasyPanel:

```bash
SECRET_KEY=django-insecure-SKYkcR_YN6oByp%HMW0481vp5KXaW-tnQHpmUWJ=tG_S-=5=FD
DEBUG=0
ALLOWED_HOSTS=easypanel.clinicamaicao.com,www.clinicamaicao.com
MONGO_URI=mongodb://root:1b20629a87ea780a63aa@easypanel.clinicamaicao.com:27017/?authSource=admin&tls=false
MONGO_DB_NAME=survey_db
```

### Paso 4: Puerto

- **Puerto del Contenedor**: `80`
- **Puerto Público**: `80` (HTTP) o `443` (HTTPS)

### Paso 5: Desplegar

1. Guarda la configuración
2. Haz clic en **"Deploy"** o **"Build"**
3. Espera 3-5 minutos mientras construye

## 📋 Qué Hace el Dockerfile

El Dockerfile en la raíz:
1. **Construye el frontend** (React) con Node.js
2. **Prepara el backend** (Django) con Python
3. **Instala Nginx y Supervisor**
4. **Ejecuta ambos servicios** en un solo contenedor:
   - Django en el puerto 8000 (interno)
   - Nginx en el puerto 80 (público)
   - Nginx hace proxy de `/api/` a Django
   - Nginx sirve el frontend en `/`

## 🔍 Verificar Despliegue

Después del despliegue:

1. **Revisa los logs** en EasyPanel
2. **Accede a la aplicación**: `http://tu-dominio` o `https://tu-dominio`
3. **Prueba la API**: `http://tu-dominio/api/surveys/`

## ⚠️ Si Hay Problemas

### Error: "Module not found" o errores de Python
- Verifica que las variables de entorno estén configuradas
- Revisa los logs para ver errores específicos

### Error: Frontend no carga
- Verifica que el build del frontend se completó (revisa logs)
- Asegúrate que Nginx esté corriendo

### Error: API no responde
- Verifica que Django esté corriendo (revisa logs)
- Verifica la conexión a MongoDB
- Revisa que `MONGO_URI` esté correcto

## 📝 Notas

- El Dockerfile ejecuta **ambos servicios en un solo contenedor** usando Supervisor
- Esto es funcional pero no es la arquitectura ideal (normalmente se separan)
- Para producción a gran escala, considera usar Docker Compose con servicios separados

---

**¡Listo para desplegar!** 🚀


