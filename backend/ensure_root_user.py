#!/usr/bin/env python
"""
Script para asegurar que el usuario root existe en la base de datos.
Se ejecuta al inicio de la aplicación.
"""
import os
import sys
import django

# Configurar Django
sys.path.insert(0, '/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'survey_project.settings')
django.setup()

from surveys.models import User

def ensure_root_user():
    """Crea el usuario root si no existe"""
    username = 'root'
    default_password = os.environ.get('ROOT_USER_PASSWORD', 'root123')  # Contraseña por defecto
    
    try:
        user = User.objects.get(username=username)
        print(f"Usuario '{username}' ya existe (ID: {user.id})")
        return user
    except User.DoesNotExist:
        print(f"Usuario '{username}' no existe, creándolo...")
        user = User.objects.create_user(
            username=username,
            password=default_password,
            email='root@example.com',
            role='root',
            is_staff=True,
            is_superuser=True
        )
        print(f"Usuario '{username}' creado exitosamente (ID: {user.id})")
        print(f"Contraseña por defecto: {default_password}")
        print("IMPORTANTE: Cambia la contraseña después del primer login")
        return user
    except Exception as e:
        print(f"Error al crear/verificar usuario '{username}': {e}")
        import traceback
        traceback.print_exc()
        return None

if __name__ == '__main__':
    ensure_root_user()

