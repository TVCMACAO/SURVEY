"""
JWT tokens for MongoDB-backed users.

Simple JWT's token blacklist stores OutstandingToken with a FK to Django's User
model. Our authenticated users are MongoUser instances, so we issue tokens
without creating OutstandingToken rows.
"""
from rest_framework_simplejwt.settings import api_settings
from rest_framework_simplejwt.tokens import RefreshToken as BaseRefreshToken


class MongoRefreshToken(BaseRefreshToken):
    @classmethod
    def for_user(cls, user):
        token = cls()
        user_id = getattr(user, api_settings.USER_ID_FIELD)
        token[api_settings.USER_ID_CLAIM] = user_id
        return token
