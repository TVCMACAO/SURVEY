"""
Modelo de usuario compatible con Django pero que representa datos de MongoDB.
No es un modelo de Django real, solo una clase Python que simula la interfaz.
"""
from django.contrib.auth.models import AnonymousUser


class MongoUser:
    """
    Clase que representa un usuario almacenado en MongoDB.
    Compatible con la interfaz de Django User para autenticación.
    """
    
    def __init__(self, id, username, email='', role='encuestador', 
                 is_active=True, is_staff=False, is_superuser=False,
                 first_name='', last_name='', date_joined=None, user_group_id=None):
        self.id = id
        self.pk = id
        self.username = username
        self.email = email
        self.role = role
        self.is_active = is_active
        self.is_staff = is_staff
        self.is_superuser = is_superuser
        self.first_name = first_name
        self.last_name = last_name
        self.date_joined = date_joined
        self.user_group_id = user_group_id  # ID del grupo que administra (para group_admin)
        self.is_authenticated = True
        self.is_anonymous = False
    
    def __str__(self):
        return self.username
    
    def has_perm(self, perm, obj=None):
        """Verifica si el usuario tiene un permiso específico"""
        if self.is_superuser:
            return True
        # Aquí puedes agregar lógica adicional de permisos basada en roles
        return False
    
    def has_module_perms(self, app_label):
        """Verifica si el usuario tiene permisos para un módulo"""
        if self.is_superuser:
            return True
        return False
    
    def get_username(self):
        return self.username
    
    def get_full_name(self):
        return f"{self.first_name} {self.last_name}".strip() or self.username
    
    def get_short_name(self):
        return self.first_name or self.username

