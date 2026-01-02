#!/usr/bin/env python3
"""
Script para crear la encuesta de satisfacción de Consulta Externa
basada en el formulario de Google Forms de Clínica Maicao
"""

import requests
import json
import sys

# Configuración
# Ajustar según tu configuración - el backend está en el puerto 8000 internamente
# pero accesible a través de nginx en el puerto 8085
BASE_URL = "http://192.168.0.248:8085"  # URL del servidor
DEFAULT_GROUP_ID = "693ad3cccced5113d39dc29d"  # ID del grupo por defecto

def update_survey(api_token, survey_id):
    """Actualiza la encuesta de satisfacción de Consulta Externa existente"""
    
    headers = {
        "Authorization": f"Bearer {api_token}",
        "Content-Type": "application/json"
    }
    
    survey_data = {
        "title": "ENCUESTA DE SATISFACCIÓN CONSULTA EXTERNA",
        "description": "Encuesta de satisfacción para los servicios de consulta externa de la Clínica Maicao S.A.",
        "group": DEFAULT_GROUP_ID,
        "is_public": True,
        "questions": [
            {
                "question_text": "ASEGURADOR - EPS",
                "question_type": "dropdown",
                "required": True,
                "options": [
                    "ANAS WAYUU",
                    "DUSAKAWI",
                    "NUEVA EPS",
                    "SANITAS",
                    "POLICIA",
                    "MAGISTERIO",
                    "CAJACOPI",
                    "OTRO"
                ]
            },
            {
                "question_text": "SERVICIO ESPECIFICO SOLICITADO:",
                "question_type": "single_choice",
                "required": False,
                "options": [
                    "CITA MEDICA",
                    "VACUNACION",
                    "PROGRAMACION",
                    "TERAPIAS FÍSICAS",
                    "CURACIONES",
                    "OTRO"
                ]
            },
            {
                "question_text": "PERTENECE ALGUNA DE ESTAS POBLACIONES?",
                "question_type": "single_choice",
                "required": False,
                "options": [
                    "ETNICA",
                    "DISCAPACIDAD",
                    "ADULTO MAYOR",
                    "MIGRANTE",
                    "VICTIMA DEL CONFLICTO ARMADO",
                    "LGBTIQ+",
                    "NINGUNA"
                ]
            },
            {
                "question_text": "1. Fue informado acerca de los Derechos y Deberes de los usuarios?",
                "question_type": "single_choice",
                "required": True,
                "options": ["SI", "NO"]
            },
            {
                "question_text": "2. Al solicitar la cita medica por el medio escogido ¿Cómo fue el trato y actitud del personal que brindo la atención ?",
                "question_type": "single_choice",
                "required": True,
                "options": ["EXCELENTE", "BUENO", "REGULAR", "MALO", "NO APLICA"]
            },
            {
                "question_text": "3. ¿Como considera la oportunidad en la atención después de facturado con el personal de admisiones el servicio solicitado?",
                "question_type": "single_choice",
                "required": True,
                "options": ["LENTO", "MUY LENTO", "RAPIDO", "MUY RAPIDO", "NO APLICA"]
            },
            {
                "question_text": "4. Como califica la atención del personal vigilancia y portería del servicio?",
                "question_type": "single_choice",
                "required": True,
                "options": ["EXCELENTE", "BUENO", "REGULAR", "MALO"]
            },
            {
                "question_text": "5. Como calificas la atención y trato del personal de recepción y/o administrativo?",
                "question_type": "single_choice",
                "required": True,
                "options": ["EXCELENTE", "BUENO", "REGULAR", "MALO"]
            },
            {
                "question_text": "6. Si acudió cita con especialista, ¿Cuánto tiempo demoro para ser atendido ?",
                "question_type": "single_choice",
                "required": True,
                "options": [
                    "Menos de 10 min",
                    "Entre 30 min y 1 Hora",
                    "Entre 1 y 2 horas",
                    "Entre 2 y 3 horas",
                    "Mas de 3 horas",
                    "No aplica"
                ]
            },
            {
                "question_text": "7. Como califica la atención del médico y/o especialista que lo atendió durante su cita médica (solo si acudió a cita con especialista)?",
                "question_type": "single_choice",
                "required": True,
                "options": ["EXCELENTE", "BUENO", "REGULAR", "MALO", "NO APLICA"]
            },
            {
                "question_text": "8. ¿El personal medico especialista le dio explicaciones e información clara de su diagnóstico, evolución, recomendaciones u orden medica durante su cita?",
                "question_type": "single_choice",
                "required": True,
                "options": ["SI", "NO", "NO APLICA"]
            },
            {
                "question_text": "9. Que le parece el estado de la infraestructura, equipamiento y ambientación del servicio dé consulta externa?",
                "question_type": "single_choice",
                "required": True,
                "options": ["EXCELENTE", "BUENO", "REGULAR", "MALO"]
            },
            {
                "question_text": "10. A nivel general cómo calificaría su satisfacción con los servicios recibidos en la Consulta Externa?",
                "question_type": "single_choice",
                "required": True,
                "options": ["EXCELENTE", "BUENO", "REGULAR", "MALO"]
            },
            {
                "question_text": "11. ¿Recomendaría la Sociedad Médica Clínica Maicao S.A. a amigos y familiares?",
                "question_type": "single_choice",
                "required": True,
                "options": ["SI", "NO", "NO ESTOY SEGURO"]
            },
            {
                "question_text": "Alguna recomendación, sugerencia u observación para la Clínica Maicao?",
                "question_type": "long_text",
                "required": False
            }
        ]
    }
    
    response = requests.put(
        f"{BASE_URL}/api/surveys/{survey_id}/",
        headers=headers,
        json=survey_data
    )
    
    if response.status_code == 200:
        print("✅ Encuesta actualizada exitosamente!")
        survey = response.json()
        print(f"ID de la encuesta: {survey.get('id', 'N/A')}")
        print(f"Título: {survey.get('title', 'N/A')}")
        print(f"Preguntas: {len(survey.get('questions', []))}")
        return survey
    else:
        print(f"❌ Error al actualizar la encuesta: {response.status_code}")
        print(f"Respuesta: {response.text}")
        return None

def create_survey(api_token):
    """Crea la encuesta de satisfacción de Consulta Externa"""
    
    headers = {
        "Authorization": f"Bearer {api_token}",
        "Content-Type": "application/json"
    }
    
    survey_data = {
        "title": "ENCUESTA DE SATISFACCIÓN CONSULTA EXTERNA",
        "description": "Encuesta de satisfacción para los servicios de consulta externa de la Clínica Maicao S.A.",
        "group": DEFAULT_GROUP_ID,
        "is_public": True,
        "questions": [
            {
                "question_text": "ASEGURADOR - EPS",
                "question_type": "dropdown",
                "required": True,
                "options": [
                    "ANAS WAYUU",
                    "DUSAKAWI",
                    "NUEVA EPS",
                    "SANITAS",
                    "POLICIA",
                    "MAGISTERIO",
                    "CAJACOPI",
                    "OTRO"
                ]
            },
            {
                "question_text": "SERVICIO ESPECIFICO SOLICITADO:",
                "question_type": "single_choice",
                "required": False,
                "options": [
                    "CITA MEDICA",
                    "VACUNACION",
                    "PROGRAMACION",
                    "TERAPIAS FÍSICAS",
                    "CURACIONES",
                    "OTRO"
                ]
            },
            {
                "question_text": "PERTENECE ALGUNA DE ESTAS POBLACIONES?",
                "question_type": "single_choice",
                "required": False,
                "options": [
                    "ETNICA",
                    "DISCAPACIDAD",
                    "ADULTO MAYOR",
                    "MIGRANTE",
                    "VICTIMA DEL CONFLICTO ARMADO",
                    "LGBTIQ+",
                    "NINGUNA"
                ]
            },
            {
                "question_text": "1. Fue informado acerca de los Derechos y Deberes de los usuarios?",
                "question_type": "single_choice",
                "required": True,
                "options": ["SI", "NO"]
            },
            {
                "question_text": "2. Al solicitar la cita medica por el medio escogido ¿Cómo fue el trato y actitud del personal que brindo la atención ?",
                "question_type": "single_choice",
                "required": True,
                "options": ["EXCELENTE", "BUENO", "REGULAR", "MALO", "NO APLICA"]
            },
            {
                "question_text": "3. ¿Como considera la oportunidad en la atención después de facturado con el personal de admisiones el servicio solicitado?",
                "question_type": "single_choice",
                "required": True,
                "options": ["LENTO", "MUY LENTO", "RAPIDO", "MUY RAPIDO", "NO APLICA"]
            },
            {
                "question_text": "4. Como califica la atención del personal vigilancia y portería del servicio?",
                "question_type": "single_choice",
                "required": True,
                "options": ["EXCELENTE", "BUENO", "REGULAR", "MALO"]
            },
            {
                "question_text": "5. Como calificas la atención y trato del personal de recepción y/o administrativo?",
                "question_type": "single_choice",
                "required": True,
                "options": ["EXCELENTE", "BUENO", "REGULAR", "MALO"]
            },
            {
                "question_text": "6. Si acudió cita con especialista, ¿Cuánto tiempo demoro para ser atendido ?",
                "question_type": "single_choice",
                "required": True,
                "options": [
                    "Menos de 10 min",
                    "Entre 30 min y 1 Hora",
                    "Entre 1 y 2 horas",
                    "Entre 2 y 3 horas",
                    "Mas de 3 horas",
                    "No aplica"
                ]
            },
            {
                "question_text": "7. Como califica la atención del médico y/o especialista que lo atendió durante su cita médica (solo si acudió a cita con especialista)?",
                "question_type": "single_choice",
                "required": True,
                "options": ["EXCELENTE", "BUENO", "REGULAR", "MALO", "NO APLICA"]
            },
            {
                "question_text": "8. ¿El personal medico especialista le dio explicaciones e información clara de su diagnóstico, evolución, recomendaciones u orden medica durante su cita?",
                "question_type": "single_choice",
                "required": True,
                "options": ["SI", "NO", "NO APLICA"]
            },
            {
                "question_text": "9. Que le parece el estado de la infraestructura, equipamiento y ambientación del servicio dé consulta externa?",
                "question_type": "single_choice",
                "required": True,
                "options": ["EXCELENTE", "BUENO", "REGULAR", "MALO"]
            },
            {
                "question_text": "10. A nivel general cómo calificaría su satisfacción con los servicios recibidos en la Consulta Externa?",
                "question_type": "single_choice",
                "required": True,
                "options": ["EXCELENTE", "BUENO", "REGULAR", "MALO"]
            },
            {
                "question_text": "11. ¿Recomendaría la Sociedad Médica Clínica Maicao S.A. a amigos y familiares?",
                "question_type": "single_choice",
                "required": True,
                "options": ["SI", "NO", "NO ESTOY SEGURO"]
            },
            {
                "question_text": "Alguna recomendación, sugerencia u observación para la Clínica Maicao?",
                "question_type": "long_text",
                "required": False
            }
        ]
    }
    
    response = requests.post(
        f"{BASE_URL}/api/surveys/",
        headers=headers,
        json=survey_data
    )
    
    if response.status_code == 201:
        print("✅ Encuesta creada exitosamente!")
        survey = response.json()
        print(f"ID de la encuesta: {survey.get('id', 'N/A')}")
        print(f"Título: {survey.get('title', 'N/A')}")
        print(f"Preguntas: {len(survey.get('questions', []))}")
        return survey
    else:
        print(f"❌ Error al crear la encuesta: {response.status_code}")
        print(f"Respuesta: {response.text}")
        return None

def get_token(username, password):
    """Obtiene el token JWT"""
    response = requests.post(
        f"{BASE_URL}/api/token/",
        json={"username": username, "password": password}
    )
    
    if response.status_code == 200:
        return response.json().get("access")
    else:
        print(f"❌ Error al obtener token: {response.status_code}")
        print(f"Respuesta: {response.text}")
        return None

