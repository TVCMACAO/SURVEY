#!/usr/bin/env python
"""
Script para listar todos los usuarios de la base de datos
Ejecutar: python list_users.py
"""
import os
import sys
import django

# Setup Django
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'survey_project.settings')
django.setup()

from surveys.models import User

def list_users():
    """Lista todos los usuarios de la base de datos"""
    try:
        users = User.objects.all().order_by('id')
        
        if not users.exists():
            print("📭 No hay usuarios en la base de datos.")
            return
        
        print("=" * 80)
        print(f"📋 Lista de usuarios ({users.count()} total)")
        print("=" * 80)
        print()
        
        for user in users:
            print(f"👤 Usuario ID: {user.id}")
            print(f"   - Username: {user.username}")
            print(f"   - Email: {user.email or '(sin email)'}")
            print(f"   - Role: {user.role}")
            print(f"   - Nombre completo: {user.get_full_name() or '(sin nombre)'}")
            print(f"   - is_active: {user.is_active}")
            print(f"   - is_staff: {user.is_staff}")
            print(f"   - is_superuser: {user.is_superuser}")
            print(f"   - Fecha de registro: {user.date_joined}")
            print(f"   - Último acceso: {user.last_login or '(nunca)'}")
            print("-" * 80)
        
        print()
        print("=" * 80)
        
    except Exception as e:
        print(f"❌ Error al listar usuarios: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == '__main__':
    list_users()


