#!/usr/bin/env python3
"""
Script para asignar encuestas al grupo TRABAJO SOCIAL
"""
import os
import sys
import django

# Configurar Django
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'survey_project.settings')
django.setup()

from surveys.mongo_utils import get_survey_groups_collection, get_surveys_collection, get_mongo_collection
from bson import ObjectId

# Títulos de las encuestas a asignar
SURVEY_TITLES = [
    "Encuesta de Satisfacción de Urgencia",
    "Encuesta de Satisfacción de Hospitalización",
    "ENCUESTA SATISFACCION PACIENTES MATERNAS",
    "ENCUESTAS DE SATISFACCIÓN POBLACIÓN WAYUU",
    "Encuesta de Satisfacción Oficina de Anás Wayuu",
    "ENCUESTA DE SATISFACCIÓN UCI NEONATAL -PEDIÁTRICO",
    "ENCUESTA DE SATISFACCIÓN SERVICIO DE LABORATORIO CLÍNICO",
    "ENCUESTA DE SATISFACCIÓN SERVICIO DE UNIDAD CARDIOVASCULAR",
    "ENCUESTA DE SATISFACCIÓN SERVICIO DE IMÁGENES",
    "ENCUESTA DE SASTIFACION AL USUARIO - UCI ADULTO",
    "ENCUESTA DE SATISFACCIÓN CONSULTA EXTERNA"
]

GROUP_NAME = "TRABAJO SOCIAL"

def main():
    print("=" * 60)
    print("ASIGNACIÓN DE ENCUESTAS AL GRUPO TRABAJO SOCIAL")
    print("=" * 60)
    
    # Obtener colecciones
    try:
        groups_collection = get_survey_groups_collection()
        surveys_collection = get_surveys_collection()
    except Exception as e:
        # Fallback si las funciones no existen
        db = get_mongo_collection('groups').database
        groups_collection = db['survey_groups']
        surveys_collection = db['surveys']
    
    # Verificar o crear el grupo
    print(f"\n1. Verificando grupo '{GROUP_NAME}'...")
    group = groups_collection.find_one({'name': GROUP_NAME})
    
    if not group:
        print(f"   Grupo '{GROUP_NAME}' no existe. Creándolo...")
        result = groups_collection.insert_one({
            'name': GROUP_NAME,
            'created_by': 'root'  # O el ID del usuario root
        })
        group = groups_collection.find_one({'_id': result.inserted_id})
        print(f"   ✓ Grupo '{GROUP_NAME}' creado con ID: {group['_id']}")
    else:
        print(f"   ✓ Grupo '{GROUP_NAME}' encontrado con ID: {group['_id']}")
    
    group_id = group['_id']
    
    # Buscar y actualizar encuestas
    print(f"\n2. Buscando y asignando encuestas al grupo...")
    updated_count = 0
    not_found = []
    
    for title in SURVEY_TITLES:
        # Buscar encuesta por título (case-insensitive)
        survey = surveys_collection.find_one({
            'title': {'$regex': f'^{title}$', '$options': 'i'},
            'is_deleted': {'$ne': True}
        })
        
        if survey:
            survey_id = survey.get('_id')
            current_group = survey.get('group')
            
            # Actualizar solo si no tiene grupo o tiene un grupo diferente
            if not current_group or str(current_group) != str(group_id):
                surveys_collection.update_one(
                    {'_id': survey_id},
                    {'$set': {'group': group_id}}
                )
                print(f"   ✓ '{title}' asignada al grupo")
                updated_count += 1
            else:
                print(f"   - '{title}' ya está asignada al grupo")
        else:
            print(f"   ✗ '{title}' no encontrada")
            not_found.append(title)
    
    # Resumen
    print(f"\n" + "=" * 60)
    print("RESUMEN")
    print("=" * 60)
    print(f"Grupo: {GROUP_NAME} (ID: {group_id})")
    print(f"Encuestas actualizadas: {updated_count}")
    print(f"Encuestas no encontradas: {len(not_found)}")
    
    if not_found:
        print(f"\nEncuestas no encontradas:")
        for title in not_found:
            print(f"  - {title}")
    
    print(f"\n✓ Proceso completado")

if __name__ == '__main__':
    main()