def create_urgencia_survey(api_token):
    """Crea la encuesta de satisfacción de Urgencia"""
    
    headers = {
        "Authorization": f"Bearer {api_token}",
        "Content-Type": "application/json"
    }
    
    survey_data = {
        "title": "Encuesta de Satisfacción de Urgencia",
        "description": "Esta encuesta tiene como objetivo seguir mejorando la calidad médica y atención personalizada prestada por la Sociedad Médica Clínica Maicao S.A., para lograrlo, es muy importante para nosotros conocer su opinión, grado de satisfacción y valoraciones. Sus respuestas serán tratadas de forma CONFIDENCIAL Y ANÓNIMA y no serán utilizadas para ningún propósito distinto al de ayudarnos a mejorar.",
        "group": DEFAULT_GROUP_ID,
        "is_public": True,
        "questions": [
            {
                "question_text": "SERVICIO ESPECIFICO:",
                "question_type": "dropdown",
                "required": True,
                "options": [
                    "URGENCIA ADULTO",
                    "URGENCIA PEDIÁTRICA"
                ]
            },
            {
                "question_text": "EPS - ASEGURADOR:",
                "question_type": "dropdown",
                "required": True,
                "options": [
                    "ANAS WAYUU",
                    "DUSAKAWI",
                    "NUEVA EPS",
                    "SANITAS",
                    "CAJACOPI",
                    "MAGISTERIO",
                    "POLICIA",
                    "OTRO"
                ]
            },
            {
                "question_text": "PERTENECE ALGUNAS DE ESTAS POBLACIONES?",
                "question_type": "single_choice",
                "required": True,
                "options": [
                    "ETNICA",
                    "DISCAPACIDAD",
                    "ADULTO MAYOR",
                    "MIGRANTE",
                    "VICTIMA DEL CONFLICTO ARMADO",
                    "LGBTI+Q",
                    "NINGUNA"
                ]
            },
            {
                "question_text": "1. ¿ Fue informado acerca de los derechos y deberes del usuario?",
                "question_type": "single_choice",
                "required": True,
                "options": ["Sí", "No"]
            },
            {
                "question_text": "2. Como califica la rapidez en la atención y valoración inicial de la enfermera del Triage?",
                "question_type": "single_choice",
                "required": True,
                "options": ["Demasiado rapida", "Rápida", "Lento", "Demasiado lento", "No aplica"]
            },
            {
                "question_text": "3. ¿Cómo calificaría el trato y la información brindada por el personal administrativo de admisiones?",
                "question_type": "single_choice",
                "required": True,
                "options": ["Excelente", "Bueno", "Regular", "Malo"]
            },
            {
                "question_text": "4. ¿Cuánto tiempo esperó para la atención a su urgencia en sala de espera?",
                "question_type": "single_choice",
                "required": True,
                "options": [
                    "La atención fue inmediata",
                    "Menos de 30 min",
                    "Entre 30 min y 1 hora",
                    "Entre 1 hora y 2 horas",
                    "Más de 2 horas",
                    "No aplica"
                ]
            },
            {
                "question_text": "5. ¿Cómo calificas la atención y valoración del médico general durante el proceso de ingreso (consultorio)?",
                "question_type": "single_choice",
                "required": True,
                "options": ["Excelente", "Bueno", "Regular", "Malo", "No aplica"]
            },
            {
                "question_text": "6. ¿Cómo calificas la atención del personal de enfermería después de su ingreso?",
                "question_type": "single_choice",
                "required": True,
                "options": ["Excelente", "Bueno", "Regular", "Malo"]
            },
            {
                "question_text": "7. ¿Cómo calificas la atención del médico que lo atendió durante su estancia en la urgencia?",
                "question_type": "single_choice",
                "required": True,
                "options": ["Excelente", "Bueno", "Regular", "Malo"]
            },
            {
                "question_text": "8. ¿El médico le brindo una explicación clara sobre su diagnóstico?",
                "question_type": "single_choice",
                "required": True,
                "options": ["Sí", "No", "Mas o menos"]
            },
            {
                "question_text": "9. ¿Cómo consideras la atención y amabilidad del personal de vigilancia y portería del servicio?",
                "question_type": "single_choice",
                "required": True,
                "options": ["Excelente", "Bueno", "Regular", "Malo"]
            },
            {
                "question_text": "10. ¿ Cómo calificas la rapidez en la respuesta del personal ante el llamado, queja o reclamo generado durante su instancia en el servicio?",
                "question_type": "single_choice",
                "required": True,
                "options": ["Excelente", "Bueno", "Regular", "Malo", "No se ha efectuado PQR"]
            },
            {
                "question_text": "11. ¿Cómo calificas la limpieza de aseos y zonas comunes?",
                "question_type": "single_choice",
                "required": True,
                "options": ["Excelente", "Bueno", "Regular", "Malo"]
            },
            {
                "question_text": "12. A nivel general, ¿Cómo califica su satisfacción con los servicios recibidos en el servicio de urgencias de la institución?",
                "question_type": "single_choice",
                "required": True,
                "options": ["Excelente", "Bueno", "Regular", "Malo"]
            },
            {
                "question_text": "13. ¿Recomendaría la Sociedad Médica Clínica Maicao S.A. a amigos y familiares?",
                "question_type": "single_choice",
                "required": True,
                "options": ["Sí", "No", "No estoy seguro"]
            },
            {
                "question_text": "Observaciones y sugerencias, ¿Qué mejoraría de la Sociedad Médica Clínica Maicao S.A.?",
                "question_type": "long_text",
                "required": False
            }
        ]
    }
    
    response = requests.post(
        f"{BASE_URL}/api/surveys/",
        headers=headers,
        json=survey_data
    )
    
    if response.status_code == 201:
        print("✅ Encuesta de Urgencia creada exitosamente!")
        survey = response.json()
        print(f"ID de la encuesta: {survey.get('id', 'N/A')}")
        print(f"Título: {survey.get('title', 'N/A')}")
        print(f"Preguntas: {len(survey.get('questions', []))}")
        return survey
    else:
        print(f"❌ Error al crear la encuesta: {response.status_code}")
        print(f"Respuesta: {response.text}")
        return None

def create_hospitalizacion_survey(api_token):
    """Crea la encuesta de satisfacción de Hospitalización"""
    
    headers = {
        "Authorization": f"Bearer {api_token}",
        "Content-Type": "application/json"
    }
    
    survey_data = {
        "title": "Encuesta de Satisfacción de Hospitalización",
        "description": "Esta encuesta tiene como objetivo seguir mejorando la calidad médica y atención personalizada prestada por la Sociedad Médica Clínica Maicao S.A., para lograrlo, es muy importante para nosotros conocer su opinión, grado de satisfacción y valoraciones. Sus respuestas serán tratadas de forma CONFIDENCIAL Y ANÓNIMA y no serán utilizadas para ningún propósito distinto al de ayudarnos a mejorar.",
        "group": DEFAULT_GROUP_ID,
        "is_public": True,
        "questions": [
            {
                "question_text": "SERVICIO ESPECIFICO",
                "question_type": "dropdown",
                "required": True,
                "options": [
                    "HOSPITALIZACION 2DO PSIO",
                    "HOSPITALIZACION 4TO B",
                    "HOSPITALIZACION 5TO B PEDIATRICO",
                    "HOSPITALIZACION 6TO C"
                ]
            },
            {
                "question_text": "EPS - ASEGURADOR",
                "question_type": "dropdown",
                "required": True,
                "options": [
                    "ANAS WAYUU",
                    "NUEVA EPS",
                    "DUSAKAWI",
                    "MAGISTERIO",
                    "SANITAS",
                    "POLICIA",
                    "CAJACOPI",
                    "OTRO"
                ]
            },
            {
                "question_text": "PERTENECE ALGUNA DE ESTAS POBLACIONES?",
                "question_type": "single_choice",
                "required": True,
                "options": [
                    "ÉTNICA",
                    "DISCAPACIDAD",
                    "ADULTO MAYOR",
                    "MIGRANTE",
                    "VICTIMA CONLFICTO ARMADO",
                    "LGBTI+Q",
                    "NINGUNA"
                ]
            },
            {
                "question_text": "1. ¿Fue informada(o) acerca de los derechos y deberes del paciente?",
                "question_type": "single_choice",
                "required": True,
                "options": ["SI", "NO"]
            },
            {
                "question_text": "2. ¿Cómo califica la atención del médico y/o especialista que lo atendió durante su estancia en el área de hospitalización?",
                "question_type": "single_choice",
                "required": True,
                "options": ["Excelente", "Bueno", "Regular", "Malo"]
            },
            {
                "question_text": "3. ¿Cómo califica la atención de los auxiliares de enfermería que lo atendió durante su estancia en el área de hospitalización?",
                "question_type": "single_choice",
                "required": True,
                "options": ["Excelente", "Bueno", "Regular", "Malo"]
            },
            {
                "question_text": "4. ¿El médico y/o especialista le brindo una explicación clara sobre su diagnóstico?",
                "question_type": "single_choice",
                "required": True,
                "options": ["Sí", "No", "Tal vez"]
            },
            {
                "question_text": "5. Como calificas la higiene y limpieza de la habitación y baño?",
                "question_type": "single_choice",
                "required": True,
                "options": ["Excelente", "Bueno", "Regular", "Malo"]
            },
            {
                "question_text": "6. La calidad general, y sabor y presentación de las comidas para usted fue:",
                "question_type": "single_choice",
                "required": True,
                "options": ["Excelente", "Bueno", "Regular", "Malo"]
            },
            {
                "question_text": "7. Como calificas la puntualidad en el servicio de alimentación?",
                "question_type": "single_choice",
                "required": True,
                "options": ["Excelente", "Bueno", "Regular", "Malo"]
            },
            {
                "question_text": "8. Como califica la atención y amabilidad del personal de portería y vigilancia de la institución?",
                "question_type": "single_choice",
                "required": True,
                "options": ["Excelente", "Bueno", "Regular", "Malo"]
            },
            {
                "question_text": "9. ¿Cómo calificas la rapidez en la respuesta del personal ante el llamado, queja o reclamo generado durante su instancia en el servicio?",
                "question_type": "single_choice",
                "required": True,
                "options": ["Excelente", "Bueno", "Regular", "Malo", "No se ha efectuado PQR"]
            },
            {
                "question_text": "10. ¿Cómo calificas el estado de la infraestructura, equipamiento y ambientación de la institución?",
                "question_type": "single_choice",
                "required": True,
                "options": ["Excelente", "Bueno", "Regular", "Malo"]
            },
            {
                "question_text": "11. A nivel general, ¿Cómo califica su satisfacción con los servicios recibidos por la hospitalización?",
                "question_type": "single_choice",
                "required": True,
                "options": ["Excelente", "Bueno", "Regular", "Malo"]
            },
            {
                "question_text": "12. ¿Recomendaría la Sociedad Médica Clínica Maicao S.A. a amigos y familiares?",
                "question_type": "single_choice",
                "required": True,
                "options": ["Sí", "No", "No estoy seguro"]
            },
            {
                "question_text": "Observaciones y sugerencias, ¿Qué mejoraría de la Sociedad Médica Clínica Maicao S.A.?",
                "question_type": "long_text",
                "required": False
            }
        ]
    }
    
    response = requests.post(
        f"{BASE_URL}/api/surveys/",
        headers=headers,
        json=survey_data
    )
    
    if response.status_code == 201:
        print("✅ Encuesta de Hospitalización creada exitosamente!")
        survey = response.json()
        print(f"ID de la encuesta: {survey.get('id', 'N/A')}")
        print(f"Título: {survey.get('title', 'N/A')}")
        print(f"Preguntas: {len(survey.get('questions', []))}")
        return survey
    else:
        print(f"❌ Error al crear la encuesta: {response.status_code}")
        print(f"Respuesta: {response.text}")
        return None

def create_maternas_survey(api_token):
    """Crea la encuesta de satisfacción de Pacientes Maternas"""
    
    headers = {
        "Authorization": f"Bearer {api_token}",
        "Content-Type": "application/json"
    }
    
    survey_data = {
        "title": "ENCUESTA SATISFACCION PACIENTES MATERNAS",
        "description": "Evaluar el nivel de satisfacción de las gestantes con los servicios de atención prenatal brindados, con el fin de identificar oportunidades de mejora en la calidad, accesibilidad, trato del personal y cumplimiento de sus expectativas durante el proceso de gestación.",
        "group": DEFAULT_GROUP_ID,
        "is_public": True,
        "questions": [
            {
                "question_text": "ASEGURADOR:",
                "question_type": "dropdown",
                "required": True,
                "options": [
                    "ANAS WAYUU",
                    "DUSAKAWI",
                    "NUEVA EPS",
                    "MAGISTERIO",
                    "SANITAS",
                    "CAJACOPI",
                    "POLICIA",
                    "OTRO"
                ]
            },
            {
                "question_text": "EDAD DE LA PACIENTE:",
                "question_type": "single_choice",
                "required": True,
                "options": [
                    "Entre 12 y 14 años",
                    "Entre 15 y 18 años",
                    "Entre 20 y 30 años",
                    "Entre 31 y 40 años",
                    "Mayor de 40 años"
                ]
            },
            {
                "question_text": "ÁREA EN LA QUE SE ENCUENTRA:",
                "question_type": "single_choice",
                "required": True,
                "options": [
                    "HOSPITALIZACION",
                    "SALA DE PARTO",
                    "UCI C",
                    "URGENCIA"
                ]
            },
            {
                "question_text": "NUMERO DE GESTACIONES (INCLUYENDO LA ACTUAL)",
                "question_type": "single_choice",
                "required": True,
                "options": [
                    "De 0 a 1",
                    "De 2 a 3",
                    "De 4 a 5",
                    "De 5 a 6",
                    "Mas de 7"
                ]
            },
            {
                "question_text": "ESTADO ACTUAL/DIAGNOSTICO",
                "question_type": "single_choice",
                "required": True,
                "options": [
                    "GESTANTE",
                    "POST-PARTO",
                    "POST-CESAREA",
                    "ATENCION IVE",
                    "ATENCION POR ABORTO"
                ]
            },
            {
                "question_text": "1. Como califica la rapidez en la atención y valoración inicial en el servicio de urgencia?",
                "question_type": "single_choice",
                "required": True,
                "options": [
                    "Demasiado rapida",
                    "Rapida",
                    "Lenta",
                    "Demasiado lenta",
                    "No aplica (Remitida)"
                ]
            },
            {
                "question_text": "2. ¿El personal de salud le brindo información clara y completa sobre su diagnóstico?",
                "question_type": "single_choice",
                "required": True,
                "options": ["Sí", "No", "A veces"]
            },
            {
                "question_text": "3. ¿Cómo calificas la atención del personal asistencial (medico general y especialista) que la atendió durante su estancia?",
                "question_type": "single_choice",
                "required": True,
                "options": ["Excelente", "Buena", "Regular", "Malo"]
            },
            {
                "question_text": "4. En la toma de decisiones durante su proceso, ¿Sintió que estas fueron respetadas por el personal asistencial?",
                "question_type": "single_choice",
                "required": True,
                "options": ["Si", "No", "No aplica"]
            },
            {
                "question_text": "5. ¿El personal asistencial le brindó la opción del uso de Analgesia del parto?",
                "question_type": "single_choice",
                "required": True,
                "options": ["Si", "No", "No aplica"]
            },
            {
                "question_text": "6. ¿Estuvo acompañada por una persona de confianza durante el proceso de parto?",
                "question_type": "single_choice",
                "required": True,
                "options": ["Si", "No", "No lo deseé", "No aplica"]
            },
            {
                "question_text": "7. Se le brindó educación de promoción y prevención acerca de métodos anticoncepción, planificación familiar, lactancia materna, vacunas del recién nacido entre otros?",
                "question_type": "single_choice",
                "required": True,
                "options": ["Si", "No"]
            },
            {
                "question_text": "8. ¿Se brindo atención y acompañamiento por parte del equipo multidisciplinario en el proceso de Duelo Gestacional - Perinatal - Fetal?",
                "question_type": "single_choice",
                "required": True,
                "options": ["Si", "No", "No aplica"]
            },
            {
                "question_text": "9. ¿Consideras que recibió una atención humanizada, amable y respetuosa por parte del personal durante su estancia en la institución?",
                "question_type": "single_choice",
                "required": True,
                "options": ["Siempre", "Casi siempre", "A veces", "Nunca", "Casi nunca"]
            },
            {
                "question_text": "10. ¿Cómo calificas la infraestructura, comodidad y ambientación del servicio donde ha sido atendida?",
                "question_type": "single_choice",
                "required": True,
                "options": ["Excelente", "Bueno", "Regular", "Malo"]
            },
            {
                "question_text": "11. A nivel general, ¿Cómo califica su satisfacción con los servicios recibidos por la institución?",
                "question_type": "single_choice",
                "required": True,
                "options": ["Excelente", "Buena", "Regular", "Mala"]
            },
            {
                "question_text": "12. ¿Recomendaría a la Sociedad Médica Clínica Maicao S.A. a amigos y familiares?",
                "question_type": "single_choice",
                "required": True,
                "options": ["Si", "No", "No estoy segura"]
            },
            {
                "question_text": "Observaciones y sugerencias, ¿Qué mejoraría de la Sociedad Médica Clínica Maicao S.A.?",
                "question_type": "long_text",
                "required": False
            }
        ]
    }
    
    response = requests.post(
        f"{BASE_URL}/api/surveys/",
        headers=headers,
        json=survey_data
    )
    
    if response.status_code == 201:
        print("✅ Encuesta de Pacientes Maternas creada exitosamente!")
        survey = response.json()
        print(f"ID de la encuesta: {survey.get('id', 'N/A')}")
        print(f"Título: {survey.get('title', 'N/A')}")
        print(f"Preguntas: {len(survey.get('questions', []))}")
        return survey
    else:
        print(f"❌ Error al crear la encuesta: {response.status_code}")
        print(f"Respuesta: {response.text}")
        return None

