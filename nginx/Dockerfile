# Build frontend
FROM node:20-alpine AS frontend-builder
WORKDIR /app
ARG GIT_SHA=
ARG APP_VERSION=
ARG BUILD_TIME=
ENV GIT_SHA=$GIT_SHA
ENV APP_VERSION=$APP_VERSION
ENV BUILD_TIME=$BUILD_TIME
ENV VITE_GIT_SHA=$GIT_SHA
ENV VITE_APP_VERSION=$APP_VERSION
ENV VITE_BUILD_TIME=$BUILD_TIME
COPY VERSION /VERSION
COPY frontend/survey-ui/package*.json ./
RUN npm ci
COPY frontend/survey-ui/ ./
RUN if [ -z "$APP_VERSION" ] && [ -f /VERSION ]; then export APP_VERSION="$(cat /VERSION | tr -d '[:space:]')"; fi && \
    APP_VERSION="${APP_VERSION:-}" GIT_SHA="${GIT_SHA}" BUILD_TIME="${BUILD_TIME}" node scripts/write-build-meta.mjs && \
    npm run build

# Production nginx
FROM nginx:1.21-alpine
# Copy built frontend
COPY --from=frontend-builder /app/dist /usr/share/nginx/html
# APK + version.json para descarga pública (/releases/apk/...)
COPY releases /releases
# También en la raíz del frontend: funciona aunque falte location /releases
# (try_files encuentra el archivo antes de caer a index.html)
COPY releases/apk/survey-app-latest.apk /usr/share/nginx/html/survey-app-latest.apk
COPY releases/apk/version.json /usr/share/nginx/html/apk-version.json
# Copy nginx configuration
COPY nginx/nginx.conf /etc/nginx/nginx.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
