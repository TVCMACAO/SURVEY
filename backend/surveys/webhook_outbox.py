"""Async outbound webhooks (survey → rifas) via Mongo outbox."""
import hashlib
import hmac
import json
import logging
import time
import urllib.error
import urllib.request
from datetime import datetime, timedelta

from bson import ObjectId
from django.conf import settings

from .mongo_utils import get_responses_collection, get_webhook_outbox_collection
from .rifas_webhook import resolve_rifas_user, is_authorization_accepted

logger = logging.getLogger(__name__)

MAX_ATTEMPTS = 5
BACKOFF_SECONDS = (30, 60, 120, 300, 600)
EVENT_NAME = 'survey.response.authorized'
EVENT_VERSION = 1


def _now():
    return datetime.utcnow()


def webhook_sync_enabled():
    return bool(getattr(settings, 'WEBHOOK_SYNC', False))


def sign_body(secret, raw_body_bytes):
    digest = hmac.new(
        (secret or '').encode('utf-8'),
        raw_body_bytes,
        hashlib.sha256,
    ).hexdigest()
    return f'sha256={digest}'


def build_authorized_payload(survey, response_doc, user_fields):
    survey_id = str(survey.get('_id') or survey.get('id') or '')
    response_id = str(response_doc.get('_id') or response_doc.get('id') or '')
    created = response_doc.get('created_at') or _now()
    if isinstance(created, datetime):
        created_iso = created.isoformat() + 'Z'
    else:
        created_iso = str(created)

    otp_at = response_doc.get('consent_otp_verified_at')
    if isinstance(otp_at, datetime):
        otp_iso = otp_at.isoformat() + 'Z'
    elif otp_at:
        otp_iso = str(otp_at)
    else:
        otp_iso = None

    user = {
        'numero_documento': user_fields.get('numero_documento') or '',
        'nombre_completo': user_fields.get('nombre_completo') or '',
        'correo': user_fields.get('correo') or '',
    }
    if user_fields.get('tipo_documento'):
        user['tipo_documento'] = user_fields['tipo_documento']
    if user_fields.get('cargo'):
        user['cargo'] = user_fields['cargo']

    ic = survey.get('informed_consent') or {}
    return {
        'event': EVENT_NAME,
        'event_version': EVENT_VERSION,
        'occurred_at': _now().isoformat() + 'Z',
        'survey': {
            'id': survey_id,
            'title': (survey.get('title') or '').strip(),
        },
        'response': {
            'id': response_id,
            'created_at': created_iso,
        },
        'user': user,
        'authorization': {
            'accepted': True,
            'acceptance_value': (ic.get('acceptance_value') or 'SI, AUTORIZO').strip(),
            'consent_otp_verified': bool(otp_at),
            'consent_otp_verified_at': otp_iso,
        },
    }


def enqueue_webhook_job(*, survey_id, response_id, url, secret, payload):
    coll = get_webhook_outbox_collection()
    doc = {
        'type': 'rifas_authorized',
        'status': 'pending',
        'attempts': 0,
        'next_run_at': _now(),
        'created_at': _now(),
        'updated_at': _now(),
        'survey_id': str(survey_id),
        'response_id': str(response_id),
        'url': (url or '').strip(),
        'secret': secret or '',
        'payload': payload,
        'http_status': None,
        'last_error': None,
        'sent_at': None,
    }
    result = coll.insert_one(doc)
    return str(result.inserted_id)


def _mark_response_webhook(response_id, **fields):
    if not response_id:
        return
    try:
        oid = ObjectId(str(response_id))
    except Exception:
        return
    fields['webhook_updated_at'] = _now()
    get_responses_collection().update_one({'_id': oid}, {'$set': fields})


def deliver_webhook_http(url, secret, payload, delivery_id=''):
    """POST JSON with HMAC signature. Returns ok/http_status/error/retryable."""
    raw = json.dumps(payload, ensure_ascii=False, separators=(',', ':')).encode('utf-8')
    signature = sign_body(secret, raw)
    req = urllib.request.Request(
        url,
        data=raw,
        method='POST',
        headers={
            'Content-Type': 'application/json; charset=utf-8',
            'User-Agent': 'survey-app-webhook/1.0',
            'X-Survey-Event': EVENT_NAME,
            'X-Survey-Delivery-Id': str(delivery_id or ''),
            'X-Survey-Signature': signature,
        },
    )
    t0 = time.perf_counter()
    try:
        with urllib.request.urlopen(req, timeout=20) as resp:
            status_code = getattr(resp, 'status', None) or resp.getcode()
            resp.read(65536)
            elapsed = int((time.perf_counter() - t0) * 1000)
            ok = 200 <= int(status_code) < 300
            return {
                'ok': ok,
                'http_status': int(status_code),
                'error': None if ok else f'HTTP {status_code}',
                'elapsed_ms': elapsed,
                'retryable': not ok and int(status_code) >= 500,
            }
    except urllib.error.HTTPError as exc:
        elapsed = int((time.perf_counter() - t0) * 1000)
        code = int(exc.code)
        body = ''
        try:
            body = exc.read(512).decode('utf-8', errors='replace')
        except Exception:
            pass
        return {
            'ok': False,
            'http_status': code,
            'error': f'HTTP {code}: {body[:200]}',
            'elapsed_ms': elapsed,
            'retryable': code >= 500,
        }
    except Exception as exc:
        elapsed = int((time.perf_counter() - t0) * 1000)
        return {
            'ok': False,
            'http_status': None,
            'error': str(exc)[:500],
            'elapsed_ms': elapsed,
            'retryable': True,
        }


