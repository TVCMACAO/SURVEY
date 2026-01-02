# Solución para Persistencia de Datos en EasyPanel

## Problema

Cada vez que se hace un redeploy en EasyPanel, se pierden los usuarios porque:
- Los usuarios se almacenan en SQLite (`db.sqlite3`)
- El archivo SQLite está dentro del contenedor (no persistente)
- Al recrear el contenedor, se pierde el archivo

## Solución 1: Volumen Persistente para SQLite (Rápida)

### Configuración en EasyPanel

1. **Agregar un volumen persistente** en la configuración del servicio en EasyPanel:
   - **Nombre del volumen**: `django_data`
   - **Ruta en el contenedor**: `/app/data`
   - **Tipo**: Volumen local persistente

2. **Modificar la ruta de SQLite** en `settings.py` para usar el volumen:
   ```python
   DATABASES = {
       'default': {
           'ENGINE': 'django.db.backends.sqlite3',
           'NAME': BASE_DIR / 'data' / 'db.sqlite3',  # Cambiar a /app/data/db.sqlite3
       }
   }
   ```

3. **Crear el directorio en el script de inicio** (`start.sh`):
   ```bash
   mkdir -p /app/data
   chmod 755 /app/data
   ```

### Ventajas
- ✅ Solución rápida y simple
- ✅ No requiere cambios en el código de autenticación
- ✅ Funciona inmediatamente

### Desventajas
- ⚠️ SQLite no es ideal para producción con múltiples workers
- ⚠️ Limitaciones de concurrencia

## Solución 2: Migrar Usuarios a MongoDB (Recomendada)

### Por qué MongoDB es mejor
- ✅ Ya está configurado y funcionando
- ✅ Escalable y robusto
- ✅ No se pierde en redeploys (ya es persistente)
- ✅ Mejor para producción

### Implementación

1. **Crear un modelo de usuario en MongoDB** (ya existe `surveys_user` collection)
2. **Modificar el sistema de autenticación** para usar MongoDB
3. **Crear script de migración** para mover usuarios existentes

## Configuración Actual

Actualmente, el proyecto usa:
- **SQLite**: Para usuarios de Django (`db.sqlite3`)
- **MongoDB**: Para encuestas, respuestas y grupos

## Recomendación

Para EasyPanel, la **Solución 1 (volumen persistente)** es la más rápida de implementar.
La **Solución 2 (MongoDB)** es mejor a largo plazo pero requiere más trabajo.

