"""
Migra adjuntos de disco a GridFS.
Ejecutar: python manage.py migrate_attachments_to_gridfs

Los adjuntos que están en media/attachments/ se copian a GridFS.
Los documentos en la colección attachments se actualizan con gridfs_id.
Así, al migrar MongoDB a EasyPanel, los archivos van incluidos.
"""
import os
import mimetypes
from django.core.management.base import BaseCommand
from django.conf import settings


class Command(BaseCommand):
    help = 'Migra adjuntos de disco a GridFS para que migren con MongoDB'

    def add_arguments(self, parser):
        parser.add_argument('--dry-run', action='store_true', help='Solo mostrar qué se haría')

    def handle(self, *args, **options):
        dry_run = options.get('dry_run', False)
        from surveys.mongo_utils import get_attachments_collection, get_gridfs

        attachments_coll = get_attachments_collection()
        gridfs = get_gridfs()
        media_root = settings.MEDIA_ROOT
        subdir = getattr(settings, 'ATTACHMENTS_SUBDIR', 'attachments')
        attach_dir = os.path.join(str(media_root), subdir)

        if not os.path.isdir(attach_dir):
            self.stdout.write(self.style.WARNING(f'No existe {attach_dir}'))
            return

        # Adjuntos que tienen stored_name y NO tienen gridfs_id
        docs = list(attachments_coll.find({
            'stored_name': {'$exists': True, '$ne': None},
            '$or': [
                {'gridfs_id': {'$exists': False}},
                {'gridfs_id': None},
            ]
        }))

        migrated = 0
        errors = 0

        for doc in docs:
            doc_id = doc['_id']
            stored_name = doc.get('stored_name')
            filename = doc.get('filename') or stored_name
            file_path = os.path.join(attach_dir, stored_name)

            if not os.path.isfile(file_path):
                self.stdout.write(self.style.WARNING(f'  {doc_id}: archivo no existe {stored_name}'))
                errors += 1
                continue

            if dry_run:
                self.stdout.write(f'  [DRY-RUN] Migraría {doc_id} -> {stored_name}')
                migrated += 1
                continue

            try:
                with open(file_path, 'rb') as f:
                    gridfs_id = gridfs.put(f, filename=filename, content_type=mimetypes.guess_type(filename)[0])
                attachments_coll.update_one(
                    {'_id': doc_id},
                    {'$set': {'storage': 'gridfs', 'gridfs_id': gridfs_id}}
                )
                self.stdout.write(self.style.SUCCESS(f'  {doc_id}: migrado a GridFS'))
                migrated += 1
            except Exception as e:
                self.stdout.write(self.style.ERROR(f'  {doc_id}: error {e}'))
                errors += 1

        self.stdout.write('')
        self.stdout.write(f'Migrados: {migrated}, Errores: {errors}')
        if dry_run:
            self.stdout.write(self.style.WARNING('Modo dry-run: no se modificó nada. Ejecuta sin --dry-run para migrar.'))
