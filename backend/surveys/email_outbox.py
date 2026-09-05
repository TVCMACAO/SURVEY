"""Mongo email outbox: enqueue and process SMTP jobs asynchronously."""
import base64
import logging
from datetime import datetime, timedelta

from bson import ObjectId
from django.conf import settings

from .email_smtp import (
    SmtpConfigError,
    SmtpSendError,
    build_consent_otp_message,
    build_consent_pdf_email,
    send_smtp_email,
)
from .mongo_utils import (
    get_consent_otps_collection,
    get_email_outbox_collection,
    get_responses_collection,
    get_survey_groups_collection,
    get_surveys_collection,
)

logger = logging.getLogger(__name__)

MAX_ATTEMPTS = 5
BACKOFF_SECONDS = (30, 60, 120, 300, 600)


def email_sync_enabled():
    """If True, send SMTP inline in the request (debug / fallback)."""
    return bool(getattr(settings, 'EMAIL_SYNC', False))


def _now():
    return datetime.utcnow()


def enqueue_email_job(
    job_type,
    *,
    group_id,
    to_email,
    subject=None,
    body_text=None,
    body_html=None,
    survey_id=None,
    otp_survey_id=None,
    otp_email=None,
    response_id=None,
    pdf_base64=None,
    pdf_filename=None,
    meta=None,
):
    """Insert a pending outbox job. Returns inserted_id as str."""
    coll = get_email_outbox_collection()
    doc = {
        'type': job_type,
        'status': 'pending',
        'attempts': 0,
        'next_run_at': _now(),
        'created_at': _now(),
        'updated_at': _now(),
        'group_id': str(group_id) if group_id is not None else '',
        'to_email': (to_email or '').strip().lower(),
        'subject': subject or '',
        'body_text': body_text or '',
        'body_html': body_html or '',
        'survey_id': str(survey_id) if survey_id is not None else '',
        'otp_survey_id': str(otp_survey_id) if otp_survey_id is not None else '',
        'otp_email': (otp_email or '').strip().lower(),
        'response_id': str(response_id) if response_id is not None else '',
        'pdf_base64': pdf_base64 or '',
        'pdf_filename': pdf_filename or '',
        'meta': meta or {},
        'smtp_ms': None,
        'message_id': None,
        'last_error': None,
    }
    result = coll.insert_one(doc)
    return str(result.inserted_id)


def _load_group(group_id):
    if not group_id:
        return None
    groups = get_survey_groups_collection()
    try:
        return groups.find_one({'_id': ObjectId(str(group_id))})
    except Exception:
        return groups.find_one({'_id': group_id})


def _load_survey(survey_id):
    if not survey_id:
        return None
    surveys = get_surveys_collection()
    try:
        return surveys.find_one({'_id': ObjectId(str(survey_id))})
    except Exception:
        return surveys.find_one({'_id': survey_id}) or surveys.find_one({'id': survey_id})


def _mark_otp_smtp(survey_id, email, *, status, smtp_ms=None, message_id=None, error=None):
    otps = get_consent_otps_collection()
    fields = {
        'smtp_status': status,
        'updated_at': _now(),
    }
    if smtp_ms is not None:
        fields['smtp_ms'] = smtp_ms
    if message_id is not None:
        fields['smtp_message_id'] = message_id
    if status == 'sent':
        fields['smtp_accepted_at'] = _now()
        fields['smtp_error'] = None
    if error is not None:
        fields['smtp_error'] = str(error)[:500]
    otps.update_one(
        {'survey_id': str(survey_id), 'email': (email or '').strip().lower()},
        {'$set': fields},
    )


def _mark_pdf_smtp(response_id, *, status, smtp_ms=None, message_id=None, error=None, to_email=None):
    if not response_id:
        return
    try:
        oid = ObjectId(str(response_id))
    except Exception:
        return
    responses = get_responses_collection()
    fields = {
        'consent_pdf_smtp_status': status,
        'consent_pdf_smtp_updated_at': _now(),
    }
    if smtp_ms is not None:
        fields['consent_pdf_smtp_ms'] = smtp_ms
    if message_id is not None:
        fields['consent_pdf_smtp_message_id'] = message_id
    if error is not None:
        fields['consent_pdf_smtp_error'] = str(error)[:500]
    if status == 'sent':
        fields['consent_pdf_emailed_at'] = _now()
        if to_email:
            fields['consent_pdf_emailed_to'] = to_email
        fields['consent_pdf_smtp_error'] = None
    responses.update_one({'_id': oid}, {'$set': fields})


