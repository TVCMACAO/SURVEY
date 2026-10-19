"""Puntaje de un test: por sección y total."""

SINGLE_TYPES = {
    'single_choice',
    'opción única',
    'opcion unica',
}
BAND_COLORS = {'green', 'yellow', 'red'}


def _as_int(raw):
    try:
        return int(raw)
    except (TypeError, ValueError):
        return None


def match_band(bands, score):
    """La primera banda cuyo rango contiene el puntaje."""
    if not isinstance(bands, list):
        return None
    for band in bands:
        if not isinstance(band, dict):
            continue
        low = _as_int(band.get('min'))
        high = _as_int(band.get('max'))
        if low is None or high is None or low > high:
            continue
        if low <= score <= high:
            color = band.get('color') if band.get('color') in BAND_COLORS else 'green'
            items = []
            for item in band.get('items') or []:
                text = str(item).strip()
                if text:
                    items.append(text)
            return {
                'min': low,
                'max': high,
                'color': color,
                'title': str(band.get('title') or '').strip(),
                'items': items,
            }
    return None


def _question_type(question):
    return str(question.get('type') or question.get('question_type') or '').strip().lower()


def score_test_response(survey, answers):
    """None si no es un test. Si lo es, puntaje de cada sección y el total."""
    if not isinstance(survey, dict) or survey.get('kind') != 'test':
        return None
    if not isinstance(answers, dict):
        answers = {}
    sections = [s for s in (survey.get('sections') or []) if isinstance(s, dict)]
    sections.sort(key=lambda section: section.get('order') if isinstance(section.get('order'), int) else 0)
    questions = [q for q in (survey.get('questions') or []) if isinstance(q, dict)]
    section_scores = []
    total = 0
    for section in sections:
        section_id = str(section.get('id') or '').strip()
        if not section_id:
            continue
        score = 0
        for question in questions:
            if str(question.get('section_id') or '') != section_id:
                continue
            if _question_type(question) not in SINGLE_TYPES:
                continue
            question_id = str(question.get('id') or question.get('_id') or '').strip()
            if not question_id:
                continue
            chosen = answers.get(question_id)
            if isinstance(chosen, list) or chosen in (None, ''):
                continue
            option = chosen if isinstance(chosen, str) else str(chosen)
            points = _as_int((question.get('option_scores') or {}).get(option))
            if points is None:
                continue
            score += points
        total += score
        section_scores.append({
            'section_id': section_id,
            'title': section.get('title') or '',
            'score': score,
            'band': match_band(section.get('score_bands'), score),
        })
    return {
        'section_scores': section_scores,
        'total_score': {
            'score': total,
            'band': match_band(survey.get('total_bands'), total),
        },
    }
