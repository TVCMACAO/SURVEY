from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from rest_framework.exceptions import NotFound, ValidationError
from rest_framework_simplejwt.views import TokenObtainPairView

from bson import ObjectId
from datetime import datetime
from django.shortcuts import get_object_or_404
from django.contrib.auth import get_user_model

from .mongo_utils import get_surveys_collection, get_responses_collection, get_survey_groups_collection, get_user_groups_collection
from .mongo_user_utils import (
    create_user_in_mongo, get_user_by_username, get_user_by_id,
    update_user_in_mongo, list_users_from_mongo, user_exists_in_mongo, delete_user_from_mongo
)
from .mongo_user_model import MongoUser
from .serializers import (
    SurveyGroupSerializer, SurveySerializer, ResponseSerializer,
    CustomTokenObtainPairSerializer, UserSerializer, UserCreateSerializer, UserUpdateSerializer,
    BatchResponseSerializer, BatchResponseItemSerializer,
    SyncStatusRequestSerializer, SyncStatusResponseSerializer,
    UserGroupSerializer, UserGroupCreateSerializer, UserGroupUpdateSerializer
)
from .permissions import IsRootUser, IsGroupAdmin, CanManageGroupUsers, CanAccessGroupResource, CanViewUserGroup

User = get_user_model()

# Vistas de autenticación
class CustomTokenObtainPairView(TokenObtainPairView):
    """
    Vista personalizada para obtener tokens JWT.
    Utiliza un serializador personalizado para incluir información adicional del usuario en el token.
    """
    serializer_class = CustomTokenObtainPairSerializer
    
    def post(self, request, *args, **kwargs):
        # #region agent log
        import logging
        import json
        import time
        from pathlib import Path
        logger = logging.getLogger(__name__)
        request_data = request.data if hasattr(request, 'data') else {}
        username = request_data.get('username', '')
        has_password = 'password' in request_data
        logger.info(f"Token request received - username: {username}, has_password: {has_password}, data_keys: {list(request_data.keys())}")
        DEBUG_LOG_PATH = Path('/app/debug.log')
        # Ensure directory exists
        DEBUG_LOG_PATH.parent.mkdir(parents=True, exist_ok=True)
        try:
            from django.conf import settings
            user_exists = user_exists_in_mongo(username) if username else False
            total_users = len(list_users_from_mongo())
            log_data = {
                "timestamp": int(time.time() * 1000),
                "location": "views.py:30",
                "message": "Authentication attempt - checking user existence",
                "data": {
                    "username": username,
                    "db_path": db_path,
                    "user_exists": user_exists,
                    "total_users": total_users,
                    "hypothesisId": "E"
                },
                "sessionId": "debug-session",
                "runId": "run1"
            }
            with open(DEBUG_LOG_PATH, 'a') as f:
                f.write(json.dumps(log_data) + '\n')
        except Exception as e:
            pass
        # #endregion
        
        try:
            response = super().post(request, *args, **kwargs)
            # #region agent log
            logger.info(f"Token request successful - status_code: {response.status_code if response else None}")
            # #endregion
            return response
        except Exception as e:
            # #region agent log
            logger.error(f"Token request failed - type: {type(e).__name__}, message: {str(e)}, args: {e.args if hasattr(e, 'args') else None}", exc_info=True)
            # Log the full traceback
            import traceback
            logger.error(f"Full traceback: {''.join(traceback.format_exception(type(e), e, e.__traceback__))}")
            try:
                log_data = {
                    "timestamp": int(time.time() * 1000),
                    "location": "views.py:53",
                    "message": "Authentication failed",
                    "data": {
                        "username": username,
                        "error_type": type(e).__name__,
                        "error_message": str(e),
                        "hypothesisId": "E"
                    },
                    "sessionId": "debug-session",
                    "runId": "run1"
                }
                with open(DEBUG_LOG_PATH, 'a') as f:
                    f.write(json.dumps(log_data) + '\n')
            except Exception:
                pass
            # #endregion
            raise

# Vistas para Grupos de Encuestas
class SurveyGroupListCreate(APIView):
    """
    Gestiona la creación y listado de grupos de encuestas.
    - POST: Crea un nuevo grupo de encuestas.
    - GET: Lista todos los grupos de encuestas.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        groups_collection = get_survey_groups_collection()
        groups = list(groups_collection.find())
        for group in groups:
            group['id'] = str(group['_id']) # Convert ObjectId to string for serialization
        serializer = SurveyGroupSerializer(groups, many=True)
        return Response(serializer.data)

    def post(self, request):
        serializer = SurveyGroupSerializer(data=request.data)
        if serializer.is_valid():
            groups_collection = get_survey_groups_collection()
            # Asegurarse de que el usuario autenticado es el creador
            validated_data = serializer.validated_data
            validated_data['created_by'] = request.user.id # Usar el ID del usuario autenticado
            
            result = groups_collection.insert_one({
                'name': validated_data['name'],
                'created_by': validated_data['created_by']
            })
            # Recuperar el objeto insertado para serializarlo con el ID correcto
            new_group = groups_collection.find_one({'_id': result.inserted_id})
            new_group['id'] = str(new_group['_id'])
            return Response(SurveyGroupSerializer(new_group).data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class SurveyGroupRetrieveUpdateDestroy(APIView):
    """
    Gestiona la recuperación, actualización y eliminación de un grupo de encuestas específico.
    - GET: Recupera un grupo de encuestas por ID.
    - PUT: Actualiza un grupo de encuestas por ID.
    - DELETE: Elimina un grupo de encuestas por ID.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self, pk):
        groups_collection = get_survey_groups_collection()
        try:
            group = groups_collection.find_one({"_id": ObjectId(pk)})
            if not group:
                raise NotFound(detail="Grupo de encuestas no encontrado.")
            group['id'] = str(group['_id'])
            return group
        except Exception:
            raise NotFound(detail="Grupo de encuestas no encontrado o ID inválido.")

    def get(self, request, pk):
        group = self.get_object(pk)
        serializer = SurveyGroupSerializer(group)
        return Response(serializer.data)

    def put(self, request, pk):
        group = self.get_object(pk)
        serializer = SurveyGroupSerializer(group, data=request.data, partial=True)
        if serializer.is_valid():
            groups_collection = get_survey_groups_collection()
            groups_collection.update_one(
                {"_id": ObjectId(pk)},
                {"$set": {'name': serializer.validated_data.get('name', group['name'])}}
                # 'created_by' no debería ser actualizable aquí
            )
            updated_group = self.get_object(pk) # Recuperar el grupo actualizado
            return Response(SurveyGroupSerializer(updated_group).data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, pk):
        group = self.get_object(pk) # Esto también verifica si existe y convierte el ID
        groups_collection = get_survey_groups_collection()
        
        # Opcional: Implementar lógica para evitar eliminar grupos con encuestas asociadas
        # surveys_collection = get_surveys_collection()
        # if surveys_collection.count_documents({'group': ObjectId(pk)}) > 0:
        #     return Response(
        #         {"detail": "No se puede eliminar el grupo porque tiene encuestas asociadas."},
        #         status=status.HTTP_409_CONFLICT # 409 Conflict
        #     )
            
        groups_collection.delete_one({"_id": ObjectId(pk)})
        return Response(status=status.HTTP_204_NO_CONTENT)

