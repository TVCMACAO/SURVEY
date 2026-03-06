"""
Crea/actualiza preview_link (URL pública) en adjuntos referenciados en respuestas existentes.
Por defecto recorre TODAS las respuestas de TODAS las encuestas y guarda la URL pública
en cada adjunto usado.

Requiere --base-url con la URL pública (ej: https://chat-survey-app.rhfh8t.easypanel.host).

Uso:
  python manage.py populate_attachment_preview_links --base-url https://tu-dominio.com
  python manage.py populate_attachment_preview_links --base-url https://tu-dominio.com --survey-id 69ab0973c584a2d29ede35c3
  python manage.py populate_attachment_preview_links --base-url https://tu-dominio.com --force   # Sobrescribe URLs ya guardadas
"""
import os
from django.core.management.base import BaseCommand
from django.conf import settings
from bson import ObjectId


def _collect_attachment_ids_from_responses(responses_coll, surveys_coll, survey_oid=None):
    """Recorre respuestas (opcionalmente de una encuesta) y devuelve set de IDs de adjuntos."""
    query = {} if survey_oid is None else {'survey': survey_oid}
    responses = list(responses_coll.find(query))
    attachment_ids = set()
    survey_cache = {}
    for r in responses:
        s_oid = r.get('survey')
        if not s_oid:
            continue
        sid = str(s_oid)
        if sid not in survey_cache:
            try:
                survey_cache[sid] = surveys_coll.find_one({'_id': s_oid})
            except Exception:
                survey_cache[sid] = None
        survey = survey_cache[sid]
        if not survey:
            continue
        file_upload_qids = []
        for q in survey.get('questions', []):
            qtype = q.get('question_type') or q.get('type', '')
            if qtype == 'file_upload':
                qid = q.get('id') or q.get('_id')
                if qid:
                    file_upload_qids.append(str(qid))
        answers = r.get('answers') or {}
        for qid in file_upload_qids:
            val = answers.get(qid)
            if val is None:
                continue
            if isinstance(val, list):
                for item in val:
                    if isinstance(item, str) and item.strip():
                        try:
                            ObjectId(item.strip())
                            attachment_ids.add(item.strip())
                        except Exception:
                            pass
            elif isinstance(val, str):
                for item in val.replace(',', ' ').split():
                    item = item.strip()
                    if item:
                        try:
                            ObjectId(item)
                            attachment_ids.add(item)
                        except Exception:
                            pass
    return attachment_ids


class Command(BaseCommand):
    help = 'Crea URLs públicas (preview_link) en adjuntos de respuestas existentes'

    def add_arguments(self, parser):
        parser.add_argument('--dry-run', action='store_true', help='Solo mostrar qué se haría')
        parser.add_argument('--base-url', type=str, required=True, help='URL pública base (ej: https://chat-survey-app.rhfh8t.easypanel.host)')
        parser.add_argument('--survey-id', type=str, help='Solo adjuntos de respuestas de esta encuesta')
        parser.add_argument('--force', action='store_true', help='Sobrescribir preview_link aunque ya exista (para corregir URLs no públicas)')

    def handle(self, *args, **options):
        dry_run = options.get('dry_run', False)
        base_url = (options.get('base_url') or getattr(settings, 'BASE_URL', '') or os.environ.get('BASE_URL', '')).strip().rstrip('/')
        survey_id = options.get('survey_id')
        force = options.get('force', False)

        if not base_url:
            self.stdout.write(self.style.ERROR(
                'Se requiere --base-url con la URL pública del sitio (ej: https://chat-survey-app.rhfh8t.easypanel.host).'
            ))
            return

        from surveys.mongo_utils import get_attachments_collection, get_surveys_collection, get_responses_collection

        attachments_coll = get_attachments_collection()
        surveys_coll = get_surveys_collection()
        responses_coll = get_responses_collection()

        if survey_id:
            try:
                survey_oid = ObjectId(survey_id)
            except Exception:
                self.stdout.write(self.style.ERROR(f'--survey-id inválido: {survey_id}'))
                return
            survey = surveys_coll.find_one({'_id': survey_oid})
            if not survey:
                self.stdout.write(self.style.ERROR(f'Encuesta no encontrada: {survey_id}'))
                return
            attachment_ids = _collect_attachment_ids_from_responses(responses_coll, surveys_coll, survey_oid=survey_oid)
            self.stdout.write(f'Encuesta "{survey.get("title", survey_id)}": {len(attachment_ids)} adjuntos en respuestas.')
        else:
            attachment_ids = _collect_attachment_ids_from_responses(responses_coll, surveys_coll)
            self.stdout.write(f'Respuestas existentes: {len(attachment_ids)} adjuntos a actualizar con URL pública.')

        if not attachment_ids:
            self.stdout.write(self.style.WARNING('No hay adjuntos en respuestas.'))
            return

        if force:
            docs = list(attachments_coll.find({'_id': {'$in': [ObjectId(aid) for aid in attachment_ids]}}))
        else:
            docs = list(attachments_coll.find({
                '_id': {'$in': [ObjectId(aid) for aid in attachment_ids]},
                '$or': [
                    {'preview_link': {'$exists': False}},
                    {'preview_link': None},
                    {'preview_link': ''},
                ]
            }))

        updated = 0
        errors = 0
        public_url = f'{base_url}/api/public/attachments'

        for doc in docs:
            doc_id = doc['_id']
            preview_link = f'{public_url}/{doc_id}/'

            if dry_run:
                self.stdout.write(f'  [DRY-RUN] {doc_id}: {preview_link}')
                updated += 1
                continue

            try:
                attachments_coll.update_one(
                    {'_id': doc_id},
                    {'$set': {'preview_link': preview_link}}
                )
                self.stdout.write(self.style.SUCCESS(f'  {doc_id}: preview_link (URL pública) guardado'))
                updated += 1
            except Exception as e:
                self.stdout.write(self.style.ERROR(f'  {doc_id}: error {e}'))
                errors += 1

        self.stdout.write('')
        self.stdout.write(f'Actualizados: {updated}, Errores: {errors}')
        if dry_run:
            self.stdout.write(self.style.WARNING('Modo dry-run: no se modificó nada. Ejecuta sin --dry-run para aplicar.'))
