# Configuración de Google Drive para adjuntos

Los adjuntos de las encuestas se pueden guardar automáticamente en una carpeta de Google Drive para tener una copia de respaldo y acceso desde Drive.

**Carpeta configurada:** [SURVEYAPP](https://drive.google.com/drive/folders/1ljZUHTQaAcM4j8xiJXbrj2Ja_IkMs3MX?usp=sharing)

## Pasos para activar

### 1. Crear proyecto en Google Cloud

1. Ve a [Google Cloud Console](https://console.cloud.google.com/)
2. Crea un proyecto nuevo o selecciona uno existente
3. Habilita la **Google Drive API**:
   - Menú → APIs y servicios → Biblioteca
   - Busca "Google Drive API" → Habilitar

### 2. Crear cuenta de servicio

1. Menú → APIs y servicios → Credenciales
2. "Crear credenciales" → "Cuenta de servicio"
3. Nombre: `survey-app-drive` (o similar)
4. Crear y continuar
5. En la cuenta creada, pestaña "Claves" → "Agregar clave" → "Crear clave nueva" → JSON
6. Se descargará un archivo JSON. **Guárdalo en un lugar seguro.**

### 3. Compartir la carpeta con la cuenta de servicio

1. Abre el JSON descargado y busca el campo `client_email` (ej: `survey-app@mi-proyecto.iam.gserviceaccount.com`)
2. Ve a la carpeta [SURVEYAPP en Drive](https://drive.google.com/drive/folders/1ljZUHTQaAcM4j8xiJXbrj2Ja_IkMs3MX?usp=sharing)
3. Clic derecho → Compartir
4. Añade el email de la cuenta de servicio con permisos de **Editor**
5. Guardar

### 4. Configurar la aplicación

**Opción A: Archivo JSON (desarrollo/local)**

```bash
# Variable de entorno con la ruta al JSON
export GOOGLE_DRIVE_CREDENTIALS_JSON=/ruta/al/archivo-service-account.json
```

**Opción B: Base64 (Docker/EasyPanel)**

Para no montar archivos, codifica el JSON en base64:

```bash
# En Linux/Mac
cat service-account.json | base64 -w0

# Añade a las variables de entorno
GOOGLE_DRIVE_CREDENTIALS_JSON_BASE64=<resultado_del_comando>
```

En EasyPanel, añade estas variables al servicio Django:

| Variable | Valor |
|----------|-------|
| `GOOGLE_DRIVE_FOLDER_ID` | `1ljZUHTQaAcM4j8xiJXbrj2Ja_IkMs3MX` (ya está por defecto) |
| `GOOGLE_DRIVE_CREDENTIALS_JSON_BASE64` | El JSON codificado en base64 |

### 5. Reiniciar la aplicación

Tras configurar las variables, reinicia el contenedor Django. Los nuevos adjuntos se subirán automáticamente a la carpeta de Drive.

## Comportamiento

- **Con Drive configurado:** Cada adjunto se guarda en GridFS (MongoDB) **y** en Google Drive
- **Sin Drive configurado:** Solo en GridFS (comportamiento actual)
- La app sirve los archivos desde GridFS (rápido). Drive es copia de respaldo y acceso externo
- Los documentos en MongoDB incluyen `drive_file_id` y `drive_web_link` cuando se sube a Drive
