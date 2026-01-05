# Diagnóstico de Errores en Build de Checklist App

## Posibles Errores y Soluciones

### Error 1: "Cannot find module" o "Module not found"

**Causa**: Dependencias faltantes o incompatibles

**Solución**:
1. Verificar que `package.json` tenga todas las dependencias necesarias
2. Asegurarse de que las versiones sean compatibles
3. Verificar que `npm ci` se ejecute correctamente

### Error 2: "Build failed" en etapa de checklist-builder

**Causa**: Error en el build de Vite

**Solución**:
1. Verificar que `vite.config.js` esté correctamente configurado
2. Verificar que todos los archivos fuente existan
3. Revisar logs del build para ver el error específico

### Error 3: "dist directory not found"

**Causa**: El build no generó el directorio dist

**Solución**:
1. Verificar que `npm run build` se ejecute sin errores
2. Verificar que `vite.config.js` tenga `outDir: 'dist'`
3. Verificar permisos de escritura

### Error 4: "COPY failed: file not found"

**Causa**: Ruta incorrecta en el Dockerfile

**Solución**:
1. Verificar que `frontend/checklist-app/` exista en el repositorio
2. Verificar que todos los archivos estén commiteados
3. Verificar el contexto de build en EasyPanel

## Verificación Manual

Para verificar localmente si el build funciona:

```bash
cd frontend/checklist-app
npm install
npm run build
ls -la dist/
```

Si el build local funciona, el problema está en la configuración de Docker/EasyPanel.

## Logs a Revisar en EasyPanel

1. **Logs del build**: Buscar errores en la etapa `checklist-builder`
2. **Logs de npm ci**: Verificar que todas las dependencias se instalen
3. **Logs de npm run build**: Verificar que el build se complete
4. **Logs de COPY**: Verificar que los archivos se copien correctamente

## Solución Temporal

Si el build de checklist-app está causando problemas, puedes comentar temporalmente esa etapa:

```dockerfile
# Stage 1b: Build Checklist App
# FROM node:20-alpine AS checklist-builder
# WORKDIR /app
# COPY frontend/checklist-app/package*.json ./
# RUN npm ci
# COPY frontend/checklist-app/ ./
# RUN npm run build
```

Y comentar la línea de COPY:
```dockerfile
# COPY --from=checklist-builder /app/dist /app/frontend/checklist-app/dist
```

Esto permitirá que Survey App se despliegue mientras se soluciona el problema de Checklist App.

