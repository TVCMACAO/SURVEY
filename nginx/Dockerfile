# Build frontend (Survey UI)
FROM node:20-alpine AS frontend-builder
WORKDIR /app
COPY frontend/survey-ui/package*.json ./
RUN npm ci
COPY frontend/survey-ui/ ./
RUN npm run build

# Build Checklist App
FROM node:20-alpine AS checklist-builder
WORKDIR /app
COPY frontend/checklist-app/package*.json ./
RUN npm ci
COPY frontend/checklist-app/ ./
RUN npm run build

# Production nginx
FROM nginx:1.21-alpine
# Copy built frontends
COPY --from=frontend-builder /app/dist /usr/share/nginx/html
COPY --from=checklist-builder /app/dist /app/frontend/checklist-app/dist
# Copy nginx configuration
COPY nginx/nginx.conf /etc/nginx/nginx.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]