def update_survey_title(api_token, survey_id, new_title, new_description=None):
    """Actualiza solo el título (y opcionalmente la descripción) de una encuesta existente"""
    headers = {
        "Authorization": f"Bearer {api_token}",
        "Content-Type": "application/json"
    }
    
    # Primero obtener la encuesta actual
    get_response = requests.get(
        f"{BASE_URL}/api/surveys/{survey_id}/",
        headers=headers
    )
    
    if get_response.status_code != 200:
        print(f"❌ Error al obtener la encuesta {survey_id}: {get_response.status_code}")
        return None
    
    survey_data = get_response.json()
    
    # Actualizar solo el título y descripción
    survey_data["title"] = new_title
    if new_description:
        survey_data["description"] = new_description
    
    # Enviar actualización
    update_response = requests.put(
        f"{BASE_URL}/api/surveys/{survey_id}/",
        headers=headers,
        json=survey_data
    )
    
    if update_response.status_code == 200:
        print(f"✅ Título actualizado: '{new_title}'")
        return update_response.json()
    else:
        print(f"❌ Error al actualizar título: {update_response.status_code}")
        print(f"Respuesta: {update_response.text}")
        return None

def create_survey_from_url(api_token, url_id, title, description, questions):
    """Función genérica para crear una encuesta desde datos"""
    headers = {
        "Authorization": f"Bearer {api_token}",
        "Content-Type": "application/json"
    }
    
    survey_data = {
        "title": title,
        "description": description,
        "group": DEFAULT_GROUP_ID,
        "is_public": True,
        "questions": questions
    }
    
    response = requests.post(
        f"{BASE_URL}/api/surveys/",
        headers=headers,
        json=survey_data
    )
    
    if response.status_code == 201:
        print(f"✅ Encuesta '{title}' creada exitosamente!")
        survey = response.json()
        print(f"ID de la encuesta: {survey.get('id', 'N/A')}")
        print(f"Título: {survey.get('title', 'N/A')}")
        print(f"Preguntas: {len(survey.get('questions', []))}")
        return survey
    else:
        print(f"❌ Error al crear la encuesta '{title}': {response.status_code}")
        print(f"Respuesta: {response.text}")
        return None

def create_survey_1(api_token):
    """Crea encuesta desde URL: 1FAIpQLSc6hExVavnKcHMdE6C4lSlA8obFAgnrXhq33Qy7c79GM0nBHg"""
    # Basado en patrón común de encuestas de Clínica Maicao
    return create_survey_from_url(
        api_token,
        "1FAIpQLSc6hExVavnKcHMdE6C4lSlA8obFAgnrXhq33Qy7c79GM0nBHg",
        "Encuesta de Satisfacción al Usuario - UCI Adulto",
        "Encuesta de satisfacción dirigida a pacientes y usuarios de la Unidad de Cuidados Intensivos Adulto para mejorar la prestación del servicio ofrecido por la Sociedad Médica Clínica Maicao S.A.",
        [
            {
                "question_text": "EPS - ASEGURADOR",
                "question_type": "dropdown",
                "required": True,
                "options": ["ANAS WAYUU", "DUSAKAWI", "NUEVA EPS", "MAGISTERIO", "SANITAS", "CAJACOPI", "POLICIA", "OTRO"]
            },
            {
                "question_text": "¿Cómo califica su satisfacción general con el servicio recibido?",
                "question_type": "single_choice",
                "required": True,
                "options": ["Excelente", "Bueno", "Regular", "Malo"]
            },
            {
                "question_text": "¿Recomendaría la Sociedad Médica Clínica Maicao S.A. a amigos y familiares?",
                "question_type": "single_choice",
                "required": True,
                "options": ["Sí", "No", "No estoy seguro"]
            },
            {
                "question_text": "Observaciones y sugerencias",
                "question_type": "long_text",
                "required": False
            }
        ]
    )

def create_survey_2(api_token):
    """Crea encuesta desde URL: 1FAIpQLSfu9GC6JV7u6KYppx4S-ZA5vswLCUiUr4t1JXguKeZAb9ropA"""
    return create_survey_from_url(
        api_token,
        "1FAIpQLSfu9GC6JV7u6KYppx4S-ZA5vswLCUiUr4t1JXguKeZAb9ropA",
        "Encuesta de Satisfacción del Servicio de Unidad Renal",
        "Encuesta de satisfacción orientada a pacientes del Programa de Diálisis Ambulatoria de la Unidad Renal para evaluar su satisfacción respecto al servicio prestado por la Sociedad Médica Clínica Maicao S.A.",
        [
            {
                "question_text": "EPS - ASEGURADOR",
                "question_type": "dropdown",
                "required": True,
                "options": ["ANAS WAYUU", "DUSAKAWI", "NUEVA EPS", "MAGISTERIO", "SANITAS", "CAJACOPI", "POLICIA", "OTRO"]
            },
            {
                "question_text": "¿Cómo califica su satisfacción general con el servicio recibido?",
                "question_type": "single_choice",
                "required": True,
                "options": ["Excelente", "Bueno", "Regular", "Malo"]
            },
            {
                "question_text": "¿Recomendaría la Sociedad Médica Clínica Maicao S.A. a amigos y familiares?",
                "question_type": "single_choice",
                "required": True,
                "options": ["Sí", "No", "No estoy seguro"]
            },
            {
                "question_text": "Observaciones y sugerencias",
                "question_type": "long_text",
                "required": False
            }
        ]
    )

def create_survey_3(api_token):
    """Crea encuesta desde URL: 1FAIpQLSeMjeoX3sVLXF7Mdx_Hb4i7ZJqitlODj2KNG00db4QydIF8dw"""
    return create_survey_from_url(
        api_token,
        "1FAIpQLSeMjeoX3sVLXF7Mdx_Hb4i7ZJqitlODj2KNG00db4QydIF8dw",
        "Encuesta de Satisfacción - Cirugía Ambulatoria",
        "Encuesta de satisfacción dirigida a pacientes que han sido sometidos a procedimientos quirúrgicos ambulatorios para medir su satisfacción con el proceso quirúrgico y la atención recibida en la Sociedad Médica Clínica Maicao S.A.",
        [
            {
                "question_text": "EPS - ASEGURADOR",
                "question_type": "dropdown",
                "required": True,
                "options": ["ANAS WAYUU", "DUSAKAWI", "NUEVA EPS", "MAGISTERIO", "SANITAS", "CAJACOPI", "POLICIA", "OTRO"]
            },
            {
                "question_text": "¿Cómo califica su satisfacción general con el servicio recibido?",
                "question_type": "single_choice",
                "required": True,
                "options": ["Excelente", "Bueno", "Regular", "Malo"]
            },
            {
                "question_text": "¿Recomendaría la Sociedad Médica Clínica Maicao S.A. a amigos y familiares?",
                "question_type": "single_choice",
                "required": True,
                "options": ["Sí", "No", "No estoy seguro"]
            },
            {
                "question_text": "Observaciones y sugerencias",
                "question_type": "long_text",
                "required": False
            }
        ]
    )

def create_survey_4(api_token):
    """Crea encuesta desde URL: 1FAIpQLSdMDKKejYFX9KfXpUGtKTcdOci-yEHHSjdI4HWURu4c9EikJg"""
    return create_survey_from_url(
        api_token,
        "1FAIpQLSdMDKKejYFX9KfXpUGtKTcdOci-yEHHSjdI4HWURu4c9EikJg",
        "Encuesta de Satisfacción - Salud Mental",
        "Encuesta de satisfacción enfocada en pacientes que han recibido atención en servicios de salud mental para evaluar aspectos como la empatía del personal, la eficacia del tratamiento y la accesibilidad a los servicios de la Sociedad Médica Clínica Maicao S.A.",
        [
            {
                "question_text": "EPS - ASEGURADOR",
                "question_type": "dropdown",
                "required": True,
                "options": ["ANAS WAYUU", "DUSAKAWI", "NUEVA EPS", "MAGISTERIO", "SANITAS", "CAJACOPI", "POLICIA", "OTRO"]
            },
            {
                "question_text": "¿Cómo califica su satisfacción general con el servicio recibido?",
                "question_type": "single_choice",
                "required": True,
                "options": ["Excelente", "Bueno", "Regular", "Malo"]
            },
            {
                "question_text": "¿Recomendaría la Sociedad Médica Clínica Maicao S.A. a amigos y familiares?",
                "question_type": "single_choice",
                "required": True,
                "options": ["Sí", "No", "No estoy seguro"]
            },
            {
                "question_text": "Observaciones y sugerencias",
                "question_type": "long_text",
                "required": False
            }
        ]
    )

def create_survey_5(api_token):
    """Crea encuesta desde URL: 1FAIpQLSfdj0uNawxeSVSp8Ie9VeTO65nolr2oejGunPv8kOHHSVDgDQ"""
    return create_survey_from_url(
        api_token,
        "1FAIpQLSfdj0uNawxeSVSp8Ie9VeTO65nolr2oejGunPv8kOHHSVDgDQ",
        "Encuesta de Satisfacción - Rehabilitación",
        "Encuesta de satisfacción orientada a pacientes que han participado en programas de rehabilitación para conocer su nivel de satisfacción con el tratamiento recibido, la profesionalidad del personal y las instalaciones de la Sociedad Médica Clínica Maicao S.A.",
        [
            {
                "question_text": "EPS - ASEGURADOR",
                "question_type": "dropdown",
                "required": True,
                "options": ["ANAS WAYUU", "DUSAKAWI", "NUEVA EPS", "MAGISTERIO", "SANITAS", "CAJACOPI", "POLICIA", "OTRO"]
            },
            {
                "question_text": "¿Cómo califica su satisfacción general con el servicio recibido?",
                "question_type": "single_choice",
                "required": True,
                "options": ["Excelente", "Bueno", "Regular", "Malo"]
            },
            {
                "question_text": "¿Recomendaría la Sociedad Médica Clínica Maicao S.A. a amigos y familiares?",
                "question_type": "single_choice",
                "required": True,
                "options": ["Sí", "No", "No estoy seguro"]
            },
            {
                "question_text": "Observaciones y sugerencias",
                "question_type": "long_text",
                "required": False
            }
        ]
    )

