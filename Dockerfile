# Multi-stage build para Survey App
# Stage 1: Build Frontend
FROM node:20-alpine AS frontend-builder
WORKDIR /app
COPY frontend/survey-ui/package*.json ./
RUN npm ci
COPY frontend/survey-ui/ ./
RUN npm run build

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

# Copy frontend build to the location Django expects
COPY --from=frontend-builder /app/dist /app/frontend/survey-ui/dist

# Copy startup script
COPY start.sh /start.sh
RUN chmod +x /start.sh

# Expose port 8000 (EasyPanel's Nginx will proxy to this)
EXPOSE 8000

# Start script (runs Django/Gunicorn only)
CMD ["/start.sh"]