def _claim_next_job():
    from pymongo import ReturnDocument
    coll = get_email_outbox_collection()
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


def _fail_job(job, error, smtp_ms=None, message_id=None):
    coll = get_email_outbox_collection()
    attempts = int(job.get('attempts') or 1)
    permanently = attempts >= MAX_ATTEMPTS
    backoff_idx = min(attempts - 1, len(BACKOFF_SECONDS) - 1)
    next_run = _now() + timedelta(seconds=BACKOFF_SECONDS[backoff_idx])
    coll.update_one(
        {'_id': job['_id']},
        {
            '$set': {
                'status': 'failed' if permanently else 'pending',
                'last_error': str(error)[:800],
                'smtp_ms': smtp_ms,
                'message_id': message_id,
                'next_run_at': next_run if not permanently else job.get('next_run_at') or _now(),
                'updated_at': _now(),
            }
        },
    )


def _complete_job(job, result):
    coll = get_email_outbox_collection()
    coll.update_one(
        {'_id': job['_id']},
        {
            '$set': {
                'status': 'sent',
                'smtp_ms': (result or {}).get('smtp_ms'),
                'message_id': (result or {}).get('message_id'),
                'last_error': None,
                'sent_at': _now(),
                'updated_at': _now(),
                # Drop large PDF payload after success
                'pdf_base64': '',
            }
        },
    )


def process_one_job(job):
    """Send a single claimed outbox job. Returns True on success."""
    group = _load_group(job.get('group_id'))
    job_type = job.get('type') or ''
    to_email = job.get('to_email') or ''

    try:
        if job_type == 'otp':
            subject = job.get('subject') or ''
            body_text = job.get('body_text') or ''
            body_html = job.get('body_html') or None
            # Rebuild from survey+code if bodies missing (legacy / partial)
            if not subject or not body_text:
                survey = _load_survey(job.get('survey_id'))
                from .consent_otp import decrypt_otp_code
                otps = get_consent_otps_collection()
                otp_doc = otps.find_one({
                    'survey_id': str(job.get('otp_survey_id') or job.get('survey_id')),
                    'email': job.get('otp_email') or to_email,
                })
                code = decrypt_otp_code((otp_doc or {}).get('code_enc')) if otp_doc else None
                if not code:
                    raise SmtpSendError('OTP no disponible para reenviar el correo.')
                subject, body_text, body_html = build_consent_otp_message(
                    group, survey, code, expires_minutes=10
                )
            result = send_smtp_email(group, to_email, subject, body_text, body_html=body_html)
            _mark_otp_smtp(
                job.get('otp_survey_id') or job.get('survey_id'),
                job.get('otp_email') or to_email,
                status='sent',
                smtp_ms=result.get('smtp_ms'),
                message_id=result.get('message_id'),
            )
            _complete_job(job, result)
            return True

        if job_type == 'pdf':
            survey = _load_survey(job.get('survey_id'))
            response_id = job.get('response_id') or ''
            subject = job.get('subject') or ''
            body_text = job.get('body_text') or ''
            body_html = job.get('body_html') or None
            if not subject or not body_text:
                subject, body_text, body_html = build_consent_pdf_email(
                    group, survey, response_id=response_id
                )
            pdf_b64 = job.get('pdf_base64') or ''
            if not pdf_b64:
                raise SmtpSendError('PDF ausente en el trabajo de outbox.')
            pdf_bytes = base64.b64decode(pdf_b64, validate=False)
            filename = job.get('pdf_filename') or f"autorizacion-{(response_id or '')[:12]}.pdf"
            result = send_smtp_email(
                group,
                to_email,
                subject,
                body_text,
                body_html=body_html,
                attachments=[{
                    'filename': filename,
                    'content': pdf_bytes,
                    'maintype': 'application',
                    'subtype': 'pdf',
                }],
            )
            _mark_pdf_smtp(
                response_id,
                status='sent',
                smtp_ms=result.get('smtp_ms'),
                message_id=result.get('message_id'),
                to_email=to_email,
            )
            _complete_job(job, result)
            return True

        if job_type == 'test':
            result = send_smtp_email(
                group,
                to_email,
                job.get('subject') or 'Prueba SMTP',
                job.get('body_text') or '',
                body_html=job.get('body_html') or None,
            )
            _complete_job(job, result)
            return True

        raise SmtpSendError(f'Tipo de trabajo desconocido: {job_type}')

    except (SmtpConfigError, SmtpSendError) as exc:
        smtp_ms = getattr(exc, 'smtp_ms', None)
        message_id = getattr(exc, 'message_id', None)
        logger.warning('email_outbox job %s failed: %s', job.get('_id'), exc)
        _fail_job(job, exc, smtp_ms=smtp_ms, message_id=message_id)
        if job_type == 'otp':
            _mark_otp_smtp(
                job.get('otp_survey_id') or job.get('survey_id'),
                job.get('otp_email') or to_email,
                status='failed',
                smtp_ms=smtp_ms,
                message_id=message_id,
                error=exc,
            )
        elif job_type == 'pdf':
            _mark_pdf_smtp(
                job.get('response_id'),
                status='failed',
                smtp_ms=smtp_ms,
                message_id=message_id,
                error=exc,
            )
        return False
    except Exception as exc:
        logger.exception('email_outbox unexpected error on job %s', job.get('_id'))
        _fail_job(job, exc)
        return False