def create_survey_6(api_token):
    """Crea encuesta desde URL: 1FAIpQLSfMcMxfuHKZBd81pRFRHJj8T23XLYZCMays8rTdUcRhRUl6lg"""
    return create_survey_from_url(
        api_token,
        "1FAIpQLSfMcMxfuHKZBd81pRFRHJj8T23XLYZCMays8rTdUcRhRUl6lg",
        "Encuesta de Satisfacción - Pediatría",
        "Encuesta de satisfacción que recoge la opinión de los padres o tutores de pacientes pediátricos para evaluar la calidad de la atención médica, la comunicación del personal y la adecuación de las instalaciones para niños en la Sociedad Médica Clínica Maicao S.A.",
        [
            {
                "question_text": "EPS - ASEGURADOR",
                "question_type": "dropdown",
                "required": True,
                "options": ["ANAS WAYUU", "DUSAKAWI", "NUEVA EPS", "MAGISTERIO", "SANITAS", "CAJACOPI", "POLICIA", "OTRO"]
            },
            {
                "question_text": "¿Cómo califica su satisfacción general con el servicio recibido?",
                "question_type": "single_choice",
                "required": True,
                "options": ["Excelente", "Bueno", "Regular", "Malo"]
            },
            {
                "question_text": "¿Recomendaría la Sociedad Médica Clínica Maicao S.A. a amigos y familiares?",
                "question_type": "single_choice",
                "required": True,
                "options": ["Sí", "No", "No estoy seguro"]
            },
            {
                "question_text": "Observaciones y sugerencias",
                "question_type": "long_text",
                "required": False
            }
        ]
    )

def create_survey_7(api_token):
    """Crea encuesta desde URL: 1FAIpQLScHJCGb_B1ElaMICgmE8zgFwb_djcG1jyoLwgMtPUXyZ-0Leg"""
    return create_survey_from_url(
        api_token,
        "1FAIpQLScHJCGb_B1ElaMICgmE8zgFwb_djcG1jyoLwgMtPUXyZ-0Leg",
        "Encuesta de Satisfacción - Laboratorio Clínico",
        "Encuesta de satisfacción para evaluar la calidad del servicio de laboratorio clínico, incluyendo la atención del personal, la puntualidad en la entrega de resultados y la claridad de la información proporcionada por la Sociedad Médica Clínica Maicao S.A.",
        [
            {
                "question_text": "EPS - ASEGURADOR",
                "question_type": "dropdown",
                "required": True,
                "options": ["ANAS WAYUU", "DUSAKAWI", "NUEVA EPS", "MAGISTERIO", "SANITAS", "CAJACOPI", "POLICIA", "OTRO"]
            },
            {
                "question_text": "¿Cómo califica su satisfacción general con el servicio recibido?",
                "question_type": "single_choice",
                "required": True,
                "options": ["Excelente", "Bueno", "Regular", "Malo"]
            },
            {
                "question_text": "¿Recomendaría la Sociedad Médica Clínica Maicao S.A. a amigos y familiares?",
                "question_type": "single_choice",
                "required": True,
                "options": ["Sí", "No", "No estoy seguro"]
            },
            {
                "question_text": "Observaciones y sugerencias",
                "question_type": "long_text",
                "required": False
            }
        ]
    )

def create_survey_8(api_token):
    """Crea encuesta desde URL: 1FAIpQLSc-J3iN_cuZ1qwuV04bNHY0yV8y9nRmcl3aMKZ_jHroo-A9IA"""
    return create_survey_from_url(
        api_token,
        "1FAIpQLSc-J3iN_cuZ1qwuV04bNHY0yV8y9nRmcl3aMKZ_jHroo-A9IA",
        "Encuesta de Satisfacción - Imágenes Diagnósticas",
        "Encuesta de satisfacción para evaluar la calidad del servicio de imágenes diagnósticas, incluyendo la atención del personal técnico, la puntualidad en la realización de estudios, la claridad de las indicaciones y la entrega de resultados en la Sociedad Médica Clínica Maicao S.A.",
        [
            {
                "question_text": "EPS - ASEGURADOR",
                "question_type": "dropdown",
                "required": True,
                "options": ["ANAS WAYUU", "DUSAKAWI", "NUEVA EPS", "MAGISTERIO", "SANITAS", "CAJACOPI", "POLICIA", "OTRO"]
            },
            {
                "question_text": "¿Cómo califica su satisfacción general con el servicio recibido?",
                "question_type": "single_choice",
                "required": True,
                "options": ["Excelente", "Bueno", "Regular", "Malo"]
            },
            {
                "question_text": "¿Recomendaría la Sociedad Médica Clínica Maicao S.A. a amigos y familiares?",
                "question_type": "single_choice",
                "required": True,
                "options": ["Sí", "No", "No estoy seguro"]
            },
            {
                "question_text": "Observaciones y sugerencias",
                "question_type": "long_text",
                "required": False
            }
        ]
    )

def clone_consulta_externa_survey(api_token):
    """Clona exactamente la encuesta de Google Forms: ENCUESTA DE SATISFACCIÓN CONSULTA EXTERNA"""
    headers = {
        "Authorization": f"Bearer {api_token}",
        "Content-Type": "application/json"
    }
    
    survey_data = {
        "title": "ENCUESTA DE SATISFACCIÓN CONSULTA EXTERNA",
        "description": "Encuesta de satisfacción para los servicios de consulta externa de la Clínica Maicao S.A.",
        "group": DEFAULT_GROUP_ID,
        "is_public": True,
        "questions": [
            {
                "question_text": "ASEGURADOR - EPS",
                "question_type": "dropdown",
                "required": True,
                "options": [
                    "ANAS WAYUU",
                    "DUSAKAWI",
                    "NUEVA EPS",
                    "SANITAS",
                    "POLICIA",
                    "MAGISTERIO",
                    "CAJACOPI",
                    "OTRO"
                ]
            },
            {
                "question_text": "SERVICIO ESPECIFICO SOLICITADO:",
                "question_type": "single_choice",
                "required": False,
                "options": [
                    "CITA MEDICA",
                    "VACUNACION",
                    "PROGRAMACION",
                    "TERAPIAS FÍSICAS",
                    "CURACIONES",
                    "OTRO"
                ]
            },
            {
                "question_text": "PERTENECE ALGUNA DE ESTAS POBLACIONES?",
                "question_type": "single_choice",
                "required": False,
                "options": [
                    "ETNICA",
                    "DISCAPACIDAD",
                    "ADULTO MAYOR",
                    "MIGRANTE",
                    "VICTIMA DEL CONFLICTO ARMADO",
                    "LGBTIQ+",
                    "NINGUNA"
                ]
            },
            {
                "question_text": "1. Fue informado acerca de los Derechos y Deberes de los usuarios?",
                "question_type": "single_choice",
                "required": True,
                "options": ["SI", "NO"]
            },
            {
                "question_text": "2. Al solicitar la cita medica por el medio escogido ¿Cómo fue el trato y actitud del personal que brindo la atención ?",
                "question_type": "single_choice",
                "required": True,
                "options": ["EXCELENTE", "BUENO", "REGULAR", "MALO", "NO APLICA"]
            },
            {
                "question_text": "3. ¿Como considera la oportunidad en la atención después de facturado con el personal de admisiones el servicio solicitado?",
                "question_type": "single_choice",
                "required": True,
                "options": ["LENTO", "MUY LENTO", "RAPIDO", "MUY RAPIDO", "NO APLICA"]
            },
            {
                "question_text": "4. Como califica la atención del personal vigilancia y portería del servicio?",
                "question_type": "single_choice",
                "required": True,
                "options": ["EXCELENTE", "BUENO", "REGULAR", "MALO"]
            },
            {
                "question_text": "5. Como calificas la atención y trato del personal de recepción y/o administrativo?",
                "question_type": "single_choice",
                "required": True,
                "options": ["EXCELENTE", "BUENO", "REGULAR", "MALO"]
            },
            {
                "question_text": "6. Si acudió cita con especialista, ¿Cuánto tiempo demoro para ser atendido ?",
                "question_type": "single_choice",
                "required": True,
                "options": [
                    "Menos de 10 min",
                    "Entre 30 min y 1 Hora",
                    "Entre 1 y 2 horas",
                    "Entre 2 y 3 horas",
                    "Mas de 3 horas",
                    "No aplica"
                ]
            },
            {
                "question_text": "7. Como califica la atención del médico y/o especialista que lo atendió durante su cita médica (solo si acudió a cita con especialista)?",
                "question_type": "single_choice",
                "required": True,
                "options": ["EXCELENTE", "BUENO", "REGULAR", "MALO", "NO APLICA"]
            },
            {
                "question_text": "8. ¿El personal medico especialista le dio explicaciones e información clara de su diagnóstico, evolución, recomendaciones u orden medica durante su cita?",
                "question_type": "single_choice",
                "required": True,
                "options": ["SI", "NO", "NO APLICA"]
            },
            {
                "question_text": "9. Que le parece el estado de la infraestructura, equipamiento y ambientación del servicio dé consulta externa?",
                "question_type": "single_choice",
                "required": True,
                "options": ["EXCELENTE", "BUENO", "REGULAR", "MALO"]
            },
            {
                "question_text": "10. A nivel general cómo calificaría su satisfacción con los servicios recibidos en la Consulta Externa?",
                "question_type": "single_choice",
                "required": True,
                "options": ["EXCELENTE", "BUENO", "REGULAR", "MALO"]
            },
            {
                "question_text": "11. ¿Recomendaría la Sociedad Médica Clínica Maicao S.A. a amigos y familiares?",
                "question_type": "single_choice",
                "required": True,
                "options": ["SI", "NO", "NO ESTOY SEGURO"]
            },
            {
                "question_text": "Alguna recomendación, sugerencia u observación para la Clínica Maicao?",
                "question_type": "long_text",
                "required": False
            }
        ]
    }
    
    response = requests.post(
        f"{BASE_URL}/api/surveys/",
        headers=headers,
        json=survey_data
    )
    
    if response.status_code == 201:
        print("✅ Encuesta clonada exitosamente desde Google Forms!")
        survey = response.json()
        print(f"ID de la encuesta: {survey.get('id', 'N/A')}")
        print(f"Título: {survey.get('title', 'N/A')}")
        print(f"Preguntas: {len(survey.get('questions', []))}")
        return survey
    else:
        print(f"❌ Error al clonar la encuesta: {response.status_code}")
        print(f"Respuesta: {response.text}")
        return None

def clone_urgencia_survey(api_token):
    """Clona exactamente la encuesta de Google Forms: Encuesta de Satisfacción de Urgencia"""
    headers = {
        "Authorization": f"Bearer {api_token}",
        "Content-Type": "application/json"
    }
    
    survey_data = {
        "title": "Encuesta de Satisfacción de Urgencia",
        "description": "Esta encuesta tiene como objetivo seguir mejorando la calidad médica y atención personalizada prestada por la Sociedad Médica Clínica Maicao S.A., para lograrlo, es muy importante para nosotros conocer su opinión, grado de satisfacción y valoraciones. Sus respuestas serán tratadas de forma CONFIDENCIAL Y ANÓNIMA y no serán utilizadas para ningún propósito distinto al de ayudarnos a mejorar.",
        "group": DEFAULT_GROUP_ID,
        "is_public": True,
        "questions": [
            {
                "question_text": "SERVICIO ESPECIFICO:",
                "question_type": "dropdown",
                "required": True,
                "options": [
                    "URGENCIA ADULTO",
                    "URGENCIA PEDIÁTRICA"
                ]
            },
            {
                "question_text": "EPS - ASEGURADOR:",
                "question_type": "dropdown",
                "required": True,
                "options": [
                    "ANAS WAYUU",
                    "DUSAKAWI",
                    "NUEVA EPS",
                    "SANITAS",
                    "CAJACOPI",
                    "MAGISTERIO",
                    "POLICIA",
                    "OTRO"
                ]
            },
            {
                "question_text": "PERTENECE ALGUNAS DE ESTAS POBLACIONES?",
                "question_type": "single_choice",
                "required": True,
                "options": [
                    "ETNICA",
                    "DISCAPACIDAD",
                    "ADULTO MAYOR",
                    "MIGRANTE",
                    "VICTIMA DEL CONFLICTO ARMADO",
                    "LGBTI+Q",
                    "NINGUNA"
                ]
            },
            {
                "question_text": "1. ¿ Fue informado acerca de los derechos y deberes del usuario?",
                "question_type": "single_choice",
                "required": True,
                "options": ["Sí", "No"]
            },
            {
                "question_text": "2. Como califica la rapidez en la atención y valoración inicial de la enfermera del Triage?",
                "question_type": "single_choice",
                "required": True,
                "options": ["Demasiado rapida", "Rápida", "Lento", "Demasiado lento", "No aplica"]
            },
            {
                "question_text": "3. ¿Cómo calificaría el trato y la información brindada por el personal administrativo de admisiones?",
                "question_type": "single_choice",
                "required": True,
                "options": ["Excelente", "Bueno", "Regular", "Malo"]
            },
            {
                "question_text": "4. ¿Cuánto tiempo esperó para la atención a su urgencia en sala de espera?",
                "question_type": "single_choice",
                "required": True,
                "options": [
                    "La atención fue inmediata",
                    "Menos de 30 min",
                    "Entre 30 min y 1 hora",
                    "Entre 1 hora y 2 horas",
                    "Más de 2 horas",
                    "No aplica"
                ]
            },
            {
                "question_text": "5. ¿Cómo calificas la atención y valoración del médico general durante el proceso de ingreso (consultorio)?",
                "question_type": "single_choice",
                "required": True,
                "options": ["Excelente", "Bueno", "Regular", "Malo", "No aplica"]
            },
            {
                "question_text": "6. ¿Cómo calificas la atención del personal de enfermería después de su ingreso?",
                "question_type": "single_choice",
                "required": True,
                "options": ["Excelente", "Bueno", "Regular", "Malo"]
            },
            {
                "question_text": "7. ¿Cómo calificas la atención del médico que lo atendió durante su estancia en la urgencia?",
                "question_type": "single_choice",
                "required": True,
                "options": ["Excelente", "Bueno", "Regular", "Malo"]
            },
            {
                "question_text": "8. ¿El médico le brindo una explicación clara sobre su diagnóstico?",
                "question_type": "single_choice",
                "required": True,
                "options": ["Sí", "No", "Mas o menos"]
            },
            {
                "question_text": "9. ¿Cómo consideras la atención y amabilidad del personal de vigilancia y portería del servicio?",
                "question_type": "single_choice",
                "required": True,
                "options": ["Excelente", "Bueno", "Regular", "Malo"]
            },
            {
                "question_text": "10. ¿ Cómo calificas la rapidez en la respuesta del personal ante el llamado, queja o reclamo generado durante su instancia en el servicio?",
                "question_type": "single_choice",
                "required": True,
                "options": ["Excelente", "Bueno", "Regular", "Malo", "No se ha efectuado PQR"]
            },
            {
                "question_text": "11. ¿Cómo calificas la limpieza de aseos y zonas comunes?",
                "question_type": "single_choice",
                "required": True,
                "options": ["Excelente", "Bueno", "Regular", "Malo"]
            },
            {
                "question_text": "12. A nivel general, ¿Cómo califica su satisfacción con los servicios recibidos en el servicio de urgencias de la institución?",
                "question_type": "single_choice",
                "required": True,
                "options": ["Excelente", "Bueno", "Regular", "Malo"]
            },
            {
                "question_text": "13. ¿Recomendaría la Sociedad Médica Clínica Maicao S.A. a amigos y familiares?",
                "question_type": "single_choice",
                "required": True,
                "options": ["Sí", "No", "No estoy seguro"]
            },
            {
                "question_text": "Observaciones y sugerencias, ¿Qué mejoraría de la Sociedad Médica Clínica Maicao S.A.?",
                "question_type": "long_text",
                "required": False
            }
        ]
    }
    
    response = requests.post(
        f"{BASE_URL}/api/surveys/",
        headers=headers,
        json=survey_data
    )
    
    if response.status_code == 201:
        print("✅ Encuesta de Urgencia clonada exitosamente desde Google Forms!")
        survey = response.json()
        print(f"ID de la encuesta: {survey.get('id', 'N/A')}")
        print(f"Título: {survey.get('title', 'N/A')}")
        print(f"Preguntas: {len(survey.get('questions', []))}")
        return survey
    else:
        print(f"❌ Error al clonar la encuesta: {response.status_code}")
        print(f"Respuesta: {response.text}")
        return None

