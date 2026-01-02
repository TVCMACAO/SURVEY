from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from rest_framework.exceptions import NotFound, ValidationError
from rest_framework_simplejwt.views import TokenObtainPairView

from bson import ObjectId
from datetime import datetime
from django.shortcuts import get_object_or_404
from django.contrib.auth import get_user_model

from .mongo_utils import get_surveys_collection, get_responses_collection, get_survey_groups_collection
from .serializers import (
    SurveyGroupSerializer, SurveySerializer, ResponseSerializer,
    CustomTokenObtainPairSerializer, UserSerializer, UserCreateSerializer, UserUpdateSerializer,
    BatchResponseSerializer, BatchResponseItemSerializer,
    SyncStatusRequestSerializer, SyncStatusResponseSerializer
)

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
            from surveys.models import User
            db_path = str(settings.DATABASES['default']['NAME'])
            user_exists = User.objects.filter(username=username).exists() if username else False
            total_users = User.objects.count()
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

# Vistas para Encuestas
class SurveyListCreate(APIView):
    """
    Gestiona la creación y listado de encuestas.
    - POST: Crea una nueva encuesta.
    - GET: Lista todas las encuestas o encuestas filtradas por group_id.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        surveys_collection = get_surveys_collection()
        group_id = request.query_params.get('group_id')
        show_deleted = request.query_params.get('show_deleted', 'false').lower() == 'true'
        
        query = {}
        if group_id:
            try:
                # Try ObjectId first, if it fails, use as string
                query['group'] = ObjectId(group_id)
            except Exception:
                query['group'] = group_id

        # Solo usuarios root pueden ver eliminadas, y solo si lo solicitan explícitamente
        user_role = None
        if request.user and hasattr(request.user, 'is_authenticated') and request.user.is_authenticated:
            try:
                user_role = getattr(request.user, 'role', None)
            except (AttributeError, TypeError):
                user_role = None
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
        log_file_path = '/home/vps/Documentos/survey-app/.cursor/debug.log'
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

    def post(self, request):
        serializer = SurveySerializer(data=request.data)
        if serializer.is_valid():
            surveys_collection = get_surveys_collection()
            validated_data = serializer.validated_data
            
            # Validar que el group_id existe
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

            result = surveys_collection.insert_one({
                'title': validated_data['title'],
                'description': validated_data.get('description', ''),
                'group': validated_data['group'],
                'questions': validated_data['questions'],
                'is_public': validated_data.get('is_public', False),
                'is_deleted': False  # Por defecto no está eliminada
            })
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
        serializer = SurveySerializer(survey, data=request.data, partial=True)
        if serializer.is_valid():
            surveys_collection = get_surveys_collection()
            validated_data = serializer.validated_data
            
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
                with open('/home/vps/Documentos/survey-app/.cursor/debug.log', 'a') as f:
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
                    with open('/home/vps/Documentos/survey-app/.cursor/debug.log', 'a') as f:
                        f.write(json.dumps(log_data) + '\n')
                except: pass
            except Exception as e:
                log_data = {"location": "views.py:336", "message": "ObjectId search exception", "data": {"error": str(e)}, "timestamp": int(__import__('time').time() * 1000), "sessionId": "debug-session", "runId": "run1", "hypothesisId": "F"}
                try:
                    with open('/home/vps/Documentos/survey-app/.cursor/debug.log', 'a') as f:
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
                    with open('/home/vps/Documentos/survey-app/.cursor/debug.log', 'a') as f:
                        f.write(json.dumps(log_data) + '\n')
                except: pass
                raise NotFound(detail="Encuesta no encontrada.")
            
            # Check if survey is public
            is_public = survey.get('is_public', False)
            log_data = {"location": "views.py:350", "message": "Survey found, checking is_public", "data": {"is_public": is_public, "survey_id": str(survey.get('_id', 'N/A'))}, "timestamp": int(__import__('time').time() * 1000), "sessionId": "debug-session", "runId": "run1", "hypothesisId": "F"}
            try:
                with open('/home/vps/Documentos/survey-app/.cursor/debug.log', 'a') as f:
                    f.write(json.dumps(log_data) + '\n')
            except: pass
            if not is_public:
                log_data = {"location": "views.py:381", "message": "Survey is not public, raising ValidationError", "data": {"survey_id": str(survey.get('_id', 'N/A'))}, "timestamp": int(__import__('time').time() * 1000), "sessionId": "debug-session", "runId": "run1", "hypothesisId": "F"}
                try:
                    with open('/home/vps/Documentos/survey-app/.cursor/debug.log', 'a') as f:
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
                with open('/home/vps/Documentos/survey-app/.cursor/debug.log', 'a') as f:
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
        survey_id = request.query_params.get('survey_id')
        query = {}
        if survey_id:
            try:
                query['survey'] = ObjectId(survey_id)
            except Exception:
                raise ValidationError(detail="ID de encuesta inválido.")

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
            if not surveys_collection.find_one({"_id": validated_data['survey']}):
                raise ValidationError(detail="La encuesta especificada no existe.")
            
            # Asegurarse de que el usuario autenticado es el surveyor (si está autenticado)
            if request.user and request.user.is_authenticated:
                validated_data['surveyor_id'] = request.user.id
            elif 'surveyor_id' not in validated_data:
                validated_data['surveyor_id'] = None

            result = responses_collection.insert_one({
                'survey': validated_data['survey'],
                'surveyor_id': validated_data['surveyor_id'],
                'device_id': validated_data.get('device_id'),
                'answers': validated_data['answers'],
                'synced': validated_data.get('synced', True),  # All responses are synced by default since they're saved directly to server
                'created_at': datetime.utcnow()  # Agregar fecha de creación
            })
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
        log_file_path = '/home/vps/Documentos/survey-app/.cursor/debug.log'
        
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
        log_file_path = '/home/vps/Documentos/survey-app/.cursor/debug.log'
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
                        with open('/home/vps/Documentos/survey-app/.cursor/debug.log', 'a') as f:
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
                    with open('/home/vps/Documentos/survey-app/.cursor/debug.log', 'a') as f:
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
                    with open('/home/vps/Documentos/survey-app/.cursor/debug.log', 'a') as f:
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
                    with open('/home/vps/Documentos/survey-app/.cursor/debug.log', 'a') as f:
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
        serializer = UserSerializer(request.user)
        return Response(serializer.data)

class UserListCreate(APIView):
    """
    Lista todos los usuarios o crea un nuevo usuario.
    Solo disponible para usuarios 'root'.
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

        users = User.objects.all().order_by('-date_joined')
        serializer = UserSerializer(users, many=True)
        return Response(serializer.data)

    def post(self, request):
        # Verificar que el usuario es 'root'
        try:
            user_role = getattr(request.user, 'role', None) if request.user and request.user.is_authenticated else None
            if user_role != 'root':
                return Response(
                    {"detail": "No tienes permisos para crear usuarios."},
                    status=status.HTTP_403_FORBIDDEN
                )
        except (AttributeError, TypeError):
            return Response(
                {"detail": "Error al verificar permisos."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

        serializer = UserCreateSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            return Response(UserSerializer(user).data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class UserRetrieveUpdateDestroy(APIView):
    """
    Recupera, actualiza o elimina un usuario específico.
    Solo disponible para usuarios 'root'.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self, pk):
        try:
            return User.objects.get(pk=pk)
        except User.DoesNotExist:
            raise NotFound(detail="Usuario no encontrado.")

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
        if user.id == request.user.id:
            return Response(
                {"detail": "No puedes eliminar tu propio usuario."},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        user.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

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
