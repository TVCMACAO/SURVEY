#!/usr/bin/env python3
"""
Crear encuesta: FORMATO DE RONDA DIARIA – SUPERVISIÓN TALENTO HUMANO

- Crea la encuesta en el grupo especificado.
- Por defecto la crea como privada (is_public=false).
- Soporta creación "en nombre de" otro usuario SOLO si el creador autenticado es root
  (ver backend/surveys/views.py -> created_by_username / created_by).

Uso:
  python3 create_ronda_diaria_th_survey.py <auth_username> <auth_password> <group_id> <created_by_username>

Ejemplo:
  python3 create_ronda_diaria_th_survey.py root root123 695d905859f19d310a5f719a dnavarro
"""

import sys
import requests


BASE_URL_DEFAULT = "http://localhost:8085"


def get_token(base_url: str, username: str, password: str) -> str:
    r = requests.post(
        f"{base_url}/api/token/",
        json={"username": username, "password": password},
        timeout=15,
    )
    r.raise_for_status()
    return r.json()["access"]


def build_payload(group_id: str, created_by_username: str):
    sections = [
        {"id": "datos_generales", "title": "Datos generales", "description": "", "order": 0},
        {"id": "objetivo_ronda", "title": "Objetivo de la ronda", "description": "", "order": 1},
        {"id": "aspectos_evaluados", "title": "Aspectos evaluados", "description": "", "order": 2},
        {"id": "descripcion_situacion", "title": "Descripción de la situación", "description": "", "order": 3},
        {"id": "tipo_hallazgo", "title": "Tipo de hallazgo", "description": "", "order": 4},
        {"id": "retroalimentacion", "title": "Retroalimentación", "description": "", "order": 5},
        {"id": "compromisos", "title": "Compromisos", "description": "", "order": 6},
        {"id": "seguimiento", "title": "Seguimiento", "description": "", "order": 7},
        {"id": "observaciones", "title": "Observaciones adicionales", "description": "", "order": 8},
        {"id": "constancia_firmas", "title": "Constancia y firmas", "description": "", "order": 9},
    ]

    def cumple_no_cumple(qid: str, label: str):
        return [
            {
                "id": f"{qid}_estado",
                "question_text": label,
                "question_type": "single_choice",
                "required": False,
                "options": ["CUMPLE", "NO CUMPLE", "NO APLICA"],
                "section_id": "aspectos_evaluados",
            },
            {
                "id": f"{qid}_obs",
                "question_text": f"Observaciones - {label}",
                "question_type": "long_text",
                "required": False,
                "section_id": "aspectos_evaluados",
            },
        ]

    # Conditional: show fecha_programada only if requiere_seguimiento == SI
    requiere_seguimiento_id = "seguimiento_requiere"

    questions = [
        # Datos generales
        {"id": "area_servicio", "question_text": "Área / Servicio", "question_type": "short_text", "required": False, "section_id": "datos_generales"},
        {"id": "fecha", "question_text": "Fecha", "question_type": "date", "required": True, "section_id": "datos_generales"},
        {"id": "hora", "question_text": "Hora", "question_type": "short_text", "required": False, "section_id": "datos_generales"},
        {"id": "nombre_trabajador", "question_text": "Nombre del trabajador evaluado", "question_type": "short_text", "required": True, "section_id": "datos_generales"},
        {"id": "identificacion", "question_text": "Identificación del trabajador", "question_type": "short_text", "required": True, "section_id": "datos_generales"},
        {"id": "cargo", "question_text": "Cargo", "question_type": "short_text", "required": False, "section_id": "datos_generales"},
        {"id": "tipo_contrato", "question_text": "Tipo de contrato", "question_type": "short_text", "required": False, "section_id": "datos_generales"},

        # Objetivo (texto informativo como pregunta opcional)
        {
            "id": "objetivo_texto",
            "question_text": "Objetivo de la ronda (texto de referencia)",
            "question_type": "long_text",
            "required": False,
            "section_id": "objetivo_ronda",
            "description": "Puedes dejarlo vacío si solo es informativo.",
        },
    ]

    # Aspectos evaluados (2 columnas + observaciones)
    questions += cumple_no_cumple("puntualidad", "Puntualidad y asistencia")
    questions += cumple_no_cumple("presentacion_epp", "Presentación personal y uso de EPP")
    questions += cumple_no_cumple("funciones", "Cumplimiento de funciones asignadas")
    questions += cumple_no_cumple("actitud", "Actitud y comportamiento laboral")
    questions += cumple_no_cumple("acatamiento", "Acatamiento de instrucciones")
    questions += cumple_no_cumple("trato", "Trato respetuoso con compañeros y usuarios")
    questions += cumple_no_cumple("normas", "Cumplimiento de normas internas")

    # Descripción situación
    questions += [
        {
            "id": "descripcion_situacion_texto",
            "question_text": "Descripción de la situación identificada (describir de manera clara, objetiva y verificable)",
            "question_type": "long_text",
            "required": False,
            "section_id": "descripcion_situacion",
        }
    ]

    # Tipo de hallazgo
    questions += [
        {
            "id": "tipo_hallazgo_check",
            "question_text": "Tipo de hallazgo (marque lo que aplique)",
            "question_type": "checkbox",
            "required": False,
            "options": [
                "Observación preventiva",
                "Llamado de atención verbal",
                "Reiteración de conducta previamente reportada",
                "Falta que podría dar lugar a proceso disciplinario",
            ],
            "section_id": "tipo_hallazgo",
        }
    ]

    # Retroalimentación
    questions += [
        {
            "id": "retroalimentacion_texto",
            "question_text": "Retroalimentación brindada al trabajador (indicar la orientación entregada y la norma, procedimiento o conducta esperada)",
            "question_type": "long_text",
            "required": False,
            "section_id": "retroalimentacion",
        }
    ]

    # Compromisos
    questions += [
        {"id": "compromisos_texto", "question_text": "Compromisos adquiridos por el trabajador", "question_type": "long_text", "required": False, "section_id": "compromisos"},
        {"id": "compromisos_fecha_limite", "question_text": "Fecha límite de cumplimiento", "question_type": "date", "required": False, "section_id": "compromisos"},
    ]

    # Seguimiento
    questions += [
        {
            "id": requiere_seguimiento_id,
            "question_text": "¿Requiere seguimiento posterior?",
            "question_type": "single_choice",
            "required": False,
            "options": ["SI", "NO"],
            "section_id": "seguimiento",
        },
        {
            "id": "seguimiento_fecha_programada",
            "question_text": "Fecha programada de seguimiento",
            "question_type": "date",
            "required": False,
            "section_id": "seguimiento",
            "conditional_logic": {"type": "show_if", "question_id": requiere_seguimiento_id, "operator": "equals", "value": "SI"},
        },
    ]

    # Observaciones adicionales
    questions += [
        {"id": "observaciones_adicionales", "question_text": "Observaciones adicionales", "question_type": "long_text", "required": False, "section_id": "observaciones"}
    ]

    # Constancia y firmas
    questions += [
        {"id": "firma_trabajador", "question_text": "Firma del trabajador", "question_type": "signature", "required": True, "section_id": "constancia_firmas"},
        {"id": "nombre_trabajador_firma", "question_text": "Nombre", "question_type": "short_text", "required": True, "section_id": "constancia_firmas"},
        {"id": "documento_trabajador_firma", "question_text": "Documento", "question_type": "short_text", "required": True, "section_id": "constancia_firmas"},
        {"id": "fecha_firma_trabajador", "question_text": "Fecha", "question_type": "date", "required": True, "section_id": "constancia_firmas"},
        {"id": "firma_supervisor_th", "question_text": "Firma Supervisora Talento Humano", "question_type": "signature", "required": True, "section_id": "constancia_firmas"},
        {"id": "nombre_supervisor_th", "question_text": "Nombre", "question_type": "short_text", "required": True, "section_id": "constancia_firmas"},
        {"id": "fecha_firma_supervisor", "question_text": "Fecha", "question_type": "date", "required": True, "section_id": "constancia_firmas"},
    ]

    return {
        "title": "FORMATO DE RONDA DIARIA – SUPERVISIÓN TALENTO HUMANO",
        "description": "Registro de ronda diaria para supervisión de comportamiento laboral, retroalimentación, compromisos, seguimiento y firmas.",
        "group": group_id,
        "is_public": False,
        "sections": sections,
        "questions": questions,
        # Root-only override (backend lo aplicará si el autenticado es root)
        "created_by_username": created_by_username,
    }


def main():
    if len(sys.argv) < 5:
        print(__doc__.strip())
        sys.exit(2)

    auth_username = sys.argv[1]
    auth_password = sys.argv[2]
    group_id = sys.argv[3]
    created_by_username = sys.argv[4]

    base_url = BASE_URL_DEFAULT

    token = get_token(base_url, auth_username, auth_password)
    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}

    payload = build_payload(group_id, created_by_username)
    r = requests.post(f"{base_url}/api/surveys/", json=payload, headers=headers, timeout=30)
    r.raise_for_status()
    data = r.json()
    print("✅ Encuesta creada")
    print("ID:", data.get("id"))
    print("Título:", data.get("title"))
    print("Grupo:", data.get("group"), "-", data.get("group_name"))
    print("Creada por:", data.get("created_by_username"))
    print("Secciones:", len(data.get("sections", []) or []))
    print("Preguntas:", len(data.get("questions", []) or []))


if __name__ == "__main__":
    main()

