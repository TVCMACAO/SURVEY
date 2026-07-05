"""
Autenticación JWT personalizada que usa MongoDB en lugar de SQLite
"""
import logging

from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import InvalidToken, AuthenticationFailed
from rest_framework_simplejwt.settings import api_settings

from .mongo_auth_backend import MongoAuthBackend

logger = logging.getLogger(__name__)


class MongoJWTAuthentication(JWTAuthentication):
    """Autenticación JWT que obtiene usuarios de MongoDB."""

    def get_user(self, validated_token):
        try:
            user_id = validated_token[api_settings.USER_ID_CLAIM]
        except KeyError:
            logger.error("Token contained no recognizable user identification")
            raise InvalidToken("Token contained no recognizable user identification")

        user = MongoAuthBackend().get_user(user_id)
        if user is None:
            logger.error("User not found in MongoDB: %s", user_id)
            raise AuthenticationFailed("User not found", code="user_not_found")
        if not user.is_active:
            logger.error("User is inactive: %s", user_id)
            raise AuthenticationFailed("User is inactive", code="user_inactive")
        return user
