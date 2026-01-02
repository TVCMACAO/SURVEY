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
from django.views.static import serve
from django.conf import settings
from django.http import FileResponse
from pathlib import Path

def serve_frontend(request, path=''):
    """Serve the React frontend index.html for all non-API routes"""
    frontend_path = Path(settings.FRONTEND_ROOT) / 'index.html'
    if frontend_path.exists():
        return FileResponse(open(frontend_path, 'rb'), content_type='text/html')
    from django.http import HttpResponse
    return HttpResponse('Frontend not found', status=404)

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include('surveys.urls')),
    # Serve static files from frontend build
    re_path(r'^(?!api|admin|static).*$', serve_frontend, name='frontend'),
]