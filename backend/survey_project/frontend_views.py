"""
Vistas para servir el frontend React en producción
"""
from django.views.generic import TemplateView
from django.conf import settings
from django.http import Http404, FileResponse
from pathlib import Path
import os


class FrontendView(TemplateView):
    """
    Vista que sirve el index.html del frontend React para cualquier ruta
    que no sea /api/ o /admin/. Esto permite que React Router maneje el routing.
    """
    template_name = 'frontend/index.html'
    
    def get_template_names(self):
        # Buscar el index.html del frontend
        frontend_paths = [
            BASE_DIR / 'frontend' / 'survey-ui' / 'dist' / 'index.html',
            Path('/app/frontend/survey-ui/dist/index.html'),
        ]
        
        for path in frontend_paths:
            if path.exists():
                return [str(path)]
        
        # Si no se encuentra, usar template por defecto
        return super().get_template_names()
    
    def get(self, request, *args, **kwargs):
        # Buscar el index.html del frontend
        frontend_paths = [
            BASE_DIR / 'frontend' / 'survey-ui' / 'dist' / 'index.html',
            Path('/app/frontend/survey-ui/dist/index.html'),
        ]
        
        for path in frontend_paths:
            if path.exists():
                return FileResponse(open(path, 'rb'), content_type='text/html')
        
        raise Http404("Frontend not found")


def serve_frontend_asset(request, path):
    """
    Sirve archivos estáticos del frontend (JS, CSS, imágenes, etc.)
    """
    BASE_DIR = Path(__file__).resolve().parent.parent
    frontend_dirs = [
        BASE_DIR / 'frontend' / 'survey-ui' / 'dist',
        Path('/app/frontend/survey-ui/dist'),
    ]
    
    for frontend_dir in frontend_dirs:
        asset_path = frontend_dir / path
        if asset_path.exists() and asset_path.is_file():
            # Determinar content type
            content_type = 'application/octet-stream'
            if path.endswith('.js'):
                content_type = 'application/javascript'
            elif path.endswith('.css'):
                content_type = 'text/css'
            elif path.endswith('.html'):
                content_type = 'text/html'
            elif path.endswith('.json'):
                content_type = 'application/json'
            elif path.endswith('.png'):
                content_type = 'image/png'
            elif path.endswith('.jpg') or path.endswith('.jpeg'):
                content_type = 'image/jpeg'
            elif path.endswith('.svg'):
                content_type = 'image/svg+xml'
            
            return FileResponse(open(asset_path, 'rb'), content_type=content_type)
    
    raise Http404(f"Asset not found: {path}")

