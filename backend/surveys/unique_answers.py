"""Enforce per-question unique answers within a survey (e.g. document number)."""
from __future__ import annotations

from bson import ObjectId
from rest_framework import status
from rest_framework.response import Response


def normalize_unique_value(value):
    if value is None:
        return None
    if isinstance(value, bool):
        return None
    if isinstance(value, (int, float)) and not isinstance(value, bool):
        try:
            if float(value).is_integer():
                return str(int(value))
        except Exception:
            pass
        return str(value).strip() or None
    s = str(value).strip()
    return s or None


def answer_value_variants(value):
    """Mongo may store the same document as int or string."""
    base = normalize_unique_value(value)
    if base is None:
        return []
    variants = {base}
    digits = ''.join(ch for ch in base if ch.isdigit())
    if digits:
        variants.add(digits)
        try:
            as_int = int(digits)
            variants.add(as_int)
            variants.add(str(as_int))
        except Exception:
            pass
    return list(variants)


def survey_id_variants(survey):
    sid = survey.get('_id') if isinstance(survey, dict) else survey
    out = []
    if sid is not None:
        out.append(sid)
        out.append(str(sid))
        try:
            out.append(ObjectId(str(sid)))
        except Exception:
            pass
    # de-dupe while preserving order
    seen = set()
    unique = []
    for v in out:
        key = (type(v).__name__, str(v))
        if key not in seen:
            seen.add(key)
            unique.append(v)
    return unique


def find_existing_unique_response(responses_collection, survey, question_id, value):
    variants = answer_value_variants(value)
    if not variants or not question_id:
        return None
    survey_ids = survey_id_variants(survey)
    if not survey_ids:
        return None
    query = {
        '$and': [
            {'survey': {'$in': survey_ids}},
            {'$or': [{f'answers.{question_id}': v} for v in variants]},
        ]
    }
    return responses_collection.find_one(query, {'_id': 1, 'answers': 1})


def unique_questions(survey):
    questions = (survey or {}).get('questions') or []
    out = []
    for q in questions:
        if not isinstance(q, dict):
            continue
        if not q.get('unique_answer'):
            continue
        qid = q.get('id') or q.get('_id')
        if not qid:
            continue
        out.append(q)
    return out


def duplicate_unique_answer_error(question, question_id):
    label = (question.get('text') or question.get('question_text') or 'esta pregunta').strip()
    return Response(
        {
            'detail': (
                f'Ya existe una respuesta registrada con este valor en "{label}". '
                'Cada documento solo puede registrarse una vez en esta encuesta.'
            ),
            'code': 'duplicate_unique_answer',
            'question_id': question_id,
        },
        status=status.HTTP_409_CONFLICT,
    )


def check_unique_answers(survey, answers, responses_collection):
    """
    Return a 409 Response if any unique_answer question already has this value,
    otherwise None.
    """
    answers = answers or {}
    for q in unique_questions(survey):
        qid = q.get('id') or q.get('_id')
        val = answers.get(qid)
        if normalize_unique_value(val) is None:
            continue
        existing = find_existing_unique_response(responses_collection, survey, qid, val)
        if existing:
            return duplicate_unique_answer_error(q, qid)
    return None
