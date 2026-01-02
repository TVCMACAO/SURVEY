"""
Modelo wrapper para usuarios de MongoDB que es compatible con Django's User model
"""
from django.utils import timezone
from datetime import datetime


class MongoUser:
    """
    Wrapper para usuarios almacenados en MongoDB que es compatible con Django's User model
    """
    USERNAME_FIELD = 'username'
    REQUIRED_FIELDS = ['email']
    
    def __init__(self, user_doc):
        """
        Inicializa el usuario desde un documento de MongoDB
        user_doc: dict con los datos del usuario desde MongoDB
        """
        self._user_doc = user_doc
        self._id = str(user_doc.get('_id', user_doc.get('id', '')))
        self.username = user_doc.get('username', '')
        self.email = user_doc.get('email', '')
        self.first_name = user_doc.get('first_name', '')
        self.last_name = user_doc.get('last_name', '')
        self.role = user_doc.get('role', 'encuestador')
        self.user_group_id = user_doc.get('user_group_id')
        self.is_active = user_doc.get('is_active', True)
        self.is_staff = user_doc.get('is_staff', False)
        self.is_superuser = user_doc.get('is_superuser', False)
        self._password_hash = user_doc.get('password_hash', '')
        
        # Fechas
        date_joined = user_doc.get('date_joined')
        if isinstance(date_joined, datetime):
            self.date_joined = date_joined
        elif date_joined:
            self.date_joined = date_joined
        else:
            self.date_joined = timezone.now()
        
        last_login = user_doc.get('last_login')
        if isinstance(last_login, datetime):
            self.last_login = last_login
        elif last_login:
            self.last_login = last_login
        else:
            self.last_login = None
    
    @property
    def id(self):
        """ID del usuario como string (ObjectId de MongoDB)"""
        return self._id
    
    @property
    def pk(self):
        """Primary key (alias de id)"""
        return self._id
    
    def get_username(self):
        return self.username
    
    @property
    def is_authenticated(self):
        """Siempre True para usuarios autenticados"""
        return True
    
    @property
    def is_anonymous(self):
        """Siempre False para usuarios autenticados"""
        return False
    
    def check_password(self, raw_password):
        """Verifica la contraseña"""
        from django.contrib.auth.hashers import check_password
        return check_password(raw_password, self._password_hash)
    
    def set_password(self, raw_password):
        """Establece una nueva contraseña (actualiza en MongoDB)"""
        from django.contrib.auth.hashers import make_password
        from .mongo_user_utils import update_user_in_mongo
        self._password_hash = make_password(raw_password)
        update_user_in_mongo(self.id, password_hash=self._password_hash)
    
    def save(self, *args, **kwargs):
        """Guarda los cambios del usuario en MongoDB"""
        from .mongo_user_utils import update_user_in_mongo
        updates = {
            'email': self.email,
            'first_name': self.first_name,
            'last_name': self.last_name,
            'role': self.role,
            'user_group_id': self.user_group_id,
            'is_active': self.is_active,
            'is_staff': self.is_staff,
            'is_superuser': self.is_superuser,
        }
        if self._password_hash:
            updates['password_hash'] = self._password_hash
        updated_user = update_user_in_mongo(self.id, **updates)
        if updated_user:
            self._user_doc = updated_user
    
    def delete(self, *args, **kwargs):
        """Elimina el usuario de MongoDB"""
        from .mongo_user_utils import delete_user_from_mongo
        delete_user_from_mongo(self.id)
    
    def __str__(self):
        return self.username
    
    def has_perm(self, perm, obj=None):
        """Verifica permisos (simplificado para roles)"""
        if self.is_superuser:
            return True
        # Implementar lógica de permisos basada en roles si es necesario
        return False
    
    def has_module_perms(self, app_label):
        """Verifica permisos de módulo"""
        if self.is_superuser:
            return True
        return False
    
    # Propiedades para compatibilidad con PermissionsMixin
    @property
    def groups(self):
        """Retorna una lista vacía (no usamos grupos de Django)"""
        return []
    
    @property
    def user_permissions(self):
        """Retorna una lista vacía (no usamos permisos de Django)"""
        return []
    
    def is_group_admin(self):
        """Verifica si el usuario es administrador de grupo"""
        return self.role == 'group_admin'
    
    def get_user_group(self):
        """Obtiene el grupo de usuarios del usuario desde MongoDB"""
        if not self.user_group_id:
            return None
        try:
            from .mongo_utils import get_user_groups_collection
            from bson import ObjectId
            groups_collection = get_user_groups_collection()
            group = groups_collection.find_one({'_id': ObjectId(self.user_group_id)})
            if group:
                group['id'] = str(group['_id'])
            return group
        except Exception:
            return None