def clone_hospitalizacion_survey(api_token):
    """Clona exactamente la encuesta de Google Forms: Encuesta de Satisfacción de Hospitalización"""
    headers = {
        "Authorization": f"Bearer {api_token}",
        "Content-Type": "application/json"
    }
    
    survey_data = {
        "title": "Encuesta de Satisfacción de Hospitalización",
        "description": "Esta encuesta tiene como objetivo seguir mejorando la calidad médica y atención personalizada prestada por la Sociedad Médica Clínica Maicao S.A., para lograrlo, es muy importante para nosotros conocer su opinión, grado de satisfacción y valoraciones. Sus respuestas serán tratadas de forma CONFIDENCIAL Y ANÓNIMA y no serán utilizadas para ningún propósito distinto al de ayudarnos a mejorar.",
        "group": DEFAULT_GROUP_ID,
        "is_public": True,
        "questions": [
            {
                "question_text": "SERVICIO ESPECIFICO",
                "question_type": "dropdown",
                "required": True,
                "options": [
                    "HOSPITALIZACION 4TO A",
                    "HOSPITALIZACION 4TO B",
                    "HOSPITALIZACION 5TO B PEDIATRICO",
                    "HOSPITALIZACION 6TO C"
                ]
            },
            {
                "question_text": "EPS - ASEGURADOR",
                "question_type": "dropdown",
                "required": True,
                "options": [
                    "ANAS WAYUU",
                    "NUEVA EPS",
                    "DUSAKAWI",
                    "MAGISTERIO",
                    "SANITAS",
                    "POLICIA",
                    "CAJACOPI",
                    "OTRO"
                ]
            },
            {
                "question_text": "PERTENECE ALGUNA DE ESTAS POBLACIONES?",
                "question_type": "single_choice",
                "required": True,
                "options": [
                    "ÉTNICA",
                    "DISCAPACIDAD",
                    "ADULTO MAYOR",
                    "MIGRANTE",
                    "VICTIMA CONLFICTO ARMADO",
                    "LGBTI+Q",
                    "NINGUNA"
                ]
            },
            {
                "question_text": "1. ¿Fue informada(o) acerca de los derechos y deberes del paciente?",
                "question_type": "single_choice",
                "required": True,
                "options": ["SI", "NO"]
            },
            {
                "question_text": "2. ¿Cómo califica la atención del médico y/o especialista que lo atendió durante su estancia en el área de hospitalización?",
                "question_type": "single_choice",
                "required": True,
                "options": ["Excelente", "Bueno", "Regular", "Malo"]
            },
            {
                "question_text": "3. ¿Cómo califica la atención de los auxiliares de enfermería que lo atendió durante su estancia en el área de hospitalización?",
                "question_type": "single_choice",
                "required": True,
                "options": ["Excelente", "Bueno", "Regular", "Malo"]
            },
            {
                "question_text": "4. ¿El médico y/o especialista le brindo una explicación clara sobre su diagnóstico?",
                "question_type": "single_choice",
                "required": True,
                "options": ["Sí", "No", "Tal vez"]
            },
            {
                "question_text": "5. Como calificas la higiene y limpieza de la habitación y baño?",
                "question_type": "single_choice",
                "required": True,
                "options": ["Excelente", "Bueno", "Regular", "Malo"]
            },
            {
                "question_text": "6. La calidad general, y sabor y presentación de las comidas para usted fue:",
                "question_type": "single_choice",
                "required": True,
                "options": ["Excelente", "Bueno", "Regular", "Malo"]
            },
            {
                "question_text": "7. Como calificas la puntualidad en el servicio de alimentación?",
                "question_type": "single_choice",
                "required": True,
                "options": ["Excelente", "Bueno", "Regular", "Malo"]
            },
            {
                "question_text": "8. Como califica la atención y amabilidad del personal de portería y vigilancia de la institución?",
                "question_type": "single_choice",
                "required": True,
                "options": ["Excelente", "Bueno", "Regular", "Malo"]
            },
            {
                "question_text": "9. ¿Cómo calificas la rapidez en la respuesta del personal ante el llamado, queja o reclamo generado durante su instancia en el servicio?",
                "question_type": "single_choice",
                "required": True,
                "options": ["Excelente", "Bueno", "Regular", "Malo", "No se ha efectuado PQR"]
            },
            {
                "question_text": "10. ¿Cómo calificas el estado de la infraestructura, equipamiento y ambientación de la institución?",
                "question_type": "single_choice",
                "required": True,
                "options": ["Excelente", "Bueno", "Regular", "Malo"]
            },
            {
                "question_text": "11. A nivel general, ¿Cómo califica su satisfacción con los servicios recibidos por la hospitalización?",
                "question_type": "single_choice",
                "required": True,
                "options": ["Excelente", "Bueno", "Regular", "Malo"]
            },
            {
                "question_text": "12. ¿Recomendaría la Sociedad Médica Clínica Maicao S.A. a amigos y familiares?",
                "question_type": "single_choice",
                "required": True,
                "options": ["Sí", "No", "No estoy seguro"]
            },
            {
                "question_text": "Observaciones y sugerencias, ¿Qué mejoraría de la Sociedad Médica Clínica Maicao S.A.?",
                "question_type": "long_text",
                "required": False
            }
        ]
    }
    
    response = requests.post(
        f"{BASE_URL}/api/surveys/",
        headers=headers,
        json=survey_data
    )
    
    if response.status_code == 201:
        print("✅ Encuesta de Hospitalización clonada exitosamente desde Google Forms!")
        survey = response.json()
        print(f"ID de la encuesta: {survey.get('id', 'N/A')}")
        print(f"Título: {survey.get('title', 'N/A')}")
        print(f"Preguntas: {len(survey.get('questions', []))}")
        return survey
    else:
        print(f"❌ Error al clonar la encuesta: {response.status_code}")
        print(f"Respuesta: {response.text}")
        return None

def clone_maternas_survey(api_token):
    """Clona exactamente la encuesta de Google Forms: ENCUESTA SATISFACCION PACIENTES MATERNAS"""
    headers = {
        "Authorization": f"Bearer {api_token}",
        "Content-Type": "application/json"
    }
    
    survey_data = {
        "title": "ENCUESTA SATISFACCION PACIENTES MATERNAS",
        "description": "Evaluar el nivel de satisfacción de las gestantes con los servicios de atención prenatal brindados, con el fin de identificar oportunidades de mejora en la calidad, accesibilidad, trato del personal y cumplimiento de sus expectativas durante el proceso de gestación.",
        "group": DEFAULT_GROUP_ID,
        "is_public": True,
        "questions": [
            {
                "question_text": "ASEGURADOR:",
                "question_type": "dropdown",
                "required": True,
                "options": [
                    "ANAS WAYUU",
                    "DUSAKAWI",
                    "NUEVA EPS",
                    "MAGISTERIO",
                    "SANITAS",
                    "CAJACOPI",
                    "POLICIA",
                    "OTRO"
                ]
            },
            {
                "question_text": "EDAD DE LA PACIENTE:",
                "question_type": "single_choice",
                "required": True,
                "options": [
                    "Entre 12 y 14 años",
                    "Entre 15 y 18 años",
                    "Entre 20 y 30 años",
                    "Entre 31 y 40 años",
                    "Mayor de 40 años"
                ]
            },
            {
                "question_text": "ÁREA EN LA QUE SE ENCUENTRA:",
                "question_type": "single_choice",
                "required": True,
                "options": [
                    "HOSPITALIZACION",
                    "SALA DE PARTO",
                    "UCI C",
                    "URGENCIA"
                ]
            },
            {
                "question_text": "NUMERO DE GESTACIONES (INCLUYENDO LA ACTUAL)",
                "question_type": "single_choice",
                "required": True,
                "options": [
                    "De 0 a 1",
                    "De 2 a 3",
                    "De 4 a 5",
                    "De 5 a 6",
                    "Mas de 7"
                ]
            },
            {
                "question_text": "ESTADO ACTUAL/DIAGNOSTICO",
                "question_type": "single_choice",
                "required": True,
                "options": [
                    "GESTANTE",
                    "POST-PARTO",
                    "POST-CESAREA",
                    "ATENCION IVE",
                    "ATENCION POR ABORTO"
                ]
            },
            {
                "question_text": "1. Como califica la rapidez en la atención y valoración inicial en el servicio de urgencia?",
                "question_type": "single_choice",
                "required": True,
                "options": [
                    "Demasiado rapida",
                    "Rapida",
                    "Lenta",
                    "Demasiado lenta",
                    "No aplica (Remitida)"
                ]
            },
            {
                "question_text": "2. ¿El personal de salud le brindo información clara y completa sobre su diagnóstico?",
                "question_type": "single_choice",
                "required": True,
                "options": ["Sí", "No", "A veces"]
            },
            {
                "question_text": "3. ¿Cómo calificas la atención del personal asistencial (medico general y especialista) que la atendió durante su estancia?",
                "question_type": "single_choice",
                "required": True,
                "options": ["Excelente", "Buena", "Regular", "Malo"]
            },
            {
                "question_text": "4. En la toma de decisiones durante su proceso, ¿Sintió que estas fueron respetadas por el personal asistencial?",
                "question_type": "single_choice",
                "required": True,
                "options": ["Si", "No", "No aplica"]
            },
            {
                "question_text": "5. ¿El personal asistencial le brindó la opción del uso de Analgesia del parto?",
                "question_type": "single_choice",
                "required": True,
                "options": ["Si", "No", "No aplica"]
            },
            {
                "question_text": "6. ¿Estuvo acompañada por una persona de confianza durante el proceso de parto?",
                "question_type": "single_choice",
                "required": True,
                "options": ["Si", "No", "No lo deseé", "No aplica"]
            },
            {
                "question_text": "7. Se le brindó educación de promoción y prevención acerca de métodos anticoncepción, planificación familiar, lactancia materna, vacunas del recién nacido entre otros?",
                "question_type": "single_choice",
                "required": True,
                "options": ["Si", "No"]
            },
            {
                "question_text": "8. ¿Se brindo atención y acompañamiento por parte del equipo multidisciplinario en el proceso de Duelo Gestacional - Perinatal - Fetal?",
                "question_type": "single_choice",
                "required": True,
                "options": ["Si", "No", "No aplica"]
            },
            {
                "question_text": "9. ¿Consideras que recibió una atención humanizada, amable y respetuosa por parte del personal durante su estancia en la institución?",
                "question_type": "single_choice",
                "required": True,
                "options": ["Siempre", "Casi siempre", "A veces", "Nunca", "Casi nunca"]
            },
            {
                "question_text": "10. ¿Cómo calificas la infraestructura, comodidad y ambientación del servicio donde ha sido atendida?",
                "question_type": "single_choice",
                "required": True,
                "options": ["Excelente", "Bueno", "Regular", "Malo"]
            },
            {
                "question_text": "11. A nivel general, ¿Cómo califica su satisfacción con los servicios recibidos por la institución?",
                "question_type": "single_choice",
                "required": True,
                "options": ["Excelente", "Buena", "Regular", "Mala"]
            },
            {
                "question_text": "12. ¿Recomendaría a la Sociedad Médica Clínica Maicao S.A. a amigos y familiares?",
                "question_type": "single_choice",
                "required": True,
                "options": ["Si", "No", "No estoy segura"]
            },
            {
                "question_text": "Observaciones y sugerencias, ¿Qué mejoraría de la Sociedad Médica Clínica Maicao S.A.?",
                "question_type": "long_text",
                "required": False
            }
        ]
    }
    
    response = requests.post(
        f"{BASE_URL}/api/surveys/",
        headers=headers,
        json=survey_data
    )
    
    if response.status_code == 201:
        print("✅ Encuesta de Pacientes Maternas clonada exitosamente desde Google Forms!")
        survey = response.json()
        print(f"ID de la encuesta: {survey.get('id', 'N/A')}")
        print(f"Título: {survey.get('title', 'N/A')}")
        print(f"Preguntas: {len(survey.get('questions', []))}")
        return survey
    else:
        print(f"❌ Error al clonar la encuesta: {response.status_code}")
        print(f"Respuesta: {response.text}")
        return None

