"""
Middleware para permitir subdominios de EasyPanel dinámicamente
"""
import re
from django.http import HttpResponseBadRequest


class EasyPanelHostMiddleware:
    """Middleware para permitir subdominios de EasyPanel dinámicamente"""
    
    # Patrones de hosts permitidos de EasyPanel
    ALLOWED_PATTERNS = [
        r'^[^.]+\.rhfh8t\.easypanel\.host$',  # Cualquier subdominio de rhfh8t.easypanel.host
        r'^[^.]+\.easypanel\.host$',  # Cualquier subdominio de easypanel.host
    ]
    
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        host = request.get_host().split(':')[0]  # Remover puerto si existe
        
        # Verificar si el host está permitido por los patrones
        is_allowed = False
        for pattern in self.ALLOWED_PATTERNS:
            if re.match(pattern, host):
                is_allowed = True
                break
        
        # Si no está permitido, verificar ALLOWED_HOSTS estándar
        if not is_allowed:
            from django.conf import settings
            if host not in settings.ALLOWED_HOSTS:
                # Si DEBUG está activo, mostrar más información
                if settings.DEBUG:
                    return HttpResponseBadRequest(
                        f"DisallowedHost at {request.path}\n"
                        f"Invalid HTTP_HOST header: '{host}'. "
                        f"You may need to add '{host}' to ALLOWED_HOSTS."
                    )
                return HttpResponseBadRequest("Invalid host header")
        
        return self.get_response(request)

