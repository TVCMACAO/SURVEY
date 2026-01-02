#!/usr/bin/env python
"""
Script para asegurar que los usuarios básicos existan en la base de datos
Se ejecuta después de las migraciones para crear usuarios si no existen
"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'survey_project.settings')
django.setup()

from surveys.models import User
from django.conf import settings
from pathlib import Path
import logging

logger = logging.getLogger(__name__)

# Usuarios por defecto a crear
DEFAULT_USERS = [
    {
        'username': 'root',
        'password': 'root123',
        'email': 'root@example.com',
        'role': 'root',
        'is_staff': True,
        'is_superuser': True,
        'is_active': True
    },
    {
        'username': 'deiner',
        'password': 'deiner123',
        'email': 'deiner@example.com',
        'role': 'encuestador',
        'is_staff': False,
        'is_superuser': False,
        'is_active': True
    }
]

def ensure_users():
    """Crea usuarios por defecto si no existen"""
    db_path = settings.DATABASES['default']['NAME']
    db_path_resolved = Path(db_path).resolve()
    
    logger.info(f"Verificando usuarios en: {db_path_resolved}")
    logger.info(f"Base de datos existe: {db_path_resolved.exists()}")
    
    # Verificar que las tablas existan antes de intentar crear usuarios
    from django.db import connection
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='surveys_user';")
            table_exists = cursor.fetchone() is not None
        if not table_exists:
            logger.error("❌ La tabla surveys_user no existe. Las migraciones pueden no haberse ejecutado correctamente.")
            logger.info("Intentando ejecutar migraciones...")
            from django.core.management import call_command
            call_command('migrate', verbosity=1, interactive=False)
            logger.info("✅ Migraciones ejecutadas")
    except Exception as e:
        logger.error(f"❌ Error al verificar/crear tablas: {e}")
        return 0, 0
    
    created_count = 0
    updated_count = 0
    
    for user_data in DEFAULT_USERS:
        username = user_data['username']
        try:
            user, created = User.objects.get_or_create(
                username=username,
                defaults={
                    'email': user_data['email'],
                    'role': user_data['role'],
                    'is_staff': user_data['is_staff'],
                    'is_superuser': user_data['is_superuser'],
                    'is_active': user_data['is_active']
                }
            )
            
            if created:
                user.set_password(user_data['password'])
                user.save()
                logger.info(f"✅ Usuario creado: {username} (ID: {user.id})")
                created_count += 1
            else:
                # Actualizar contraseña y permisos si el usuario ya existe
                user.set_password(user_data['password'])
                user.email = user_data['email']
                user.role = user_data['role']
                user.is_staff = user_data['is_staff']
                user.is_superuser = user_data['is_superuser']
                user.is_active = user_data['is_active']
                user.save()
                logger.info(f"🔄 Usuario actualizado: {username} (ID: {user.id})")
                updated_count += 1
                
        except Exception as e:
            logger.error(f"❌ Error al crear/actualizar usuario {username}: {e}")
    
    total_users = User.objects.count()
    logger.info(f"Total de usuarios en la base de datos: {total_users}")
    logger.info(f"Usuarios creados: {created_count}, actualizados: {updated_count}")
    
    return created_count, updated_count

if __name__ == '__main__':
    ensure_users()

