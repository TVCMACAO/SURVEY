#!/usr/bin/env python
"""
Script para asegurar que el usuario root existe en MongoDB.
Se ejecuta al inicio de la aplicación.
"""
import os
import sys
import django

# Configurar Django
sys.path.insert(0, '/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'survey_project.settings')
django.setup()

from surveys.mongo_user_utils import ensure_root_user as ensure_root_user_mongo

def ensure_root_user():
    """Crea el usuario root en MongoDB si no existe"""
    default_password = os.environ.get('ROOT_USER_PASSWORD', 'root123')  # Contraseña por defecto
    
    try:
        user = ensure_root_user_mongo(password=default_password)
        if user and user.get('_id'):
            print(f"Contraseña por defecto: {default_password}")
            print("IMPORTANTE: Cambia la contraseña después del primer login")
        return user
    except Exception as e:
        print(f"Error al crear/verificar usuario 'root' en MongoDB: {e}")
        import traceback
        traceback.print_exc()
        return None

if __name__ == '__main__':
    ensure_root_user()

