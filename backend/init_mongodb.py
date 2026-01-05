#!/usr/bin/env python
"""
Script de inicialización de MongoDB para Survey App.
Crea índices y verifica que las colecciones estén listas.
"""
import os
import sys
import django

# Configurar Django
sys.path.insert(0, '/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'survey_project.settings')
django.setup()

from surveys.mongo_utils import get_mongo_db, get_mongo_collection
from surveys.mongo_user_utils import ensure_root_user
from bson import ObjectId
import pymongo


def create_indexes():
    """
    Crea los índices necesarios en las colecciones de MongoDB.
    """
    print("=== Creando índices en MongoDB ===")
    
    db = get_mongo_db()
    
    # ===== COLECCIÓN: users =====
    print("\n1. Colección 'users':")
    users_collection = get_mongo_collection('users')
    
    # Índice único en username
    try:
        users_collection.create_index('username', unique=True, name='username_unique')
        print("   ✓ Índice único creado: username")
    except Exception as e:
        print(f"   ⚠ Índice username ya existe o error: {e}")
    
    # Índice en email (puede ser único si quieres)
    try:
        users_collection.create_index('email', name='email_index')
        print("   ✓ Índice creado: email")
    except Exception as e:
        print(f"   ⚠ Índice email ya existe o error: {e}")
    
    # Índice en role para búsquedas rápidas
    try:
        users_collection.create_index('role', name='role_index')
        print("   ✓ Índice creado: role")
    except Exception as e:
        print(f"   ⚠ Índice role ya existe o error: {e}")
    
    # ===== COLECCIÓN: groups =====
    print("\n2. Colección 'groups':")
    groups_collection = get_mongo_collection('groups')
    
    # Índice en name (puede ser único si quieres nombres únicos)
    try:
        groups_collection.create_index('name', name='name_index')
        print("   ✓ Índice creado: name")
    except Exception as e:
        print(f"   ⚠ Índice name ya existe o error: {e}")
    
    # Índice en created_by para búsquedas por usuario
    try:
        groups_collection.create_index('created_by', name='created_by_index')
        print("   ✓ Índice creado: created_by")
    except Exception as e:
        print(f"   ⚠ Índice created_by ya existe o error: {e}")
    
    # ===== COLECCIÓN: surveys =====
    print("\n3. Colección 'surveys':")
    surveys_collection = get_mongo_collection('surveys')
    
    # Índice en group para búsquedas por grupo
    try:
        surveys_collection.create_index('group', name='group_index')
        print("   ✓ Índice creado: group")
    except Exception as e:
        print(f"   ⚠ Índice group ya existe o error: {e}")
    
    # Índice compuesto en is_deleted e is_public para filtros comunes
    try:
        surveys_collection.create_index([('is_deleted', 1), ('is_public', 1)], name='deleted_public_index')
        print("   ✓ Índice compuesto creado: is_deleted + is_public")
    except Exception as e:
        print(f"   ⚠ Índice deleted_public ya existe o error: {e}")
    
    # Índice en title para búsquedas de texto (opcional, para búsquedas por título)
    try:
        surveys_collection.create_index('title', name='title_index')
        print("   ✓ Índice creado: title")
    except Exception as e:
        print(f"   ⚠ Índice title ya existe o error: {e}")
    
    # ===== COLECCIÓN: responses =====
    print("\n4. Colección 'responses':")
    responses_collection = get_mongo_collection('responses')
    
    # Índice en survey para búsquedas por encuesta
    try:
        responses_collection.create_index('survey', name='survey_index')
        print("   ✓ Índice creado: survey")
    except Exception as e:
        print(f"   ⚠ Índice survey ya existe o error: {e}")
    
    # Índice en surveyor_id para búsquedas por encuestador
    try:
        responses_collection.create_index('surveyor_id', name='surveyor_id_index')
        print("   ✓ Índice creado: surveyor_id")
    except Exception as e:
        print(f"   ⚠ Índice surveyor_id ya existe o error: {e}")
    
    # Índice en device_id para búsquedas por dispositivo
    try:
        responses_collection.create_index('device_id', name='device_id_index')
        print("   ✓ Índice creado: device_id")
    except Exception as e:
        print(f"   ⚠ Índice device_id ya existe o error: {e}")
    
    # Índice en synced para búsquedas de respuestas no sincronizadas
    try:
        responses_collection.create_index('synced', name='synced_index')
        print("   ✓ Índice creado: synced")
    except Exception as e:
        print(f"   ⚠ Índice synced ya existe o error: {e}")
    
    # Índice compuesto en survey + synced para búsquedas comunes
    try:
        responses_collection.create_index([('survey', 1), ('synced', 1)], name='survey_synced_index')
        print("   ✓ Índice compuesto creado: survey + synced")
    except Exception as e:
        print(f"   ⚠ Índice survey_synced ya existe o error: {e}")
    
    print("\n=== Índices creados exitosamente ===")


def verify_collections():
    """
    Verifica que las colecciones existan (se crean automáticamente, pero verificamos).
    """
    print("\n=== Verificando colecciones ===")
    
    db = get_mongo_db()
    collections = db.list_collection_names()
    
    required_collections = ['users', 'groups', 'surveys', 'responses']
    
    for collection_name in required_collections:
        if collection_name in collections:
            count = db[collection_name].count_documents({})
            print(f"   ✓ Colección '{collection_name}' existe ({count} documentos)")
        else:
            print(f"   ⚠ Colección '{collection_name}' no existe (se creará automáticamente al insertar)")


def main():
    """
    Función principal que ejecuta todas las inicializaciones.
    """
    print("=" * 50)
    print("Inicialización de MongoDB para Survey App")
    print("=" * 50)
    
    try:
        # Verificar conexión
        db = get_mongo_db()
        db.command('ping')
        print("\n✓ Conexión a MongoDB exitosa")
        
        # Verificar colecciones
        verify_collections()
        
        # Crear índices
        create_indexes()
        
        # Crear usuario root si no existe
        print("\n=== Verificando usuario root ===")
        root_password = os.environ.get('ROOT_USER_PASSWORD', 'root123')
        ensure_root_user(password=root_password)
        
        print("\n" + "=" * 50)
        print("✓ Inicialización de MongoDB completada")
        print("=" * 50)
        
    except Exception as e:
        print(f"\n✗ Error durante la inicialización: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == '__main__':
    main()

