"""
Django management command para crear usuarios
Uso: python manage.py create_user <username> <password> [email] [role]
"""
from django.core.management.base import BaseCommand, CommandError
from surveys.models import User


class Command(BaseCommand):
    help = 'Crea un nuevo usuario en la base de datos'

    def add_arguments(self, parser):
        parser.add_argument('username', type=str, help='Nombre de usuario')
        parser.add_argument('password', type=str, help='Contraseña del usuario')
        parser.add_argument('--email', type=str, default=None, help='Email del usuario (opcional)')
        parser.add_argument('--role', type=str, default='encuestador', 
                          choices=['root', 'encuestador', 'analista'],
                          help='Rol del usuario (default: encuestador)')

    def handle(self, *args, **options):
        username = options['username']
        password = options['password']
        email = options['email']
        role = options['role']
        
        try:
            # Verificar si el usuario ya existe
            if User.objects.filter(username=username).exists():
                self.stdout.write(
                    self.style.WARNING(f'⚠️  El usuario "{username}" ya existe en la base de datos.')
                )
                return
            
            # Crear el usuario
            user = User.objects.create_user(
                username=username,
                password=password,
                email=email or f'{username}@example.com',
                role=role
            )
            
            self.stdout.write(
                self.style.SUCCESS(f'✅ Usuario "{username}" creado exitosamente!')
            )
            self.stdout.write(f'   - Username: {user.username}')
            self.stdout.write(f'   - Email: {user.email}')
            self.stdout.write(f'   - Role: {user.role}')
            self.stdout.write(f'   - ID: {user.id}')
            
        except Exception as e:
            raise CommandError(f'❌ Error al crear el usuario: {str(e)}')