# Vistas para Grupos de Usuarios
class UserGroupListCreate(APIView):
    """
    Gestiona la creación y listado de grupos de usuarios.
    - POST: Crea un nuevo grupo de usuarios (solo root).
    - GET: Lista todos los grupos de usuarios (solo root).
    """
    permission_classes = [IsRootUser]

    def get(self, request):
        groups_collection = get_user_groups_collection()
        groups = list(groups_collection.find())
        for group in groups:
            group['id'] = str(group['_id'])
        serializer = UserGroupSerializer(groups, many=True)
        return Response(serializer.data)

    def post(self, request):
        serializer = UserGroupCreateSerializer(data=request.data)
        if serializer.is_valid():
            groups_collection = get_user_groups_collection()
            validated_data = serializer.validated_data
            
            # Verificar que el admin_user_id existe y tiene rol group_admin
            admin_user_id = validated_data['admin_user_id']
            admin_user = get_user_by_id(admin_user_id)
            if not admin_user:
                return Response(
                    {"admin_user_id": "El usuario administrador no existe"},
                    status=status.HTTP_400_BAD_REQUEST
                )
            if admin_user.get('role') != 'group_admin':
                return Response(
                    {"admin_user_id": "El usuario debe tener el rol 'group_admin'"},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Crear el grupo
            new_group = {
                'name': validated_data['name'],
                'description': validated_data.get('description', ''),
                'created_by': str(request.user.id),  # Convertir a string para ObjectId
                'admin_user_id': str(admin_user_id),  # Asegurar que sea string
                'created_at': datetime.utcnow(),
                'is_active': validated_data.get('is_active', True)
            }
            
            result = groups_collection.insert_one(new_group)
            new_group['_id'] = result.inserted_id
            new_group['id'] = str(new_group['_id'])
            
            # Asignar el grupo al usuario administrador
            update_user_in_mongo(admin_user_id, user_group_id=str(result.inserted_id))
            
            return Response(UserGroupSerializer(new_group).data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class UserGroupRetrieveUpdateDestroy(APIView):
    """
    Gestiona la recuperación, actualización y eliminación de un grupo de usuarios específico.
    - GET: Recupera un grupo de usuarios por ID (root puede ver todos, group_admin solo el suyo).
    - PUT: Actualiza un grupo de usuarios por ID (solo root).
    - DELETE: Elimina un grupo de usuarios por ID (solo root).
    """
    permission_classes = [CanViewUserGroup]

    def get_object(self, pk):
        groups_collection = get_user_groups_collection()
        try:
            group = groups_collection.find_one({"_id": ObjectId(pk)})
            if not group:
                raise NotFound(detail="Grupo de usuarios no encontrado.")
            group['id'] = str(group['_id'])
            return group
        except Exception:
            raise NotFound(detail="Grupo de usuarios no encontrado o ID inválido.")

    def get(self, request, pk):
        group = self.get_object(pk)
        
        # Verificar permisos: group_admin solo puede ver su propio grupo
        user_role = getattr(request.user, 'role', None)
        if user_role == 'group_admin':
            user_group_id = getattr(request.user, 'user_group_id', None)
            group_id = str(group.get('_id', group.get('id', '')))
            if user_group_id and group_id != str(user_group_id):
                return Response(
                    {"detail": "No tienes permisos para ver este grupo."},
                    status=status.HTTP_403_FORBIDDEN
                )
        
        serializer = UserGroupSerializer(group)
        return Response(serializer.data)

    def put(self, request, pk):
        group = self.get_object(pk)
        serializer = UserGroupUpdateSerializer(data=request.data, partial=True)
        if serializer.is_valid():
            groups_collection = get_user_groups_collection()
            update_data = {}
            
            if 'name' in serializer.validated_data:
                update_data['name'] = serializer.validated_data['name']
            if 'description' in serializer.validated_data:
                update_data['description'] = serializer.validated_data['description']
            if 'is_active' in serializer.validated_data:
                update_data['is_active'] = serializer.validated_data['is_active']
            
            # Si se cambia el admin_user_id
            if 'admin_user_id' in serializer.validated_data:
                new_admin_id = serializer.validated_data['admin_user_id']
                old_admin_id = group.get('admin_user_id')
                
                # Verificar que el nuevo admin existe y tiene rol group_admin
                new_admin = get_user_by_id(new_admin_id)
                if not new_admin:
                    return Response(
                        {"admin_user_id": "El usuario administrador no existe"},
                        status=status.HTTP_400_BAD_REQUEST
                    )
                if new_admin.get('role') != 'group_admin':
                    return Response(
                        {"admin_user_id": "El usuario debe tener el rol 'group_admin'"},
                        status=status.HTTP_400_BAD_REQUEST
                    )
                
                # Actualizar user_group_id del nuevo admin
                update_user_in_mongo(new_admin_id, user_group_id=str(pk))
                
                # Remover user_group_id del admin anterior si existe
                if old_admin_id:
                    old_admin = get_user_by_id(old_admin_id)
                    if old_admin and old_admin.get('user_group_id') == str(pk):
                        update_user_in_mongo(old_admin_id, user_group_id=None)
                
                update_data['admin_user_id'] = new_admin_id
            
            if update_data:
                groups_collection.update_one(
                    {"_id": ObjectId(pk)},
                    {"$set": update_data}
                )
            
            updated_group = self.get_object(pk)
            return Response(UserGroupSerializer(updated_group).data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, pk):
        group = self.get_object(pk)
        groups_collection = get_user_groups_collection()
        
        # Remover user_group_id de todos los usuarios del grupo
        users_in_group = list_users_from_mongo({'user_group_id': str(pk)})
        for user in users_in_group:
            update_user_in_mongo(user['id'], user_group_id=None)
        
        groups_collection.delete_one({"_id": ObjectId(pk)})
        return Response(status=status.HTTP_204_NO_CONTENT)


class UserGroupUsersListCreate(APIView):
    """
    Gestiona la lista y creación de usuarios dentro de un grupo.
    - GET: Lista usuarios del grupo (root o admin del grupo).
    - POST: Agrega un usuario al grupo (root o admin del grupo).
    """
    permission_classes = [CanManageGroupUsers]

    def get(self, request, group_id):
        # Verificar que el grupo existe
        groups_collection = get_user_groups_collection()
        try:
            group = groups_collection.find_one({"_id": ObjectId(group_id)})
            if not group:
                raise NotFound(detail="Grupo de usuarios no encontrado.")
        except Exception:
            raise NotFound(detail="Grupo de usuarios no encontrado o ID inválido.")
        
        # Obtener usuarios del grupo
        users = list_users_from_mongo({'user_group_id': str(group_id)})
        serializer = UserSerializer(users, many=True)
        return Response(serializer.data)

    def post(self, request, group_id):
        # Verificar que el grupo existe
        groups_collection = get_user_groups_collection()
        try:
            group = groups_collection.find_one({"_id": ObjectId(group_id)})
            if not group:
                raise NotFound(detail="Grupo de usuarios no encontrado.")
        except Exception:
            raise NotFound(detail="Grupo de usuarios no encontrado o ID inválido.")
        
        user_id = request.data.get('user_id')
        if not user_id:
            return Response(
                {"user_id": "Este campo es requerido"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        user = get_user_by_id(user_id)
        if not user:
            return Response(
                {"user_id": "Usuario no encontrado"},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Verificar que el usuario no pertenece a otro grupo
        if user.get('user_group_id') and user.get('user_group_id') != str(group_id):
            return Response(
                {"user_id": "El usuario ya pertenece a otro grupo"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Asignar usuario al grupo
        update_user_in_mongo(user_id, user_group_id=str(group_id))
        user = get_user_by_id(user_id)  # Recargar usuario actualizado
        
        serializer = UserSerializer(user)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class UserGroupUsersRetrieveUpdateDestroy(APIView):
    """
    Gestiona un usuario específico dentro de un grupo.
    - GET: Obtiene información del usuario (root o admin del grupo).
    - PUT: Actualiza el usuario (root o admin del grupo).
    - DELETE: Remueve el usuario del grupo (root o admin del grupo).
    """
    permission_classes = [CanManageGroupUsers]

    def get(self, request, group_id, user_id):
        # Verificar que el grupo existe
        groups_collection = get_user_groups_collection()
        try:
            group = groups_collection.find_one({"_id": ObjectId(group_id)})
            if not group:
                raise NotFound(detail="Grupo de usuarios no encontrado.")
        except Exception:
            raise NotFound(detail="Grupo de usuarios no encontrado o ID inválido.")
        
        user = get_user_by_id(user_id)
        if not user or user.get('user_group_id') != str(group_id):
            raise NotFound(detail="Usuario no encontrado en este grupo.")
        
        serializer = UserSerializer(user)
        return Response(serializer.data)

    def put(self, request, group_id, user_id):
        # Verificar que el grupo existe
        groups_collection = get_user_groups_collection()
        try:
            group = groups_collection.find_one({"_id": ObjectId(group_id)})
            if not group:
                raise NotFound(detail="Grupo de usuarios no encontrado.")
        except Exception:
            raise NotFound(detail="Grupo de usuarios no encontrado o ID inválido.")
        
        user = get_user_by_id(user_id)
        if not user or user.get('user_group_id') != str(group_id):
            raise NotFound(detail="Usuario no encontrado en este grupo.")
        
        # Para group_admin, prevenir cambios no permitidos
        user_role = getattr(request.user, 'role', None)
        if user_role == 'group_admin':
            # Prevenir que group_admin cambie roles privilegiados
            if 'role' in request.data and request.data['role'] in ('root', 'group_admin'):
                return Response(
                    {"role": "No tienes permisos para asignar este rol."},
                    status=status.HTTP_403_FORBIDDEN
                )
            # Prevenir que group_admin cambie el grupo del usuario
            if 'user_group_id' in request.data and request.data['user_group_id'] != str(group_id):
                return Response(
                    {"user_group_id": "No tienes permisos para cambiar el grupo del usuario."},
                    status=status.HTTP_403_FORBIDDEN
                )
            # Forzar que el user_group_id se mantenga en el grupo del admin
            request_data = request.data.copy()
            request_data['user_group_id'] = str(group_id)
        else:
            request_data = request.data
        
        serializer = UserUpdateSerializer(user, data=request_data, partial=True)
        if serializer.is_valid():
            updated_user = serializer.save()
            return Response(UserSerializer(updated_user).data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, group_id, user_id):
        # Verificar que el grupo existe
        groups_collection = get_user_groups_collection()
        try:
            group = groups_collection.find_one({"_id": ObjectId(group_id)})
            if not group:
                raise NotFound(detail="Grupo de usuarios no encontrado.")
        except Exception:
            raise NotFound(detail="Grupo de usuarios no encontrado o ID inválido.")
        
        user = get_user_by_id(user_id)
        if not user or user.get('user_group_id') != str(group_id):
            raise NotFound(detail="Usuario no encontrado en este grupo.")
        
        # No permitir remover al administrador del grupo
        if user.get('id') == str(group.get('admin_user_id')):
            return Response(
                {"detail": "No se puede remover al administrador del grupo"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Remover usuario del grupo
        update_user_in_mongo(user_id, user_group_id=None)
        
        return Response(status=status.HTTP_204_NO_CONTENT)

# Vistas para Encuestas
class SurveyListCreate(APIView):
    """
    Gestiona la creación y listado de encuestas.
    - POST: Crea una nueva encuesta.
    - GET: Lista todas las encuestas o encuestas filtradas por group_id.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        try:
            surveys_collection = get_surveys_collection()
            group_id = request.query_params.get('group_id')  # Grupo de encuestas (legacy)
            user_group_id = request.query_params.get('user_group_id')  # Grupo de usuarios
            show_deleted = request.query_params.get('show_deleted', 'false').lower() == 'true'
            
            query = {}
            
            # Filtro por grupo de encuestas (legacy)
            if group_id:
                try:
                    query['group'] = ObjectId(group_id)
                except Exception:
                    query['group'] = group_id

            # Filtro por grupo de usuarios según rol
            user_role = None
            if request.user and hasattr(request.user, 'is_authenticated') and request.user.is_authenticated:
                try:
                    user_role = getattr(request.user, 'role', None)
                except (AttributeError, TypeError):
                    user_role = None
            
            # Root puede ver todas las encuestas o filtrar por user_group_id si se especifica
            if user_role == 'root':
                if user_group_id:
                    try:
                        query['user_group_id'] = str(user_group_id)
                    except Exception:
                        query['user_group_id'] = user_group_id
            # Admin de grupo y usuarios regulares solo ven encuestas de su grupo
            elif user_role in ('group_admin', 'encuestador', 'analista'):
                try:
                    user_group_id = getattr(request.user, 'user_group_id', None)
                    if user_group_id:
                        query['user_group_id'] = str(user_group_id)
                except (AttributeError, TypeError):
                    pass
            # Si se especifica user_group_id en query params, usarlo (solo para root)
            elif user_group_id and user_role == 'root':
                try:
                    query['user_group_id'] = str(user_group_id)
                except Exception:
                    query['user_group_id'] = user_group_id

            # Solo usuarios root pueden ver eliminadas, y solo si lo solicitan explícitamente
            if not show_deleted or user_role != 'root':
                # Excluir eliminadas: campo no existe o es False/None
                # Usar $and para combinar con otras condiciones si existen
                deleted_condition = {
                    '$or': [
                        {'is_deleted': {'$ne': True}},
                        {'is_deleted': {'$exists': False}}
                    ]
                }
                if query:
                    # Combinar condiciones existentes con filtro de eliminadas
                    query = {'$and': [query, deleted_condition]}
                else:
                    query = deleted_condition

            surveys = list(surveys_collection.find(query))
            
            # #region agent log
            import json
            log_file_path = '/app/debug.log'
            try:
                with open(log_file_path, 'a') as f:
                    f.write(json.dumps({
                        "sessionId": "debug-session",
                        "runId": "run1",
                        "hypothesisId": "B",
                        "location": "views.py:231",
                        "message": "Surveys found in database",
                        "data": {
                            "count": len(surveys),
                            "query": str(query),
                            "survey_ids": [str(s.get('_id', s.get('id', ''))) for s in surveys[:5]]
                        },
                        "timestamp": int(__import__('time').time() * 1000)
                    }) + '\n')
            except Exception:
                pass
            # #endregion
        
            for survey in surveys:
                # Handle both ObjectId and string _id formats
                if '_id' in survey:
                    if isinstance(survey['_id'], ObjectId):
                        survey['id'] = str(survey['_id'])
                    else:
                        survey['id'] = str(survey['_id'])
                elif 'id' not in survey:
                    # If no _id, use id field if it exists
                    survey['id'] = survey.get('id', '')
            serializer = SurveySerializer(surveys, many=True)
            return Response(serializer.data)
        except Exception as e:
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Error in SurveyListCreate.get: {type(e).__name__}: {str(e)}", exc_info=True)
            return Response(
                {"detail": f"Error al cargar las encuestas: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def post(self, request):
        serializer = SurveySerializer(data=request.data)
        if serializer.is_valid():
            surveys_collection = get_surveys_collection()
            validated_data = serializer.validated_data
            
            # Validar que el group_id existe (grupo de encuestas legacy)
            groups_collection = get_survey_groups_collection()
            group_found = False
            # Try ObjectId first
            try:
                if groups_collection.find_one({"_id": ObjectId(validated_data['group'])}):
                    group_found = True
            except Exception:
                pass
            # Try as string
            if not group_found:
                if groups_collection.find_one({"_id": validated_data['group']}):
                    group_found = True
            if not group_found:
                raise ValidationError(detail="El grupo de encuestas especificado no existe.")

            # Determinar user_group_id según el rol del usuario
            user_role = getattr(request.user, 'role', None)
            user_group_id = None
            
            # Root puede especificar user_group_id en el request, o se asigna None (todas las encuestas)
            if user_role == 'root':
                user_group_id = request.data.get('user_group_id')
                if user_group_id:
                    # Validar que el grupo de usuarios existe
                    user_groups_collection = get_user_groups_collection()
                    try:
                        if not user_groups_collection.find_one({"_id": ObjectId(user_group_id)}):
                            return Response(
                                {"user_group_id": "El grupo de usuarios especificado no existe"},
                                status=status.HTTP_400_BAD_REQUEST
                            )
                    except Exception:
                        return Response(
                            {"user_group_id": "ID de grupo de usuarios inválido"},
                            status=status.HTTP_400_BAD_REQUEST
                        )
            # Admin de grupo y usuarios regulares: SIEMPRE asignar automáticamente su grupo (ignorar cualquier user_group_id del request)
            elif user_role in ('group_admin', 'encuestador', 'analista'):
                user_group_id = getattr(request.user, 'user_group_id', None)
                if not user_group_id:
                    return Response(
                        {"detail": "Tu usuario no tiene un grupo asignado. Contacta al administrador."},
                        status=status.HTTP_400_BAD_REQUEST
                    )
                # Forzar el grupo del usuario (ignorar cualquier user_group_id que venga en el request)
                user_group_id = str(user_group_id)
            
            # Construir documento de encuesta
            survey_doc = {
                'title': validated_data['title'],
                'description': validated_data.get('description', ''),
                'group': validated_data['group'],
                'questions': validated_data['questions'],
                'is_public': validated_data.get('is_public', False),
                'is_deleted': False,  # Por defecto no está eliminada
                'created_by': request.user.id,  # ID del usuario que crea la encuesta
                'survey_type': validated_data.get('survey_type', 'survey'),  # 'survey' o 'checklist'
            }
            
            # Agregar checklist_config si existe
            if 'checklist_config' in validated_data and validated_data['checklist_config']:
                survey_doc['checklist_config'] = validated_data['checklist_config']
            
            # Agregar user_group_id si está definido
            if user_group_id:
                survey_doc['user_group_id'] = str(user_group_id)
            
            # Agregar sections si existen
            if 'sections' in validated_data:
                survey_doc['sections'] = validated_data['sections']
            
            result = surveys_collection.insert_one(survey_doc)
            new_survey = surveys_collection.find_one({'_id': result.inserted_id})
            new_survey['id'] = str(new_survey['_id'])
            return Response(SurveySerializer(new_survey).data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class SurveyRetrieveUpdateDestroy(APIView):
    """
    Gestiona la recuperación, actualización y eliminación de una encuesta específica.
    - GET: Recupera una encuesta por ID.
    - PUT: Actualiza una encuesta por ID.
    - DELETE: Elimina una encuesta por ID.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self, pk, include_deleted=False):
        surveys_collection = get_surveys_collection()
        try:
            # Try multiple search strategies
            survey = None
            
            # Construir filtro de eliminadas
            deleted_filter = None
            if not include_deleted:
                deleted_filter = {
                    '$or': [
                        {'is_deleted': {'$ne': True}},
                        {'is_deleted': {'$exists': False}}
                    ]
                }
            
            # Strategy 1: Try ObjectId format
            try:
                if deleted_filter:
                    query = {"$and": [{"_id": ObjectId(pk)}, deleted_filter]}
                else:
                    query = {"_id": ObjectId(pk)}
                survey = surveys_collection.find_one(query)
            except Exception:
                pass
            
            # Strategy 2: Try string _id (for UUIDs)
            if not survey:
                if deleted_filter:
                    query = {"$and": [{"_id": pk}, deleted_filter]}
                else:
                    query = {"_id": pk}
                survey = surveys_collection.find_one(query)
            
            # Strategy 3: Try id field
            if not survey:
                if deleted_filter:
                    query = {"$and": [{"id": pk}, deleted_filter]}
                else:
                    query = {"id": pk}
                survey = surveys_collection.find_one(query)
            
            if not survey:
                raise NotFound(detail="Encuesta no encontrada.")
            
            # Ensure 'id' field exists for serialization
            if '_id' in survey:
                if isinstance(survey['_id'], ObjectId):
                    survey['id'] = str(survey['_id'])
                else:
                    survey['id'] = str(survey['_id'])
            elif 'id' not in survey:
                survey['id'] = pk
            
            return survey
        except NotFound:
            raise
        except Exception as e:
            raise NotFound(detail="Encuesta no encontrada o ID inválido.")

    def get(self, request, pk):
        survey = self.get_object(pk)
        serializer = SurveySerializer(survey)
        return Response(serializer.data)

    def put(self, request, pk):
        survey = self.get_object(pk)
        
        # Verificar permisos: group_admin solo puede editar encuestas de su grupo
        user_role = getattr(request.user, 'role', None)
        if user_role == 'group_admin':
            user_group_id = getattr(request.user, 'user_group_id', None)
            survey_group_id = survey.get('user_group_id')
            if user_group_id and survey_group_id and str(user_group_id) != str(survey_group_id):
                return Response(
                    {"detail": "No tienes permisos para editar encuestas de otros grupos."},
                    status=status.HTTP_403_FORBIDDEN
                )
            # Forzar que el user_group_id sea el del usuario (no puede cambiarlo)
            if 'user_group_id' in request.data:
                request.data['user_group_id'] = user_group_id
        
        serializer = SurveySerializer(survey, data=request.data, partial=True)
        if serializer.is_valid():
            surveys_collection = get_surveys_collection()
            validated_data = serializer.validated_data
            
            # Para group_admin, asegurar que user_group_id sea el suyo
            if user_role == 'group_admin':
                user_group_id = getattr(request.user, 'user_group_id', None)
                if user_group_id:
                    validated_data['user_group_id'] = str(user_group_id)
            
            # Si se intenta cambiar el grupo, validar que el nuevo grupo existe
            if 'group' in validated_data:
                groups_collection = get_survey_groups_collection()
                group_found = False
                # Try ObjectId first
                try:
                    if groups_collection.find_one({"_id": ObjectId(validated_data['group'])}):
                        group_found = True
                except Exception:
                    pass
                # Try as string
                if not group_found:
                    if groups_collection.find_one({"_id": validated_data['group']}):
                        group_found = True
                if not group_found:
                    raise ValidationError(detail="El nuevo grupo de encuestas especificado no existe.")

            update_fields = {
                'title': validated_data.get('title', survey['title']),
                'description': validated_data.get('description', survey.get('description', '')),
                'group': validated_data.get('group', survey['group']),
                'questions': validated_data.get('questions', survey['questions']),
                'is_public': validated_data.get('is_public', survey.get('is_public', False))
            }
            
            # Actualizar survey_type si está presente
            if 'survey_type' in validated_data:
                update_fields['survey_type'] = validated_data['survey_type']
            elif 'survey_type' not in survey:
                # Si no existe, usar 'survey' por defecto
                update_fields['survey_type'] = 'survey'
            
            # Actualizar checklist_config si está presente
            if 'checklist_config' in validated_data:
                update_fields['checklist_config'] = validated_data['checklist_config']
            
            # Para group_admin, asegurar que user_group_id no cambie (siempre el suyo)
            if user_role == 'group_admin':
                user_group_id = getattr(request.user, 'user_group_id', None)
                if user_group_id:
                    update_fields['user_group_id'] = str(user_group_id)
            
            # Build query - try ObjectId first, then fallback to other formats
            try:
                query = {"_id": ObjectId(pk)}
            except Exception:
                # If ObjectId conversion fails, try other formats
                if '_id' in survey:
                    query = {"_id": survey['_id']}
                elif 'id' in survey:
                    query = {"id": survey['id']}
                else:
                    query = {"_id": pk}
            
            surveys_collection.update_one(
                query,
                {"$set": update_fields}
            )
            updated_survey = self.get_object(pk)
            return Response(SurveySerializer(updated_survey).data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, pk):
        survey = self.get_object(pk)
        surveys_collection = get_surveys_collection()
        
        # Build query - try ObjectId first, then fallback to other formats
        try:
            query = {"_id": ObjectId(pk)}
        except Exception:
            # If ObjectId conversion fails, try other formats
            if '_id' in survey:
                query = {"_id": survey['_id']}
            elif 'id' in survey:
                query = {"id": survey['id']}
            else:
                query = {"_id": pk}
        
        # Eliminación lógica: marcar como eliminada en lugar de borrar
        surveys_collection.update_one(
            query,
            {"$set": {"is_deleted": True, "deleted_at": datetime.utcnow()}}
        )
        return Response({"detail": "Encuesta eliminada correctamente."}, status=status.HTTP_200_OK)

class SurveyRestoreView(APIView):
    """
    Restaura una encuesta eliminada lógicamente.
    Solo disponible para usuarios 'root'.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        # Verificar que el usuario es 'root'
        try:
            user_role = getattr(request.user, 'role', None) if request.user and request.user.is_authenticated else None
            if user_role != 'root':
                return Response(
                    {"detail": "No tienes permisos para restaurar encuestas."},
                    status=status.HTTP_403_FORBIDDEN
                )
        except (AttributeError, TypeError):
            return Response(
                {"detail": "Error al verificar permisos."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

        surveys_collection = get_surveys_collection()
        
        # Buscar la encuesta (incluyendo eliminadas)
        survey = None
        try:
            query = {"_id": ObjectId(pk)}
            survey = surveys_collection.find_one(query)
        except Exception:
            # Si ObjectId falla, intentar otros formatos
            query = {"_id": pk}
            survey = surveys_collection.find_one(query)
            if not survey:
                query = {"id": pk}
                survey = surveys_collection.find_one(query)

        if not survey:
            raise NotFound(detail="Encuesta no encontrada.")

        # Restaurar la encuesta
        surveys_collection.update_one(
            {"_id": survey.get('_id')},
            {"$unset": {"is_deleted": "", "deleted_at": ""}}
        )
        
        return Response({"detail": "Encuesta restaurada correctamente."}, status=status.HTTP_200_OK)

class SurveyPermanentDeleteView(APIView):
    """
    Elimina permanentemente una encuesta.
    Solo disponible para usuarios 'root'.
    """
    permission_classes = [permissions.IsAuthenticated]

    def delete(self, request, pk):
        # Verificar que el usuario es 'root'
        try:
            user_role = getattr(request.user, 'role', None) if request.user and request.user.is_authenticated else None
            if user_role != 'root':
                return Response(
                    {"detail": "No tienes permisos para eliminar permanentemente encuestas."},
                    status=status.HTTP_403_FORBIDDEN
                )
        except (AttributeError, TypeError):
            return Response(
                {"detail": "Error al verificar permisos."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

        surveys_collection = get_surveys_collection()
        
        # Buscar la encuesta (incluyendo eliminadas)
        survey = None
        try:
            query = {"_id": ObjectId(pk)}
            survey = surveys_collection.find_one(query)
        except Exception:
            # Si ObjectId falla, intentar otros formatos
            query = {"_id": pk}
            survey = surveys_collection.find_one(query)
            if not survey:
                query = {"id": pk}
                survey = surveys_collection.find_one(query)

        if not survey:
            raise NotFound(detail="Encuesta no encontrada.")

        # Eliminar permanentemente
        surveys_collection.delete_one({"_id": survey.get('_id')})
        
        return Response({"detail": "Encuesta eliminada permanentemente."}, status=status.HTTP_200_OK)

# Vistas públicas (sin autenticación)
class PublicSurveyView(APIView):
    """
    Vista pública para ver una encuesta sin autenticación.
    Permite acceso público a encuestas mediante enlace compartido.
    """
    permission_classes = [permissions.AllowAny]

    def get(self, request, pk):
        surveys_collection = get_surveys_collection()
        try:
            # Log entry
            import json
            log_data = {"location": "views.py:325", "message": "PublicSurveyView.get entry", "data": {"pk": pk}, "timestamp": int(__import__('time').time() * 1000), "sessionId": "debug-session", "runId": "run1", "hypothesisId": "F"}
            try:
                with open('/app/debug.log', 'a') as f:
                    f.write(json.dumps(log_data) + '\n')
            except: pass
            
            # Try multiple search strategies
            survey = None
            
            # Excluir encuestas eliminadas en vistas públicas
            deleted_filter = {
                "$or": [
                    {"is_deleted": {"$ne": True}},
                    {"is_deleted": {"$exists": False}}
                ]
            }
            
            # Strategy 1: Try ObjectId format
            try:
                query = {"$and": [{"_id": ObjectId(pk)}, deleted_filter]}
                survey = surveys_collection.find_one(query)
                log_data = {"location": "views.py:333", "message": "ObjectId search result", "data": {"found": survey is not None}, "timestamp": int(__import__('time').time() * 1000), "sessionId": "debug-session", "runId": "run1", "hypothesisId": "F"}
                try:
                    with open('/app/debug.log', 'a') as f:
                        f.write(json.dumps(log_data) + '\n')
                except: pass
            except Exception as e:
                log_data = {"location": "views.py:336", "message": "ObjectId search exception", "data": {"error": str(e)}, "timestamp": int(__import__('time').time() * 1000), "sessionId": "debug-session", "runId": "run1", "hypothesisId": "F"}
                try:
                    with open('/app/debug.log', 'a') as f:
                        f.write(json.dumps(log_data) + '\n')
                except: pass
            
            # Strategy 2: Try string _id (for UUIDs)
            if not survey:
                query = {"$and": [{"_id": pk}, deleted_filter]}
                survey = surveys_collection.find_one(query)
            
            # Strategy 3: Try id field
            if not survey:
                query = {"$and": [{"id": pk}, deleted_filter]}
                survey = surveys_collection.find_one(query)
            
            if not survey:
                log_data = {"location": "views.py:346", "message": "Survey not found", "data": {"pk": pk}, "timestamp": int(__import__('time').time() * 1000), "sessionId": "debug-session", "runId": "run1", "hypothesisId": "F"}
                try:
                    with open('/app/debug.log', 'a') as f:
                        f.write(json.dumps(log_data) + '\n')
                except: pass
                raise NotFound(detail="Encuesta no encontrada.")
            
            # Check if survey is public
            is_public = survey.get('is_public', False)
            log_data = {"location": "views.py:350", "message": "Survey found, checking is_public", "data": {"is_public": is_public, "survey_id": str(survey.get('_id', 'N/A'))}, "timestamp": int(__import__('time').time() * 1000), "sessionId": "debug-session", "runId": "run1", "hypothesisId": "F"}
            try:
                with open('/app/debug.log', 'a') as f:
                    f.write(json.dumps(log_data) + '\n')
            except: pass
            if not is_public:
                log_data = {"location": "views.py:381", "message": "Survey is not public, raising ValidationError", "data": {"survey_id": str(survey.get('_id', 'N/A'))}, "timestamp": int(__import__('time').time() * 1000), "sessionId": "debug-session", "runId": "run1", "hypothesisId": "F"}
                try:
                    with open('/app/debug.log', 'a') as f:
                        f.write(json.dumps(log_data) + '\n')
                except: pass
                raise ValidationError(detail="Esta encuesta no es pública. Se requiere autenticación para acceder.")
            
            # Ensure 'id' field exists for serialization
            if '_id' in survey:
                if isinstance(survey['_id'], ObjectId):
                    survey['id'] = str(survey['_id'])
                else:
                    survey['id'] = str(survey['_id'])
            elif 'id' not in survey:
                survey['id'] = pk
            
            serializer = SurveySerializer(survey)
            return Response(serializer.data)
        except NotFound:
            raise
        except ValidationError:
            raise
        except Exception as e:
            import traceback
            log_data = {"location": "views.py:409", "message": "Unexpected exception in PublicSurveyView", "data": {"error": str(e), "traceback": traceback.format_exc()}, "timestamp": int(__import__('time').time() * 1000), "sessionId": "debug-session", "runId": "run1", "hypothesisId": "F"}
            try:
                with open('/app/debug.log', 'a') as f:
                    f.write(json.dumps(log_data) + '\n')
            except: pass
            raise NotFound(detail="Encuesta no encontrada o ID inválido.")

class PublicResponseCreate(APIView):
    """
    Vista pública para crear respuestas sin autenticación.
    Permite que usuarios anónimos respondan encuestas públicas.
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = ResponseSerializer(data=request.data)
        if serializer.is_valid():
            responses_collection = get_responses_collection()
            validated_data = serializer.validated_data
            
            # Validar que el survey_id existe
            surveys_collection = get_surveys_collection()
            survey = None
            try:
                survey = surveys_collection.find_one({"_id": ObjectId(validated_data['survey'])})
            except Exception:
                survey = surveys_collection.find_one({"_id": validated_data['survey']})
            
            if not survey:
                raise ValidationError(detail="La encuesta especificada no existe.")
            
            # Para respuestas públicas, surveyor_id puede ser None o un valor opcional
            surveyor_id = validated_data.get('surveyor_id')
            if request.user and request.user.is_authenticated:
                surveyor_id = request.user.id

            result = responses_collection.insert_one({
                'survey': validated_data['survey'],
                'surveyor_id': surveyor_id,
                'device_id': validated_data.get('device_id'),
                'answers': validated_data['answers'],
                'synced': validated_data.get('synced', True),  # Public responses are synced by default
                'created_at': datetime.utcnow()  # Agregar fecha de creación
            })
            new_response = responses_collection.find_one({'_id': result.inserted_id})
            new_response['id'] = str(new_response['_id'])
            return Response(ResponseSerializer(new_response).data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

# Vistas para Respuestas
class ResponseListCreate(APIView):
    """
    Gestiona la creación y listado de respuestas.
    - POST: Crea una nueva respuesta a una encuesta.
    - GET: Lista todas las respuestas o respuestas filtradas por survey_id.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        responses_collection = get_responses_collection()
        surveys_collection = get_surveys_collection()
        survey_id = request.query_params.get('survey_id')
        user_group_id = request.query_params.get('user_group_id')
        
        query = {}
        if survey_id:
            try:
                query['survey'] = ObjectId(survey_id)
            except Exception:
                raise ValidationError(detail="ID de encuesta inválido.")

        # Filtro por grupo de usuarios según rol
        user_role = getattr(request.user, 'role', None)
        
        # Root puede ver todas las respuestas o filtrar por user_group_id si se especifica
        if user_role == 'root':
            if user_group_id:
                # Filtrar respuestas de encuestas que pertenecen al grupo especificado
                try:
                    survey_ids = [
                        str(s['_id']) for s in surveys_collection.find(
                            {'user_group_id': str(user_group_id)},
                            {'_id': 1}
                        )
                    ]
                    if survey_ids:
                        query['survey'] = {'$in': [ObjectId(sid) for sid in survey_ids]}
                    else:
                        # No hay encuestas en este grupo, retornar vacío
                        return Response([])
                except Exception:
                    return Response(
                        {"detail": "ID de grupo de usuarios inválido"},
                        status=status.HTTP_400_BAD_REQUEST
                    )
        # Admin de grupo y usuarios regulares solo ven respuestas de encuestas de su grupo
        elif user_role in ('group_admin', 'encuestador', 'analista') and request.user.user_group_id:
            # Obtener IDs de encuestas del grupo del usuario
            try:
                survey_ids = [
                    str(s['_id']) for s in surveys_collection.find(
                        {'user_group_id': str(request.user.user_group_id)},
                        {'_id': 1}
                    )
                ]
                if survey_ids:
                    # Si ya hay un filtro por survey_id, verificar que pertenece al grupo
                    if 'survey' in query:
                        survey_obj_id = query['survey']
                        if isinstance(survey_obj_id, ObjectId):
                            survey_obj_id = str(survey_obj_id)
                        if survey_obj_id not in survey_ids:
                            # El usuario no tiene acceso a esta encuesta
                            return Response([])
                    else:
                        # Filtrar por todas las encuestas del grupo
                        query['survey'] = {'$in': [ObjectId(sid) for sid in survey_ids]}
                else:
                    # No hay encuestas en este grupo, retornar vacío
                    return Response([])
            except Exception:
                return Response([])

        responses = list(responses_collection.find(query))
        for response in responses:
            response['id'] = str(response['_id'])
        serializer = ResponseSerializer(responses, many=True)
        return Response(serializer.data)

    def post(self, request):
        serializer = ResponseSerializer(data=request.data)
        if serializer.is_valid():
            responses_collection = get_responses_collection()
            validated_data = serializer.validated_data
            
            # Validar que el survey_id existe
            surveys_collection = get_surveys_collection()
            survey = None
            try:
                survey = surveys_collection.find_one({"_id": ObjectId(validated_data['survey'])})
            except Exception:
                survey = surveys_collection.find_one({"_id": validated_data['survey']})
            
            if not survey:
                raise ValidationError(detail="La encuesta especificada no existe.")
            
            # Verificar si es una actualización de respuesta existente (tiene id)
            response_id = request.data.get('id')
            if response_id:
                # Es una actualización, verificar que no esté bloqueada
                existing_response = None
                try:
                    existing_response = responses_collection.find_one({"_id": ObjectId(response_id)})
                except Exception:
                    existing_response = responses_collection.find_one({"_id": response_id})
                
                if existing_response and existing_response.get('is_locked', False):
                    return Response(
                        {"detail": "No se puede modificar un chequeo bloqueado."},
                        status=status.HTTP_400_BAD_REQUEST
                    )
            
            # Validaciones para checklists
            survey_type = survey.get('survey_type', 'survey')
            if survey_type == 'checklist':
                # Para checklists, check_number y check_date son requeridos
                check_number = validated_data.get('check_number')
                check_date = validated_data.get('check_date')
                
                if check_number is None or check_date is None:
                    return Response(
                        {"detail": "Para checklists, check_number y check_date son requeridos."},
                        status=status.HTTP_400_BAD_REQUEST
                    )
                
                # Validar formato de fecha (YYYY-MM-DD)
                import re
                if not re.match(r'^\d{4}-\d{2}-\d{2}$', check_date):
                    return Response(
                        {"detail": "check_date debe tener formato YYYY-MM-DD."},
                        status=status.HTTP_400_BAD_REQUEST
                    )
                
                # Verificar que no exista ya un chequeo con el mismo número y fecha bloqueado
                existing_check = responses_collection.find_one({
                    'survey': validated_data['survey'],
                    'check_number': check_number,
                    'check_date': check_date,
                    'is_locked': True
                })
                
                if existing_check and (not response_id or str(existing_check.get('_id')) != str(response_id)):
                    return Response(
                        {"detail": f"Ya existe un chequeo #{check_number} bloqueado para la fecha {check_date}."},
                        status=status.HTTP_400_BAD_REQUEST
                    )
            
            # Asegurarse de que el usuario autenticado es el surveyor (si está autenticado)
            if request.user and request.user.is_authenticated:
                validated_data['surveyor_id'] = request.user.id
            elif 'surveyor_id' not in validated_data:
                validated_data['surveyor_id'] = None

            # Construir documento de respuesta
            response_doc = {
                'survey': validated_data['survey'],
                'surveyor_id': validated_data['surveyor_id'],
                'device_id': validated_data.get('device_id'),
                'answers': validated_data['answers'],
                'synced': validated_data.get('synced', True),
                'created_at': datetime.utcnow()
            }
            
            # Agregar campos de checklist si existen
            if 'check_number' in validated_data and validated_data['check_number'] is not None:
                response_doc['check_number'] = validated_data['check_number']
            if 'check_date' in validated_data and validated_data['check_date']:
                response_doc['check_date'] = validated_data['check_date']
            if 'is_locked' in validated_data:
                response_doc['is_locked'] = validated_data['is_locked']
            
            # Si es actualización, usar update_one; si no, insert_one
            if response_id:
                try:
                    query = {"_id": ObjectId(response_id)}
                except Exception:
                    query = {"_id": response_id}
                
                responses_collection.update_one(query, {"$set": response_doc})
                updated_response = responses_collection.find_one(query)
                updated_response['id'] = str(updated_response['_id'])
                return Response(ResponseSerializer(updated_response).data, status=status.HTTP_200_OK)
            else:
                result = responses_collection.insert_one(response_doc)
                new_response = responses_collection.find_one({'_id': result.inserted_id})
                new_response['id'] = str(new_response['_id'])
                return Response(ResponseSerializer(new_response).data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class ResponseSyncView(APIView):
    """
    Vista para sincronizar múltiples respuestas en lote desde dispositivos móviles.
    - POST: Recibe un lote de respuestas y las sincroniza con el servidor.
    """
    permission_classes = [permissions.IsAuthenticated]

    def dispatch(self, request, *args, **kwargs):
        """
        Sobrescribir dispatch para capturar TODAS las peticiones, incluso antes de autenticación.
        """
        import logging
        import json
        logger = logging.getLogger(__name__)
        log_file_path = '/app/debug.log'
        
        # Log ANTES de cualquier procesamiento
        try:
            log_entry = {
                'location': 'views.py:dispatch',
                'message': 'ResponseSyncView dispatch called',
                'data': {
                    'method': request.method,
                    'path': request.path,
                    'full_path': request.get_full_path(),
                    'META': {k: str(v)[:100] for k, v in request.META.items() if 'HTTP' in k or 'CONTENT' in k},
                    'user': str(request.user) if hasattr(request, 'user') else 'Not set yet',
                    'authenticated': request.user.is_authenticated if hasattr(request, 'user') and hasattr(request.user, 'is_authenticated') else False,
                },
                'timestamp': int(__import__('time').time() * 1000),
                'sessionId': 'debug-session',
                'runId': 'run1',
                'hypothesisId': 'S'
            }
            log_json = json.dumps(log_entry) + '\n'
            with open(log_file_path, 'a') as f:
                f.write(log_json)
            print(f"DEBUG DISPATCH: {log_json}", flush=True)
            logger.info(f"ResponseSyncView dispatch: {request.method} {request.path}")
        except Exception as log_err:
            error_msg = f"Could not write dispatch log: {log_err}"
            logger.warning(error_msg)
            print(error_msg, flush=True)
        
        # Llamar al dispatch original
        return super().dispatch(request, *args, **kwargs)

    def post(self, request):
        import logging
        import json
        import os
        logger = logging.getLogger(__name__)
        
        # Log de entrada - escribir a archivo Y stdout
        log_file_path = '/app/debug.log'
        log_message = f"=== SYNC REQUEST RECEIVED at {__import__('time').time()} ==="
        logger.info(log_message)
        print(log_message, flush=True)  # Forzar flush para gunicorn
        
        try:
            log_entry = {
                'location': 'views.py:523',
                'message': 'SYNC REQUEST RECEIVED',
                'data': {
                    'method': request.method,
                    'path': request.path,
                    'headers': dict(request.headers),
                    'user': str(request.user) if hasattr(request, 'user') else 'Anonymous',
                    'body_preview': str(request.data)[:500] if hasattr(request, 'data') else 'No data'
                },
                'timestamp': int(__import__('time').time() * 1000),
                'sessionId': 'debug-session',
                'runId': 'run1',
                'hypothesisId': 'O'
            }
            log_json = json.dumps(log_entry) + '\n'
            with open(log_file_path, 'a') as f:
                f.write(log_json)
            print(f"DEBUG LOG: {log_json}", flush=True)
        except Exception as log_err:
            error_msg = f"Could not write to debug log file: {log_err}"
            logger.warning(error_msg)
            print(error_msg, flush=True)
        
        # Log de entrada
        logger.info(f"=== SYNC REQUEST RECEIVED ===")
        logger.info(f"Request method: {request.method}")
        logger.info(f"Request path: {request.path}")
        logger.info(f"Request headers: {dict(request.headers)}")
        try:
            logger.info(f"Request body: {json.dumps(request.data) if hasattr(request, 'data') else 'No data'}")
        except Exception as e:
            logger.warning(f"Could not log request body: {e}")
        
        serializer = BatchResponseSerializer(data=request.data)
        if not serializer.is_valid():
            logger.error(f"BatchResponseSerializer validation errors: {serializer.errors}")
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        responses_collection = get_responses_collection()
        surveys_collection = get_surveys_collection()
        validated_responses = serializer.validated_data['responses']
        
        import logging
        logger = logging.getLogger(__name__)
        logger.info(f"Processing batch sync with {len(validated_responses)} responses")
        
        results = []
        errors = []
        
        for idx, response_data in enumerate(validated_responses):
            try:
                import logging
                logger = logging.getLogger(__name__)
                
                # Validar que la encuesta existe
                survey = None
                survey_id = response_data['survey']
                
                # Limpiar el survey_id (remover espacios y caracteres inválidos)
                survey_id_str = str(survey_id).strip().replace(' ', '')
                logger.info(f"Processing response {idx}: survey_id={survey_id}, cleaned={survey_id_str}")
                
                # Intentar múltiples estrategias para encontrar la encuesta
                # Estrategia 1: Buscar por ObjectId
                try:
                    if isinstance(survey_id, ObjectId):
                        survey = surveys_collection.find_one({"_id": survey_id})
                        logger.info(f"Found survey by ObjectId (direct): {survey is not None}")
                    elif ObjectId.is_valid(survey_id_str):
                        survey = surveys_collection.find_one({"_id": ObjectId(survey_id_str)})
                        logger.info(f"Found survey by ObjectId (converted): {survey is not None}")
                except Exception as e:
                    logger.warning(f"Error searching by ObjectId: {e}")
                
                # Estrategia 2: Buscar por string (puede ser UUID u otro formato)
                if not survey:
                    try:
                        survey = surveys_collection.find_one({"_id": survey_id_str})
                        logger.info(f"Found survey by string _id: {survey is not None}")
                    except Exception as e:
                        logger.warning(f"Error searching by string _id: {e}")
                
                # Estrategia 3: Buscar por campo 'id' si existe
                if not survey:
                    try:
                        survey = surveys_collection.find_one({"id": survey_id_str})
                        logger.info(f"Found survey by 'id' field: {survey is not None}")
                    except Exception as e:
                        logger.warning(f"Error searching by 'id' field: {e}")
                
                # Estrategia 4: Buscar todos y comparar IDs como strings
                if not survey:
                    try:
                        all_surveys = list(surveys_collection.find({}))
                        for s in all_surveys:
                            s_id = str(s.get('_id', ''))
                            if s_id == survey_id_str or s_id.replace(' ', '') == survey_id_str:
                                survey = s
                                logger.info(f"Found survey by string comparison: {survey is not None}")
                                break
                    except Exception as e:
                        logger.warning(f"Error in fallback search: {e}")
                
                if not survey:
                    error_msg = f'La encuesta especificada no existe. ID recibido: {survey_id} (limpiado: {survey_id_str})'
                    logger.error(error_msg)
                    # Escribir a archivo de log
                    try:
                        import json
                        log_entry = {
                            'location': 'views.py:608',
                            'message': 'Survey not found',
                            'data': {
                                'index': idx,
                                'local_id': response_data.get('local_id'),
                                'original_survey_id': str(survey_id),
                                'cleaned_survey_id': survey_id_str,
                                'error': error_msg
                            },
                            'timestamp': int(__import__('time').time() * 1000),
                            'sessionId': 'debug-session',
                            'runId': 'run1',
                            'hypothesisId': 'N'
                        }
                        with open('/app/debug.log', 'a') as f:
                            f.write(json.dumps(log_entry) + '\n')
                    except Exception as log_err:
                        logger.warning(f"Could not write to debug log: {log_err}")
                    
                    errors.append({
                        'index': idx,
                        'local_id': response_data.get('local_id'),
                        'error': error_msg
                    })
                    continue
                
                # Log cuando se encuentra la encuesta exitosamente
                try:
                    import json
                    log_entry = {
                        'location': 'views.py:665',
                        'message': 'Survey found successfully',
                        'data': {
                            'index': idx,
                            'local_id': response_data.get('local_id'),
                            'original_survey_id': str(survey_id),
                            'cleaned_survey_id': survey_id_str,
                            'found_survey_id': str(survey.get('_id', 'N/A')),
                            'survey_title': survey.get('title', 'N/A')
                        },
                        'timestamp': int(__import__('time').time() * 1000),
                        'sessionId': 'debug-session',
                        'runId': 'run1',
                        'hypothesisId': 'P'
                    }
                    with open('/app/debug.log', 'a') as f:
                        f.write(json.dumps(log_entry) + '\n')
                except Exception as log_err:
                    logger.warning(f"Could not write survey found log: {log_err}")
                
                # Usar surveyor_id del request o del usuario autenticado
                surveyor_id = response_data.get('surveyor_id')
                if not surveyor_id and request.user and request.user.is_authenticated:
                    surveyor_id = request.user.id
                
                # Asegurar que survey_id sea ObjectId para guardar en MongoDB
                survey_id_to_save = survey['_id'] if '_id' in survey else ObjectId(str(survey_id))
                
                # Insertar respuesta
                from datetime import datetime
                # Usar created_at del request si está disponible, sino usar la fecha actual
                created_at = response_data.get('created_at')
                if created_at:
                    try:
                        # Si viene como string ISO, parsearlo
                        if isinstance(created_at, str):
                            created_at = datetime.fromisoformat(created_at.replace('Z', '+00:00'))
                        elif isinstance(created_at, datetime):
                            pass  # Ya es datetime
                        else:
                            created_at = datetime.utcnow()
                    except:
                        created_at = datetime.utcnow()
                else:
                    created_at = datetime.utcnow()
                
                result = responses_collection.insert_one({
                    'survey': survey_id_to_save,
                    'surveyor_id': surveyor_id,
                    'device_id': response_data.get('device_id'),
                    'answers': response_data['answers'],
                    'synced': True,  # Marcado como sincronizado al llegar al servidor
                    'created_at': created_at  # Agregar fecha de creación
                })
                
                new_response = responses_collection.find_one({'_id': result.inserted_id})
                new_response['id'] = str(new_response['_id'])
                
                # Log cuando se inserta exitosamente
                try:
                    import json
                    log_entry = {
                        'location': 'views.py:695',
                        'message': 'Response inserted successfully',
                        'data': {
                            'index': idx,
                            'local_id': response_data.get('local_id'),
                            'server_id': str(new_response['_id']),
                            'survey_id': str(survey_id_to_save)
                        },
                        'timestamp': int(__import__('time').time() * 1000),
                        'sessionId': 'debug-session',
                        'runId': 'run1',
                        'hypothesisId': 'Q'
                    }
                    with open('/app/debug.log', 'a') as f:
                        f.write(json.dumps(log_entry) + '\n')
                except Exception as log_err:
                    logger.warning(f"Could not write success log: {log_err}")
                
                results.append({
                    'index': idx,
                    'local_id': response_data.get('local_id'),
                    'server_id': str(new_response['_id']),
                    'status': 'success'
                })
            except Exception as e:
                import traceback
                error_trace = traceback.format_exc()
                logger.error(f"Exception processing response {idx} (local_id: {response_data.get('local_id')}): {e}")
                logger.error(f"Traceback: {error_trace}")
                # Escribir a archivo de log también
                try:
                    import json
                    log_entry = {
                        'location': 'views.py:644',
                        'message': 'Exception during sync processing',
                        'data': {
                            'index': idx,
                            'local_id': response_data.get('local_id'),
                            'survey_id': response_data.get('survey'),
                            'error': str(e),
                            'traceback': error_trace
                        },
                        'timestamp': int(__import__('time').time() * 1000),
                        'sessionId': 'debug-session',
                        'runId': 'run1',
                        'hypothesisId': 'L'
                    }
                    with open('/app/debug.log', 'a') as f:
                        f.write(json.dumps(log_entry) + '\n')
                except Exception as log_err:
                    logger.warning(f"Could not write to debug log: {log_err}")
                
                errors.append({
                    'index': idx,
                    'local_id': response_data.get('local_id'),
                    'error': str(e)
                })
        
        # Log final antes de retornar
        logger.info(f"Sync completed: {len(results)} success, {len(errors)} errors")
        if errors:
            logger.error(f"Errors details: {errors}")
        
        # Escribir resultado final a archivo de log
        try:
            import json
            log_entry = {
                'location': 'views.py:680',
                'message': 'Sync request completed',
                'data': {
                    'success_count': len(results),
                    'error_count': len(errors),
                    'results': results,
                    'errors': errors
                },
                'timestamp': int(__import__('time').time() * 1000),
                'sessionId': 'debug-session',
                'runId': 'run1',
                'hypothesisId': 'M'
            }
            with open('/home/vps/Documentos/survey-app/.cursor/debug.log', 'a') as f:
                f.write(json.dumps(log_entry) + '\n')
        except Exception as log_err:
            logger.warning(f"Could not write final result to debug log: {log_err}")
        
        return Response({
            'success_count': len(results),
            'error_count': len(errors),
            'results': results,
            'errors': errors
        }, status=status.HTTP_200_OK)

class SyncStatusView(APIView):
    """
    Vista para verificar el estado de sincronización de respuestas.
    - POST: Recibe lista de IDs locales y devuelve su estado de sincronización.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = SyncStatusRequestSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        responses_collection = get_responses_collection()
        status_results = []
        
        # Si se proporcionan items con más información, usarlos
        if 'items' in serializer.validated_data and serializer.validated_data['items']:
            items = serializer.validated_data['items']
            for item in items:
                local_id = item['local_id']
                survey_id = item['survey']
                device_id = item.get('device_id')
                
                # Buscar respuesta sincronizada que coincida
                query = {'survey': survey_id}
                if device_id:
                    query['device_id'] = device_id
                
                # Buscar por device_id y survey para encontrar respuestas similares
                synced_response = responses_collection.find_one(query)
                
                status_results.append({
                    'local_id': local_id,
                    'synced': synced_response is not None,
                    'server_id': str(synced_response['_id']) if synced_response else None
                })
        # Si solo se proporcionan local_ids, buscar por device_id del usuario
        elif 'local_ids' in serializer.validated_data:
            local_ids = serializer.validated_data['local_ids']
            # Sin más información, no podemos verificar exactamente
            # Devolver todos como no sincronizados (el cliente deberá usar items con más info)
            for local_id in local_ids:
                status_results.append({
                    'local_id': local_id,
                    'synced': False,
                    'server_id': None
                })
        
        return Response({
            'statuses': status_results
        }, status=status.HTTP_200_OK)

class ResponseRetrieve(APIView):
    """
    Recupera una respuesta específica por ID.
    - GET: Recupera una respuesta por ID.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self, pk):
        responses_collection = get_responses_collection()
        try:
            response = responses_collection.find_one({"_id": ObjectId(pk)})
            if not response:
                raise NotFound(detail="Respuesta no encontrada.")
            response['id'] = str(response['_id'])
            return response
        except Exception:
            raise NotFound(detail="Respuesta no encontrada o ID inválido.")

    def get(self, request, pk):
        response = self.get_object(pk)
        serializer = ResponseSerializer(response)
        return Response(serializer.data)

# Vistas de usuario
class CurrentUserView(APIView):
    """
    Recupera los detalles del usuario actualmente autenticado.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        # #region agent log
        import json
        import time
        log_file_path = '/app/debug.log'
        try:
            log_data = {
                "timestamp": int(time.time() * 1000),
                "location": "views.py:CurrentUserView.get",
                "message": "CurrentUserView.get called",
                "data": {
                    "user_type": type(request.user).__name__ if request.user else "None",
                    "user_authenticated": request.user.is_authenticated if request.user else False,
                    "has_user": request.user is not None,
                    "hypothesisId": "A"
                },
                "sessionId": "debug-session",
                "runId": "run1"
            }
            with open(log_file_path, 'a') as f:
                f.write(json.dumps(log_data) + '\n')
        except Exception:
            pass
        # #endregion
        
        try:
            # #region agent log
            try:
                user_attrs = {}
                if request.user:
                    user_attrs = {
                        "has_username": hasattr(request.user, 'username'),
                        "has_role": hasattr(request.user, 'role'),
                        "has_user_group_id": hasattr(request.user, 'user_group_id'),
                        "has_user_doc": hasattr(request.user, '_user_doc'),
                        "username": getattr(request.user, 'username', None),
                        "role": getattr(request.user, 'role', None),
                        "user_group_id": getattr(request.user, 'user_group_id', None),
                    }
                log_data = {
                    "timestamp": int(time.time() * 1000),
                    "location": "views.py:CurrentUserView.get:before_serialize",
                    "message": "Before serializing user",
                    "data": {"user_attrs": user_attrs, "hypothesisId": "B"},
                    "sessionId": "debug-session",
                    "runId": "run1"
                }
                with open(log_file_path, 'a') as f:
                    f.write(json.dumps(log_data) + '\n')
            except Exception:
                pass
            # #endregion
            
            serializer = UserSerializer(request.user)
            
            # #region agent log
            try:
                log_data = {
                    "timestamp": int(time.time() * 1000),
                    "location": "views.py:CurrentUserView.get:after_serialize",
                    "message": "After serializing user",
                    "data": {"serializer_data_keys": list(serializer.data.keys()) if hasattr(serializer, 'data') else None, "hypothesisId": "C"},
                    "sessionId": "debug-session",
                    "runId": "run1"
                }
                with open(log_file_path, 'a') as f:
                    f.write(json.dumps(log_data) + '\n')
            except Exception:
                pass
            # #endregion
            
            return Response(serializer.data)
        except Exception as e:
            # #region agent log
            import logging
            import traceback
            logger = logging.getLogger(__name__)
            logger.error(f"Error in CurrentUserView: {type(e).__name__}: {str(e)}", exc_info=True)
            try:
                log_data = {
                    "timestamp": int(time.time() * 1000),
                    "location": "views.py:CurrentUserView.get:error",
                    "message": "Error in CurrentUserView",
                    "data": {
                        "error_type": type(e).__name__,
                        "error_message": str(e),
                        "traceback": ''.join(traceback.format_exception(type(e), e, e.__traceback__)),
                        "hypothesisId": "D"
                    },
                    "sessionId": "debug-session",
                    "runId": "run1"
                }
                with open(log_file_path, 'a') as f:
                    f.write(json.dumps(log_data) + '\n')
            except Exception:
                pass
            # #endregion
            return Response(
                {"detail": f"Error al obtener información del usuario: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

class UserListCreate(APIView):
    """
    Lista todos los usuarios o crea un nuevo usuario.
    - GET: Solo disponible para usuarios 'root'.
    - POST: Disponible para 'root' y 'group_admin'. Los group_admin solo pueden crear usuarios en su grupo.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        # Verificar que el usuario es 'root'
        try:
            user_role = getattr(request.user, 'role', None) if request.user and request.user.is_authenticated else None
            if user_role != 'root':
                return Response(
                    {"detail": "No tienes permisos para ver usuarios."},
                    status=status.HTTP_403_FORBIDDEN
                )
        except (AttributeError, TypeError):
            return Response(
                {"detail": "Error al verificar permisos."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

        users = list_users_from_mongo(order_by='-date_joined')
        serializer = UserSerializer(users, many=True)
        return Response(serializer.data)

    def post(self, request):
        # Verificar que el usuario es 'root' o 'group_admin'
        try:
            user_role = getattr(request.user, 'role', None) if request.user and request.user.is_authenticated else None
            if user_role not in ('root', 'group_admin'):
                return Response(
                    {"detail": "No tienes permisos para crear usuarios."},
                    status=status.HTTP_403_FORBIDDEN
                )
        except (AttributeError, TypeError):
            return Response(
                {"detail": "Error al verificar permisos."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

        # Para group_admin, forzar que el usuario se asigne a su grupo
        user_group_id = getattr(request.user, 'user_group_id', None)
        
        if user_role == 'group_admin':
            # Forzar asignación al grupo del administrador
            if not user_group_id:
                return Response(
                    {"detail": "No tienes un grupo asignado. No puedes crear usuarios."},
                    status=status.HTTP_403_FORBIDDEN
                )
            # Asegurar que el user_group_id se asigne automáticamente
            request_data = request.data.copy()
            request_data['user_group_id'] = str(user_group_id)
            
            # Prevenir que group_admin cree usuarios con roles privilegiados
            if request_data.get('role') in ('root', 'group_admin'):
                return Response(
                    {"role": "No tienes permisos para crear usuarios con este rol."},
                    status=status.HTTP_403_FORBIDDEN
                )
        else:
            request_data = request.data

        serializer = UserCreateSerializer(data=request_data)
        
        if serializer.is_valid():
            validated_data = serializer.validated_data.copy()
            password = validated_data.pop('password')
            validated_data.pop('password_confirm', None)
            
            # Crear usuario con created_by
            user = create_user_in_mongo(
                username=validated_data['username'],
                password=password,
                email=validated_data.get('email', ''),
                first_name=validated_data.get('first_name', ''),
                last_name=validated_data.get('last_name', ''),
                role=validated_data.get('role', 'encuestador'),
                user_group_id=validated_data.get('user_group_id'),
                is_active=validated_data.get('is_active', True),
                is_staff=(validated_data.get('role') == 'root'),
                is_superuser=(validated_data.get('role') == 'root'),
                created_by=str(request.user.id)
            )
            return Response(UserSerializer(user).data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class UserRetrieveUpdateDestroy(APIView):
    """
    Recupera, actualiza o elimina un usuario específico.
    Solo disponible para usuarios 'root'.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self, pk):
        user = get_user_by_id(pk)
        if not user:
            raise NotFound(detail="Usuario no encontrado.")
        return user

    def get(self, request, pk):
        # Verificar que el usuario es 'root'
        try:
            user_role = getattr(request.user, 'role', None) if request.user and request.user.is_authenticated else None
            if user_role != 'root':
                return Response(
                    {"detail": "No tienes permisos para ver usuarios."},
                    status=status.HTTP_403_FORBIDDEN
                )
        except (AttributeError, TypeError):
            return Response(
                {"detail": "Error al verificar permisos."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

        user = self.get_object(pk)
        serializer = UserSerializer(user)
        return Response(serializer.data)

    def put(self, request, pk):
        # Verificar que el usuario es 'root'
        try:
            user_role = getattr(request.user, 'role', None) if request.user and request.user.is_authenticated else None
            if user_role != 'root':
                return Response(
                    {"detail": "No tienes permisos para actualizar usuarios."},
                    status=status.HTTP_403_FORBIDDEN
                )
        except (AttributeError, TypeError):
            return Response(
                {"detail": "Error al verificar permisos."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

        user = self.get_object(pk)
        serializer = UserUpdateSerializer(user, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(UserSerializer(user).data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, pk):
        # Verificar que el usuario es 'root'
        try:
            user_role = getattr(request.user, 'role', None) if request.user and request.user.is_authenticated else None
            if user_role != 'root':
                return Response(
                    {"detail": "No tienes permisos para eliminar usuarios."},
                    status=status.HTTP_403_FORBIDDEN
                )
        except (AttributeError, TypeError):
            return Response(
                {"detail": "Error al verificar permisos."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

        user = self.get_object(pk)
        
        # No permitir que un usuario se elimine a sí mismo
        user_id = user.get('id') if isinstance(user, dict) else user.id
        if user_id == str(request.user.id):
            return Response(
                {"detail": "No puedes eliminar tu propio usuario."},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if delete_user_from_mongo(pk):
            return Response(status=status.HTTP_204_NO_CONTENT)
        return Response(
            {"detail": "Error al eliminar el usuario."},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

class SyncStatusView(APIView):
    """
    Vista para verificar el estado de sincronización de respuestas.
    Recibe una lista de IDs locales y devuelve cuáles ya están sincronizadas.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = SyncStatusRequestSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        responses_collection = get_responses_collection()
        results = []
        
        # Soporta dos formatos: lista de local_ids o lista de items con más información
        if 'local_ids' in serializer.validated_data and serializer.validated_data['local_ids']:
            # Formato simple: solo lista de IDs locales
            # En este caso, necesitamos otra forma de identificar las respuestas
            # Como no tenemos una relación directa, retornamos que todas están sin sincronizar
            # O mejor, usamos device_id + survey para buscar
            for local_id in serializer.validated_data['local_ids']:
                results.append({
                    'local_id': local_id,
                    'synced': False,
                    'server_id': None
                })
        elif 'items' in serializer.validated_data and serializer.validated_data['items']:
            # Formato completo: items con local_id, survey, device_id
            for item in serializer.validated_data['items']:
                local_id = item['local_id']
                survey_id = item['survey']
                device_id = item.get('device_id')
                
                # Buscar respuesta existente
                query = {
                    'survey': survey_id,
                    'device_id': device_id
                }
                
                # Si hay usuario autenticado, también buscar por surveyor_id
                if request.user and request.user.is_authenticated:
                    query['surveyor_id'] = request.user.id
                
                # Buscar respuestas que coincidan (podría haber múltiples)
                matching_responses = list(responses_collection.find(query))
                
                if matching_responses:
                    # Si encontramos al menos una, considerar sincronizada
                    # Por simplicidad, tomamos la primera
                    first_response = matching_responses[0]
                    results.append({
                        'local_id': local_id,
                        'synced': True,
                        'server_id': str(first_response['_id'])
                    })
                else:
                    results.append({
                        'local_id': local_id,
                        'synced': False,
                        'server_id': None
                    })
        
        return Response({'results': results}, status=status.HTTP_200_OK)

class ChecklistMonthlySummaryView(APIView):
    """
    Vista para obtener el resumen mensual de cumplimiento de un checklist.
    GET: /api/checklists/{survey_id}/monthly-summary/?year=2025&month=12
    Retorna tabla con áreas, preguntas, días del mes, y promedios.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, survey_id):
        from calendar import monthrange
        from collections import defaultdict
        
        # Obtener parámetros de año y mes
        year = int(request.query_params.get('year', datetime.now().year))
        month = int(request.query_params.get('month', datetime.now().month))
        
        # Validar que el survey existe y es un checklist
        surveys_collection = get_surveys_collection()
        survey = None
        try:
            survey = surveys_collection.find_one({"_id": ObjectId(survey_id)})
        except Exception:
            survey = surveys_collection.find_one({"_id": survey_id})
        
        if not survey:
            raise NotFound(detail="Checklist no encontrado.")
        
        if survey.get('survey_type') != 'checklist':
            return Response(
                {"detail": "Esta encuesta no es un checklist."},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Verificar permisos: solo usuarios del grupo pueden ver el resumen
        user_role = getattr(request.user, 'role', None)
        survey_user_group_id = survey.get('user_group_id')
        
        if user_role in ('group_admin', 'encuestador', 'analista'):
            user_group_id = getattr(request.user, 'user_group_id', None)
            if not user_group_id or str(user_group_id) != str(survey_user_group_id):
                return Response(
                    {"detail": "No tienes permisos para ver este resumen."},
                    status=status.HTTP_403_FORBIDDEN
                )
        
        # Obtener todas las respuestas del checklist para el mes especificado
        responses_collection = get_responses_collection()
        
        # Construir rango de fechas para el mes
        first_day = f"{year}-{month:02d}-01"
        last_day_num = monthrange(year, month)[1]
        last_day = f"{year}-{month:02d}-{last_day_num:02d}"
        
        # Buscar respuestas del checklist en el rango de fechas
        query = {
            'survey': ObjectId(survey_id) if isinstance(survey_id, str) else survey_id,
            'check_date': {
                '$gte': first_day,
                '$lte': last_day
            }
        }
        
        responses = list(responses_collection.find(query))
        
        # Obtener el título del checklist como "área"
        area_name = survey.get('title', 'Sin título')
        questions = survey.get('questions', [])
        
        # Estructura de datos: {question_id: {day: {check_number: status}}}
        question_data = defaultdict(lambda: defaultdict(dict))
        
        # Procesar respuestas
        for response in responses:
            check_date = response.get('check_date', '')
            check_number = response.get('check_number')
            answers = response.get('answers', {})
            is_locked = response.get('is_locked', False)
            
            # Solo procesar respuestas bloqueadas (completadas)
            if not is_locked:
                continue
            
            # Extraer día del mes
            try:
                day = int(check_date.split('-')[2])
            except (IndexError, ValueError):
                continue
            
            # Procesar cada pregunta
            for question in questions:
                question_id = question.get('id', '')
                if not question_id:
                    continue
                
                answer = answers.get(question_id, answers.get(str(question_id)))
                
                # Determinar status: "C" (Cumple) o "NC" (No Cumple)
                # Para checklists, las respuestas son binarias
                if isinstance(answer, list):
                    answer = answer[0] if answer else None
                
                if answer == "Cumple" or answer == "C":
                    status = "C"
                elif answer == "No cumple" or answer == "NC":
                    status = "NC"
                else:
                    status = None
                
                if status:
                    # Guardar status por check_number
                    if check_number not in question_data[question_id][day]:
                        question_data[question_id][day][check_number] = status
                    else:
                        # Si hay múltiples chequeos, combinar: "C/C", "C/NC", "NC/NC"
                        existing_status = question_data[question_id][day][check_number]
                        if existing_status != status:
                            question_data[question_id][day][check_number] = f"{existing_status}/{status}"
                        else:
                            question_data[question_id][day][check_number] = f"{status}/{status}"
        
        # Construir respuesta estructurada
        result = {
            'survey_id': str(survey_id),
            'survey_title': area_name,
            'year': year,
            'month': month,
            'month_name': datetime(year, month, 1).strftime('%B'),
            'areas': []
        }
        
        # Agrupar por área (en este caso, solo una área por checklist)
        area_data = {
            'name': area_name,
            'questions': [],
            'average': 0.0
        }
        
        total_compliance = 0
        total_checks = 0
        
        for question in questions:
            question_id = question.get('id', '')
            question_text = question.get('text', question.get('question_text', ''))
            
            question_data_days = question_data.get(question_id, {})
            
            # Construir array de días
            days_data = []
            question_compliance = 0
            question_checks = 0
            
            for day in range(1, last_day_num + 1):
                day_data = {
                    'day': day,
                    'status': '-',
                    'check_numbers': []
                }
                
                if day in question_data_days:
                    # Hay datos para este día
                    check_statuses = question_data_days[day]
                    
                    # Combinar todos los chequeos del día
                    statuses = []
                    for check_num, status in sorted(check_statuses.items()):
                        statuses.append(status)
                        day_data['check_numbers'].append({
                            'check_number': check_num,
                            'status': status
                        })
                    
                    # Determinar status combinado
                    if len(statuses) == 1:
                        day_data['status'] = statuses[0]
                    elif len(statuses) == 2:
                        # Combinar: "C/C", "C/NC", "NC/NC"
                        if statuses[0] == statuses[1]:
                            day_data['status'] = f"{statuses[0]}/{statuses[1]}"
                        else:
                            day_data['status'] = f"{statuses[0]}/{statuses[1]}"
                    else:
                        # Múltiples chequeos, usar el más común o combinar
                        c_count = statuses.count('C')
                        nc_count = statuses.count('NC')
                        if c_count > nc_count:
                            day_data['status'] = 'C'
                        elif nc_count > c_count:
                            day_data['status'] = 'NC'
                        else:
                            day_data['status'] = 'C/NC'
                    
                    # Calcular cumplimiento para este día
                    if day_data['status'] == 'C' or day_data['status'] == 'C/C':
                        question_compliance += 1
                    elif day_data['status'] == 'C/NC':
                        question_compliance += 0.5
                    question_checks += 1
                
                days_data.append(day_data)
            
            # Calcular promedio de la pregunta
            question_average = (question_compliance / question_checks * 100) if question_checks > 0 else 0.0
            
            area_data['questions'].append({
                'text': question_text,
                'days': days_data,
                'average': round(question_average, 1)
            })
            
            total_compliance += question_compliance
            total_checks += question_checks
        
        # Calcular promedio del área
        area_average = (total_compliance / total_checks * 100) if total_checks > 0 else 0.0
        area_data['average'] = round(area_average, 1)
        
        result['areas'].append(area_data)
        
        return Response(result, status=status.HTTP_200_OK)


class UserChecklistsView(APIView):
    """
    Vista para verificar si el usuario tiene checklists asignadas.
    Retorna un booleano indicando si el usuario tiene checklists asignadas.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        try:
            surveys_collection = get_surveys_collection()
            user_role = getattr(request.user, 'role', None)
            
            query = {'survey_type': 'checklist'}
            
            # Filtrar por grupo de usuarios según rol
            if user_role == 'root':
                # Root puede ver todas las checklists, pero para este endpoint
                # verificamos si tiene alguna asignada a su grupo si tiene user_group_id
                user_group_id = getattr(request.user, 'user_group_id', None)
                if user_group_id:
                    query['user_group_id'] = str(user_group_id)
            elif user_role in ('group_admin', 'encuestador', 'analista'):
                # Usuarios regulares solo ven checklists de su grupo
                user_group_id = getattr(request.user, 'user_group_id', None)
                if user_group_id:
                    query['user_group_id'] = str(user_group_id)
                else:
                    # Si no tiene grupo asignado, no tiene checklists
                    return Response({'has_checklists': False}, status=status.HTTP_200_OK)
            
            # Excluir eliminadas
            deleted_condition = {
                '$or': [
                    {'is_deleted': {'$ne': True}},
                    {'is_deleted': {'$exists': False}}
                ]
            }
            if query:
                final_query = {'$and': [query, deleted_condition]}
            else:
                final_query = deleted_condition
            
            count = surveys_collection.count_documents(final_query)
            has_checklists = count > 0
            
            return Response({
                'has_checklists': has_checklists,
                'count': count
            }, status=status.HTTP_200_OK)
        except Exception as e:
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Error in UserChecklistsView.get: {type(e).__name__}: {str(e)}", exc_info=True)
            return Response(
                {"detail": f"Error al verificar checklists: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
