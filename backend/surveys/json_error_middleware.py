"""
Middleware para garantizar que TODAS las respuestas de error sean JSON.
Captura errores que ocurren antes de que DRF pueda manejarlos.
"""
import json
import logging
import traceback
from django.http import JsonResponse

logger = logging.getLogger(__name__)


class JSONErrorMiddleware:
    """
    Middleware que captura cualquier excepción no manejada y devuelve JSON.
    Debe estar al PRINCIPIO de la lista de middlewares.
    """
    
    def __init__(self, get_response):
        self.get_response = get_response
    
    def __call__(self, request):
        try:
            response = self.get_response(request)
            
            # Si la respuesta es un error 5xx y tiene content-type HTML, convertir a JSON
            if response.status_code >= 500:
                content_type = response.get('Content-Type', '')
                if 'text/html' in content_type:
                    logger.error(f"Converting HTML error response to JSON for {request.path}")
                    return JsonResponse(
                        {
                            'detail': 'Error interno del servidor',
                            'status_code': response.status_code,
                            'path': request.path,
                        },
                        status=response.status_code
                    )
            
            return response
            
        except Exception as e:
            logger.error("=" * 60)
            logger.error("UNHANDLED EXCEPTION IN MIDDLEWARE")
            logger.error(f"Path: {request.path}")
            logger.error(f"Method: {request.method}")
            logger.error(f"Exception type: {type(e).__name__}")
            logger.error(f"Exception message: {str(e)}")
            logger.error(f"Traceback: {traceback.format_exc()}")
            logger.error("=" * 60)
            
            return JsonResponse(
                {
                    'detail': f'Error interno del servidor: {str(e)[:200]}',
                    'error_type': type(e).__name__,
                    'path': request.path,
                },
                status=500
            )
    
    def process_exception(self, request, exception):
        """
        Captura excepciones que ocurren en las vistas.
        """
        logger.error("=" * 60)
        logger.error("EXCEPTION IN VIEW (caught by middleware)")
        logger.error(f"Path: {request.path}")
        logger.error(f"Method: {request.method}")
        logger.error(f"Exception type: {type(exception).__name__}")
        logger.error(f"Exception message: {str(exception)}")
        logger.error(f"Traceback: {traceback.format_exc()}")
        logger.error("=" * 60)
        
        return JsonResponse(
            {
                'detail': f'Error: {str(exception)[:200]}',
                'error_type': type(exception).__name__,
                'path': request.path,
            },
            status=500
        )
