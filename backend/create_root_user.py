#!/usr/bin/env python
"""
Script para crear usuario root y verificar configuración
Ejecutar: python create_root_user.py
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

def create_or_update_root_user():
    """Crea o actualiza el usuario root"""
    username = 'root'
    password = 'root123'
    
    try:
        # Verificar si el usuario ya existe
        if User.objects.filter(username=username).exists():
            user = User.objects.get(username=username)
            print(f"⚠️  El usuario '{username}' ya existe.")
            print(f"   - ID: {user.id}")
            print(f"   - Email: {user.email}")
            print(f"   - Role: {user.role}")
            print(f"   - is_active: {user.is_active}")
            print(f"   - is_staff: {user.is_staff}")
            print(f"   - is_superuser: {user.is_superuser}")
            
            # Actualizar contraseña y asegurar que esté activo
            user.set_password(password)
            user.is_active = True
            user.is_staff = True
            user.is_superuser = True
            user.role = 'root'
            user.save()
            print(f"✅ Usuario '{username}' actualizado exitosamente!")
            print(f"   - Contraseña actualizada")
            print(f"   - is_active: {user.is_active}")
            print(f"   - is_staff: {user.is_staff}")
            print(f"   - is_superuser: {user.is_superuser}")
            return True
        else:
            # Crear el usuario
            user = User.objects.create_user(
                username=username,
                password=password,
                email=f'{username}@example.com',
                role='root',
                is_staff=True,
                is_superuser=True,
                is_active=True
            )
            
            print(f"✅ Usuario '{username}' creado exitosamente!")
            print(f"   - Username: {user.username}")
            print(f"   - Email: {user.email}")
            print(f"   - Role: {user.role}")
            print(f"   - ID: {user.id}")
            print(f"   - is_active: {user.is_active}")
            print(f"   - is_staff: {user.is_staff}")
            print(f"   - is_superuser: {user.is_superuser}")
            
            # Verificar que la contraseña funciona
            if user.check_password(password):
                print(f"✅ Verificación: La contraseña es correcta")
            else:
                print(f"❌ ERROR: La contraseña no es correcta después de crear el usuario")
                return False
            
            return True
        
    except Exception as e:
        print(f"❌ Error al crear/actualizar el usuario: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == '__main__':
    # Ejecutar migraciones primero
    if not setup_database():
        sys.exit(1)
    
    # Crear o actualizar usuario root
    success = create_or_update_root_user()
    sys.exit(0 if success else 1)

