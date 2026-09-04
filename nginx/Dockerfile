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
# Copy nginx configuration
COPY nginx/nginx.conf /etc/nginx/nginx.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
