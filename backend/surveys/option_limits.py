"""Cupo por opción en preguntas de selección única."""

from .unique_answers import survey_id_variants

SINGLE_TYPES = {
    'single_choice',
    'opción única',
    'opcion unica',
    'dropdown',
    'desplegable',
}


def _question_type(question):
    return str(question.get('type') or question.get('question_type') or '').strip().lower()


def limited_selections(survey, answers):
    """Opciones elegidas que tienen cupo: (pregunta, id, texto, cupo)."""
    selections = []
    if not isinstance(answers, dict):
        return selections
    for question in survey.get('questions') or []:
        if not isinstance(question, dict):
            continue
        if _question_type(question) not in SINGLE_TYPES:
            continue
        limits = question.get('option_limits') or {}
        if not isinstance(limits, dict) or not limits:
            continue
        qid = str(question.get('id') or question.get('_id') or '').strip()
        if not qid or qid not in answers:
            continue
        chosen = answers.get(qid)
        if isinstance(chosen, list) or chosen in (None, ''):
            continue
        option = chosen if isinstance(chosen, str) else str(chosen)
        if option == '':
            continue
        raw = limits.get(option)
        try:
            limit = int(raw)
        except (TypeError, ValueError):
            continue
        if limit > 0:
            selections.append((question, qid, option, limit))
    return selections


def quota_payload(question, qid, option):
    return {
        'detail': f'El cupo de "{option}" ya se llenó. Elige otra opción.',
        'code': 'option_quota_full',
        'question_id': qid,
        'option': option,
        'question_text': question.get('text') or '',
    }


def _option_query(survey, qid, option):
    return {
        'survey': {'$in': survey_id_variants(survey)},
        f'answers.{qid}': option,
    }


def find_full_option(survey, answers, responses_collection):
    """Antes de guardar: la opción ya alcanzó el cupo."""
    for question, qid, option, limit in limited_selections(survey, answers):
        taken = responses_collection.count_documents(_option_query(survey, qid, option))
        if taken >= limit:
            return quota_payload(question, qid, option)
    return None


def drop_if_over_quota(survey, answers, responses_collection, inserted_id):
    """
    Después de guardar: si esta respuesta deja el total por encima del cupo,
    se borra y se rechaza. Se conservan las que llegaron primero.
    """
    for question, qid, option, limit in limited_selections(survey, answers):
        cursor = responses_collection.find(
            _option_query(survey, qid, option),
            {'_id': 1},
        ).sort([('created_at', 1), ('_id', 1)])
        keep = []
        for doc in cursor:
            keep.append(doc['_id'])
            if len(keep) > limit:
                break
        if len(keep) > limit and inserted_id not in keep[:limit]:
            responses_collection.delete_one({'_id': inserted_id})
            return quota_payload(question, qid, option)
    return None


def option_counts(survey, responses_collection):
    """Cuántas respuestas hay en cada opción con cupo."""
    counts = {}
    for question in survey.get('questions') or []:
        if not isinstance(question, dict):
            continue
        if _question_type(question) not in SINGLE_TYPES:
            continue
        limits = question.get('option_limits') or {}
        if not isinstance(limits, dict):
            continue
        qid = str(question.get('id') or question.get('_id') or '').strip()
        if not qid:
            continue
        per_option = {}
        for option, raw in limits.items():
            try:
                limit = int(raw)
            except (TypeError, ValueError):
                continue
            label = str(option)
            if limit > 0 and label:
                per_option[label] = responses_collection.count_documents(
                    _option_query(survey, qid, label)
                )
        if per_option:
            counts[qid] = per_option
    return counts