def process_pending_jobs(limit=20):
    """Claim and process up to `limit` jobs. Returns (processed, succeeded)."""
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


def deliver_or_enqueue(
    job_type,
    *,
    group,
    to_email,
    subject,
    body_text,
    body_html=None,
    attachments=None,
    survey_id=None,
    otp_survey_id=None,
    otp_email=None,
    response_id=None,
    pdf_base64=None,
    pdf_filename=None,
    meta=None,
    force_sync=False,
):
    """
    Send immediately if EMAIL_SYNC / force_sync, else enqueue.
    Returns dict: {queued, smtp_ms, message_id, job_id?}
    Raises SmtpConfigError / SmtpSendError on sync failure.
    """
    group_id = (group or {}).get('_id') or (group or {}).get('id')
    sync = force_sync or email_sync_enabled()

    if sync:
        result = send_smtp_email(
            group,
            to_email,
            subject,
            body_text,
            body_html=body_html,
            attachments=attachments,
        )
        if job_type == 'otp':
            _mark_otp_smtp(
                otp_survey_id or survey_id,
                otp_email or to_email,
                status='sent',
                smtp_ms=result.get('smtp_ms'),
                message_id=result.get('message_id'),
            )
        elif job_type == 'pdf':
            _mark_pdf_smtp(
                response_id,
                status='sent',
                smtp_ms=result.get('smtp_ms'),
                message_id=result.get('message_id'),
                to_email=to_email,
            )
        return {
            'queued': False,
            'smtp_ms': result.get('smtp_ms'),
            'message_id': result.get('message_id'),
        }

    # Async: for PDF, encode attachment into outbox; OTP uses prebuilt bodies
    if job_type == 'pdf' and attachments and not pdf_base64:
        att = attachments[0]
        content = att.get('content') if isinstance(att, dict) else att[1]
        pdf_base64 = base64.b64encode(bytes(content)).decode('ascii')
        if isinstance(att, dict):
            pdf_filename = pdf_filename or att.get('filename')

    if job_type == 'otp':
        _mark_otp_smtp(otp_survey_id or survey_id, otp_email or to_email, status='queued')
    elif job_type == 'pdf':
        _mark_pdf_smtp(response_id, status='queued')

    job_id = enqueue_email_job(
        job_type,
        group_id=group_id,
        to_email=to_email,
        subject=subject,
        body_text=body_text,
        body_html=body_html,
        survey_id=survey_id,
        otp_survey_id=otp_survey_id,
        otp_email=otp_email,
        response_id=response_id,
        pdf_base64=pdf_base64,
        pdf_filename=pdf_filename,
        meta=meta,
    )
    return {
        'queued': True,
        'job_id': job_id,
        'smtp_ms': None,
        'message_id': None,
    }
