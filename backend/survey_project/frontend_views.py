"""
Vistas para servir el frontend React en producción
"""
from django.http import Http404, FileResponse
from pathlib import Path


def serve_frontend(request):
    """
    Vista que sirve el index.html del frontend React para cualquier ruta
    que no sea /api/ o /admin/. Esto permite que React Router maneje el routing.
    """
    # Buscar el index.html del frontend en diferentes ubicaciones posibles
    frontend_paths = [
        Path('/app/frontend/survey-ui/dist/index.html'),
        Path(__file__).resolve().parent.parent.parent / 'frontend' / 'survey-ui' / 'dist' / 'index.html',
    ]
    
    for path in frontend_paths:
        if path.exists():
            return FileResponse(open(path, 'rb'), content_type='text/html')
    
    raise Http404("Frontend not found. Checked paths: " + ", ".join(str(p) for p in frontend_paths))


def serve_frontend_asset(request, path):
    """
    Sirve archivos estáticos del frontend (JS, CSS, imágenes, etc.)
    Los archivos están en dist/assets/ cuando se construye con Vite
    """
    import logging
    logger = logging.getLogger(__name__)
    
    frontend_dirs = [
        Path('/app/frontend/survey-ui/dist'),
        Path(__file__).resolve().parent.parent.parent / 'frontend' / 'survey-ui' / 'dist',
    ]
    
    # Log para debugging
    logger.info(f"Buscando asset: {path}")
    
    for frontend_dir in frontend_dirs:
        # Verificar que el directorio base existe
        if not frontend_dir.exists():
            logger.warning(f"Frontend dir no existe: {frontend_dir}")
            continue
        
        # Intentar primero en assets/ (estructura de Vite)
        asset_path = frontend_dir / 'assets' / path
        logger.info(f"Intentando: {asset_path} (existe: {asset_path.exists()})")
        
        if not asset_path.exists():
            # Si no está en assets/, intentar directamente
            asset_path = frontend_dir / path
            logger.info(f"Intentando directamente: {asset_path} (existe: {asset_path.exists()})")
        
        if asset_path.exists() and asset_path.is_file():
            logger.info(f"Asset encontrado: {asset_path}")
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
            elif path.endswith('.woff') or path.endswith('.woff2'):
                content_type = 'font/woff2' if path.endswith('.woff2') else 'font/woff'
            
            return FileResponse(open(asset_path, 'rb'), content_type=content_type)
    
    # Listar archivos disponibles para debugging
    checked_paths = []
    for frontend_dir in frontend_dirs:
        if frontend_dir.exists():
            assets_dir = frontend_dir / 'assets'
            if assets_dir.exists():
                checked_paths.append(f"{assets_dir}: {list(assets_dir.iterdir())[:5] if assets_dir.exists() else 'no existe'}")
    
    error_msg = f"Asset not found: {path}. Checked paths: {checked_paths}"
    logger.error(error_msg)
    raise Http404(error_msg)
