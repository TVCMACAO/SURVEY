#!/usr/bin/env python
"""
Script para ejecutar migraciones y crear usuario
Ejecutar: python setup_and_create_user.py
"""
import os
import sys
import django

# Setup Django
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'survey_project.settings')
django.setup()

from django.core.management import call_command
from surveys.models import User

def setup_database():
    """Ejecuta las migraciones de Django"""
    try:
        print("🔄 Ejecutando migraciones de Django...")
        call_command('migrate', verbosity=1, interactive=False)
        print("✅ Migraciones completadas exitosamente!")
        return True
    except Exception as e:
        print(f"❌ Error al ejecutar migraciones: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

def create_user(username, password, email=None, role='encuestador'):
    """Crea un usuario en la base de datos"""
    try:
        # Verificar si el usuario ya existe
        if User.objects.filter(username=username).exists():
            print(f"⚠️  El usuario '{username}' ya existe en la base de datos.")
            existing_user = User.objects.get(username=username)
            print(f"   - ID: {existing_user.id}")
            print(f"   - Email: {existing_user.email}")
            print(f"   - Role: {existing_user.role}")
            return False
        
        # Crear el usuario
        user = User.objects.create_user(
            username=username,
            password=password,
            email=email or f'{username}@example.com',
            role=role
        )
        
        print(f"✅ Usuario '{username}' creado exitosamente!")
        print(f"   - Username: {user.username}")
        print(f"   - Email: {user.email}")
        print(f"   - Role: {user.role}")
        print(f"   - ID: {user.id}")
        return True
        
    except Exception as e:
        print(f"❌ Error al crear el usuario: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == '__main__':
    # Ejecutar migraciones primero
    if not setup_database():
        sys.exit(1)
    
    # Crear usuario deiner con password deiner123
    username = 'deiner'
    password = 'deiner123'
    
    success = create_user(username, password)
    sys.exit(0 if success else 1)


