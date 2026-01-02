#!/usr/bin/env python
"""
Script para crear un usuario en la base de datos Django
Uso: python create_user.py <username> <password> [email] [role]
"""
import os
import sys
import django

# Setup Django
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'survey_project.settings')
django.setup()

from surveys.models import User

def create_user(username, password, email=None, role='encuestador'):
    """Crea un usuario en la base de datos"""
    try:
        # Verificar si el usuario ya existe
        if User.objects.filter(username=username).exists():
            print(f"❌ El usuario '{username}' ya existe en la base de datos.")
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
    if len(sys.argv) < 3:
        print("Uso: python create_user.py <username> <password> [email] [role]")
        print("Roles disponibles: root, encuestador, analista")
        sys.exit(1)
    
    username = sys.argv[1]
    password = sys.argv[2]
    email = sys.argv[3] if len(sys.argv) > 3 else None
    role = sys.argv[4] if len(sys.argv) > 4 else 'encuestador'
    
    if role not in ['root', 'encuestador', 'analista']:
        print(f"❌ Rol inválido: {role}. Roles disponibles: root, encuestador, analista")
        sys.exit(1)
    
    success = create_user(username, password, email, role)
    sys.exit(0 if success else 1)