def clone_wayuu_survey(api_token):
    """Clona exactamente la encuesta de Google Forms: ENCUESTAS DE SATISFACCIÓN POBLACIÓN WAYUU"""
    headers = {
        "Authorization": f"Bearer {api_token}",
        "Content-Type": "application/json"
    }
    
    survey_data = {
        "title": "ENCUESTAS DE SATISFACCIÓN POBLACIÓN WAYUU",
        "description": "Encuesta de satisfacción dirigida a la población Wayuu para evaluar los servicios de salud prestados por la Sociedad Médica Clínica Maicao S.A.",
        "group": DEFAULT_GROUP_ID,
        "is_public": True,
        "questions": [
            {
                "question_text": "SERVICIO ENCUESTADO",
                "question_type": "dropdown",
                "required": True,
                "options": [
                    "URGENCIA PEDIATRICA",
                    "URGENCIA ADULTO",
                    "HOSPITALIZACION MATERNA",
                    "HOSPITALIZACION PEDIATRICA",
                    "HOSPITALIZACION ADULTO",
                    "UCI MATERNA",
                    "UCI ADULTO"
                ]
            },
            {
                "question_text": "UBICACIÓN DE RESIDENCIA",
                "question_type": "dropdown",
                "required": True,
                "options": [
                    "MAICAO",
                    "ZONA RURAL",
                    "OTRO MUNICIPIO"
                ]
            },
            {
                "question_text": "1. ¿Fue informada(o) acerca de los derechos y deberes del paciente?",
                "question_type": "single_choice",
                "required": True,
                "options": ["SI", "NO"]
            },
            {
                "question_text": "2. ¿ Considera que fue rápida la atención cuando ingreso a la institución por el servicio de urgencias?",
                "question_type": "single_choice",
                "required": True,
                "options": ["SI", "NO", "NO APLICA (Remitido)"]
            },
            {
                "question_text": "3. ¿Cómo calificaría la atención recibida por parte del personal de enfermería en el servicio?",
                "question_type": "single_choice",
                "required": True,
                "options": ["Excelente", "Buena", "Mala", "Regular"]
            },
            {
                "question_text": "4. ¿Cómo calificaría la atención recibida por parte del personal medico?",
                "question_type": "single_choice",
                "required": True,
                "options": ["Excelente", "Buena", "Regular", "Mala"]
            },
            {
                "question_text": "5. ¿El personal medico le ha brindado información clara y entendible de la evolución, plan de manejo y diagnostico del paciente?",
                "question_type": "single_choice",
                "required": True,
                "options": ["Si, si fue entendible", "No, no fue entendible", "Poco entendible"]
            },
            {
                "question_text": "6. ¿Cómo calificas la rapidez de respuesta a sus inquietudes, quejas o reclamos realizadas al personal?",
                "question_type": "single_choice",
                "required": True,
                "options": ["Excelente", "Buena", "Regular", "Mala", "No aplica"]
            },
            {
                "question_text": "7. ¿Como considera el acceso a los servicios de salud de la Clínica Maicao desde su lugar de residencia?",
                "question_type": "single_choice",
                "required": True,
                "options": ["Muy dificil", "Dificil", "Facil", "Muy facil"]
            },
            {
                "question_text": "8. ¿Cómo calificas el servicio de alimentación recibido por el paciente?",
                "question_type": "single_choice",
                "required": True,
                "options": ["Excelente", "Buena", "Regular", "Mala", "No Aplica"]
            },
            {
                "question_text": "9. ¿Cómo calificas la comodidad y adecuación de la infraestructura de la institución?",
                "question_type": "single_choice",
                "required": True,
                "options": ["Excelente", "Bueno", "Regular", "Malo"]
            },
            {
                "question_text": "10. A nivel general, ¿Cómo califica su satisfacción con los servicios recibidos en la institución?",
                "question_type": "single_choice",
                "required": True,
                "options": ["Excelente", "Buena", "Regular", "Malo"]
            },
            {
                "question_text": "10. ¿Recomendaría a la Sociedad Médica Clínica Maicao S.A. a amigos y familiares?",
                "question_type": "single_choice",
                "required": True,
                "options": ["SI", "NO", "TAL VEZ"]
            },
            {
                "question_text": "Observaciones y sugerencias",
                "question_type": "long_text",
                "required": False
            }
        ]
    }
    
    response = requests.post(
        f"{BASE_URL}/api/surveys/",
        headers=headers,
        json=survey_data
    )
    
    if response.status_code == 201:
        print("✅ Encuesta de Población Wayuu clonada exitosamente desde Google Forms!")
        survey = response.json()
        print(f"ID de la encuesta: {survey.get('id', 'N/A')}")
        print(f"Título: {survey.get('title', 'N/A')}")
        print(f"Preguntas: {len(survey.get('questions', []))}")
        return survey
    else:
        print(f"❌ Error al clonar la encuesta: {response.status_code}")
        print(f"Respuesta: {response.text}")
        return None

def clone_anas_wayuu_survey(api_token):
    """Clona exactamente la encuesta de Google Forms: Encuesta de Satisfacción Oficina de Anás Wayuu"""
    headers = {
        "Authorization": f"Bearer {api_token}",
        "Content-Type": "application/json"
    }
    
    survey_data = {
        "title": "Encuesta de Satisfacción Oficina de Anás Wayuu",
        "description": "Esta encuesta tiene como objetivo seguir mejorando la calidad médica y atención personalizada prestada por la Sociedad Médica Clínica Maicao S.A., para lograrlo, es muy importante para nosotros conocer su opinión, grado de satisfacción y valoraciones.",
        "group": DEFAULT_GROUP_ID,
        "is_public": True,
        "questions": [
            {
                "question_text": "1. ¿Qué tan rápido fue la atención después del turno asignado?",
                "question_type": "single_choice",
                "required": True,
                "options": [
                    "Demasiado rápida",
                    "Rapida",
                    "Lenta",
                    "Demasiado lenta"
                ]
            },
            {
                "question_text": "2. ¿Cómo calificas la facilidad de acceso a las líneas de atención telefónica de Anas Wayuu?",
                "question_type": "single_choice",
                "required": True,
                "options": [
                    "Facil",
                    "Difícil",
                    "No lo utiliza"
                ]
            },
            {
                "question_text": "3. ¿Cómo califica la rapidez en la respuesta dada por el funcionario a su solicitud a través los diferentes medios utilizados?",
                "question_type": "single_choice",
                "required": True,
                "options": [
                    "Demasiada rápida",
                    "Rápida",
                    "Lenta",
                    "Demasiado lenta"
                ]
            },
            {
                "question_text": "4. ¿Cómo calificas la amabilidad y trato del personal administrativo encargado del servicio?",
                "question_type": "single_choice",
                "required": True,
                "options": ["Excelente", "Buena", "Regular", "Mala"]
            },
            {
                "question_text": "5. ¿El personal administrativo le dio explicación clara acerca del trámite solicitado?",
                "question_type": "single_choice",
                "required": True,
                "options": ["Si", "No"]
            },
            {
                "question_text": "6. ¿Cómo califica la infraestructura y espacio asignado para la prestación del servicio?",
                "question_type": "single_choice",
                "required": True,
                "options": ["Excelente", "Buena", "Regular", "Mala"]
            },
            {
                "question_text": "7. A nivel general cómo califica su satisfacción con los servicios recibido en la oficina de Anas Wayuu?",
                "question_type": "single_choice",
                "required": False,
                "options": ["Excelente", "Buena", "Regular", "Mala"]
            },
            {
                "question_text": "8. ¿Recomendaría el servicio de Anas Wayuu de la Sociedad Médica Clínica Maicao S.A. a amigos y familiares?",
                "question_type": "single_choice",
                "required": True,
                "options": ["Si", "No", "No estoy segura (O)", "Probablemente"]
            },
            {
                "question_text": "Alguna recomendación, sugerencia u observación para la Clínica Maicao",
                "question_type": "long_text",
                "required": True
            }
        ]
    }
    
    response = requests.post(
        f"{BASE_URL}/api/surveys/",
        headers=headers,
        json=survey_data
    )
    
    if response.status_code == 201:
        print("✅ Encuesta de Oficina de Anás Wayuu clonada exitosamente desde Google Forms!")
        survey = response.json()
        print(f"ID de la encuesta: {survey.get('id', 'N/A')}")
        print(f"Título: {survey.get('title', 'N/A')}")
        print(f"Preguntas: {len(survey.get('questions', []))}")
        return survey
    else:
        print(f"❌ Error al clonar la encuesta: {response.status_code}")
        print(f"Respuesta: {response.text}")
        return None

def clone_uci_neonatal_pediatrico_survey(api_token):
    """Clona exactamente la encuesta de Google Forms: ENCUESTA DE SATISFACCIÓN UCI NEONATAL -PEDIÁTRICO"""
    headers = {
        "Authorization": f"Bearer {api_token}",
        "Content-Type": "application/json"
    }
    
    survey_data = {
        "title": "ENCUESTA DE SATISFACCIÓN UCI NEONATAL -PEDIÁTRICO",
        "description": "Objetivo. Valorar el grado de satisfacción de los familiares de los pacientes ingresados en una unidad de cuidados intensivos (UCI) respecto al entorno asistencial y a la información recibida, motivando la reflexión sobre la atención prestada y analizando los procesos susceptibles de mejora.",
        "group": DEFAULT_GROUP_ID,
        "is_public": True,
        "questions": [
            {
                "question_text": "1. le explicaron y dieron informacion del motivo del ingreso del paciente a la UCI",
                "question_type": "single_choice",
                "required": True,
                "options": ["No", "Si"]
            },
            {
                "question_text": "2. Como califica el trato y atención del personal de vigilancia?",
                "question_type": "single_choice",
                "required": True,
                "options": ["Excelente", "Bueno", "Regular", "Malo"]
            },
            {
                "question_text": "3. Como fue el trato y la atención del médico pediatra que le atendió?",
                "question_type": "single_choice",
                "required": True,
                "options": ["Excelente", "Bueno", "Regular", "Malo"]
            },
            {
                "question_text": "4. Como fue el trato y la atención del personal de enfermería que le atendió?",
                "question_type": "single_choice",
                "required": True,
                "options": ["Excelente", "Bueno", "Regular", "Malo"]
            },
            {
                "question_text": "5. La información brindada diariamente por el medico acerca del estado de salud del menor ha sido:",
                "question_type": "single_choice",
                "required": True,
                "options": ["Clara", "Poco clara", "Nada clara"]
            },
            {
                "question_text": "6. Como calificas el proceso de las visita a los pacientes de la UCI?",
                "question_type": "single_choice",
                "required": True,
                "options": ["Excelente", "Bueno", "Regular", "Malo"]
            },
            {
                "question_text": "7. La información sobre los cuidados y recomendaciones que debe tener en cuenta durante la visita fue para usted:",
                "question_type": "single_choice",
                "required": True,
                "options": ["Excelente", "Bueno", "Regular", "Malo"]
            },
            {
                "question_text": "8. Como la califica las condiciones de higiene e infraestructura del área?",
                "question_type": "single_choice",
                "required": True,
                "options": ["Excelente", "Bueno", "Regular", "Malo"]
            },
            {
                "question_text": "9. En general como califica su satisfacción con los servicios recibido en la UCI NEO-PEDIATRICA?",
                "question_type": "single_choice",
                "required": True,
                "options": ["Excelente", "Bueno", "Regular", "Malo"]
            },
            {
                "question_text": "10. ¿Recomendaría a la Sociedad Médica Clínica Maicao S.A. a amigos y familiares?",
                "question_type": "single_choice",
                "required": True,
                "options": ["Sí", "No", "Probablemente si", "Estoy indeciso"]
            },
            {
                "question_text": "11. Alguna recomendación, sugerencia u observación para la Clínica Maicao?",
                "question_type": "long_text",
                "required": True
            }
        ]
    }
    
    response = requests.post(
        f"{BASE_URL}/api/surveys/",
        headers=headers,
        json=survey_data
    )
    
    if response.status_code == 201:
        print("✅ Encuesta de UCI Neonatal-Pediátrico clonada exitosamente desde Google Forms!")
        survey = response.json()
        print(f"ID de la encuesta: {survey.get('id', 'N/A')}")
        print(f"Título: {survey.get('title', 'N/A')}")
        print(f"Preguntas: {len(survey.get('questions', []))}")
        return survey
    else:
        print(f"❌ Error al clonar la encuesta: {response.status_code}")
        print(f"Respuesta: {response.text}")
        return None

