"""
Backend de autenticación personalizado para Django que usa MongoDB
"""
from django.contrib.auth.backends import BaseBackend
from django.contrib.auth.hashers import check_password
from .mongo_user_utils import get_user_by_username, get_user_by_id, authenticate_user
from .mongo_user_model import MongoUser


class MongoAuthBackend(BaseBackend):
    """
    Backend de autenticación que usa MongoDB en lugar de SQLite
    """
    
    def authenticate(self, request, username=None, password=None, **kwargs):
        """
        Autentica un usuario usando MongoDB
        """
        if username is None:
            username = kwargs.get('username')
        if username is None or password is None:
            return None
        
        user_doc = get_user_by_username(username)
        if not user_doc:
            return None
        
        if not user_doc.get('is_active', True):
            return None
        
        if check_password(password, user_doc.get('password_hash', '')):
            # Crear un objeto MongoUser wrapper
            return MongoUser(user_doc)
        
        return None
    
    def get_user(self, user_id):
        """
        Obtiene un usuario por ID
        """
        try:
            user_doc = get_user_by_id(user_id)
            if user_doc and user_doc.get('is_active', True):
                return MongoUser(user_doc)
        except Exception:
            pass
        return None

