"""
Handlers de error personalizados para devolver JSON en lugar de HTML
"""
from django.http import JsonResponse
import logging

logger = logging.getLogger(__name__)


def handler500(request):
    """
    Handler 500 personalizado que devuelve JSON
    """
    logger.error("500 Internal Server Error", exc_info=True)
    return JsonResponse(
        {"detail": "Error interno del servidor. Por favor, contacta al administrador."},
        status=500
    )


def handler404(request, exception):
    """
    Handler 404 personalizado que devuelve JSON para API, HTML para otros
    """
    if request.path.startswith('/api/'):
        return JsonResponse(
            {"detail": "Recurso no encontrado."},
            status=404
        )
    # Para rutas no-API, usar el handler por defecto de Django
    from django.views.defaults import page_not_found
    return page_not_found(request, exception)


def handler403(request, exception):
    """
    Handler 403 personalizado que devuelve JSON para API
    """
    if request.path.startswith('/api/'):
        return JsonResponse(
            {"detail": "No tienes permisos para acceder a este recurso."},
            status=403
        )
    # Para rutas no-API, usar el handler por defecto de Django
    from django.views.defaults import permission_denied
    return permission_denied(request, exception)


def handler400(request, exception):
    """
    Handler 400 personalizado que devuelve JSON para API
    """
    if request.path.startswith('/api/'):
        return JsonResponse(
            {"detail": "Solicitud incorrecta."},
            status=400
        )
    # Para rutas no-API, usar el handler por defecto de Django
    from django.views.defaults import bad_request
    return bad_request(request, exception)


