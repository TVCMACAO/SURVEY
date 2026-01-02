"""
Autenticación JWT personalizada para MongoDB
"""
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import InvalidToken, AuthenticationFailed
from .mongo_user_utils import get_user_by_id
from .mongo_user_model import MongoUser


class MongoJWTAuthentication(JWTAuthentication):
    """
    Autenticación JWT que obtiene usuarios de MongoDB en lugar de SQLite
    """
    
    def get_user(self, validated_token):
        """
        Obtiene el usuario desde MongoDB usando el user_id del token
        """
        try:
            user_id = validated_token.get('user_id')
            if not user_id:
                raise InvalidToken('Token contained no recognizable user identification')
            
            # Obtener usuario de MongoDB
            user_doc = get_user_by_id(user_id)
            if not user_doc:
                raise AuthenticationFailed('User not found')
            
            if not user_doc.get('is_active', True):
                raise AuthenticationFailed('User is inactive')
            
            # Crear MongoUser wrapper
            user = MongoUser(user_doc)
            return user
            
        except Exception as e:
            if isinstance(e, (InvalidToken, AuthenticationFailed)):
                raise
            raise AuthenticationFailed(f'Error getting user: {str(e)}')

