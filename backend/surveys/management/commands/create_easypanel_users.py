"""
Comando para crear usuarios iniciales en EasyPanel MongoDB
"""
from django.core.management.base import BaseCommand
from surveys.mongo_user_utils import create_user_in_mongo, user_exists_in_mongo, list_users_from_mongo


class Command(BaseCommand):
    help = 'Crea usuarios iniciales en MongoDB para EasyPanel'

    def add_arguments(self, parser):
        parser.add_argument(
            '--username',
            type=str,
            help='Username del usuario a crear',
        )
        parser.add_argument(
            '--password',
            type=str,
            help='Password del usuario',
        )
        parser.add_argument(
            '--role',
            type=str,
            choices=['root', 'group_admin', 'encuestador', 'analista'],
            default='encuestador',
            help='Rol del usuario',
        )
        parser.add_argument(
            '--email',
            type=str,
            default='',
            help='Email del usuario',
        )
        parser.add_argument(
            '--list',
            action='store_true',
            help='Lista todos los usuarios existentes',
        )

    def handle(self, *args, **options):
        if options['list']:
            users = list_users_from_mongo()
            self.stdout.write(f'\n=== USUARIOS EN MONGODB (Total: {len(users)}) ===\n')
            for i, user in enumerate(users, 1):
                self.stdout.write(f'Usuario #{i}:')
                self.stdout.write(f'  ID: {user.get("id")}')
                self.stdout.write(f'  Username: {user.get("username")}')
                self.stdout.write(f'  Email: {user.get("email") or "N/A"}')
                self.stdout.write(f'  Rol: {user.get("role")}')
                self.stdout.write(f'  Activo: {user.get("is_active")}')
                self.stdout.write(f'  Grupo: {user.get("user_group_id") or "Ninguno"}')
                self.stdout.write('')
            return
        
        username = options.get('username')
        password = options.get('password')
        role = options.get('role', 'encuestador')
        email = options.get('email', '')
        
        if not username or not password:
            self.stdout.write(self.style.ERROR('Debes proporcionar --username y --password'))
            self.stdout.write('\nEjemplos:')
            self.stdout.write('  python manage.py create_easypanel_users --username root --password root123 --role root')
            self.stdout.write('  python manage.py create_easypanel_users --list')
            return
        
        if user_exists_in_mongo(username):
            self.stdout.write(self.style.WARNING(f'El usuario "{username}" ya existe en MongoDB'))
            return
        
        try:
            user = create_user_in_mongo(
                username=username,
                password=password,
                email=email,
                role=role,
                is_active=True,
                is_staff=(role == 'root'),
                is_superuser=(role == 'root')
            )
            self.stdout.write(self.style.SUCCESS(f'✓ Usuario "{username}" creado exitosamente'))
            self.stdout.write(f'  ID: {user.get("id")}')
            self.stdout.write(f'  Rol: {role}')
            self.stdout.write(f'  Activo: {user.get("is_active")}')
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'✗ Error creando usuario: {str(e)}'))

