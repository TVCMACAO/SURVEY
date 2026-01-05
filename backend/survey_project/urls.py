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
from .frontend_views import serve_frontend, serve_frontend_asset

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include('surveys.urls')),
    
    # Servir archivos estáticos del frontend (JS, CSS, assets, etc.)
    re_path(r'^static/(?P<path>.*)$', serve, {'document_root': settings.STATIC_ROOT}),
    re_path(r'^assets/(?P<path>.*)$', serve_frontend_asset),
    
    # Servir el frontend React para todas las demás rutas
    # Esto debe ir al final para capturar todas las rutas no manejadas
    re_path(r'^(?!api/|admin/|static/|assets/).*$', serve_frontend, name='frontend'),
]