#!/usr/bin/env python
"""
Script para verificar usuarios en la base de datos
"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'survey_project.settings')
django.setup()

from django.conf import settings
from surveys.models import User
from pathlib import Path

print("=" * 80)
print("VERIFICACIÓN DE BASE DE DATOS Y USUARIOS")
print("=" * 80)

# Verificar ruta de base de datos
db_path = settings.DATABASES['default']['NAME']
db_path_resolved = Path(db_path).resolve()
print(f"\n📁 Ruta de base de datos:")
print(f"   Configurada: {db_path}")
print(f"   Resuelta: {db_path_resolved}")
print(f"   Existe: {db_path_resolved.exists()}")
print(f"   Tamaño: {db_path_resolved.stat().st_size if db_path_resolved.exists() else 0} bytes")

# Verificar /app/data
print(f"\n📂 Directorio /app/data:")
print(f"   Existe: {os.path.exists('/app/data')}")
if os.path.exists('/app/data'):
    print(f"   Permisos: {oct(os.stat('/app/data').st_mode)[-3:]}")
    files = os.listdir('/app/data')
    print(f"   Archivos: {files}")

# Verificar usuarios
print(f"\n👥 Usuarios en la base de datos:")
try:
    users = User.objects.all()
    print(f"   Total: {users.count()}")
    if users.exists():
        for user in users:
            print(f"   - {user.username} (ID: {user.id}, Role: {user.role}, Active: {user.is_active})")
    else:
        print("   ⚠️  NO HAY USUARIOS EN LA BASE DE DATOS")
except Exception as e:
    print(f"   ❌ Error al consultar usuarios: {e}")

print("\n" + "=" * 80)


