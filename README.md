# Survey App

Aplicación web completa para crear, gestionar y responder encuestas. Desarrollada con Django (backend) y React (frontend).

## Características

- ✅ Creación y edición de encuestas con múltiples tipos de preguntas
- ✅ Secciones para organizar encuestas complejas
- ✅ Lógica condicional para mostrar/ocultar preguntas basadas en respuestas
- ✅ Vista previa de encuestas antes de publicar
- ✅ Respuestas públicas sin necesidad de autenticación
- ✅ Visualización de respuestas con gráficos y estadísticas
- ✅ Exportación de respuestas a Excel
- ✅ Gestión de usuarios con roles (root, encuestador)
- ✅ Soft delete de encuestas (restauración posible)
- ✅ Interfaz responsive para móviles y desktop

## Tipos de Preguntas Soportadas

- Texto Corto
- Párrafo
- Opción Única (Radio)
- Casillas (Checkbox)
- Desplegable (Dropdown)
- Número
- Fecha
- Puntuación (Rating con estrellas)
- Firma (Canvas)
- Correo Electrónico

## Estructura del Proyecto

```
survey-app/
├── backend/              # Django REST API
│   ├── surveys/         # App principal
│   │   ├── models.py    # Modelos de Django (User)
│   │   ├── serializers.py  # Serializers para API
│   │   ├── views.py     # Vistas API
│   │   └── mongo_utils.py  # Utilidades MongoDB
│   └── survey_project/  # Configuración Django
│       └── settings.py  # Configuración
├── frontend/
│   └── survey-ui/       # React + Vite
│       ├── src/
│       │   └── App.jsx  # Componente principal
│       └── dist/        # Build de producción
├── nginx/               # Configuración Nginx
├── docker-compose.yml   # Docker Compose para desarrollo
├── docker-compose-easypanel.yml  # Docker Compose para EasyPanel
└── deploy_to_easypanel.sh  # Script de despliegue
```

## Requisitos

- Docker y Docker Compose (para desarrollo)
- Node.js 20+ y npm (para desarrollo frontend)
- Python 3.10+ (para desarrollo backend)
- MongoDB (incluido en docker-compose o externo)

## Instalación y Desarrollo Local

### 1. Clonar el repositorio

```bash
git clone <repository-url>
cd survey-app
```

### 2. Configurar variables de entorno

Copia `env.example` a `.env` y configura las variables:

```bash
cp env.example .env
```

Edita `.env` con tus valores:
- `SECRET_KEY`: Genera una clave secreta para Django
- `DEBUG`: `1` para desarrollo, `0` para producción
- `ALLOWED_HOSTS`: `localhost,127.0.0.1`
- Variables de MongoDB (si usas MongoDB externo)

### 3. Iniciar con Docker Compose

```bash
docker-compose up -d
```

Esto iniciará:
- MongoDB en el puerto 27017
- Django en el puerto 8000 (interno)
- Nginx en el puerto 8085

### 4. Acceder a la aplicación

- Frontend: http://localhost:8085
- API: http://localhost:8085/api/

### 5. Desarrollo Frontend

Para desarrollo con hot-reload:

```bash
cd frontend/survey-ui
npm install
npm run dev
```

## Despliegue en EasyPanel

Consulta [DEPLOY_EASYPANEL.md](DEPLOY_EASYPANEL.md) para instrucciones detalladas de despliegue en EasyPanel.

### Resumen rápido:

1. Ejecuta el script de preparación:
   ```bash
   ./deploy_to_easypanel.sh
   ```

2. Configura las variables de entorno en EasyPanel

3. Sube los archivos al servidor

4. Despliega con Docker Compose:
   ```bash
   docker-compose -f docker-compose-easypanel.yml up -d
   ```

## Uso de Secciones y Lógica Condicional

Consulta [FEATURES_SECTIONS.md](FEATURES_SECTIONS.md) para documentación completa sobre:

- Cómo crear y gestionar secciones
- Cómo asignar preguntas a secciones
- Cómo configurar lógica condicional
- Ejemplos de uso

## API Endpoints

### Autenticación
- `POST /api/token/` - Obtener token JWT
- `GET /api/me/` - Obtener usuario actual

### Encuestas
- `GET /api/surveys/` - Listar encuestas
- `POST /api/surveys/` - Crear encuesta
- `GET /api/surveys/{id}/` - Obtener encuesta
- `PUT /api/surveys/{id}/` - Actualizar encuesta
- `DELETE /api/surveys/{id}/` - Eliminar encuesta (soft delete)
- `POST /api/surveys/{id}/restore/` - Restaurar encuesta eliminada

