"""
Rellena preview_link en adjuntos existentes que no lo tienen.
Ejecutar: python manage.py populate_attachment_preview_links

Requiere BASE_URL en settings o variable de entorno (ej: https://chat-survey-app.rhfh8t.easypanel.host)
"""
import os
from django.core.management.base import BaseCommand
from django.conf import settings


class Command(BaseCommand):
    help = 'Rellena preview_link en adjuntos existentes que no lo tienen'

    def add_arguments(self, parser):
        parser.add_argument('--dry-run', action='store_true', help='Solo mostrar qué se haría')
        parser.add_argument('--base-url', type=str, help='URL base (ej: https://dominio.com). Sobrescribe BASE_URL de settings.')

    def handle(self, *args, **options):
        dry_run = options.get('dry_run', False)
        base_url = options.get('base_url') or getattr(settings, 'BASE_URL', '') or os.environ.get('BASE_URL', '')

        if not base_url:
            self.stdout.write(self.style.ERROR(
                'BASE_URL no configurado. Usa --base-url o define BASE_URL en settings/variable de entorno.'
            ))
            self.stdout.write('Ejemplo: python manage.py populate_attachment_preview_links --base-url https://chat-survey-app.rhfh8t.easypanel.host')
            return

        base_url = base_url.rstrip('/')
        from surveys.mongo_utils import get_attachments_collection

        attachments_coll = get_attachments_collection()

        # Adjuntos sin preview_link o con preview_link vacío
        docs = list(attachments_coll.find({
            '$or': [
                {'preview_link': {'$exists': False}},
                {'preview_link': None},
                {'preview_link': ''},
            ]
        }))

        updated = 0
        errors = 0

        for doc in docs:
            doc_id = doc['_id']
            preview_link = f'{base_url}/api/public/attachments/{doc_id}/'

            if dry_run:
                self.stdout.write(f'  [DRY-RUN] {doc_id}: {preview_link}')
                updated += 1
                continue

            try:
                attachments_coll.update_one(
                    {'_id': doc_id},
                    {'$set': {'preview_link': preview_link}}
                )
                self.stdout.write(self.style.SUCCESS(f'  {doc_id}: preview_link actualizado'))
                updated += 1
            except Exception as e:
                self.stdout.write(self.style.ERROR(f'  {doc_id}: error {e}'))
                errors += 1

        self.stdout.write('')
        self.stdout.write(f'Actualizados: {updated}, Errores: {errors}')
        if dry_run:
            self.stdout.write(self.style.WARNING('Modo dry-run: no se modificó nada. Ejecuta sin --dry-run para aplicar.'))
