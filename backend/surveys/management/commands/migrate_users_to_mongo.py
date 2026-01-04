"""
Comando de gestión para migrar usuarios de SQLite a MongoDB
"""
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from surveys.mongo_user_utils import create_user_in_mongo, user_exists_in_mongo

User = get_user_model()


class Command(BaseCommand):
    help = 'Migra usuarios de SQLite a MongoDB'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Simula la migración sin crear usuarios en MongoDB',
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        
        if dry_run:
            self.stdout.write(self.style.WARNING('MODO DRY-RUN: No se crearán usuarios en MongoDB'))
        
        # Obtener todos los usuarios de SQLite
        sqlite_users = User.objects.all()
        total = sqlite_users.count()
        
        self.stdout.write(f'Encontrados {total} usuarios en SQLite')
        
        migrated = 0
        skipped = 0
        errors = 0
        
        for user in sqlite_users:
            username = user.username
            
            # Verificar si el usuario ya existe en MongoDB
            if user_exists_in_mongo(username):
                self.stdout.write(self.style.WARNING(f'  Usuario "{username}" ya existe en MongoDB, omitiendo...'))
                skipped += 1
                continue
            
            if dry_run:
                self.stdout.write(f'  [DRY-RUN] Crearía usuario: {username} (rol: {user.role})')
                migrated += 1
            else:
                try:
                    create_user_in_mongo(
                        username=username,
                        password='temp_password_123',  # El usuario deberá cambiar su contraseña
                        email=user.email or '',
                        first_name=user.first_name or '',
                        last_name=user.last_name or '',
                        role=user.role or 'encuestador',
                        user_group_id=user.user_group_id,
                        is_active=user.is_active,
                        is_staff=user.is_staff,
                        is_superuser=user.is_superuser
                    )
                    self.stdout.write(self.style.SUCCESS(f'  ✓ Usuario "{username}" migrado a MongoDB'))
                    migrated += 1
                except Exception as e:
                    self.stdout.write(self.style.ERROR(f'  ✗ Error migrando usuario "{username}": {str(e)}'))
                    errors += 1
        
        self.stdout.write('')
        self.stdout.write(self.style.SUCCESS(f'Migración completada:'))
        self.stdout.write(f'  - Migrados: {migrated}')
        self.stdout.write(f'  - Omitidos: {skipped}')
        self.stdout.write(f'  - Errores: {errors}')
        
        if not dry_run and migrated > 0:
            self.stdout.write('')
            self.stdout.write(self.style.WARNING('IMPORTANTE: Los usuarios migrados tienen contraseña temporal "temp_password_123"'))
            self.stdout.write(self.style.WARNING('Debes actualizar las contraseñas de los usuarios migrados.'))


