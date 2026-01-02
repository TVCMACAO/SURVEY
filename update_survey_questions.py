#!/usr/bin/env python3
"""
Script para actualizar las preguntas de una encuesta existente
Uso: python update_survey_questions.py <username> <password> <survey_id>
"""

import requests
import json
import sys

BASE_URL = "http://192.168.0.248:8085"

def get_token(username, password):
    """Obtiene el token de autenticación"""
    response = requests.post(
        f"{BASE_URL}/api/token/",
        json={"username": username, "password": password}
    )
    
    if response.status_code == 200:
        return response.json()["access"]
    else:
        print(f"❌ Error al autenticar: {response.status_code}")
        print(f"Respuesta: {response.text}")
        return None

def update_survey_questions(api_token, survey_id, questions):
    """Actualiza las preguntas de una encuesta existente"""
    headers = {
        "Authorization": f"Bearer {api_token}",
        "Content-Type": "application/json"
    }
    
    # Obtener la encuesta actual
    get_response = requests.get(
        f"{BASE_URL}/api/surveys/{survey_id}/",
        headers=headers
    )
    
    if get_response.status_code != 200:
        print(f"❌ Error al obtener la encuesta {survey_id}: {get_response.status_code}")
        return None
    
    survey_data = get_response.json()
    
    # Actualizar las preguntas
    survey_data["questions"] = questions
    
    # Enviar actualización
    update_response = requests.put(
        f"{BASE_URL}/api/surveys/{survey_id}/",
        headers=headers,
        json=survey_data
    )
    
    if update_response.status_code == 200:
        print(f"✅ Encuesta actualizada exitosamente!")
        survey = update_response.json()
        print(f"Título: {survey.get('title', 'N/A')}")
        print(f"Preguntas: {len(survey.get('questions', []))}")
        return survey
    else:
        print(f"❌ Error al actualizar: {update_response.status_code}")
        print(f"Respuesta: {update_response.text}")
        return None

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Uso: python update_survey_questions.py <username> <password> <survey_id>")
        print("Ejemplo: python update_survey_questions.py root password123 694ebbcfd99b44d0803c4ce6")
        sys.exit(1)
    
    username = sys.argv[1]
    password = sys.argv[2]
    survey_id = sys.argv[3]
    
    print("🔐 Obteniendo token de autenticación...")
    token = get_token(username, password)
    
    if not token:
        sys.exit(1)
    
    # Ejemplo de preguntas - reemplazar con las preguntas reales
    questions = [
        {
            "question_text": "EPS - ASEGURADOR",
            "question_type": "dropdown",
            "required": True,
            "options": ["ANAS WAYUU", "DUSAKAWI", "NUEVA EPS", "MAGISTERIO", "SANITAS", "CAJACOPI", "POLICIA", "OTRO"]
        },
        # Agregar más preguntas aquí según el formulario original
    ]
    
    print(f"📝 Actualizando encuesta {survey_id}...")
    print("⚠️  NOTA: Este script tiene preguntas de ejemplo. Edita el script para agregar todas las preguntas reales.")
    update_survey_questions(token, survey_id, questions)





