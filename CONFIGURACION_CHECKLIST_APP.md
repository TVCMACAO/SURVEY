# Configuración Checklist App como Complemento

## Descripción

Checklist App es una aplicación complementaria de Survey App que se despliega junto con ella en EasyPanel. Ambas aplicaciones comparten el mismo backend (Django) y sistema de autenticación.

## Estructura de Despliegue

```
Survey App (Principal)
├── Frontend: / (raíz)
└── API: /api/

Checklist App (Complemento)
├── Frontend: /checklist/
└── API: /api/ (compartida con Survey App)
```

## Configuración en EasyPanel

### 1. Repositorio Git

La aplicación Checklist App está incluida en el mismo repositorio Git que Survey App:
- Ruta: `frontend/checklist-app/`
- Se construye automáticamente durante el build del Dockerfile principal

### 2. Build Automático

El Dockerfile principal ahora construye ambas aplicaciones:
- **Stage 1**: Construye `frontend/survey-ui` (Survey App)
- **Stage 1b**: Construye `frontend/checklist-app` (Checklist App)
- **Stage 2-3**: Copia ambos builds al contenedor final

### 3. Configuración de Nginx

Nginx está configurado para servir ambas aplicaciones:
- **Survey App**: Disponible en `/` (raíz)
- **Checklist App**: Disponible en `/checklist/`

### 4. Rutas de Acceso

Después del despliegue:
- **Survey App**: `http://tu-dominio/` o `https://tu-dominio/`
- **Checklist App**: `http://tu-dominio/checklist/` o `https://tu-dominio/checklist/`
- **API Compartida**: `http://tu-dominio/api/` (ambas aplicaciones usan la misma API)

## Variables de Entorno

Las mismas variables de entorno de Survey App se aplican a Checklist App:
- `SECRET_KEY`
- `DEBUG`
- `ALLOWED_HOSTS`
- `MONGO_URI`
- `MONGO_DB_NAME`

## Autenticación Compartida

Ambas aplicaciones comparten:
- El mismo sistema de autenticación JWT
- Los mismos endpoints de API (`/api/token/`, `/api/token/refresh/`)
- Los mismos usuarios y permisos

**Nota**: Cada aplicación mantiene sus propios tokens en localStorage con claves diferentes:
- Survey App: `survey_access_token`, `survey_refresh_token`
- Checklist App: `checklist_access_token`, `checklist_refresh_token`

## Despliegue

### Proceso Automático

1. **Push a Git**: Al hacer push al repositorio, EasyPanel detecta los cambios
2. **Build Automático**: EasyPanel ejecuta el Dockerfile que construye ambas apps
3. **Deploy**: Ambas aplicaciones quedan disponibles automáticamente

### Verificación Post-Despliegue

1. **Verificar Survey App**:
   ```bash
   curl http://tu-dominio/
   ```

2. **Verificar Checklist App**:
   ```bash
   curl http://tu-dominio/checklist/
   ```

3. **Verificar API Compartida**:
   ```bash
   curl http://tu-dominio/api/surveys/
   ```

## Desarrollo Local

Para desarrollo local de Checklist App:

```bash
cd frontend/checklist-app
npm install
npm run dev
```

La aplicación estará disponible en `http://localhost:5173` (o el puerto que Vite asigne).

## Actualización

Para actualizar Checklist App:

1. Realizar cambios en `frontend/checklist-app/`
2. Hacer commit y push a Git
3. EasyPanel detectará los cambios y reconstruirá automáticamente
4. Ambas aplicaciones se actualizarán en el siguiente deploy

## Troubleshooting

### Checklist App no carga en `/checklist/`

**Solución**:
1. Verificar que el build de checklist-app se completó:
   ```bash
   docker exec <container> ls -la /app/frontend/checklist-app/dist/
   ```
2. Verificar configuración de Nginx:
   ```bash
   docker exec <container> cat /etc/nginx/nginx.conf | grep checklist
   ```

### Errores de autenticación en Checklist App

**Solución**:
- Verificar que la API esté accesible en `/api/`
- Verificar que los tokens se estén guardando correctamente en localStorage
- Revisar la consola del navegador para errores de CORS

### Build falla al construir Checklist App

**Solución**:
1. Verificar que `frontend/checklist-app/package.json` existe
2. Verificar que todas las dependencias estén correctas
3. Revisar logs del build en EasyPanel

## Notas Importantes

- ✅ Checklist App es completamente independiente en términos de UI/UX
- ✅ Comparte el mismo backend y base de datos
- ✅ Usa el mismo sistema de autenticación
- ✅ Se despliega automáticamente con Survey App
- ✅ No requiere configuración adicional en EasyPanel

