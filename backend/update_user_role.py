#!/usr/bin/env python3
"""
Script para actualizar el rol de un usuario a 'root'
Uso: python3 update_user_role.py <username>
"""
import os
import sys
import django

# Setup Django
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'survey_project.settings')
django.setup()

from surveys.models import User

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print("Uso: python3 update_user_role.py <username>")
        print("\nUsuarios disponibles:")
        for user in User.objects.all():
            print(f"  - {user.username} (rol actual: {user.role})")
        sys.exit(1)
    
    username = sys.argv[1]
    try:
        user = User.objects.get(username=username)
        print(f"Usuario encontrado: {user.username}")
        print(f"Rol actual: {user.role}")
        
        user.role = 'root'
        user.save()
        
        print(f"✅ Rol actualizado a 'root' para el usuario {user.username}")
    except User.DoesNotExist:
        print(f"❌ Error: Usuario '{username}' no encontrado")
        print("\nUsuarios disponibles:")
        for user in User.objects.all():
            print(f"  - {user.username} (rol actual: {user.role})")
        sys.exit(1)





