"""
Backend de autenticación personalizado para usar MongoDB en lugar de SQLite
"""
from django.contrib.auth.backends import BaseBackend
from django.contrib.auth.hashers import check_password, make_password
from .mongo_utils import get_mongo_collection
from bson import ObjectId


class MongoAuthBackend(BaseBackend):
    """
    Backend de autenticación que usa MongoDB para almacenar y autenticar usuarios.
    """
    
    def authenticate(self, request, username=None, password=None, **kwargs):
        """
        Autentica un usuario usando MongoDB.
        """
        if username is None:
            username = kwargs.get('username')
        if username is None or password is None:
            return None
        
        users_collection = get_mongo_collection('users')
        
        # Buscar usuario por username
        user_doc = users_collection.find_one({'username': username})
        
        if user_doc is None:
            return None
        
        # Verificar contraseña
        stored_password = user_doc.get('password')
        if stored_password and check_password(password, stored_password):
            # Crear un objeto de usuario compatible con Django
            return self._create_user_object(user_doc)
        
        return None
    
    def get_user(self, user_id):
        """
        Obtiene un usuario por su ID.
        """
        try:
            users_collection = get_mongo_collection('users')
            
            # Intentar buscar por ObjectId
            try:
                user_doc = users_collection.find_one({'_id': ObjectId(user_id)})
            except:
                # Si falla, intentar buscar por string ID
                user_doc = users_collection.find_one({'_id': user_id})
            
            if user_doc is None:
                # Intentar buscar por el campo 'id' si existe
                user_doc = users_collection.find_one({'id': user_id})
            
            if user_doc is None:
                return None
            
            return self._create_user_object(user_doc)
        except Exception:
            return None
    
    def _create_user_object(self, user_doc):
        """
        Crea un objeto de usuario compatible con Django a partir de un documento de MongoDB.
        """
        from .mongo_user_model import MongoUser
        
        user = MongoUser(
            id=str(user_doc.get('_id', user_doc.get('id'))),
            username=user_doc.get('username'),
            email=user_doc.get('email', ''),
            role=user_doc.get('role', 'encuestador'),
            is_active=user_doc.get('is_active', True),
            is_staff=user_doc.get('is_staff', False),
            is_superuser=user_doc.get('is_superuser', False),
            first_name=user_doc.get('first_name', ''),
            last_name=user_doc.get('last_name', ''),
            date_joined=user_doc.get('date_joined'),
        )
        return user

