#!/bin/bash
# Migra los archivos de adjuntos (media/attachments/) al servidor EasyPanel.
# Los adjuntos se guardan en disco; MongoDB solo tiene la metadata.
# Si las respuestas tienen IDs de adjuntos pero los archivos no están en el servidor, verás 404.
#
# OPCIÓN A - Si tienes los archivos localmente y EasyPanel en el mismo servidor:
#   docker cp backend/media/attachments/. survey-django:/app/media/attachments/
#
# OPCIÓN B - Si los archivos están en otro servidor (ej. tu máquina local):
#   1. Copia al servidor EasyPanel: scp -r backend/media/attachments/* user@HOST:/tmp/attachments/
#   2. En el servidor: docker cp /tmp/attachments/. survey-django:/app/media/attachments/
#
# OPCIÓN C - Si usas EasyPanel con volumen montado en el host:
#   Copia los archivos a la ruta del volumen que EasyPanel use para media_volume.

EASYPANEL_HOST="${EASYPANEL_HOST:-easypanel.clinicamaicao.com}"
CONTAINER_NAME="${CONTAINER_NAME:-survey-django}"
LOCAL_ATTACHMENTS="backend/media/attachments"

echo "=== Migración de adjuntos a EasyPanel ==="
echo ""

if [ ! -d "$LOCAL_ATTACHMENTS" ]; then
  echo "No existe $LOCAL_ATTACHMENTS - no hay adjuntos que migrar."
  echo ""
  echo "Si los adjuntos están en otro servidor, cópialos primero a esta carpeta."
  exit 0
fi

echo "Archivos a migrar: $(find "$LOCAL_ATTACHMENTS" -type f 2>/dev/null | wc -l)"
echo ""
echo "Si el contenedor Django ($CONTAINER_NAME) está en ESTE servidor:"
echo "  mkdir -p backend/media/attachments"
echo "  docker exec $CONTAINER_NAME mkdir -p /app/media/attachments"
echo "  docker cp $LOCAL_ATTACHMENTS/. $CONTAINER_NAME:/app/media/attachments/"
echo ""
echo "Si EasyPanel está en un servidor remoto ($EASYPANEL_HOST):"
echo "  1. scp -r $LOCAL_ATTACHMENTS/* user@$EASYPANEL_HOST:/tmp/attachments/"
echo "  2. ssh user@$EASYPANEL_HOST 'docker cp /tmp/attachments/. survey-django:/app/media/attachments/'"
