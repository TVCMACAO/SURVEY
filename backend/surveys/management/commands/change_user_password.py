"""
Comando de gestión para cambiar la contraseña de un usuario en MongoDB
"""
from django.core.management.base import BaseCommand
from surveys.mongo_user_utils import get_user_by_username, update_user_in_mongo
from django.contrib.auth.hashers import make_password


class Command(BaseCommand):
    help = 'Cambia la contraseña de un usuario en MongoDB'

    def add_arguments(self, parser):
        parser.add_argument(
            '--username',
            type=str,
            required=True,
            help='Username del usuario',
        )
        parser.add_argument(
            '--password',
            type=str,
            required=True,
            help='Nueva contraseña',
        )

    def handle(self, *args, **options):
        username = options['username']
        new_password = options['password']
        
        # Verificar que el usuario existe
        user = get_user_by_username(username)
        if not user:
            self.stdout.write(self.style.ERROR(f'✗ Usuario "{username}" no encontrado en MongoDB'))
            return
        
        # Validar longitud de contraseña
        if len(new_password) < 8:
            self.stdout.write(self.style.ERROR('✗ La contraseña debe tener al menos 8 caracteres'))
            return
        
        try:
            # Hashear la nueva contraseña
            password_hash = make_password(new_password)
            
            # Actualizar en MongoDB
            update_user_in_mongo(user['id'], password_hash=password_hash)
            
            self.stdout.write(self.style.SUCCESS(f'✓ Contraseña actualizada exitosamente para el usuario "{username}"'))
            self.stdout.write(f'  ID: {user.get("id")}')
            self.stdout.write(f'  Rol: {user.get("role")}')
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'✗ Error al actualizar la contraseña: {str(e)}'))
            import traceback
            self.stdout.write(traceback.format_exc())

