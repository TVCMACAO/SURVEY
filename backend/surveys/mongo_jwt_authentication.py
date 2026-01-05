"""
Autenticación JWT personalizada que usa MongoDB en lugar de SQLite
"""
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import InvalidToken, AuthenticationFailed
from rest_framework_simplejwt.settings import api_settings
from .mongo_auth_backend import MongoAuthBackend


class MongoJWTAuthentication(JWTAuthentication):
    """
    Autenticación JWT que obtiene usuarios de MongoDB en lugar de SQLite.
    """
    
    def get_user(self, validated_token):
        """
        Obtiene el usuario desde MongoDB usando el user_id del token.
        """
        import json
        import traceback
        import logging
        logger = logging.getLogger(__name__)
        log_file_path = '/home/vps/Documentos/survey-app/.cursor/debug.log'
        
        try:
            user_id = validated_token[api_settings.USER_ID_CLAIM]
        except KeyError:
            # #region agent log
            try:
                with open(log_file_path, 'a') as f:
                    f.write(json.dumps({
                        "sessionId": "debug-session",
                        "runId": "run1",
                        "hypothesisId": "F",
                        "location": "mongo_jwt_authentication.py:get_user",
                        "message": "Token has no user_id",
                        "data": {
                            "token_keys": list(validated_token.keys()) if hasattr(validated_token, 'keys') else None
                        },
                        "timestamp": int(__import__('time').time() * 1000)
                    }) + '\n')
            except Exception:
                pass
            # #endregion
            logger.error("Token contained no recognizable user identification")
            raise InvalidToken("Token contained no recognizable user identification")
        
        # #region agent log
        try:
            with open(log_file_path, 'a') as f:
                f.write(json.dumps({
                    "sessionId": "debug-session",
                    "runId": "run1",
                    "hypothesisId": "F",
                    "location": "mongo_jwt_authentication.py:get_user",
                    "message": "Getting user from MongoDB",
                    "data": {
                        "user_id": str(user_id),
                        "user_id_type": type(user_id).__name__
                    },
                    "timestamp": int(__import__('time').time() * 1000)
                }) + '\n')
        except Exception:
            pass
        # #endregion
        
        # Usar nuestro backend de MongoDB para obtener el usuario
        mongo_backend = MongoAuthBackend()
        user = mongo_backend.get_user(user_id)
        
        if user is None:
            # #region agent log
            try:
                with open(log_file_path, 'a') as f:
                    f.write(json.dumps({
                        "sessionId": "debug-session",
                        "runId": "run1",
                        "hypothesisId": "F",
                        "location": "mongo_jwt_authentication.py:get_user",
                        "message": "User not found in MongoDB",
                        "data": {
                            "user_id": str(user_id)
                        },
                        "timestamp": int(__import__('time').time() * 1000)
                    }) + '\n')
            except Exception:
                pass
            # #endregion
            logger.error(f"User not found in MongoDB: {user_id}")
            raise AuthenticationFailed("User not found", code="user_not_found")
        
        if not user.is_active:
            # #region agent log
            try:
                with open(log_file_path, 'a') as f:
                    f.write(json.dumps({
                        "sessionId": "debug-session",
                        "runId": "run1",
                        "hypothesisId": "F",
                        "location": "mongo_jwt_authentication.py:get_user",
                        "message": "User is inactive",
                        "data": {
                            "user_id": str(user_id),
                            "username": user.username if user else None
                        },
                        "timestamp": int(__import__('time').time() * 1000)
                    }) + '\n')
            except Exception:
                pass
            # #endregion
            logger.error(f"User is inactive: {user_id}")
            raise AuthenticationFailed("User is inactive", code="user_inactive")
        
        # #region agent log
        try:
            with open(log_file_path, 'a') as f:
                f.write(json.dumps({
                    "sessionId": "debug-session",
                    "runId": "run1",
                    "hypothesisId": "F",
                    "location": "mongo_jwt_authentication.py:get_user",
                    "message": "User found and authenticated successfully",
                    "data": {
                        "user_id": str(user_id),
                        "username": user.username if user else None,
                        "user_type": type(user).__name__ if user else None
                    },
                    "timestamp": int(__import__('time').time() * 1000)
                }) + '\n')
        except Exception:
            pass
        # #endregion
        
        return user

