"""
Permisos personalizados para el sistema de usuarios y grupos
"""
from rest_framework import permissions
from bson import ObjectId


class IsRootUser(permissions.BasePermission):
    """
    Permiso que solo permite acceso a usuarios con rol 'root'
    """
    def has_permission(self, request, view):
        return (
            request.user and
            request.user.is_authenticated and
            hasattr(request.user, 'role') and
            request.user.role == 'root'
        )


class IsGroupAdmin(permissions.BasePermission):
    """
    Permiso que permite acceso a administradores de grupo o root
    """
    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False
        
        user_role = getattr(request.user, 'role', None)
        return user_role in ('root', 'group_admin')


class IsGroupMember(permissions.BasePermission):
    """
    Permiso que permite acceso a usuarios del grupo, administradores de grupo o root
    """
    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False
        
        user_role = getattr(request.user, 'role', None)
        if user_role == 'root':
            return True
        
        # Admin de grupo o usuario regular con grupo asignado
        return user_role in ('group_admin', 'encuestador', 'analista') and request.user.user_group_id


class CanManageGroupUsers(permissions.BasePermission):
    """
    Permiso que permite a administradores de grupo gestionar usuarios de su grupo,
    o a root gestionar todos los usuarios
    """
    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False
        
        user_role = getattr(request.user, 'role', None)
        if user_role == 'root':
            return True
        
        if user_role == 'group_admin' and request.user.user_group_id:
            # Verificar que el grupo en la URL pertenece al admin
            group_id = view.kwargs.get('group_id') or view.kwargs.get('pk')
            if group_id:
                try:
                    return str(request.user.user_group_id) == str(group_id)
                except Exception:
                    return False
        
        return False


class CanViewUserGroup(permissions.BasePermission):
    """
    Permiso que permite a root ver cualquier grupo, o a group_admin ver su propio grupo
    """
    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False
        
        user_role = getattr(request.user, 'role', None)
        if user_role == 'root':
            return True
        
        # group_admin puede ver su propio grupo
        if user_role == 'group_admin' and request.user.user_group_id:
            return True
        
        return False
    
    def has_object_permission(self, request, view, obj):
        """
        Verifica que el group_admin solo pueda ver su propio grupo
        """
        user_role = getattr(request.user, 'role', None)
        if user_role == 'root':
            return True
        
        if user_role == 'group_admin' and request.user.user_group_id:
            # Verificar que el grupo es el del usuario
            group_id = str(obj.get('_id', obj.get('id', '')))
            user_group_id = str(request.user.user_group_id)
            return group_id == user_group_id
        
        return False


class CanAccessGroupResource(permissions.BasePermission):
    """
    Permiso que permite acceso a recursos (encuestas, respuestas) del grupo del usuario
    Root puede acceder a todo, admin de grupo a su grupo, usuario regular a su grupo
    """
    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False
        
        user_role = getattr(request.user, 'role', None)
        if user_role == 'root':
            return True
        
        # Admin de grupo o usuario regular con grupo asignado
        return user_role in ('group_admin', 'encuestador', 'analista') and request.user.user_group_id
    
    def has_object_permission(self, request, view, obj):
        """
        Verifica permisos a nivel de objeto (encuesta, respuesta, etc.)
        """
        user_role = getattr(request.user, 'role', None)
        if user_role == 'root':
            return True
        
        if not request.user.user_group_id:
            return False
        
        # Verificar que el recurso pertenece al grupo del usuario
        user_group_id = str(request.user.user_group_id)
        
        # Para encuestas
        if 'user_group_id' in obj:
            return str(obj.get('user_group_id')) == user_group_id
        
        # Para respuestas, verificar a través de la encuesta asociada
        if 'survey' in obj:
            from .mongo_utils import get_surveys_collection
            from bson import ObjectId
            surveys_collection = get_surveys_collection()
            survey_id = obj.get('survey')
            try:
                survey = surveys_collection.find_one({'_id': ObjectId(survey_id)})
                if survey and survey.get('user_group_id'):
                    return str(survey.get('user_group_id')) == user_group_id
            except Exception:
                pass
        
        return False

