#!/bin/bash
# Migra los archivos de adjuntos (media/attachments/) al servidor EasyPanel.
# Los adjuntos se guardan en disco; MongoDB solo tiene la metadata.
# Si las respuestas tienen IDs de adjuntos pero los archivos no están en el servidor, verás 404.
#
# Uso:
#   1. Configura EASYPANEL_HOST y ruta de destino
#   2. Ejecuta: ./migrate_attachments_to_easypanel.sh
#
# Alternativa manual con scp:
#   scp -r backend/media/attachments/* user@easypanel.clinicamaicao.com:/ruta/del/proyecto/backend/media/attachments/

EASYPANEL_HOST="${EASYPANEL_HOST:-easypanel.clinicamaicao.com}"
# Ruta en el servidor remoto donde está el proyecto (ajusta según tu despliegue)
REMOTE_MEDIA_PATH="${REMOTE_MEDIA_PATH:-/app/media/attachments}"
LOCAL_ATTACHMENTS="backend/media/attachments"

if [ ! -d "$LOCAL_ATTACHMENTS" ]; then
  echo "No existe $LOCAL_ATTACHMENTS - no hay adjuntos que migrar."
  exit 0
fi

echo "Migrando adjuntos de $LOCAL_ATTACHMENTS a $EASYPANEL_HOST:$REMOTE_MEDIA_PATH"
echo "Asegúrate de tener acceso SSH al servidor."
echo ""
echo "Ejemplo con scp (ejecuta manualmente con tus credenciales):"
echo "  ssh $EASYPANEL_HOST 'mkdir -p $REMOTE_MEDIA_PATH'"
echo "  scp -r $LOCAL_ATTACHMENTS/* $EASYPANEL_HOST:$REMOTE_MEDIA_PATH/"
echo ""
echo "O con rsync:"
echo "  rsync -avz $LOCAL_ATTACHMENTS/ $EASYPANEL_HOST:$REMOTE_MEDIA_PATH/"
