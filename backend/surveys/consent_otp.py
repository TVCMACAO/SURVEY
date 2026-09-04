"""Consent OTP helpers: hashing, tokens, rate limits."""
import hashlib
import hmac
import secrets
import time
from datetime import datetime, timedelta

from django.conf import settings

OTP_TTL_SECONDS = 10 * 60
TOKEN_TTL_SECONDS = 2 * 60 * 60
MAX_ATTEMPTS = 5
RESEND_COOLDOWN_SECONDS = 45


def normalize_email(email):
    return (email or '').strip().lower()


def generate_otp_code(length=6):
    # Numeric OTP, no leading-zero loss as string
    return ''.join(secrets.choice('0123456789') for _ in range(length))


def hash_otp(code):
    raw = f"{settings.SECRET_KEY}:consent-otp:{code}"
    return hashlib.sha256(raw.encode('utf-8')).hexdigest()


def make_consent_token(survey_id, email, exp_ts=None):
    email_n = normalize_email(email)
    exp = int(exp_ts or (time.time() + TOKEN_TTL_SECONDS))
    payload = f"{survey_id}|{email_n}|{exp}"
    sig = hmac.new(
        settings.SECRET_KEY.encode('utf-8'),
        payload.encode('utf-8'),
        hashlib.sha256,
    ).hexdigest()
    return f"{payload}|{sig}"


def verify_consent_token(token, survey_id, email=None):
    if not token or not isinstance(token, str):
        return False, 'Token de consentimiento ausente o inválido.'
    parts = token.split('|')
    if len(parts) != 4:
        return False, 'Token de consentimiento inválido.'
    tok_survey, tok_email, tok_exp, tok_sig = parts
    if str(tok_survey) != str(survey_id):
        return False, 'Token de consentimiento no corresponde a esta encuesta.'
    if email is not None and normalize_email(email) != normalize_email(tok_email):
        return False, 'Token de consentimiento no corresponde al correo.'
    try:
        exp = int(tok_exp)
    except ValueError:
        return False, 'Token de consentimiento inválido.'
    if time.time() > exp:
        return False, 'El token de consentimiento expiró. Verifica el OTP de nuevo.'
    payload = f"{tok_survey}|{tok_email}|{tok_exp}"
    expected = hmac.new(
        settings.SECRET_KEY.encode('utf-8'),
        payload.encode('utf-8'),
        hashlib.sha256,
    ).hexdigest()
    if not hmac.compare_digest(expected, tok_sig):
        return False, 'Token de consentimiento inválido.'
    return True, tok_email


def otp_expires_at():
    return datetime.utcnow() + timedelta(seconds=OTP_TTL_SECONDS)
