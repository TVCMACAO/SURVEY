# Multi-stage build para Survey App
# Stage 1: Build Frontend (Survey UI)
FROM node:20-alpine AS frontend-builder
WORKDIR /app
COPY frontend/survey-ui/package*.json ./
RUN test -f package.json || (echo "ERROR: package.json no encontrado en survey-ui" && exit 1)
# Instalar dependencias (usar npm install si no hay package-lock.json, npm ci si existe)
RUN if [ -f package-lock.json ]; then \
      npm ci || (echo "ERROR: npm ci falló en survey-ui" && exit 1); \
    else \
      echo "package-lock.json no encontrado, usando npm install..." && \
      npm install || (echo "ERROR: npm install falló en survey-ui" && exit 1); \
    fi
COPY frontend/survey-ui/ ./
RUN npm run build || (echo "ERROR: npm run build falló en survey-ui" && exit 1)
RUN test -d dist || (echo "ERROR: directorio dist no se creó en survey-ui" && exit 1)

# Stage 1b: Build Checklist App
FROM node:20-alpine AS checklist-builder
WORKDIR /app
# Copiar archivos de checklist-app
COPY frontend/checklist-app/package*.json ./
# Verificar que package.json existe
RUN test -f package.json || (echo "ERROR: package.json no encontrado en checklist-app" && ls -la && exit 1)
# Mostrar contenido de package.json para debug
RUN echo "=== package.json contenido ===" && cat package.json || true
# Instalar dependencias (usar npm install si no hay package-lock.json, npm ci si existe)
RUN if [ -f package-lock.json ]; then \
      echo "Usando npm ci (package-lock.json encontrado)" && \
      npm ci || (echo "ERROR: npm ci falló en checklist-app" && exit 1); \
    else \
      echo "package-lock.json no encontrado, usando npm install..." && \
      npm install --verbose || (echo "ERROR: npm install falló en checklist-app" && exit 1); \
    fi
# Copiar resto de archivos
COPY frontend/checklist-app/ ./
# Verificar archivos críticos y mostrar estructura
RUN echo "=== Estructura de archivos ===" && ls -la && \
    test -f index.html || (echo "ERROR: index.html no encontrado" && exit 1) && \
    test -f vite.config.js || (echo "ERROR: vite.config.js no encontrado" && exit 1) && \
    test -d src || (echo "ERROR: directorio src no encontrado" && exit 1) && \
    echo "=== Contenido de src ===" && ls -la src/ || true
# Construir la aplicación con manejo de errores mejorado
RUN echo "=== Iniciando build ===" && \
    npm run build 2>&1 | tee /tmp/build.log || { \
      echo "ERROR: npm run build falló en checklist-app" && \
      echo "=== Logs de build ===" && \
      cat /tmp/build.log && \
      echo "=== Verificando node_modules ===" && \
      ls -la node_modules/ 2>/dev/null | head -5 || echo "No node_modules" && \
      echo "=== Verificando package-lock.json ===" && \
      test -f package-lock.json && echo "package-lock.json existe" || echo "No package-lock.json" && \
      exit 1; \
    }
# Verificar que el build se completó
RUN test -d dist || (echo "ERROR: directorio dist no se creó" && ls -la && exit 1) && \
    test -f dist/index.html || (echo "ERROR: dist/index.html no encontrado después del build" && echo "=== Contenido de dist ===" && ls -la dist/ && exit 1) && \
    echo "=== Build completado exitosamente ===" && ls -la dist/ | head -10

# Stage 2: Build Backend
FROM python:3.10-slim-bullseye AS backend-builder
WORKDIR /app
COPY backend/requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Stage 3: Production - Solo Django/Gunicorn (EasyPanel maneja Nginx)
FROM python:3.10-slim-bullseye

# Install curl and network tools for diagnostics
RUN apt-get update && apt-get install -y \
    curl \
    net-tools \
    iproute2 \
    && rm -rf /var/lib/apt/lists/*

# Copy backend
WORKDIR /app
COPY --from=backend-builder /usr/local/lib/python3.10/site-packages /usr/local/lib/python3.10/site-packages
COPY --from=backend-builder /usr/local/bin /usr/local/bin
COPY backend/ /app/

# Copy frontend builds to the location Django expects
COPY --from=frontend-builder /app/dist /app/frontend/survey-ui/dist
COPY --from=checklist-builder /app/dist /app/frontend/checklist-app/dist

# Copy startup script
COPY start.sh /start.sh
RUN chmod +x /start.sh

# Expose port 8000 (EasyPanel's Nginx will proxy to this)
EXPOSE 8000

# Start script (runs Django/Gunicorn only)
CMD ["/start.sh"]