### Encuestas Públicas
- `GET /api/public/surveys/{id}/` - Ver encuesta pública
- `POST /api/public/responses/` - Crear respuesta pública

### Respuestas
- `GET /api/responses/?survey_id={id}` - Listar respuestas
- `POST /api/responses/` - Crear respuesta

### Usuarios (solo root)
- `GET /api/users/` - Listar usuarios
- `POST /api/users/` - Crear usuario
- `PUT /api/users/{id}/` - Actualizar usuario
- `DELETE /api/users/{id}/` - Eliminar usuario

## Base de Datos

### MongoDB

La aplicación usa MongoDB para almacenar:
- Encuestas (surveys)
- Respuestas (responses)
- Grupos de encuestas (groups)

### SQLite

Django usa SQLite para:
- Autenticación de usuarios
- Sesiones

## Backup y Restauración

### Backup de MongoDB

```bash
./backup_mongodb.sh
```

Esto crea un backup comprimido en `backups/`.

### Restaurar desde backup

```bash
./restore_mongodb.sh backups/mongodb_backup_YYYYMMDD_HHMMSS.tar.gz
```

## Scripts Útiles

- `backup_mongodb.sh` - Crear backup de MongoDB
- `restore_mongodb.sh` - Restaurar backup de MongoDB
- `migrate_to_easypanel.sh` - Migrar datos a EasyPanel MongoDB
- `deploy_to_easypanel.sh` - Preparar aplicación para EasyPanel

## Tecnologías Utilizadas

### Backend
- Django 5.1.6
- Django REST Framework
- Django CORS Headers
- Simple JWT
- PyMongo
- Gunicorn

### Frontend
- React 19.2.0
- Vite
- Tailwind CSS
- Font Awesome
- Chart.js
- XLSX (para exportar a Excel)

### Infraestructura
- Docker
- Docker Compose
- Nginx
- MongoDB

## Desarrollo

### Estructura de Datos

#### Encuesta (Survey)
```json
{
  "id": "ObjectId",
  "title": "string",
  "description": "string",
  "group": "ObjectId",
  "questions": [...],
  "sections": [...],
  "is_public": boolean,
  "is_deleted": boolean
}
```

#### Pregunta (Question)
```json
{
  "id": "string",
  "question_text": "string",
  "question_type": "short_text|long_text|...",
  "options": ["string"],
  "description": "string",
  "required": boolean,
  "section_id": "string|null",
  "conditional_logic": {
    "type": "show_if",
    "question_id": "string",
    "operator": "equals|not_equals|...",
    "value": "any"
  }
}
```

#### Sección (Section)
```json
{
  "id": "string",
  "title": "string",
  "description": "string",
  "order": number
}
```

## Troubleshooting

### Problema: Contenedores no inician

```bash
docker-compose logs
```

### Problema: Error de conexión a MongoDB

Verifica que MongoDB esté corriendo:
```bash
docker ps | grep mongo
```

### Problema: Frontend no carga

Verifica que el build esté actualizado:
```bash
cd frontend/survey-ui
npm run build
```

### Problema: CORS Error

Verifica `CORS_ALLOWED_ORIGINS` en `backend/survey_project/settings.py`.

## Contribuir

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## Licencia

Este proyecto es privado y de uso interno.

## Soporte

Para problemas o preguntas, contacta al equipo de desarrollo.

## Changelog

### Versión Actual (Web y APK)
- ✅ **Archivo de referenciación (Excel):** subida en el editor, mapeo pregunta → columna. Al responder (enlace o APK), al ingresar el documento/clave se autocompletan el resto de campos. Web: lookup al escribir (debounce) y al salir del campo; fechas del Excel formateadas para inputs date/datetime. APK: lookup online con token; offline usa copia descargada al sincronizar.
- ✅ **Vista pública (enlace compartido):** Enter en un campo ya no envía el formulario; solo el botón «Enviar Respuestas» envía. Validación de campos obligatorios (*) antes de enviar; mensaje claro si faltan.
- ✅ Soporte completo de secciones
- ✅ Lógica condicional para preguntas
- ✅ Migración a EasyPanel
- ✅ Mejoras de UI responsive
- ✅ Exportación a Excel mejorada

---

**Desarrollado con ❤️ para Clínica Maicao S.A.**

