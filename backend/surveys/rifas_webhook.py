"""Resolve rifas user fields from survey answers + webhook_field_map."""
import re
import unicodedata

RIFAS_REQUIRED_FIELDS = ('numero_documento', 'nombre_completo', 'correo')
RIFAS_OPTIONAL_FIELDS = ('tipo_documento', 'cargo')
RIFAS_ALL_FIELDS = RIFAS_REQUIRED_FIELDS + RIFAS_OPTIONAL_FIELDS


def _norm(s):
    return re.sub(r'\s+', ' ', str(s or '').strip())


def _norm_label(s):
    t = _norm(s).lower()
    t = unicodedata.normalize('NFD', t)
    return ''.join(c for c in t if unicodedata.category(c) != 'Mn')


def _answer_str(answers, question_id):
    if not question_id:
        return ''
    val = answers.get(question_id)
    if val is None:
        return ''
    if isinstance(val, list):
        return _norm(', '.join(str(x) for x in val if x is not None))
    if isinstance(val, dict):
        return ''
    s = _norm(val)
    if s.startswith('data:image'):
        return ''
    return s


def _from_consent_mappings(survey, answers, keys):
    ic = survey.get('informed_consent') or {}
    mappings = ic.get('mappings') or []
    key_set = {_norm_label(k) for k in keys}
    for m in mappings:
        if not isinstance(m, dict):
            continue
        if _norm_label(m.get('key')) not in key_set:
            continue
        val = _answer_str(answers, m.get('question_id'))
        if val:
            return val
    return ''


def _from_question_text(survey, answers, keywords):
    questions = survey.get('questions') or []
    for q in questions:
        if not isinstance(q, dict):
            continue
        label = _norm_label(q.get('text') or q.get('question_text') or q.get('label') or '')
        if not any(_norm_label(k) in label for k in keywords):
            continue
        qid = q.get('id') or q.get('_id')
        val = _answer_str(answers, qid)
        if val:
            return val
    return ''


# Ej.: "CC 40879812", "CC-40879812", "NIT 900123456-1"
_TIPO_NUM_RE = re.compile(
    r'^\s*([A-Za-zÁÉÍÓÚáéíóúÑñ]{1,10})\s*[.\-–—:]?\s+([0-9][0-9.\-]*[0-9]|[0-9]+)\s*$'
)


def split_tipo_y_numero(value):
    """
    Si el valor es 'CC 40879812' (u similar), retorna (tipo, numero).
    Si no se puede partir, (None, None).
    """
    s = _norm(value)
    if not s:
        return None, None
    m = _TIPO_NUM_RE.match(s)
    if not m:
        return None, None
    tipo = m.group(1).strip().upper()
    numero = re.sub(r'[.\s]', '', m.group(2).strip())
    if not tipo or not numero:
        return None, None
    return tipo, numero


def resolve_rifas_user(survey, answers, consent_email=None):
    """
    Build user dict for rifas webhook.
    Returns (user_dict, missing_required_list).
    """
    answers = answers or {}
    field_map = survey.get('webhook_field_map') or {}
    if not isinstance(field_map, dict):
        field_map = {}

    user = {}
    for key in RIFAS_ALL_FIELDS:
        qid = field_map.get(key) or ''
        user[key] = _answer_str(answers, qid)

    if not user['numero_documento']:
        user['numero_documento'] = (
            _from_consent_mappings(survey, answers, ['cc', 'cedula', 'cédula', 'documento', 'nit'])
            or _answer_str(answers, survey.get('documento_votante_question_id'))
            or _answer_str(answers, survey.get('documento_empleado_question_id'))
            or _from_question_text(
                survey, answers,
                ['cedula', 'cédula', 'documento', 'identificacion', 'identificación', 'nit'],
            )
        )

    if not user['nombre_completo']:
        user['nombre_completo'] = (
            _from_consent_mappings(survey, answers, ['nombre', 'name', 'nombres', 'nombre_completo'])
            or _from_question_text(
                survey, answers,
                ['nombre completo', 'nombres y apellidos', 'nombre y apellido', 'nombre', 'nombres'],
            )
        )

    if not user['correo']:
        email = _norm(consent_email).lower()
        if email and '@' in email:
            user['correo'] = email
        else:
            user['correo'] = _from_question_text(
                survey, answers, ['correo', 'email', 'e-mail']
            ).lower()

    if not user['tipo_documento']:
        user['tipo_documento'] = (
            _from_question_text(
                survey, answers,
                ['tipo y numero de documento', 'tipo y número de documento', 'tipo de documento', 'tipo documento'],
            )
            or _from_question_text(survey, answers, ['tipo doc'])
        )

    if not user['cargo']:
        user['cargo'] = _from_question_text(survey, answers, ['cargo', 'puesto', 'rol'])

    # "CC 40879812" → tipo_documento=CC; si faltaba número, rellenarlo
    tipo_p, numero_p = split_tipo_y_numero(user.get('tipo_documento'))
    if tipo_p:
        user['tipo_documento'] = tipo_p
        if not user.get('numero_documento') and numero_p:
            user['numero_documento'] = numero_p

    missing = [k for k in RIFAS_REQUIRED_FIELDS if not user.get(k)]
    return user, missing


def is_authorization_accepted(survey, answers):
    """True if acceptance question matches configured acceptance_value."""
    if not survey.get('informed_consent_enabled'):
        return True
    ic = survey.get('informed_consent') or {}
    aq = (ic.get('acceptance_question_id') or '').strip()
    accept_value = (ic.get('acceptance_value') or 'SI, AUTORIZO').strip()
    if not aq:
        return True
    answered = answers.get(aq) if answers else None
    return str(answered or '').strip() == accept_value
