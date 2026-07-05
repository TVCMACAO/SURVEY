"""
Vistas para servir el frontend React en producción
"""
import logging
from pathlib import Path

from django.http import FileResponse, Http404, HttpResponse

logger = logging.getLogger(__name__)


def _frontend_dist_dirs():
    return [
        Path('/app/frontend/survey-ui/dist'),
        Path(__file__).resolve().parent.parent.parent / 'frontend' / 'survey-ui' / 'dist',
    ]


def serve_frontend(request):
    """Serve index.html for SPA routing."""
    for base in _frontend_dist_dirs():
        index_path = base / 'index.html'
        if index_path.is_file():
            return FileResponse(open(index_path, 'rb'), content_type='text/html')
    raise Http404("Frontend not found")


def serve_frontend_asset(request, path):
    """Serve built frontend assets (JS, CSS, images)."""
    for frontend_dir in _frontend_dist_dirs():
        if not frontend_dir.exists():
            continue
        asset_path = frontend_dir / 'assets' / path
        if not asset_path.is_file():
            asset_path = frontend_dir / path
        if asset_path.is_file():
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
            elif path.endswith(('.jpg', '.jpeg')):
                content_type = 'image/jpeg'
            elif path.endswith('.svg'):
                content_type = 'image/svg+xml'
            elif path.endswith('.woff2'):
                content_type = 'font/woff2'
            elif path.endswith('.woff'):
                content_type = 'font/woff'
            return FileResponse(open(asset_path, 'rb'), content_type=content_type)
    raise Http404(f"Asset not found: {path}")
