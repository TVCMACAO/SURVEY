"""
Manejador de excepciones personalizado para devolver JSON en lugar de HTML
"""
from rest_framework.views import exception_handler
from rest_framework.response import Response
from rest_framework import status
import logging

logger = logging.getLogger(__name__)


def custom_exception_handler(exc, context):
    """
    Manejador de excepciones personalizado que siempre devuelve JSON
    """
    # Llamar al manejador por defecto de DRF
    response = exception_handler(exc, context)
    
    # Si DRF no puede manejar la excepción, crear una respuesta JSON genérica
    if response is None:
        logger.error(f"Unhandled exception: {type(exc).__name__}: {str(exc)}", exc_info=True)
        response = Response(
            {
                "detail": f"Error interno del servidor: {str(exc)}",
                "error_type": type(exc).__name__
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
    else:
        # Asegurar que la respuesta tenga el formato correcto
        if not isinstance(response.data, dict):
            response.data = {"detail": str(response.data)}
    
    return response


