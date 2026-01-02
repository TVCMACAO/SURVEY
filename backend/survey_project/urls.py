"""
URL configuration for survey_project project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.1/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    1. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path, include, re_path
from django.views.static import serve as static_serve
from django.conf import settings
from django.http import FileResponse, Http404
from pathlib import Path
import os

def serve_frontend(request, path=''):
    """
    Serve the React frontend:
    1. Try to serve the actual file if it exists (for assets like CSS, JS, images)
    2. If file doesn't exist, serve index.html (for SPA routing)
    """
    # #region agent log
    import logging
    logger = logging.getLogger(__name__)
    logger.info(f"Serving frontend - Host: {request.get_host()}, Path: {request.path}")
    # #endregion
    
    frontend_root = Path(settings.FRONTEND_ROOT)
    
    # Remove leading slash from path
    file_path = path.lstrip('/')
    
    # Try to serve the actual file if it exists
    if file_path:
        full_path = frontend_root / file_path
        # #region agent log
        logger.info(f"Checking for file: {full_path}, exists: {full_path.exists()}")
        # #endregion
        if full_path.exists() and full_path.is_file():
            # Serve the actual file with correct MIME type
            return static_serve(request, file_path, document_root=str(frontend_root))
    
    # If file doesn't exist, serve index.html for SPA routing
    index_path = frontend_root / 'index.html'
    if index_path.exists():
        # #region agent log
        logger.info(f"Serving index.html for SPA route: {request.path}")
        # #endregion
        return FileResponse(open(index_path, 'rb'), content_type='text/html')
    
    # #region agent log
    logger.error(f"Frontend not found at: {index_path}")
    # #endregion
    raise Http404('Frontend not found')

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include('surveys.urls')),
    # Serve frontend files and SPA routes
    re_path(r'^(?!api|admin|static).*$', serve_frontend, name='frontend'),
]