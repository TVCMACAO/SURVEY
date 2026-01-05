"""
Vistas para servir el frontend React en producción
"""
from django.http import Http404, FileResponse
from pathlib import Path
import os


def serve_frontend(request):
    """
    Vista que sirve el index.html del frontend React para cualquier ruta
    que no sea /api/ o /admin/. Esto permite que React Router maneje el routing.
    """
    import json
    import traceback
    from django.http import HttpResponse
    log_file_path = '/home/vps/Documentos/survey-app/.cursor/debug.log'
    
    try:
        # #region agent log
        try:
            with open(log_file_path, 'a') as f:
                f.write(json.dumps({
                    "sessionId": "debug-session",
                    "runId": "run1",
                    "hypothesisId": "C",
                    "location": "frontend_views.py:9",
                    "message": "serve_frontend called",
                    "data": {
                        "path": request.path,
                        "method": request.method
                    },
                    "timestamp": int(__import__('time').time() * 1000)
                }) + '\n')
        except Exception:
            pass
        # #endregion
        
        # Buscar el index.html del frontend en diferentes ubicaciones posibles
        frontend_paths = [
            Path('/app/frontend/survey-ui/dist/index.html'),
            Path(__file__).resolve().parent.parent.parent / 'frontend' / 'survey-ui' / 'dist' / 'index.html',
        ]
        
        # #region agent log
        try:
            with open(log_file_path, 'a') as f:
                f.write(json.dumps({
                    "sessionId": "debug-session",
                    "runId": "run1",
                    "hypothesisId": "C",
                    "location": "frontend_views.py:9",
                    "message": "Checking frontend paths",
                    "data": {
                        "paths": [str(p) for p in frontend_paths],
                        "paths_exist": [p.exists() for p in frontend_paths]
                    },
                    "timestamp": int(__import__('time').time() * 1000)
                }) + '\n')
        except Exception:
            pass
        # #endregion
        
        for path in frontend_paths:
            try:
                if path.exists() and path.is_file():
                    # #region agent log
                    try:
                        with open(log_file_path, 'a') as f:
                            f.write(json.dumps({
                                "sessionId": "debug-session",
                                "runId": "run1",
                                "hypothesisId": "C",
                                "location": "frontend_views.py:9",
                                "message": "Frontend file found, serving",
                                "data": {
                                    "path": str(path),
                                    "is_file": path.is_file(),
                                    "readable": os.access(path, os.R_OK)
                                },
                                "timestamp": int(__import__('time').time() * 1000)
                            }) + '\n')
                    except Exception:
                        pass
                    # #endregion
                    
                    # Abrir el archivo y crear la respuesta
                    file_handle = open(path, 'rb')
                    response = FileResponse(file_handle, content_type='text/html')
                    # #region agent log
                    try:
                        with open(log_file_path, 'a') as f:
                            f.write(json.dumps({
                                "sessionId": "debug-session",
                                "runId": "run1",
                                "hypothesisId": "C",
                                "location": "frontend_views.py:9",
                                "message": "FileResponse created successfully",
                                "data": {
                                    "path": str(path)
                                },
                                "timestamp": int(__import__('time').time() * 1000)
                            }) + '\n')
                    except Exception:
                        pass
                    # #endregion
                    return response
            except (IOError, OSError, PermissionError) as file_error:
                # #region agent log
                try:
                    with open(log_file_path, 'a') as f:
                        f.write(json.dumps({
                            "sessionId": "debug-session",
                            "runId": "run1",
                            "hypothesisId": "C",
                            "location": "frontend_views.py:9",
                            "message": "Error opening file, trying next path",
                            "data": {
                                "path": str(path),
                                "error_type": type(file_error).__name__,
                                "error_message": str(file_error)
                            },
                            "timestamp": int(__import__('time').time() * 1000)
                        }) + '\n')
                except Exception:
                    pass
                # #endregion
                continue
            except Exception as file_error:
                # #region agent log
                try:
                    with open(log_file_path, 'a') as f:
                        f.write(json.dumps({
                            "sessionId": "debug-session",
                            "runId": "run1",
                            "hypothesisId": "C",
                            "location": "frontend_views.py:9",
                            "message": "Unexpected error, trying next path",
                            "data": {
                                "path": str(path),
                                "error_type": type(file_error).__name__,
                                "error_message": str(file_error),
                                "traceback": traceback.format_exc()
                            },
                            "timestamp": int(__import__('time').time() * 1000)
                        }) + '\n')
                except Exception:
                    pass
                # #endregion
                continue
        
        # #region agent log
        try:
            with open(log_file_path, 'a') as f:
                f.write(json.dumps({
                    "sessionId": "debug-session",
                    "runId": "run1",
                    "hypothesisId": "C",
                    "location": "frontend_views.py:9",
                    "message": "Frontend file not found in any path",
                    "data": {
                        "checked_paths": [str(p) for p in frontend_paths],
                        "paths_exist": [p.exists() for p in frontend_paths],
                        "paths_are_files": [p.is_file() if p.exists() else False for p in frontend_paths]
                    },
                    "timestamp": int(__import__('time').time() * 1000)
                }) + '\n')
        except Exception:
            pass
        # #endregion
        
        # Si no se encuentra el archivo, devolver un 404 en lugar de 500
        error_msg = "Frontend not found. Checked paths: " + ", ".join(str(p) for p in frontend_paths)
        
        # #region agent log
        try:
            with open(log_file_path, 'a') as f:
                f.write(json.dumps({
                    "sessionId": "debug-session",
                    "runId": "run1",
                    "hypothesisId": "C",
                    "location": "frontend_views.py:9",
                    "message": "Frontend file not found, returning 404",
                    "data": {
                        "error_msg": error_msg
                    },
                    "timestamp": int(__import__('time').time() * 1000)
                }) + '\n')
        except Exception:
            pass
        # #endregion
        
        raise Http404(error_msg)
    except Exception as e:
        # Capturar cualquier error inesperado y devolver un 500 con información de debug
        # #region agent log
        try:
            with open(log_file_path, 'a') as f:
                f.write(json.dumps({
                    "sessionId": "debug-session",
                    "runId": "run1",
                    "hypothesisId": "D",
                    "location": "frontend_views.py:9",
                    "message": "Unexpected error in serve_frontend",
                    "data": {
                        "error_type": type(e).__name__,
                        "error_message": str(e),
                        "traceback": traceback.format_exc()
                    },
                    "timestamp": int(__import__('time').time() * 1000)
                }) + '\n')
        except Exception:
            pass
        # #endregion
        
        # Devolver un error 500 con información útil
        error_response = HttpResponse(
            f"Internal Server Error: {type(e).__name__}: {str(e)}\n\nTraceback:\n{traceback.format_exc()}",
            status=500,
            content_type='text/plain'
        )
        return error_response


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
