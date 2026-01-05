from django.db import models
from django.contrib.auth.models import AbstractUser

class User(AbstractUser):
    # Add custom roles field to Django's User model
    ROLE_CHOICES = [
        ('root', 'Root'),
        ('group_admin', 'Administrador de Grupo'),
        ('encuestador', 'Encuestador'),
        ('analista', 'Analista'),
    ]
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='encuestador')
    # groups field is already part of AbstractUser (Many-to-Many to auth.Group)
    # The user's 'groups[]' could refer to this or the MongoDB Group.
    # For now, I'll assume Django's groups for auth, and the MongoDB Group for survey organization.

    def __str__(self):
        return self.username