# Django en survey-app

Documentación del uso de **Django** y **Django REST Framework** en el backend de survey-app. Para la documentación oficial de Django: [docs.djangoproject.com](https://docs.djangoproject.com/en/4.2/).

---

## Resumen

- **Django 5.x**: framework web del backend.
- **Django REST Framework (DRF)**: API REST (encuestas, respuestas, usuarios, grupos).
- **Autenticación**: JWT (Simple JWT) con usuarios en **MongoDB**, no en el modelo User de Django.
- **Datos de negocio**: MongoDB vía `pymongo` (encuestas, respuestas, grupos). SQLite solo para compatibilidad con admin/sessions si se usa.
- **Frontend**: React (Vite) servido por Django en producción (rutas no-API).

---

## Estructura del backend

```
backend/
├── manage.py
├── survey_project/          # Proyecto Django
│   ├── settings.py
│   ├── urls.py              # Raíz: admin, api/, static, assets, frontend
│   ├── frontend_views.py    # Servir SPA React
│   ├── wsgi.py
│   └── asgi.py
├── surveys/                 # App principal
│   ├── views.py             # API (encuestas, respuestas, usuarios, grupos)
│   ├── serializers.py       # DRF serializers (Survey, Question, Response, User, etc.)
│   ├── urls.py              # Rutas bajo /api/
│   ├── mongo_utils.py       # Conexión y colecciones MongoDB
│   ├── mongo_jwt_authentication.py  # JWT contra usuarios en MongoDB
│   ├── mongo_auth_backend.py
│   ├── mongo_user_model.py
│   ├── mongo_user_utils.py
│   ├── exception_handlers.py  # Respuestas de error en JSON
│   ├── json_error_middleware.py
│   ├── models.py            # User (Django) para AUTH_USER_MODEL
│   └── admin.py
└── requirements.txt
```

---

## Configuración (settings.py)

- **SECRET_KEY**: desde `SECRET_KEY` en entorno (evitar valor por defecto en producción).
- **DEBUG**: desde `DEBUG` en entorno (`'true'/'1'/'yes'` = True).
- **ALLOWED_HOSTS**: desde `ALLOWED_HOSTS` (lista separada por comas); se añaden hosts de EasyPanel.
- **Bases de datos**: `DATABASES['default']` es SQLite; los datos de encuestas/respuestas/usuarios de app están en **MongoDB** (variable `MONGO_URI`, etc.), accedidos por código en `surveys` (sin ORM Django para MongoDB).
- **AUTH_USER_MODEL**: `surveys.User` (modelo Django usado para referencias; la autenticación real usa MongoDB con `MongoAuthBackend` y `MongoJWTAuthentication`).
- **AUTHENTICATION_BACKENDS**: solo `surveys.mongo_auth_backend.MongoAuthBackend`.
- **CORS**: `corsheaders` con `CORS_ALLOWED_ORIGINS`, `CORS_ALLOWED_ORIGIN_REGEXES` y `CORS_ALLOW_CREDENTIALS = True`.
- **REST_FRAMEWORK**:
  - Autenticación por defecto: `surveys.mongo_jwt_authentication.MongoJWTAuthentication`.
  - Respuestas en JSON: `JSONRenderer`.
  - Manejador de excepciones: `surveys.exception_handlers.custom_exception_handler` (respuestas de error siempre en JSON).
- **SIMPLE_JWT**: duración de access/refresh token, algoritmo, etc. (ver `settings.py`).

Referencia: [Django settings](https://docs.djangoproject.com/en/4.2/topics/settings/).

---

## URL routing

- **Raíz** (`survey_project/urls.py`):
  - `/admin/` → Django admin.
  - `/api/` → incluye `surveys.urls`.
  - `/static/`, `/assets/` → archivos estáticos y assets del frontend.
  - Cualquier otra ruta → SPA (frontend React) vía `serve_frontend`.

- **API** (`surveys/urls.py`) bajo `/api/`:
  - `token/`, `token/refresh/` → JWT (obtain pair, refresh).
  - `me/` → usuario actual.
  - `users/`, `users/<pk>/` → CRUD usuarios.
  - `groups/`, `groups/<pk>/` → grupos de encuestas.
  - `surveys/`, `surveys/<pk>/` → CRUD encuestas; restore y permanent-delete.
  - `responses/`, `responses/sync/`, `responses/sync-status/`, `responses/<pk>/` → respuestas y sincronización.
  - `public/surveys/<pk>/`, `public/responses/` → endpoints públicos (sin JWT).

Referencia: [URL dispatcher](https://docs.djangoproject.com/en/4.2/topics/http/urls/).

---

## Vistas y API (DRF)

Las vistas son **class-based views** que heredan de `rest_framework.views.APIView`:

- **Encuestas**: `SurveyListCreate` (GET, POST), `SurveyRetrieveUpdateDestroy` (GET, PUT, DELETE). Datos en MongoDB; PUT con `partial=True`; si el body solo trae `is_public`, solo se actualiza ese campo.
- **Respuestas**: `ResponseListCreate`, `ResponseRetrieve`, `ResponseSyncView`, `PublicResponseCreate`.
- **Usuarios**: `CurrentUserView`, `UserListCreate`, `UserRetrieveUpdateDestroy` (usuarios en MongoDB).
- **Grupos**: `SurveyGroupListCreate`, `SurveyGroupRetrieveUpdateDestroy`.

Serialización en `surveys/serializers.py` (Survey, Question, Section, Response, User, etc.). Los documentos en MongoDB usan campos como `text`/`type` en preguntas; el API expone `question_text`/`question_type` vía serializers.

Referencia: [Writing views](https://docs.djangoproject.com/en/4.2/topics/http/views/), [DRF API View](https://www.django-rest-framework.org/api-guide/views/).

---

## Autenticación JWT con MongoDB

- **Obtención de token**: `POST /api/token/` (username/password). `CustomTokenObtainPairView` usa usuarios en MongoDB y emite access/refresh JWT.
- **Refresh**: `POST /api/token/refresh/` (refresh token).
- **Uso en API**: header `Authorization: Bearer <access_token>`. `MongoJWTAuthentication` valida el JWT y asocia el usuario desde MongoDB.

No se usa el modelo User de Django para comprobar contraseñas en login; se usa el backend `MongoAuthBackend` y lógica en `surveys` (MongoDB).

---

## Middleware y errores

- **JSONErrorMiddleware** (primero en la lista): captura excepciones no manejadas y devuelve respuestas JSON.
- **custom_exception_handler** (DRF): todas las respuestas de error de la API en JSON; 401 por token inválido/caducado no se registran como ERROR para no llenar logs.

---

## Archivos estáticos y frontend

- **STATIC_URL** / **STATIC_ROOT**: archivos estáticos de Django.
- En producción, el build del frontend (Vite) se copia y se sirve con `serve_frontend` y `serve_frontend_asset` para `/assets/` y el resto de rutas no-API.

Referencia: [Managing static files](https://docs.djangoproject.com/en/4.2/howto/static-files/).

---

## Comandos útiles

```bash
cd backend
python manage.py runserver          # Servidor de desarrollo
python manage.py collectstatic     # Recoger estáticos (si se usan)
python manage.py migrate           # Migraciones del modelo User (SQLite)
```

---

## Referencias Django

- [Django overview](https://docs.djangoproject.com/en/4.2/intro/overview/)
- [Settings](https://docs.djangoproject.com/en/4.2/topics/settings/)
- [URL dispatcher](https://docs.djangoproject.com/en/4.2/topics/http/urls/)
- [Views](https://docs.djangoproject.com/en/4.2/topics/http/views/)
- [Static files](https://docs.djangoproject.com/en/4.2/howto/static-files/)
- [FAQ: Databases and models (NoSQL)](https://docs.djangoproject.com/en/4.2/faq/) (Django no usa ORM para MongoDB en este proyecto; el acceso es vía `pymongo` en la app `surveys`).