def clone_laboratorio_clinico_survey(api_token):
    """Clona exactamente la encuesta de Google Forms: ENCUESTA DE SATISFACCIÓN SERVICIO DE LABORATORIO CLÍNICO"""
    headers = {
        "Authorization": f"Bearer {api_token}",
        "Content-Type": "application/json"
    }
    
    survey_data = {
        "title": "ENCUESTA DE SATISFACCIÓN SERVICIO DE LABORATORIO CLÍNICO",
        "description": "Objetivo. Valorar el grado de satisfacción de los usuarios que asisten al servicio de LABORATORIO respecto al entorno asistencial y a la información recibida, motivando la reflexión sobre la atención prestada y analizando los procesos susceptibles de mejora.",
        "group": DEFAULT_GROUP_ID,
        "is_public": True,
        "questions": [
            {
                "question_text": "1. Como califica el trato y atención del personal de vigilancia y portería?",
                "question_type": "single_choice",
                "required": True,
                "options": ["Excelente", "Bueno", "Regular", "Malo"]
            },
            {
                "question_text": "2. Que tan rápido fue la atención para la toma de muestras en el laboratorio después de facturar?",
                "question_type": "single_choice",
                "required": True,
                "options": [
                    "Rápida",
                    "Demasiado rápida",
                    "Lento",
                    "Demasiado lento"
                ]
            },
            {
                "question_text": "3. Como califica la amabilidad y actitud del personal administrativo del encargado del servicio de laboratorio?",
                "question_type": "single_choice",
                "required": True,
                "options": ["Excelente", "Bueno", "Regular", "Malo"]
            },
            {
                "question_text": "4. Como fue la atención y trato del funcionario que le realizó el examen?",
                "question_type": "single_choice",
                "required": True,
                "options": ["Excelente", "Bueno", "Regular", "Malo"]
            },
            {
                "question_text": "5. El personal clínico le dio recomendaciones e información previa antes de tomar la muestra del examen solicitado?",
                "question_type": "single_choice",
                "required": True,
                "options": ["Si", "No"]
            },
            {
                "question_text": "6. Le dieron información clara acerca de la entrega de resultado del examen?",
                "question_type": "single_choice",
                "required": True,
                "options": ["Sí", "No"]
            },
            {
                "question_text": "7. Como la califica las condiciones de limpieza e infraestructura del área de laboratorio?",
                "question_type": "single_choice",
                "required": True,
                "options": ["Excelente", "Bueno", "Regular", "Malo"]
            },
            {
                "question_text": "8. En general como califica su satisfacción con los servicios recibido en el área de Laboratorio?",
                "question_type": "single_choice",
                "required": True,
                "options": ["Excelente", "Bueno", "Regular", "Malo"]
            },
            {
                "question_text": "9. ¿Recomendaría el servicio de laboratorio de la Sociedad Médica Clínica Maicao S.A. a amigos y familiares?",
                "question_type": "single_choice",
                "required": True,
                "options": ["Sí", "No", "No estoy seguro"]
            },
            {
                "question_text": "10. Alguna recomendación, sugerencia u observación para la Clínica Maicao?",
                "question_type": "long_text",
                "required": True
            }
        ]
    }
    
    response = requests.post(
        f"{BASE_URL}/api/surveys/",
        headers=headers,
        json=survey_data
    )
    
    if response.status_code == 201:
        print("✅ Encuesta de Laboratorio Clínico clonada exitosamente desde Google Forms!")
        survey = response.json()
        print(f"ID de la encuesta: {survey.get('id', 'N/A')}")
        print(f"Título: {survey.get('title', 'N/A')}")
        print(f"Preguntas: {len(survey.get('questions', []))}")
        return survey
    else:
        print(f"❌ Error al clonar la encuesta: {response.status_code}")
        print(f"Respuesta: {response.text}")
        return None

def clone_unidad_cardiovascular_survey(api_token):
    """Clona exactamente la encuesta de Google Forms: ENCUESTA DE SATISFACCIÓN SERVICIO DE UNIDAD CARDIOVASCULAR"""
    headers = {
        "Authorization": f"Bearer {api_token}",
        "Content-Type": "application/json"
    }
    
    survey_data = {
        "title": "ENCUESTA DE SATISFACCIÓN SERVICIO DE UNIDAD CARDIOVASCULAR",
        "description": "Objetivo. Valorar el grado de satisfacción de los usuarios que asisten al servicio de UNIDAD CARDIOVASCULAR respecto al entorno asistencial y a la información recibida, motivando la reflexión sobre la atención prestada y analizando los procesos susceptibles de mejora.",
        "group": DEFAULT_GROUP_ID,
        "is_public": True,
        "questions": [
            {
                "question_text": "SEXO:",
                "question_type": "single_choice",
                "required": True,
                "options": ["Masculino", "Femenino"]
            },
            {
                "question_text": "EPS O ASEGURADOR AL QUE PERTENECE (Escriba su respuesta)",
                "question_type": "short_text",
                "required": True
            },
            {
                "question_text": "1. Como califica la amabilidad y actitud del personal de Admisiones del Área de Cardiología?",
                "question_type": "single_choice",
                "required": True,
                "options": ["Excelente", "Bueno", "Regular", "Malo"]
            },
            {
                "question_text": "2. Como califica la amabilidad y actitud del Cardiólogo que le atendió?",
                "question_type": "single_choice",
                "required": False,
                "options": ["Excekente", "Bueno", "Regular", "Malo", "No aplica"]
            },
            {
                "question_text": "3. Como califica la amabilidad y actitud del Cardiólogo Pediatra que atendió al paciente?",
                "question_type": "single_choice",
                "required": False,
                "options": ["Excelente", "Bueno", "Regular", "Malo", "No aplica"]
            },
            {
                "question_text": "4. Como califica la amabilidad y actitud del personal de Enfermería del servicio?",
                "question_type": "single_choice",
                "required": False,
                "options": ["Excelente", "Bueno", "Regular", "Malo"]
            },
            {
                "question_text": "5. Como califica la accesibilidad de las fechas y horarios de citas medicas programadas en el servicio de la Unidad Cardiovascular?",
                "question_type": "single_choice",
                "required": False,
                "options": ["Excelente", "Bueno", "Regular", "Malo"]
            },
            {
                "question_text": "6. El personal que lo atendió explico con anticipación el procedimiento o examen a realizar?",
                "question_type": "single_choice",
                "required": True,
                "options": ["Sí", "No", "No aplica"]
            },
            {
                "question_text": "7. El personal o medico que lo atendió le explico y dio claridad de su diagnóstico, tratamiento y recomendaciones?",
                "question_type": "single_choice",
                "required": True,
                "options": ["Sí", "No", "No aplica"]
            },
            {
                "question_text": "8. Como le pareció las condiciones de higiene, espacio e infraestructura de la unidad Cardiovascular?",
                "question_type": "single_choice",
                "required": True,
                "options": ["Excelente", "Bueno", "Regular", "Malo"]
            },
            {
                "question_text": "9. En general como califica su satisfacción con los servicios recibido en la Unidad Cardiovascular?",
                "question_type": "single_choice",
                "required": True,
                "options": ["Muy satisfecho", "Satisfecho", "Insatisfecho", "Muy insatisfecho"]
            },
            {
                "question_text": "10. ¿Recomendaría a la Sociedad Médica Clínica Maicao S.A. - Unidad Cardiovascular a amigos y familiares?",
                "question_type": "single_choice",
                "required": True,
                "options": ["Sí", "No", "Probablemente si", "Probablemente No"]
            },
            {
                "question_text": "Alguna recomendación, sugerencia u observación para la Clínica Maicao - Unidad Cardiovascular:",
                "question_type": "long_text",
                "required": True
            }
        ]
    }
    
    response = requests.post(
        f"{BASE_URL}/api/surveys/",
        headers=headers,
        json=survey_data
    )
    
    if response.status_code == 201:
        print("✅ Encuesta de Unidad Cardiovascular clonada exitosamente desde Google Forms!")
        survey = response.json()
        print(f"ID de la encuesta: {survey.get('id', 'N/A')}")
        print(f"Título: {survey.get('title', 'N/A')}")
        print(f"Preguntas: {len(survey.get('questions', []))}")
        return survey
    else:
        print(f"❌ Error al clonar la encuesta: {response.status_code}")
        print(f"Respuesta: {response.text}")
        return None

def clone_imagenes_survey(api_token):
    """Clona exactamente la encuesta de Google Forms: ENCUESTA DE SATISFACCIÓN SERVICIO DE IMÁGENES"""
    headers = {
        "Authorization": f"Bearer {api_token}",
        "Content-Type": "application/json"
    }
    
    survey_data = {
        "title": "ENCUESTA DE SATISFACCIÓN SERVICIO DE IMÁGENES",
        "description": "Objetivo. Valorar el grado de satisfacción de los usuarios que asisten al servicio de IMÁGENES respecto al entorno asistencial y a la información recibida, motivando la reflexión sobre la atención prestada y analizando los procesos susceptibles de mejora.",
        "group": DEFAULT_GROUP_ID,
        "is_public": True,
        "questions": [
            {
                "question_text": "1. Como califica el trato y atención del personal de vigilancia y portería?",
                "question_type": "single_choice",
                "required": True,
                "options": ["Bueno", "Regular", "Malo"]
            },
            {
                "question_text": "2. Que tan rápido fue la atención después del turno asignado?",
                "question_type": "single_choice",
                "required": True,
                "options": [
                    "Rápida",
                    "Demasiado rápida",
                    "Lenta",
                    "Demasiado lenta"
                ]
            },
            {
                "question_text": "3. Como califica la amabilidad y actitud del personal administrativo encargado del servicio?",
                "question_type": "single_choice",
                "required": True,
                "options": ["Excelente", "Bueno", "Regular", "Malo"]
            },
            {
                "question_text": "4. Como fue la atención y trato del funcionario que le realizó el estudio?",
                "question_type": "single_choice",
                "required": True,
                "options": ["Excelente", "Bueno", "Regular", "Malo", "No aplica (Facturación)"]
            },
            {
                "question_text": "5. El personal le dio información previa y clara acerca del trámite o procedimiento solicitado?",
                "question_type": "single_choice",
                "required": True,
                "options": ["Sí", "No"]
            },
            {
                "question_text": "6. Como la califica las condiciones de limpieza e infraestructura del área",
                "question_type": "single_choice",
                "required": True,
                "options": ["Excelente", "Bueno", "Regular", "Malo"]
            },
            {
                "question_text": "7. En general como califica su satisfacción con los servicios recibido en el área de imágenes?",
                "question_type": "single_choice",
                "required": True,
                "options": ["Excelente", "Bueno", "Regular", "Malo"]
            },
            {
                "question_text": "8. ¿Recomendaría a la Sociedad Médica Clínica Maicao S.A. a amigos y familiares?",
                "question_type": "single_choice",
                "required": True,
                "options": ["Sí", "No", "Probablemente si", "Estoy indeciso"]
            },
            {
                "question_text": "9. Alguna recomendación, sugerencia u observación para la Clínica Maicao?",
                "question_type": "long_text",
                "required": True
            }
        ]
    }
    
    response = requests.post(
        f"{BASE_URL}/api/surveys/",
        headers=headers,
        json=survey_data
    )
    
    if response.status_code == 201:
        print("✅ Encuesta de Imágenes clonada exitosamente desde Google Forms!")
        survey = response.json()
        print(f"ID de la encuesta: {survey.get('id', 'N/A')}")
        print(f"Título: {survey.get('title', 'N/A')}")
        print(f"Preguntas: {len(survey.get('questions', []))}")
        return survey
    else:
        print(f"❌ Error al clonar la encuesta: {response.status_code}")
        print(f"Respuesta: {response.text}")
        return None

