# Build frontend
FROM node:20-alpine AS frontend-builder
WORKDIR /app
COPY frontend/survey-ui/package*.json ./
RUN npm ci
COPY frontend/survey-ui/ ./
RUN npm run build

# Production nginx
FROM nginx:1.21-alpine
# Copy built frontend
COPY --from=frontend-builder /app/dist /usr/share/nginx/html
# Copy nginx configuration
COPY nginx/nginx.conf /etc/nginx/nginx.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]

