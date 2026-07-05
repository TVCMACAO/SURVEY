"""
Marca como sincronizadas las respuestas guardadas en servidor con synced=false.

Corrige respuestas del link público y otras inserciones directas afectadas por el
default incorrecto del serializer (synced=False).

Uso:
  python manage.py fix_synced_responses --dry-run
  python manage.py fix_synced_responses
"""
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = 'Actualiza synced=false a synced=true en respuestas ya almacenadas en el servidor'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Solo mostrar cuántas respuestas se actualizarían',
        )

    def handle(self, *args, **options):
        from surveys.mongo_utils import get_responses_collection

        dry_run = options.get('dry_run', False)
        responses_coll = get_responses_collection()
        query = {'synced': False}
        count = responses_coll.count_documents(query)

        if count == 0:
            self.stdout.write(self.style.SUCCESS('No hay respuestas con synced=false.'))
            return

        if dry_run:
            self.stdout.write(
                self.style.WARNING(f'[DRY-RUN] Se actualizarían {count} respuesta(s) a synced=true.')
            )
            return

        result = responses_coll.update_many(query, {'$set': {'synced': True}})
        self.stdout.write(
            self.style.SUCCESS(
                f'Actualizadas {result.modified_count} respuesta(s) de {count} encontrada(s).'
            )
        )
