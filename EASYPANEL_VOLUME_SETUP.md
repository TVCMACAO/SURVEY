# Configuración de Volumen Persistente en EasyPanel

## Problema Resuelto

Este documento explica cómo configurar un volumen persistente en EasyPanel para que los usuarios no se pierdan en cada redeploy.

## Pasos en EasyPanel

### 1. Agregar Volumen Persistente

1. Ve a tu servicio en EasyPanel
2. Busca la sección **"Volumes"** o **"Volúmenes"**
3. Haz clic en **"Add Volume"** o **"Agregar Volumen"**
4. Configura:
   - **Nombre**: `django_data` (o el nombre que prefieras)
   - **Ruta en el contenedor**: `/app/data`
   - **Tipo**: `Local Persistent Volume` o `Volumen Local Persistente`
   - **Tamaño**: Mínimo 1GB (SQLite es pequeño, pero deja espacio para crecimiento)

### 2. Verificar Configuración

Después de agregar el volumen y hacer redeploy, verifica que:

1. El directorio `/app/data` existe en el contenedor
2. El archivo `db.sqlite3` se crea en `/app/data/db.sqlite3`
3. Los usuarios persisten después de un redeploy

### 3. Verificación Post-Deploy

Ejecuta estos comandos en el contenedor de EasyPanel (si tienes acceso SSH):

```bash
# Verificar que el directorio existe
ls -la /app/data

# Verificar que la base de datos está ahí
ls -lh /app/data/db.sqlite3

# Verificar usuarios (si tienes acceso a Django shell)
python manage.py shell
>>> from surveys.models import User
>>> User.objects.all()
```

## Cambios Realizados en el Código

### 1. `backend/survey_project/settings.py`
- Detecta automáticamente si existe `/app/data` (volumen montado)
- Usa `/app/data/db.sqlite3` si el volumen está montado
- Usa la ubicación por defecto si no está montado (para desarrollo local)

### 2. `start.sh`
- Crea el directorio `/app/data` si no existe
- Establece permisos correctos

## Notas Importantes

⚠️ **IMPORTANTE**: 
- El volumen debe estar montado **antes** de crear usuarios
- Si ya tienes usuarios en la ubicación por defecto, necesitarás migrarlos manualmente
- Después del primer deploy con volumen, los usuarios persistirán automáticamente

## Migración de Usuarios Existentes

Si ya tienes usuarios creados y quieres moverlos al volumen:

1. **Backup de la base de datos actual**:
   ```bash
   # En el contenedor actual (si tienes acceso)
   cp /app/db.sqlite3 /app/data/db.sqlite3
   ```

2. **O recrear usuarios** después del primer deploy con volumen:
   ```bash
   python manage.py create_user root root123 --role root
   python manage.py create_user deiner deiner123 --role encuestador
   ```

## Troubleshooting

### El volumen no se monta
- Verifica que el nombre del volumen sea correcto
- Verifica que la ruta en el contenedor sea `/app/data`
- Revisa los logs del contenedor para errores

### Los usuarios aún se pierden
- Verifica que el volumen esté montado: `ls -la /app/data`
- Verifica la ubicación de la BD: `python manage.py dbshell` y luego `.databases`
- Revisa los logs de Django para ver dónde está buscando la BD

### Permisos denegados
- El script `start.sh` crea el directorio con permisos 755
- Si hay problemas, verifica: `chmod 755 /app/data`

