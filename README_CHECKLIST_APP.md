# Checklist App - Aplicación Complementaria

## Descripción

Checklist App es una aplicación complementaria de Survey App que se despliega automáticamente junto con ella. Ambas aplicaciones comparten el mismo backend (Django) y sistema de autenticación.

## Acceso

- **URL**: `http://tu-dominio/checklist/` o `https://tu-dominio/checklist/`
- **API Compartida**: `http://tu-dominio/api/` (misma que Survey App)

## Características

- ✅ Funcionalidad offline/online
- ✅ Sincronización automática con backend
- ✅ Validación de chequeos
- ✅ Interfaz moderna y responsive
- ✅ PWA ready
- ✅ Autenticación compartida con Survey App

## Estructura

```
frontend/checklist-app/
├── src/
│   ├── App.jsx              # Componente principal
│   ├── main.jsx             # Punto de entrada
│   ├── auth.js              # Sistema de autenticación
│   ├── components/          # Componentes React
│   ├── hooks/               # Custom hooks
│   └── utils/               # Utilidades
├── package.json
├── vite.config.js
└── index.html
```

## Desarrollo Local

```bash
cd frontend/checklist-app
npm install
npm run dev
```

La aplicación estará disponible en `http://localhost:5173/checklist/` (con el base path configurado).

## Build para Producción

El build se realiza automáticamente durante el despliegue en EasyPanel. El Dockerfile principal construye ambas aplicaciones:

1. Construye `frontend/survey-ui` → `/`
2. Construye `frontend/checklist-app` → `/checklist/`
3. Ambas usan la misma API en `/api/`

## Configuración

### Base Path

La aplicación está configurada para servir desde `/checklist/` mediante:
- `vite.config.js`: `base: '/checklist/'`
- `nginx.conf`: Configuración de ruta `/checklist/`

### Autenticación

Comparte el mismo sistema de autenticación que Survey App:
- Endpoints: `/api/token/`, `/api/token/refresh/`
- Tokens almacenados en localStorage con claves específicas:
  - `checklist_access_token`
  - `checklist_refresh_token`

## Funcionalidades

### Pestañas

1. **Checklist Operativo**: Gestión de chequeos diarios
2. **Resumen Mensual**: (En desarrollo)

### Checklist Operativo

- Selector de área (20 áreas predefinidas)
- Chequeo 1 y Chequeo 2
- 2 preguntas por chequeo: "Cumple" / "No cumple"
- Validación: Chequeo 1 debe completarse antes de Chequeo 2
- Sincronización offline/online
- Indicador de estado de conexión

## Integración con Backend

La aplicación utiliza los mismos endpoints del backend:
- `GET /api/surveys/` - Obtener checklists (filtrado por `survey_type='checklist'`)
- `POST /api/responses/` - Crear respuesta de checklist
- `POST /api/token/` - Autenticación
- `POST /api/token/refresh/` - Refrescar token

## Despliegue en EasyPanel

La aplicación se despliega automáticamente con Survey App:

1. **Push a Git**: Los cambios se detectan automáticamente
2. **Build Automático**: EasyPanel construye ambas aplicaciones
3. **Deploy**: Ambas quedan disponibles automáticamente

No se requiere configuración adicional en EasyPanel.

## Troubleshooting

### La aplicación no carga en `/checklist/`

1. Verificar que el build se completó:
   ```bash
   docker exec <container> ls -la /app/frontend/checklist-app/dist/
   ```

2. Verificar configuración de Nginx:
   ```bash
   docker exec <container> cat /etc/nginx/nginx.conf | grep checklist
   ```

### Errores de rutas (404)

- Verificar que `vite.config.js` tenga `base: '/checklist/'`
- Verificar que los assets se estén sirviendo desde `/checklist/assets/`

### Errores de autenticación

- Verificar que la API esté accesible en `/api/`
- Revisar la consola del navegador para errores de CORS
- Verificar que los tokens se guarden correctamente en localStorage

## Más Información

Ver `CONFIGURACION_CHECKLIST_APP.md` para detalles completos de configuración y despliegue.