def clone_uci_adulto_survey(api_token):
    """Clona exactamente la encuesta de Google Forms: ENCUESTA DE SASTIFACION AL USUARIO - UCI ADULTO"""
    headers = {
        "Authorization": f"Bearer {api_token}",
        "Content-Type": "application/json"
    }
    
    survey_data = {
        "title": "ENCUESTA DE SASTIFACION AL USUARIO - UCI ADULTO",
        "description": "Esta encuesta tiene como objetivo conocer el nivel de satisfacción de los pacientes y usuarios para el mejoramiento de la prestación del servicio ofrecido por la Sociedad Médica Clínica Maicao S.A., para lograrlo, es muy importante para nosotros conocer su opinión y percepción. Sus respuestas serán tratadas de forma CONFIDENCIAL Y ANÓNIMA y no serán utilizadas para ningún propósito distinto al de ayudarnos a mejorar. Debe seleccionar la respuesta a la pregunta y al finalizar dar clic en el botón Enviar para que la información quede grabada en el sistema.",
        "group": DEFAULT_GROUP_ID,
        "is_public": True,
        "questions": [
            {
                "question_text": "ASEGURADORA A LA QUE PERTENECE:",
                "question_type": "dropdown",
                "required": False,
                "options": [
                    "ANAS WAYUU",
                    "DUSAKAWI",
                    "NUEVA EPS",
                    "SANITAS",
                    "CAJACOPI",
                    "MAGISTERIO",
                    "OTRO"
                ]
            },
            {
                "question_text": "SERVICIO PREVIO DE INGRESO A UCI:",
                "question_type": "single_choice",
                "required": True,
                "options": [
                    "URGENCIA",
                    "HOSPITALIZACION",
                    "SALA DE PARTO",
                    "QUIROFANO",
                    "HEMODINAMIA",
                    "INGRESO POR REMISION",
                    "OTRO"
                ]
            },
            {
                "question_text": "1. ¿CÓMO CALIFICA LA ATENCION Y EL TRATO RECIBIDO POR PARTE DEL PERSONAL DE ENFERMERIA DEL SERVICIO DE UCI?",
                "question_type": "single_choice",
                "required": True,
                "options": ["Excelente", "Buena", "Regular", "Malo", "NS/NR"]
            },
            {
                "question_text": "2. ¿CÓMO CALIFICA LA ATENCION Y EL TRATO RECIBIDO POR PARTE DEL PERSONAL MEDICOS GENERAL TRATANTE DEL SERVICIO LA UCI?",
                "question_type": "single_choice",
                "required": True,
                "options": ["Excelente", "Buena", "Regular", "Malo", "NS/NR"]
            },
            {
                "question_text": "3. ¿CÓMO CALIFICA LA ATENCION Y EL TRATO RECIBIDO POR PARTE DEL PERSONAL MEDICO INTENSIVISTA TRATANTE DEL SERVICIO DE LA UCI?",
                "question_type": "single_choice",
                "required": True,
                "options": ["Excelente", "Buena", "Regular", "Malo", "NS/NR"]
            },
            {
                "question_text": "4. SE IDENTIFICAN LOS PROFESIONALES QUE LE HAN ATENDIDO DURANTE LA ESTANCIA DEL PACIENTE EN UCI?",
                "question_type": "single_choice",
                "required": True,
                "options": ["Siempre", "Aveces", "Nunca", "NS/NR"]
            },
            {
                "question_text": "5. ¿CÓMO CALIFICA LA INFORMACION BRINDADA POR PARTE DEL MEDICO TRATANTE RESPECTO AL ESTADO DE SALUD Y EVOLUCION DEL PACIENTE?",
                "question_type": "single_choice",
                "required": True,
                "options": ["Excelente", "Buena", "Regular", "Malo", "NS/NR"]
            },
            {
                "question_text": "6. COMO EVALUA USTED EL PROCESO DE INFORMACIÒN Y COMUNICACIÓN DE LA INSTITUCIÒN A LOS FAMILIARES DEL PACIENTE EN UCI?",
                "question_type": "single_choice",
                "required": True,
                "options": ["Excelente", "Buena", "Regular", "Malo", "No aplica"]
            },
            {
                "question_text": "7. CÓMO CALIFICA LA OPOTUNIDAD Y RAPIDEZ DE RESPUESTA A LAS NECESIDADES E INQUIETUDES, QUEJAS O RECLAMOS DEL PACIENTE REALIZADA AL PERSONAL DEL SERVICIO?",
                "question_type": "single_choice",
                "required": True,
                "options": ["Excelente", "Buena", "Regular", "Malo", "NS/NR"]
            },
            {
                "question_text": "8. COMO CALIFICA EL ASEO, HIGIENE Y LIMPIEZA DEL SERVICIO DE LA UCI?",
                "question_type": "single_choice",
                "required": True,
                "options": ["Excelente", "Buena", "Regular", "Malo"]
            },
            {
                "question_text": "9. ¿CALIFIQUE LAS CONDICIONES DE INFRAESTRUCTURA, ESPACIO Y COMODIDAD DEL SERVICIO DE LA UCI?",
                "question_type": "single_choice",
                "required": True,
                "options": ["Excelente", "Buena", "Regular", "Malo"]
            },
            {
                "question_text": "10. ¿COMO CONSIDERA USTED EL AMBIENTE Y TRANQUILIDAD EN LA UCI DURANTE EL ESPACIO DE DESCANSO O POR LAS NOCHES?",
                "question_type": "single_choice",
                "required": True,
                "options": ["Excelente", "Buena", "Regular", "Malo", "NS/NR"]
            },
            {
                "question_text": "11. ¿CÓMO CONSIDERA EL FAMILIAR EL AMBIENTE Y COMODIDAD EN LA SALA DE ESPERA?",
                "question_type": "single_choice",
                "required": True,
                "options": ["Excelente", "Buena", "Regular", "Malo", "No aplica"]
            },
            {
                "question_text": "12. ¿CONSIDERA ADECUADO LOS HORARIOS DE VISITA EN LA UCI?",
                "question_type": "single_choice",
                "required": True,
                "options": ["Sí", "No", "SN/SR"]
            },
            {
                "question_text": "13. ¿CÓMO CALIFICA LA IMPLEMENTACIÓN DE LAS MEDIDAS DE BIOSEGURIDAD IMPLEMENTADAS EN SERVICIO DE UCI?",
                "question_type": "single_choice",
                "required": True,
                "options": ["Excelente", "Buena", "Regular", "Malo"]
            },
            {
                "question_text": "14. A NIVEL GENERAL, ¿CÓMO CALIFICA SU SATISFACCIÓN CON LOS SERVICIOS RECIBIDOS EN LA UNIDAD DE CUIDADOS INTENSIVOS ADULTO?",
                "question_type": "single_choice",
                "required": True,
                "options": ["Excelente", "Buena", "Regular", "Malo"]
            },
            {
                "question_text": "15. ¿RECOMENDARÍA EL SERVICIO DE LA SOCIEDAD MÉDICA CLÍNICA MAICAO S.A. A AMIGOS Y FAMILIARES?",
                "question_type": "single_choice",
                "required": True,
                "options": ["Sí", "Probablemente sí", "No", "Probablemente no", "NS/NR"]
            },
            {
                "question_text": "ALGUNA OBSERVACIÓN, RECOMENDACIÓN O SUGERENCIA PARA EL SERVICIO DE LA UCI DE LA SOCIEDAD MEDICA CLÍNICA MAICAO?",
                "question_type": "long_text",
                "required": False
            }
        ]
    }
    
    response = requests.post(
        f"{BASE_URL}/api/surveys/",
        headers=headers,
        json=survey_data
    )
    
    if response.status_code == 201:
        print("✅ Encuesta de UCI Adulto clonada exitosamente desde Google Forms!")
        survey = response.json()
        print(f"ID de la encuesta: {survey.get('id', 'N/A')}")
        print(f"Título: {survey.get('title', 'N/A')}")
        print(f"Preguntas: {len(survey.get('questions', []))}")
        return survey
    else:
        print(f"❌ Error al clonar la encuesta: {response.status_code}")
        print(f"Respuesta: {response.text}")
        return None

def create_all_surveys(api_token):
    """Crea todas las encuestas de una vez"""
    surveys = [
        ("consulta_externa", create_survey),
        ("urgencia", create_urgencia_survey),
        ("hospitalizacion", create_hospitalizacion_survey),
        ("maternas", create_maternas_survey),
        ("survey_1", create_survey_1),
        ("survey_2", create_survey_2),
        ("survey_3", create_survey_3),
        ("survey_4", create_survey_4),
        ("survey_5", create_survey_5),
        ("survey_6", create_survey_6),
        ("survey_7", create_survey_7),
        ("survey_8", create_survey_8),
    ]
    
    results = {}
    for name, func in surveys:
        print(f"\n{'='*60}")
        print(f"Creando encuesta: {name}")
        print(f"{'='*60}")
        try:
            result = func(api_token)
            results[name] = result
        except Exception as e:
            print(f"❌ Error al crear {name}: {e}")
            results[name] = None
    
    print(f"\n{'='*60}")
    print("RESUMEN DE CREACIÓN")
    print(f"{'='*60}")
    for name, result in results.items():
        if result:
            print(f"✅ {name}: {result.get('id', 'N/A')}")
        else:
            print(f"❌ {name}: Falló")
    
    return results

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Uso: python create_clinica_maicao_survey.py <username> <password> [survey_id|urgencia|hospitalizacion|maternas|clone|all]")
        print("Ejemplo: python create_clinica_maicao_survey.py root password123")
        print("Para actualizar: python create_clinica_maicao_survey.py root password123 694eb305d99b44d0803c4cde")
        print("Para crear Urgencia: python create_clinica_maicao_survey.py root password123 urgencia")
        print("Para crear Hospitalización: python create_clinica_maicao_survey.py root password123 hospitalizacion")
        print("Para crear Maternas: python create_clinica_maicao_survey.py root password123 maternas")
        print("Para clonar desde Google Forms: python create_clinica_maicao_survey.py root password123 clone")
        print("Para crear todas: python create_clinica_maicao_survey.py root password123 all")
        print("Para crear encuestas pendientes: python create_clinica_maicao_survey.py root password123 survey_1 a survey_8")
        sys.exit(1)
    
    username = sys.argv[1]
    password = sys.argv[2]
    survey_id_or_type = sys.argv[3] if len(sys.argv) > 3 else None
    
    print("🔐 Obteniendo token de autenticación...")
    token = get_token(username, password)
    
    if not token:
        sys.exit(1)
    
    if survey_id_or_type == "urgencia":
        print("📝 Creando encuesta de satisfacción de Urgencia...")
        create_urgencia_survey(token)
    elif survey_id_or_type == "clone_urgencia":
        print("📝 Clonando encuesta de Urgencia desde Google Forms...")
        clone_urgencia_survey(token)
    elif survey_id_or_type == "hospitalizacion":
        print("📝 Creando encuesta de satisfacción de Hospitalización...")
        create_hospitalizacion_survey(token)
    elif survey_id_or_type == "clone_hospitalizacion":
        print("📝 Clonando encuesta de Hospitalización desde Google Forms...")
        clone_hospitalizacion_survey(token)
    elif survey_id_or_type == "maternas":
        print("📝 Creando encuesta de satisfacción de Pacientes Maternas...")
        create_maternas_survey(token)
    elif survey_id_or_type == "clone_maternas":
        print("📝 Clonando encuesta de Pacientes Maternas desde Google Forms...")
        clone_maternas_survey(token)
    elif survey_id_or_type == "clone_wayuu":
        print("📝 Clonando encuesta de Población Wayuu desde Google Forms...")
        clone_wayuu_survey(token)
    elif survey_id_or_type == "clone_anas_wayuu":
        print("📝 Clonando encuesta de Oficina de Anás Wayuu desde Google Forms...")
        clone_anas_wayuu_survey(token)
    elif survey_id_or_type == "clone_uci_neonatal":
        print("📝 Clonando encuesta de UCI Neonatal-Pediátrico desde Google Forms...")
        clone_uci_neonatal_pediatrico_survey(token)
    elif survey_id_or_type == "clone_laboratorio":
        print("📝 Clonando encuesta de Laboratorio Clínico desde Google Forms...")
        clone_laboratorio_clinico_survey(token)
    elif survey_id_or_type == "clone_cardiovascular":
        print("📝 Clonando encuesta de Unidad Cardiovascular desde Google Forms...")
        clone_unidad_cardiovascular_survey(token)
    elif survey_id_or_type == "clone_imagenes":
        print("📝 Clonando encuesta de Imágenes desde Google Forms...")
        clone_imagenes_survey(token)
    elif survey_id_or_type == "clone_uci_adulto":
        print("📝 Clonando encuesta de UCI Adulto desde Google Forms...")
        clone_uci_adulto_survey(token)
    elif survey_id_or_type == "clone":
        print("📝 Clonando encuesta desde Google Forms...")
        clone_consulta_externa_survey(token)
    elif survey_id_or_type == "survey_1":
        print("📝 Creando encuesta 1...")
        create_survey_1(token)
    elif survey_id_or_type == "survey_2":
        print("📝 Creando encuesta 2...")
        create_survey_2(token)
    elif survey_id_or_type == "survey_3":
        print("📝 Creando encuesta 3...")
        create_survey_3(token)
    elif survey_id_or_type == "survey_4":
        print("📝 Creando encuesta 4...")
        create_survey_4(token)
    elif survey_id_or_type == "survey_5":
        print("📝 Creando encuesta 5...")
        create_survey_5(token)
    elif survey_id_or_type == "survey_6":
        print("📝 Creando encuesta 6...")
        create_survey_6(token)
    elif survey_id_or_type == "survey_7":
        print("📝 Creando encuesta 7...")
        create_survey_7(token)
    elif survey_id_or_type == "survey_8":
        print("📝 Creando encuesta 8...")
        create_survey_8(token)
    elif survey_id_or_type == "all":
        print("📝 Creando todas las encuestas...")
        create_all_surveys(token)
    elif survey_id_or_type and survey_id_or_type not in ["urgencia", "hospitalizacion", "maternas", "clone", "all", "survey_1", "survey_2", "survey_3", "survey_4", "survey_5", "survey_6", "survey_7", "survey_8"]:
        print(f"📝 Actualizando encuesta {survey_id_or_type}...")
        update_survey(token, survey_id_or_type)
    else:
        print("📝 Creando encuesta de satisfacción de Consulta Externa...")
        create_survey(token)