def maybe_enqueue_rifas_webhook(survey, response_doc):
    """After response insert: enqueue rifas webhook if configured and authorized."""
    if not survey or not survey.get('webhook_enabled'):
        return 'disabled'

    url = (survey.get('webhook_url') or '').strip()
    secret = survey.get('webhook_secret') or ''
    if not url:
        _mark_response_webhook(response_doc.get('_id'), webhook_status='skipped_no_url')
        return 'skipped_no_url'

    answers = response_doc.get('answers') or {}
    if not is_authorization_accepted(survey, answers):
        _mark_response_webhook(response_doc.get('_id'), webhook_status='skipped_not_authorized')
        return 'skipped_not_authorized'

    require_otp = survey.get('webhook_require_otp')
    if require_otp is None:
        require_otp = bool(survey.get('informed_consent_enabled'))
    if require_otp and not response_doc.get('consent_otp_verified_at'):
        _mark_response_webhook(response_doc.get('_id'), webhook_status='skipped_otp_required')
        return 'skipped_otp_required'

    user, missing = resolve_rifas_user(
        survey,
        answers,
        consent_email=response_doc.get('consent_email'),
    )
    if missing:
        _mark_response_webhook(
            response_doc.get('_id'),
            webhook_status='skipped_missing_fields',
            webhook_missing_fields=missing,
            rifas_user=user,
        )
        return 'skipped_missing_fields'

    payload = build_authorized_payload(survey, response_doc, user)
    response_id = str(response_doc.get('_id'))
    survey_id = str(survey.get('_id') or survey.get('id'))

    if webhook_sync_enabled():
        result = deliver_webhook_http(url, secret, payload, delivery_id='sync')
        if result['ok']:
            _mark_response_webhook(
                response_id,
                webhook_status='sent',
                webhook_sent_at=_now(),
                webhook_http_status=result['http_status'],
                rifas_user=user,
            )
            return 'sent'
        _mark_response_webhook(
            response_id,
            webhook_status='failed',
            webhook_last_error=result.get('error'),
            webhook_http_status=result.get('http_status'),
            rifas_user=user,
        )
        return 'failed'

    job_id = enqueue_webhook_job(
        survey_id=survey_id,
        response_id=response_id,
        url=url,
        secret=secret,
        payload=payload,
    )
    _mark_response_webhook(
        response_id,
        webhook_status='queued',
        webhook_job_id=job_id,
        rifas_user=user,
    )
    return 'queued'


def _claim_next_job():
    from pymongo import ReturnDocument
    coll = get_webhook_outbox_collection()
    now = _now()
    return coll.find_one_and_update(
        {
            'status': {'$in': ['pending', 'failed']},
            'next_run_at': {'$lte': now},
            'attempts': {'$lt': MAX_ATTEMPTS},
        },
        {
            '$set': {'status': 'sending', 'updated_at': now},
            '$inc': {'attempts': 1},
        },
        sort=[('next_run_at', 1), ('created_at', 1)],
        return_document=ReturnDocument.AFTER,
    )


def process_one_job(job):
    url = job.get('url') or ''
    secret = job.get('secret') or ''
    payload = job.get('payload') or {}
    delivery_id = str(job.get('_id'))
    result = deliver_webhook_http(url, secret, payload, delivery_id=delivery_id)
    coll = get_webhook_outbox_collection()
    response_id = job.get('response_id')

    if result['ok']:
        coll.update_one(
            {'_id': job['_id']},
            {'$set': {
                'status': 'sent',
                'http_status': result['http_status'],
                'last_error': None,
                'sent_at': _now(),
                'updated_at': _now(),
                'elapsed_ms': result.get('elapsed_ms'),
            }},
        )
        _mark_response_webhook(
            response_id,
            webhook_status='sent',
            webhook_sent_at=_now(),
            webhook_http_status=result['http_status'],
        )
        return True

    attempts = int(job.get('attempts') or 1)
    permanently = attempts >= MAX_ATTEMPTS or not result.get('retryable', True)
    if result.get('http_status') and 400 <= int(result['http_status']) < 500:
        permanently = True
    backoff_idx = min(max(attempts - 1, 0), len(BACKOFF_SECONDS) - 1)
    next_run = _now() + timedelta(seconds=BACKOFF_SECONDS[backoff_idx])
    coll.update_one(
        {'_id': job['_id']},
        {'$set': {
            'status': 'failed' if permanently else 'pending',
            'http_status': result.get('http_status'),
            'last_error': result.get('error'),
            'next_run_at': next_run if not permanently else job.get('next_run_at') or _now(),
            'updated_at': _now(),
            'elapsed_ms': result.get('elapsed_ms'),
        }},
    )
    _mark_response_webhook(
        response_id,
        webhook_status='failed' if permanently else 'queued',
        webhook_last_error=result.get('error'),
        webhook_http_status=result.get('http_status'),
    )
    return False


def process_pending_jobs(limit=20):
    processed = 0
    succeeded = 0
    for _ in range(limit):
        job = _claim_next_job()
        if not job:
            break
        processed += 1
        if process_one_job(job):
            succeeded += 1
    return processed, succeeded
