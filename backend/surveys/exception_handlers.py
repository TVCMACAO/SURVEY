"""
Manejador de excepciones personalizado para DRF.
Asegura que TODAS las respuestas de error sean en formato JSON.
"""
from rest_framework.views import exception_handler
from rest_framework.response import Response
from rest_framework import status
from rest_framework.exceptions import NotAuthenticated, AuthenticationFailed
import logging
import traceback

logger = logging.getLogger(__name__)


def _is_auth_4xx(exc):
    """Excepciones que devuelven 401/403 y son esperadas (token caducado, no autenticado)."""
    if isinstance(exc, (NotAuthenticated, AuthenticationFailed)):
        return True
    try:
        from rest_framework_simplejwt.exceptions import InvalidToken
        if isinstance(exc, InvalidToken):
            return True
    except ImportError:
        pass
    return False


def custom_exception_handler(exc, context):
    """
    Manejador de excepciones personalizado que:
    1. Primero intenta usar el manejador por defecto de DRF
    2. Si falla, devuelve una respuesta JSON con el error
    3. Loguea errores; 401 por token inválido/caducado solo a nivel DEBUG para no llenar logs
    """
    request = context.get('request')
    view = context.get('view')
    is_auth_4xx = _is_auth_4xx(exc)

    # Log: 401 por token caducado/inválido es esperado; solo DEBUG. El resto, ERROR.
    if is_auth_4xx:
        logger.debug(
            "Auth 4xx: %s on %s %s -> %s",
            type(exc).__name__, getattr(request, 'method', '') or '', getattr(request, 'path', '') or '', str(exc)[:100]
        )
    else:
        logger.error("=" * 60)
        logger.error(f"Exception in {view.__class__.__name__ if view else 'Unknown'}")
        logger.error(f"Exception type: {type(exc).__name__}")
        logger.error(f"Exception message: {str(exc)}")
        logger.error(f"Request path: {request.path if request else 'Unknown'}")
        logger.error(f"Request method: {request.method if request else 'Unknown'}")
        logger.error(f"Traceback: {traceback.format_exc()}")
        logger.error("=" * 60)

    # Intentar usar el manejador por defecto de DRF
    response = exception_handler(exc, context)
    
    if response is not None:
        # DRF manejó la excepción, añadir información adicional si es útil
        return response
    
    # Si DRF no manejó la excepción (error 500 típicamente), crear respuesta JSON
    error_data = {
        'detail': f'Error interno del servidor: {str(exc)[:200]}',
        'error_type': type(exc).__name__,
    }
    
    # Añadir más información solo en desarrollo (DEBUG=True)
    from django.conf import settings
    if settings.DEBUG:
        error_data['traceback'] = traceback.format_exc()
        error_data['view'] = view.__class__.__name__ if view else None
        error_data['path'] = str(request.path) if request else None
    
    return Response(error_data, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
