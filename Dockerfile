# Multi-stage build para Survey App
# Stage 1: Build Frontend (Survey UI)
FROM node:20-alpine AS frontend-builder
WORKDIR /app
COPY frontend/survey-ui/package*.json ./
RUN npm ci
COPY frontend/survey-ui/ ./
RUN npm run build

# Stage 1b: Build Checklist App (opcional - si falla, crea placeholder)
FROM node:20-alpine AS checklist-builder
WORKDIR /app
COPY frontend/checklist-app/package*.json ./
# Intentar instalar dependencias, si falla usar npm install
RUN npm ci 2>/dev/null || npm install || true
COPY frontend/checklist-app/ ./
# Intentar construir, si falla crear placeholder
RUN npm run build 2>&1 || ( \
    echo "WARNING: Build de checklist-app falló, creando placeholder..." && \
    mkdir -p dist && \
    echo '<!DOCTYPE html><html><head><title>Checklist App</title></head><body><h1>Checklist App - En construcción</h1></body></html>' > dist/index.html \
    )
# Asegurar que dist existe
RUN mkdir -p dist && test -f dist/index.html || echo '<!DOCTYPE html><html><head><title>Checklist</title></head><body><h1>Checklist App</h1></body></html>' > dist/index.html

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
