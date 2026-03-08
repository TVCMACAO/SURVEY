"""
Integración con Google Drive para guardar adjuntos en una carpeta compartida.

Requisitos:
1. Crear un proyecto en Google Cloud Console
2. Habilitar la API de Google Drive
3. Crear una cuenta de servicio y descargar el JSON de credenciales
4. Compartir la carpeta de Drive con el email de la cuenta de servicio
   (ej: algo@proyecto.iam.gserviceaccount.com) con permisos de "Editor"

Configuración en settings o variables de entorno:
- GOOGLE_DRIVE_FOLDER_ID: ID de la carpeta (ej: 1ljZUHTQaAcM4j8xiJXbrj2Ja_IkMs3MX)
- GOOGLE_DRIVE_CREDENTIALS_JSON: ruta al archivo JSON de la cuenta de servicio
- GOOGLE_DRIVE_CREDENTIALS_JSON_BASE64: JSON codificado en base64 (alternativa para env)
"""
import base64
import io
import logging
import os
import time

logger = logging.getLogger(__name__)
_last_drive_404_log = 0.0

# ID de la carpeta SURVEYAPP en Google Drive
DEFAULT_DRIVE_FOLDER_ID = '1ljZUHTQaAcM4j8xiJXbrj2Ja_IkMs3MX'

_drive_service = None


def _get_drive_service():
    """Obtiene el cliente de Google Drive (singleton)."""
    global _drive_service
    if _drive_service is not None:
        return _drive_service

    from django.conf import settings
    folder_id = getattr(settings, 'GOOGLE_DRIVE_FOLDER_ID', None) or os.environ.get('GOOGLE_DRIVE_FOLDER_ID', DEFAULT_DRIVE_FOLDER_ID)
    creds_path = getattr(settings, 'GOOGLE_DRIVE_CREDENTIALS_JSON', None) or os.environ.get('GOOGLE_DRIVE_CREDENTIALS_JSON', '')
    creds_base64 = (os.environ.get('GOOGLE_DRIVE_CREDENTIALS_JSON_BASE64', '') or '').strip().replace('\n', '').replace('\r', '')

    if not creds_path and not creds_base64:
        logger.info("Google Drive: no hay credenciales configuradas. Adjuntos solo en GridFS.")
        return None

    try:
        from google.oauth2 import service_account
        from googleapiclient.discovery import build
        from googleapiclient.http import MediaIoBaseUpload

        if creds_base64:
            import json
            creds_json = json.loads(base64.b64decode(creds_base64).decode('utf-8'))
            creds = service_account.Credentials.from_service_account_info(
                creds_json,
                scopes=['https://www.googleapis.com/auth/drive.file']
            )
        else:
            if not os.path.isfile(creds_path):
                logger.warning("Google Drive: archivo de credenciales no encontrado: %s", creds_path)
                return None
            creds = service_account.Credentials.from_service_account_file(
                creds_path,
                scopes=['https://www.googleapis.com/auth/drive.file']
            )

        _drive_service = build('drive', 'v3', credentials=creds)
        logger.info("Google Drive: cliente inicializado correctamente. Carpeta: %s", folder_id)
        return _drive_service
    except ImportError as e:
        logger.warning("Google Drive: dependencias no instaladas. Ejecuta: pip install google-auth google-api-python-client. Error: %s", e)
        return None
    except Exception as e:
        logger.exception("Google Drive: error al inicializar: %s", e)
        return None


def is_google_drive_configured():
    """Indica si Google Drive está configurado y disponible."""
    service = _get_drive_service()
    return service is not None


def upload_to_google_drive(file_obj, filename, content_type=None):
    """
    Sube un archivo a la carpeta de Google Drive configurada.

    Args:
        file_obj: objeto file-like (con read()) o bytes
        filename: nombre del archivo
        content_type: MIME type (opcional)

    Returns:
        dict con 'id' (file_id de Drive) y 'web_view_link' si está disponible,
        o None si falla o no está configurado.
    """
    service = _get_drive_service()
    if service is None:
        return None

    from django.conf import settings
    folder_id = getattr(settings, 'GOOGLE_DRIVE_FOLDER_ID', None) or os.environ.get('GOOGLE_DRIVE_FOLDER_ID', DEFAULT_DRIVE_FOLDER_ID)

    try:
        from googleapiclient.http import MediaIoBaseUpload

        # Asegurar que tenemos un objeto con seek/read
        if hasattr(file_obj, 'read'):
            content = file_obj.read()
            if hasattr(file_obj, 'seek'):
                file_obj.seek(0)  # Restaurar posición para posible uso posterior
        else:
            content = bytes(file_obj) if not isinstance(file_obj, bytes) else file_obj

        media = MediaIoBaseUpload(
            io.BytesIO(content),
            mimetype=content_type or 'application/octet-stream',
            resumable=True
        )

        file_metadata = {
            'name': filename,
            'parents': [folder_id],
        }

        uploaded = service.files().create(
            body=file_metadata,
            media_body=media,
            fields='id, webViewLink'
        ).execute()

        drive_file_id = uploaded.get('id')
        web_link = uploaded.get('webViewLink')
        logger.info("Google Drive: archivo subido: %s (id=%s)", filename, drive_file_id)
        return {'id': drive_file_id, 'web_view_link': web_link}
    except Exception as e:
        # 404 = carpeta no existe o sin acceso: warning como máximo una vez por minuto
        try:
            from googleapiclient.errors import HttpError
            if isinstance(e, HttpError) and e.resp.status == 404:
                global _last_drive_404_log
                now = time.time()
                if now - _last_drive_404_log >= 60:
                    _last_drive_404_log = now
                    logger.warning(
                        "Google Drive: carpeta no encontrada o sin acceso (404). "
                        "Revise GOOGLE_DRIVE_FOLDER_ID y permisos. Adjuntos se guardan solo en GridFS."
                    )
                return None
        except Exception:
            pass
        logger.exception("Google Drive: error al subir %s: %s", filename, e)
        return None
