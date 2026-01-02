from django.db import models
from django.contrib.auth.models import AbstractUser
# Import MongoUser para compatibilidad
from .mongo_user_model import MongoUser

class User(AbstractUser):
    # Add custom roles field to Django's User model
    ROLE_CHOICES = [
        ('root', 'Root'),
        ('group_admin', 'Administrador de Grupo'),
        ('encuestador', 'Encuestador'),
        ('analista', 'Analista'),
    ]
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='encuestador')
    # user_group_id: ObjectId del grupo de usuarios en MongoDB (nullable)
    user_group_id = models.CharField(max_length=255, null=True, blank=True, help_text="ObjectId del grupo de usuarios en MongoDB")
    # groups field is already part of AbstractUser (Many-to-Many to auth.Group)
    # The user's 'groups[]' could refer to this or the MongoDB Group.
    # For now, I'll assume Django's groups for auth, and the MongoDB Group for survey organization.

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

    def __str__(self):
        return self.username