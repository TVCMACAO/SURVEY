from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from rest_framework.exceptions import NotFound, ValidationError
from rest_framework_simplejwt.views import TokenObtainPairView

from bson import ObjectId
from datetime import datetime
from django.shortcuts import get_object_or_404
from django.contrib.auth import get_user_model

from .mongo_utils import get_surveys_collection, get_responses_collection, get_survey_groups_collection, get_mongo_collection
from .serializers import (
    SurveyGroupSerializer, SurveySerializer, ResponseSerializer,
    CustomTokenObtainPairSerializer, UserSerializer, UserCreateSerializer, UserUpdateSerializer,
    BatchResponseSerializer, BatchResponseItemSerializer,
    SyncStatusRequestSerializer, SyncStatusResponseSerializer
)

User = get_user_model()


# ============================================================================
# Funciones helper para eliminar redundancias
# ============================================================================

def get_user_role_and_group(request):
    """
    Obtiene el role y user_group_id del usuario autenticado.
    Retorna (user_role, user_group_id) o (None, None) si no está autenticado.
    """
    if request.user and hasattr(request.user, 'is_authenticated') and request.user.is_authenticated:
        try:
            user_role = getattr(request.user, 'role', None)
            user_group_id = getattr(request.user, 'user_group_id', None)
            return user_role, user_group_id
        except (AttributeError, TypeError):
            return None, None
    return None, None


def require_admin_permission(request, action_description="realizar esta acción"):
    """
    Verifica que el usuario tenga permisos de 'root' o 'group_admin'.
    Retorna Response con error 403 si no tiene permisos, None si tiene permisos.
    """
    user_role, _ = get_user_role_and_group(request)
    
    if user_role not in ['root', 'group_admin']:
        return Response(
            {"detail": f"No tienes permisos para {action_description}."},
            status=status.HTTP_403_FORBIDDEN
        )
    return None


def check_group_admin_access(user_role, user_group_id, resource_group_id, error_message="No tienes permisos para acceder a este recurso."):
    """
    Verifica que un group_admin solo pueda acceder a recursos de su grupo.
    Compara resource_group_id con user_group_id de forma segura.
    Retorna Response con error 403 si no tiene acceso, None si tiene acceso.
    """
    if user_role == 'group_admin' and user_group_id:
        try:
            # Intentar comparar como ObjectId primero
            if str(resource_group_id) != str(user_group_id) and str(resource_group_id) != str(ObjectId(user_group_id)):
                return Response(
                    {"detail": error_message},
                    status=status.HTTP_403_FORBIDDEN
                )
        except Exception:
            # Si falla la conversión, comparar como strings
            if str(resource_group_id) != str(user_group_id):
                return Response(
                    {"detail": error_message},
                    status=status.HTTP_403_FORBIDDEN
                )
    return None

# Vistas de autenticación
class CustomTokenObtainPairView(TokenObtainPairView):
    """
    Vista personalizada para obtener tokens JWT.
    Utiliza un serializador personalizado para incluir información adicional del usuario en el token.
    """
    serializer_class = CustomTokenObtainPairSerializer
    
    def post(self, request, *args, **kwargs):
        # #region agent log
        import json
        import traceback
        import os
        # Detectar la ruta correcta del log (desarrollo vs producción)
        base_paths = [
            '/home/vps/Documentos/survey-app/.cursor/debug.log',  # Desarrollo local
            '/app/.cursor/debug.log',  # Producción Docker
            os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), '.cursor', 'debug.log')  # Fallback
        ]
        log_file_path = None
        for path in base_paths:
            log_dir = os.path.dirname(path)
            if os.path.exists(log_dir) or os.path.exists(os.path.dirname(log_dir)):
                log_file_path = path
                # Crear directorio si no existe
                try:
                    os.makedirs(log_dir, exist_ok=True)
                except:
                    pass
                break
        if not log_file_path:
            log_file_path = '/tmp/survey_debug.log'  # Fallback final
        try:
            request_data = request.data if hasattr(request, 'data') else {}
            with open(log_file_path, 'a') as f:
                f.write(json.dumps({
                    "sessionId": "debug-session",
                    "runId": "run1",
                    "hypothesisId": "D",
                    "location": "views.py:30",
                    "message": "Token request received",
                    "data": {
                        "has_username": 'username' in request_data,
                        "has_password": 'password' in request_data,
                        "username_value": request_data.get('username', None),
                        "request_method": request.method,
                        "content_type": request.content_type if hasattr(request, 'content_type') else None
                    },
                    "timestamp": int(__import__('time').time() * 1000)
                }) + '\n')
        except Exception:
            pass
        # #endregion
        
        try:
            response = super().post(request, *args, **kwargs)
            # #region agent log
            try:
                with open(log_file_path, 'a') as f:
                    f.write(json.dumps({
                        "sessionId": "debug-session",
                        "runId": "run1",
                        "hypothesisId": "D",
                        "location": "views.py:23",
                        "message": "Token request successful",
                        "data": {
                            "status_code": response.status_code if response else None
                        },
                        "timestamp": int(__import__('time').time() * 1000)
                    }) + '\n')
            except Exception:
                pass
            # #endregion
            return response
        except Exception as e:
            # #region agent log
            import traceback
            import logging
            logger = logging.getLogger(__name__)
            
            error_info = {
                "error_type": type(e).__name__,
                "error_message": str(e),
                "error_args": str(e.args) if hasattr(e, 'args') else None,
                "traceback": traceback.format_exc()
            }
            
            # Log a stderr (visible en Gunicorn logs)
            logger.error(f"Token request failed: {error_info['error_type']} - {error_info['error_message']}")
            logger.error(f"Traceback: {error_info['traceback']}")
            
            try:
                with open(log_file_path, 'a') as f:
                    f.write(json.dumps({
                        "sessionId": "debug-session",
                        "runId": "run1",
                        "hypothesisId": "D",
                        "location": "views.py:73",
                        "message": "Token request failed",
                        "data": error_info,
                        "timestamp": int(__import__('time').time() * 1000)
                    }) + '\n')
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
        # #region agent log
        import json
        import traceback
        import os
        # Detectar la ruta correcta del log (desarrollo vs producción)
        base_paths = [
            '/home/vps/Documentos/survey-app/.cursor/debug.log',  # Desarrollo local
            '/app/.cursor/debug.log',  # Producción Docker
            os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), '.cursor', 'debug.log')  # Fallback
        ]
        log_file_path = None
        for path in base_paths:
            log_dir = os.path.dirname(path)
            if os.path.exists(log_dir) or os.path.exists(os.path.dirname(log_dir)):
                log_file_path = path
                # Crear directorio si no existe
                try:
                    os.makedirs(log_dir, exist_ok=True)
                except:
                    pass
                break
        if not log_file_path:
            log_file_path = '/tmp/survey_debug.log'  # Fallback final
        try:
            user_role = getattr(request.user, 'role', None) if request.user else None
            user_group_id = getattr(request.user, 'user_group_id', None) if request.user else None
            with open(log_file_path, 'a') as f:
                f.write(json.dumps({
                    "sessionId": "debug-session",
                    "runId": "run1",
                    "hypothesisId": "B",
                    "location": "views.py:SurveyGroupListCreate.get",
                    "message": "Entering SurveyGroupListCreate.get",
                    "data": {
                        "user_id": str(request.user.id) if request.user and hasattr(request.user, 'id') else 'N/A',
                        "user_role": user_role,
                        "user_group_id": str(user_group_id) if user_group_id else None
                    },
                    "timestamp": int(__import__('time').time() * 1000)
                }) + '\n')
        except Exception:
            pass
        # #endregion
        
        try:
            groups_collection = get_survey_groups_collection()
            groups = list(groups_collection.find())
            # #region agent log
            try:
                with open(log_file_path, 'a') as f:
                    f.write(json.dumps({
                        "sessionId": "debug-session",
                        "runId": "run1",
                        "hypothesisId": "B",
                        "location": "views.py:SurveyGroupListCreate.get",
                        "message": "Groups fetched from MongoDB",
                        "data": {"groups_count": len(groups)},
                        "timestamp": int(__import__('time').time() * 1000)
                    }) + '\n')
            except Exception:
                pass
            # #endregion
            
            for group in groups:
                group['id'] = str(group['_id']) # Convert ObjectId to string for serialization
            
            serializer = SurveyGroupSerializer(groups, many=True)
            # #region agent log
            try:
                with open(log_file_path, 'a') as f:
                    f.write(json.dumps({
                        "sessionId": "debug-session",
                        "runId": "run1",
                        "hypothesisId": "B",
                        "location": "views.py:SurveyGroupListCreate.get",
                        "message": "Serializer created",
                        "data": {"serializer_valid": serializer.is_valid() if hasattr(serializer, 'is_valid') else 'N/A', "groups_count": len(groups)},
                        "timestamp": int(__import__('time').time() * 1000)
                    }) + '\n')
            except Exception:
                pass
            # #endregion
            
            serialized_data = serializer.data
            # #region agent log
            try:
                with open(log_file_path, 'a') as f:
                    f.write(json.dumps({
                        "sessionId": "debug-session",
                        "runId": "run1",
                        "hypothesisId": "B",
                        "location": "views.py:SurveyGroupListCreate.get",
                        "message": "Returning serialized groups",
                        "data": {"serialized_groups_count": len(serialized_data)},
                        "timestamp": int(__import__('time').time() * 1000)
                    }) + '\n')
            except Exception:
                pass
            # #endregion
            return Response(serialized_data)
        except Exception as e:
            # #region agent log
            try:
                with open(log_file_path, 'a') as f:
                    f.write(json.dumps({
                        "sessionId": "debug-session",
                        "runId": "run1",
                        "hypothesisId": "B",
                        "location": "views.py:SurveyGroupListCreate.get",
                        "message": "Error in SurveyGroupListCreate.get",
                        "data": {
                            "error_message": str(e),
                            "error_type": type(e).__name__,
                            "traceback": traceback.format_exc()[:1000]
                        },
                        "timestamp": int(__import__('time').time() * 1000)
                    }) + '\n')
            except Exception:
                pass
            # #endregion
            raise

    def post(self, request):
        # #region agent log
        import json
        import traceback
        import os
        # Detectar la ruta correcta del log (desarrollo vs producción)
        base_paths = [
            '/home/vps/Documentos/survey-app/.cursor/debug.log',  # Desarrollo local
            '/app/.cursor/debug.log',  # Producción Docker
            os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), '.cursor', 'debug.log')  # Fallback
        ]
        log_file_path = None
        for path in base_paths:
            log_dir = os.path.dirname(path)
            if os.path.exists(log_dir) or os.path.exists(os.path.dirname(log_dir)):
                log_file_path = path
                # Crear directorio si no existe
                try:
                    os.makedirs(log_dir, exist_ok=True)
                except:
                    pass
                break
        if not log_file_path:
            log_file_path = '/tmp/survey_debug.log'  # Fallback final
        try:
            with open(log_file_path, 'a') as f:
                f.write(json.dumps({
                    "sessionId": "debug-session",
                    "runId": "run1",
                    "hypothesisId": "C",
                    "location": "views.py:SurveyGroupListCreate.post",
                    "message": "Entering SurveyGroupListCreate.post",
                    "data": {
                        "user_id": str(request.user.id) if request.user and hasattr(request.user, 'id') else 'N/A',
                        "user_role": getattr(request.user, 'role', None) if request.user else None,
                        "request_data": dict(request.data) if hasattr(request.data, '__dict__') else str(request.data)[:200]
                    },
                    "timestamp": int(__import__('time').time() * 1000)
                }) + '\n')
        except Exception:
            pass
        # #endregion
        
        serializer = SurveyGroupSerializer(data=request.data)
        if serializer.is_valid():
            # #region agent log
            try:
                with open(log_file_path, 'a') as f:
                    f.write(json.dumps({
                        "sessionId": "debug-session",
                        "runId": "run1",
                        "hypothesisId": "C",
                        "location": "views.py:SurveyGroupListCreate.post",
                        "message": "Serializer is valid",
                        "data": {"validated_data": dict(serializer.validated_data)},
                        "timestamp": int(__import__('time').time() * 1000)
                    }) + '\n')
            except Exception:
                pass
            # #endregion
            
            groups_collection = get_survey_groups_collection()
            # Asegurarse de que el usuario autenticado es el creador
            validated_data = serializer.validated_data
            validated_data['created_by'] = str(request.user.id) # Usar el ID del usuario autenticado como string
            
            result = groups_collection.insert_one({
                'name': validated_data['name'],
                'created_by': validated_data['created_by']
            })
            # Recuperar el objeto insertado para serializarlo con el ID correcto
            new_group = groups_collection.find_one({'_id': result.inserted_id})
            new_group['id'] = str(new_group['_id'])
            # #region agent log
            try:
                with open(log_file_path, 'a') as f:
                    f.write(json.dumps({
                        "sessionId": "debug-session",
                        "runId": "run1",
                        "hypothesisId": "C",
                        "location": "views.py:SurveyGroupListCreate.post",
                        "message": "Group created successfully",
                        "data": {"group_id": new_group['id'], "group_name": new_group.get('name')},
                        "timestamp": int(__import__('time').time() * 1000)
                    }) + '\n')
            except Exception:
                pass
            # #endregion
            return Response(SurveyGroupSerializer(new_group).data, status=status.HTTP_201_CREATED)
        
        # #region agent log
        try:
            with open(log_file_path, 'a') as f:
                f.write(json.dumps({
                    "sessionId": "debug-session",
                    "runId": "run1",
                    "hypothesisId": "C",
                    "location": "views.py:SurveyGroupListCreate.post",
                    "message": "Serializer validation failed",
                    "data": {"errors": dict(serializer.errors)},
                    "timestamp": int(__import__('time').time() * 1000)
                }) + '\n')
        except Exception:
            pass
        # #endregion
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
        # Verificar permisos: solo root puede editar grupos
        user_role, user_group_id = get_user_role_and_group(request)
        if user_role != 'root':
            return Response(
                {"detail": "Solo los usuarios con rol 'root' pueden editar grupos."},
                status=status.HTTP_403_FORBIDDEN
            )
        
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
        # Verificar permisos: solo root puede eliminar grupos
        user_role, user_group_id = get_user_role_and_group(request)
        if user_role != 'root':
            return Response(
                {"detail": "Solo los usuarios con rol 'root' pueden eliminar grupos."},
                status=status.HTTP_403_FORBIDDEN
            )
        
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

    def post(self, request):
        """
        Wrapper para capturar excepciones no manejadas y asegurar respuestas JSON válidas.
        """
        try:
            return self._post_impl(request)
        except Exception as e:
            import logging
            import traceback
            logger = logging.getLogger(__name__)
            logger.error("=" * 60)
            logger.error("UNHANDLED EXCEPTION in SurveyListCreate.post")
            logger.error(f"Error type: {type(e).__name__}")
            logger.error(f"Error message: {str(e)}")
            logger.error(f"Traceback: {traceback.format_exc()}")
            logger.error("=" * 60)
            
            # Devolver respuesta JSON válida
            try:
                return Response(
                    {
                        "detail": f"Error inesperado al crear la encuesta: {str(e)[:200]}",
                        "error_type": type(e).__name__
                    },
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
            except Exception as response_error:
                logger.error(f"Error creating error response: {response_error}")
                # Fallback absoluto
                return Response(
                    {"detail": "Error interno del servidor."},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
    
    def _post_impl(self, request):
        """
        Implementación real del método POST.
        """
        # #region agent log
        import json
        import traceback
        import os
        # Detectar la ruta correcta del log (desarrollo vs producción)
        base_paths = [
            '/home/vps/Documentos/survey-app/.cursor/debug.log',  # Desarrollo local
            '/app/.cursor/debug.log',  # Producción Docker
            os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), '.cursor', 'debug.log')  # Fallback
        ]
        log_file_path = None
        for path in base_paths:
            log_dir = os.path.dirname(path)
            if os.path.exists(log_dir) or os.path.exists(os.path.dirname(log_dir)):
                log_file_path = path
                # Crear directorio si no existe
                try:
                    os.makedirs(log_dir, exist_ok=True)
                except:
                    pass
                break
        if not log_file_path:
            log_file_path = '/tmp/survey_debug.log'  # Fallback final
        try:
            # Obtener información del usuario antes de validar
            user_role = None
            user_group_id = None
            user_id = None
            if request.user and hasattr(request.user, 'is_authenticated') and request.user.is_authenticated:
                try:
                    user_role = getattr(request.user, 'role', None)
                    user_group_id = getattr(request.user, 'user_group_id', None)
                    user_id = getattr(request.user, 'id', None)
                except (AttributeError, TypeError):
                    pass
            
            with open(log_file_path, 'a') as f:
                f.write(json.dumps({
                    "sessionId": "debug-session",
                    "runId": "run1",
                    "hypothesisId": "A",
                    "location": "views.py:823",
                    "message": "SurveyListCreate.post called",
                    "data": {
                        "user_role": user_role,
                        "user_group_id": str(user_group_id) if user_group_id else None,
                        "user_group_id_type": type(user_group_id).__name__ if user_group_id else None,
                        "user_id": str(user_id) if user_id else None,
                        "request_data_keys": list(request.data.keys()) if hasattr(request.data, 'keys') else str(type(request.data)),
                        "has_title": 'title' in request.data if hasattr(request.data, '__contains__') else False,
                        "has_group": 'group' in request.data if hasattr(request.data, '__contains__') else False,
                        "request_group_value": str(request.data.get('group')) if hasattr(request.data, 'get') and 'group' in request.data else None,
                        "has_questions": 'questions' in request.data if hasattr(request.data, '__contains__') else False,
                        "questions_count": len(request.data.get('questions', [])) if hasattr(request.data, 'get') else 0,
                        "has_sections": 'sections' in request.data if hasattr(request.data, '__contains__') else False,
                        "sections_count": len(request.data.get('sections', [])) if hasattr(request.data, 'get') else 0,
                        "request_data_preview": str(request.data)[:1000] if hasattr(request.data, '__str__') else str(type(request.data))
                    },
                    "timestamp": int(__import__('time').time() * 1000)
                }) + '\n')
        except Exception as e:
            try:
                with open(log_file_path, 'a') as f:
                    f.write(json.dumps({
                        "sessionId": "debug-session",
                        "runId": "run1",
                        "hypothesisId": "A",
                        "location": "views.py:823",
                        "message": "Error logging entry data",
                        "data": {"error": str(e)},
                        "timestamp": int(__import__('time').time() * 1000)
                    }) + '\n')
            except:
                pass
        # #endregion
        
        # PRE-VALIDATION: Si es group_admin o usuario de grupo, ajustar el grupo antes de validar
        # Esto evita que el serializer rechace el grupo incorrecto enviado por el frontend
        # Crear una copia mutable de request.data
        try:
            if hasattr(request.data, 'copy'):
                request_data_copy = request.data.copy()
            elif hasattr(request.data, '__dict__'):
                request_data_copy = dict(request.data.__dict__)
            else:
                request_data_copy = dict(request.data)
        except Exception as copy_error:
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Error copying request.data: {copy_error}")
            # Fallback: usar request.data directamente
            request_data_copy = request.data
        
        if user_role == 'group_admin' and user_group_id:
            # Forzar el grupo del admin antes de validar
            request_data_copy['group'] = str(user_group_id)
            # #region agent log
            try:
                with open(log_file_path, 'a') as f:
                    f.write(json.dumps({
                        "sessionId": "debug-session",
                        "runId": "run1",
                        "hypothesisId": "E",
                        "location": "views.py:900",
                        "message": "Pre-validation: Adjusting group for group_admin",
                        "data": {
                            "original_group": str(request.data.get('group')) if hasattr(request.data, 'get') else None,
                            "adjusted_group": str(user_group_id),
                            "user_group_id": str(user_group_id)
                        },
                        "timestamp": int(__import__('time').time() * 1000)
                    }) + '\n')
            except:
                pass
            # #endregion
        elif user_role and user_group_id and user_role != 'root':
            # Usuario regular con grupo: usar su grupo
            request_data_copy['group'] = str(user_group_id)
        
        # Asegurar que request_data_copy es un diccionario mutable
        if not isinstance(request_data_copy, dict):
            try:
                # Si es un QueryDict u otro tipo, convertirlo a dict
                if hasattr(request_data_copy, 'dict'):
                    request_data_copy = request_data_copy.dict()
                else:
                    request_data_copy = dict(request_data_copy)
            except Exception as convert_error:
                import logging
                logger = logging.getLogger(__name__)
                logger.error(f"Error converting request_data_copy to dict: {convert_error}")
                # Usar request.data original
                request_data_copy = dict(request.data) if hasattr(request.data, '__iter__') else {}
        
        serializer = SurveySerializer(data=request_data_copy)
        is_valid = serializer.is_valid()
        
        # #region agent log
        try:
            with open(log_file_path, 'a') as f:
                f.write(json.dumps({
                    "sessionId": "debug-session",
                    "runId": "run1",
                    "hypothesisId": "B",
                    "location": "views.py:774",
                    "message": "Serializer validation result",
                    "data": {
                        "is_valid": is_valid,
                        "errors": dict(serializer.errors) if not is_valid else None,
                        "errors_str": str(serializer.errors) if not is_valid else None,
                        "validated_data_keys": list(serializer.validated_data.keys()) if is_valid else None,
                        "request_group": str(request.data.get('group')) if hasattr(request.data, 'get') else None
                    },
                    "timestamp": int(__import__('time').time() * 1000)
                }) + '\n')
        except Exception as e:
            try:
                with open(log_file_path, 'a') as f:
                    f.write(json.dumps({
                        "sessionId": "debug-session",
                        "runId": "run1",
                        "hypothesisId": "B",
                        "location": "views.py:774",
                        "message": "Error logging validation result",
                        "data": {"error": str(e)},
                        "timestamp": int(__import__('time').time() * 1000)
                    }) + '\n')
            except:
                pass
        # #endregion
        
        if not is_valid:
            # #region agent log
            import logging
            logger = logging.getLogger(__name__)
            # Log detallado a stderr (visible en Gunicorn logs)
            logger.error("=" * 60)
            logger.error("SURVEY CREATION VALIDATION FAILED")
            logger.error(f"User role: {user_role}")
            logger.error(f"User group_id: {user_group_id} (type: {type(user_group_id).__name__ if user_group_id else None})")
            logger.error(f"Request data type: {type(request.data)}")
            logger.error(f"Request data keys: {list(request.data.keys()) if hasattr(request.data, 'keys') else 'N/A'}")
            logger.error(f"User role: {user_role}, User group_id: {user_group_id}")
            logger.error(f"Request group value: {request.data.get('group') if hasattr(request.data, 'get') else 'N/A'}")
            logger.error(f"Adjusted group value: {request_data_copy.get('group') if hasattr(request_data_copy, 'get') else 'N/A'}")
            logger.error(f"Serializer errors: {serializer.errors}")
            logger.error("=" * 60)
            
            try:
                with open(log_file_path, 'a') as f:
                    f.write(json.dumps({
                        "sessionId": "debug-session",
                        "runId": "run1",
                        "hypothesisId": "C",
                        "location": "views.py:795",
                        "message": "Serializer validation failed",
                        "data": {
                            "errors": dict(serializer.errors),
                            "errors_str": str(serializer.errors),
                            "request_data_keys": list(request.data.keys()) if hasattr(request.data, 'keys') else None,
                            "request_group": str(request.data.get('group')) if hasattr(request.data, 'get') else None,
                            "request_data_preview": str(request.data)[:1000] if hasattr(request.data, '__str__') else None
                        },
                        "timestamp": int(__import__('time').time() * 1000)
                    }) + '\n')
            except Exception as e:
                try:
                    with open(log_file_path, 'a') as f:
                        f.write(json.dumps({
                            "sessionId": "debug-session",
                            "runId": "run1",
                            "hypothesisId": "C",
                            "location": "views.py:795",
                            "message": "Error logging validation failure",
                            "data": {"error": str(e)},
                            "timestamp": int(__import__('time').time() * 1000)
                        }) + '\n')
                except:
                    pass
            # #endregion
            
            # Mejorar el mensaje de error para que sea más claro y detallado
            import logging
            logger = logging.getLogger(__name__)
            
            # Crear un mensaje de error más descriptivo
            error_messages = []
            for field, errors in serializer.errors.items():
                if isinstance(errors, list):
                    for error in errors:
                        if isinstance(error, dict):
                            error_messages.append(f"{field}: {error}")
                        else:
                            error_messages.append(f"{field}: {error}")
                else:
                    error_messages.append(f"{field}: {errors}")
            
            error_detail = "Error de validación al crear la encuesta. " + "; ".join(error_messages[:5])  # Limitar a 5 errores
            if len(error_messages) > 5:
                error_detail += f" ... y {len(error_messages) - 5} error(es) más."
            
            logger.error(f"Survey creation validation failed: {serializer.errors}")
            logger.error(f"Request data type: {type(request.data)}")
            logger.error(f"Request data keys: {list(request.data.keys()) if hasattr(request.data, 'keys') else 'N/A'}")
            logger.error(f"User role: {user_role}, User group_id: {user_group_id}")
            logger.error(f"Request group value: {request.data.get('group') if hasattr(request.data, 'get') else 'N/A'}")
            logger.error(f"Adjusted group value: {request_data_copy.get('group') if hasattr(request_data_copy, 'get') else 'N/A'}")
            
            # Asegurar que los errores se serialicen correctamente
            try:
                # Convertir errores a formato serializable
                serializable_errors = {}
                for field, errors in serializer.errors.items():
                    try:
                        if isinstance(errors, list):
                            serializable_errors[field] = [str(e) if not isinstance(e, (dict, list)) else json.dumps(e) for e in errors]
                        elif isinstance(errors, dict):
                            serializable_errors[field] = {str(k): str(v) if not isinstance(v, (dict, list)) else json.dumps(v) for k, v in errors.items()}
                        else:
                            serializable_errors[field] = str(errors)
                    except Exception as field_error:
                        logger.error(f"Error serializing field {field}: {field_error}")
                        serializable_errors[field] = ["Error al procesar este campo"]
                
                error_response = {
                    "detail": error_detail[:500] if len(error_detail) > 500 else error_detail,  # Limitar tamaño
                    "errors": serializable_errors
                }
                
                # Validar que la respuesta se puede serializar a JSON
                json.dumps(error_response)
                logger.error(f"Error response prepared: {error_response}")
            except Exception as e:
                # Si hay un error al serializar, devolver un mensaje simple
                logger.error(f"Error serializing error response: {e}")
                logger.error(f"Traceback: {traceback.format_exc()}")
                error_response = {
                    "detail": "Error de validación al crear la encuesta. Por favor, verifica los datos enviados.",
                    "errors": {"general": ["Error al procesar los errores de validación"]}
                }
            
            try:
                return Response(error_response, status=status.HTTP_400_BAD_REQUEST)
            except Exception as e:
                logger.error(f"Error creating Response object: {e}")
                logger.error(f"Traceback: {traceback.format_exc()}")
                # Fallback: respuesta mínima
                return Response(
                    {"detail": "Error de validación al crear la encuesta."},
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        surveys_collection = get_surveys_collection()
        validated_data = serializer.validated_data
        
        # Verificar permisos: si es group_admin, solo puede crear encuestas en su grupo
        user_role = None
        user_group_id = None
        if request.user and hasattr(request.user, 'is_authenticated') and request.user.is_authenticated:
            try:
                user_role = getattr(request.user, 'role', None)
                user_group_id = getattr(request.user, 'user_group_id', None)
            except (AttributeError, TypeError):
                user_role = None
                user_group_id = None
        
        # #region agent log
        try:
            with open(log_file_path, 'a') as f:
                f.write(json.dumps({
                    "sessionId": "debug-session",
                    "runId": "run1",
                    "hypothesisId": "D",
                    "location": "views.py:529",
                    "message": "Checking user role and group",
                    "data": {
                        "user_role": user_role,
                        "user_group_id": str(user_group_id) if user_group_id else None,
                        "user_group_id_type": type(user_group_id).__name__ if user_group_id else None,
                        "validated_data_group": str(validated_data.get('group')) if 'group' in validated_data else None
                    },
                    "timestamp": int(__import__('time').time() * 1000)
                }) + '\n')
        except Exception:
            pass
        # #endregion
        
        # Si es group_admin, forzar el grupo a su grupo
        if user_role == 'group_admin' and user_group_id:
            # #region agent log
            try:
                with open(log_file_path, 'a') as f:
                    f.write(json.dumps({
                        "sessionId": "debug-session",
                        "runId": "run1",
                        "hypothesisId": "D",
                        "location": "views.py:952",
                        "message": "group_admin detected, forcing group",
                        "data": {
                            "user_group_id": str(user_group_id),
                            "user_group_id_type": type(user_group_id).__name__,
                            "validated_data_group_before": str(validated_data.get('group')) if 'group' in validated_data else None
                        },
                        "timestamp": int(__import__('time').time() * 1000)
                    }) + '\n')
            except Exception:
                pass
            # #endregion
            
            # Verificar primero que el grupo existe antes de asignarlo
            groups_collection = get_survey_groups_collection()
            group_obj = None
            
            # Estrategia 1: Intentar buscar el grupo por ObjectId
            try:
                if isinstance(user_group_id, ObjectId):
                    group_obj = groups_collection.find_one({"_id": user_group_id})
                else:
                    # Intentar convertir a ObjectId si es válido
                    if ObjectId.is_valid(str(user_group_id)):
                        group_obj = groups_collection.find_one({"_id": ObjectId(user_group_id)})
            except Exception as e:
                # #region agent log
                try:
                    with open(log_file_path, 'a') as f:
                        f.write(json.dumps({
                            "sessionId": "debug-session",
                            "runId": "run1",
                            "hypothesisId": "D",
                            "location": "views.py:983",
                            "message": "Error converting user_group_id to ObjectId",
                            "data": {
                                "error": str(e),
                                "user_group_id": str(user_group_id),
                                "user_group_id_type": type(user_group_id).__name__
                            },
                            "timestamp": int(__import__('time').time() * 1000)
                        }) + '\n')
                except:
                    pass
                # #endregion
                pass
            
            # Estrategia 2: Si no se encontró, intentar como string directo
            if not group_obj:
                try:
                    group_obj = groups_collection.find_one({"_id": user_group_id})
                except Exception:
                    pass
            
            # Estrategia 3: Buscar todos los grupos y comparar IDs como strings (último recurso)
            if not group_obj:
                try:
                    all_groups = list(groups_collection.find({}, {'_id': 1, 'name': 1}))
                    user_group_id_str = str(user_group_id)
                    for g in all_groups:
                        if str(g.get('_id')) == user_group_id_str:
                            group_obj = g
                            break
                except Exception as e:
                    import logging
                    logger = logging.getLogger(__name__)
                    logger.error(f"Error searching all groups: {e}")
            
            if group_obj:
                # El grupo existe, usar su ObjectId
                validated_data['group'] = group_obj['_id']
                # #region agent log
                try:
                    with open(log_file_path, 'a') as f:
                        f.write(json.dumps({
                            "sessionId": "debug-session",
                            "runId": "run1",
                            "hypothesisId": "D",
                            "location": "views.py:540",
                            "message": "Group found for group_admin, using it",
                            "data": {
                                "group_id": str(group_obj['_id']),
                                "group_name": group_obj.get('name', 'N/A')
                            },
                            "timestamp": int(__import__('time').time() * 1000)
                        }) + '\n')
                except Exception:
                    pass
                # #endregion
            else:
                # El grupo no existe, esto es un error
                # Obtener todos los grupos disponibles para el mensaje de error
                all_groups = []
                try:
                    all_groups = list(groups_collection.find({}, {'_id': 1, 'name': 1})[:10])
                except Exception:
                    pass
                
                # #region agent log
                import logging
                logger = logging.getLogger(__name__)
                logger.error(f"Group not found for user_group_id: {user_group_id}")
                logger.error(f"Available groups: {[str(g.get('_id')) for g in all_groups]}")
                
                try:
                    with open(log_file_path, 'a') as f:
                        f.write(json.dumps({
                            "sessionId": "debug-session",
                            "runId": "run1",
                            "hypothesisId": "D",
                            "location": "views.py:540",
                            "message": "Group not found for group_admin user_group_id",
                            "data": {
                                "user_group_id": str(user_group_id),
                                "user_group_id_type": type(user_group_id).__name__,
                                "all_groups": [{"_id": str(g.get('_id')), "name": g.get('name')} for g in all_groups],
                                "user_id": str(request.user.id) if request.user and hasattr(request.user, 'id') else None,
                                "username": request.user.username if request.user else None
                            },
                            "timestamp": int(__import__('time').time() * 1000)
                        }) + '\n')
                except Exception:
                    pass
                # #endregion
                
                # Mensaje de error más descriptivo
                error_message = f"El grupo asociado a tu usuario (ID: {user_group_id}) no existe en el sistema."
                if all_groups:
                    error_message += f" Grupos disponibles: {', '.join([g.get('name', str(g.get('_id'))) for g in all_groups[:3]])}."
                error_message += " Contacta al administrador para que asigne un grupo válido a tu usuario."
                
                return Response(
                    {"detail": error_message},
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        # Si el usuario tiene un grupo asignado (no es root), asegurar que la encuesta use su grupo
        if user_role and user_group_id and user_role != 'root':
            # Usuario con grupo asignado: verificar que el grupo existe y asignarlo
            groups_collection = get_survey_groups_collection()
            group_obj = None
            
            # Buscar el grupo del usuario
            try:
                if isinstance(user_group_id, ObjectId):
                    group_obj = groups_collection.find_one({"_id": user_group_id})
                else:
                    if ObjectId.is_valid(str(user_group_id)):
                        group_obj = groups_collection.find_one({"_id": ObjectId(user_group_id)})
            except Exception:
                pass
            
            # Si no se encontró, intentar como string
            if not group_obj:
                try:
                    group_obj = groups_collection.find_one({"_id": user_group_id})
                except Exception:
                    pass
            
            # Si aún no se encontró, buscar todos los grupos y comparar IDs como strings
            if not group_obj:
                try:
                    all_groups = list(groups_collection.find({}, {'_id': 1, 'name': 1}))
                    user_group_id_str = str(user_group_id)
                    for g in all_groups:
                        if str(g.get('_id')) == user_group_id_str:
                            group_obj = g
                            break
                except Exception:
                    pass
            
            if group_obj:
                # El grupo existe, forzar su uso (sobrescribir cualquier grupo que venga del frontend)
                validated_data['group'] = group_obj['_id']
                # #region agent log
                try:
                    with open(log_file_path, 'a') as f:
                        f.write(json.dumps({
                            "sessionId": "debug-session",
                            "runId": "run1",
                            "hypothesisId": "D",
                            "location": "views.py:1020",
                            "message": "User with group detected, forcing group inheritance",
                            "data": {
                                "user_role": user_role,
                                "user_group_id": str(user_group_id),
                                "group_id": str(group_obj['_id']),
                                "group_name": group_obj.get('name', 'N/A')
                            },
                            "timestamp": int(__import__('time').time() * 1000)
                        }) + '\n')
                except Exception:
                    pass
                # #endregion
            else:
                # El grupo del usuario no existe, esto es un error
                all_groups = []
                try:
                    all_groups = list(groups_collection.find({}, {'_id': 1, 'name': 1})[:10])
                except Exception:
                    pass
                
                import logging
                logger = logging.getLogger(__name__)
                logger.error(f"Group not found for user_group_id: {user_group_id} (user role: {user_role})")
                
                error_message = f"El grupo asociado a tu usuario (ID: {user_group_id}) no existe en el sistema."
                if all_groups:
                    error_message += f" Grupos disponibles: {', '.join([g.get('name', str(g.get('_id'))) for g in all_groups[:3]])}."
                error_message += " Contacta al administrador para que asigne un grupo válido a tu usuario."
                
                return Response(
                    {"detail": error_message},
                    status=status.HTTP_400_BAD_REQUEST
                )
        elif user_role == 'root':
            # Root puede crear encuestas sin grupo o con cualquier grupo
            # Validar que el grupo especificado existe (si se especificó uno)
            group_to_check = validated_data.get('group')
            if group_to_check:
                groups_collection = get_survey_groups_collection()
                group_found = False
                
                try:
                    group_obj = groups_collection.find_one({"_id": ObjectId(group_to_check)})
                    if group_obj:
                        group_found = True
                except Exception:
                    pass
                
                if not group_found:
                    try:
                        group_obj = groups_collection.find_one({"_id": group_to_check})
                        if group_obj:
                            group_found = True
                    except Exception:
                        pass
                
                if not group_found:
                    return Response(
                        {"detail": "El grupo de encuestas especificado no existe."},
                        status=status.HTTP_400_BAD_REQUEST
                    )
        
        # Asegurar que el grupo esté asignado (debe estar en validated_data después de las validaciones anteriores)
        # Solo requerir grupo si el usuario no es root
        if user_role != 'root' and ('group' not in validated_data or validated_data['group'] is None):
            return Response(
                {"detail": "Error: no se pudo asignar el grupo automáticamente. Contacta al administrador."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        
        # Preparar datos para insertar
        survey_doc = {
            'title': validated_data['title'],
            'description': validated_data.get('description', ''),
            'group': validated_data['group'],
            'questions': validated_data.get('questions', []),
            'is_public': validated_data.get('is_public', False),
            'is_deleted': False,  # Por defecto no está eliminada
            'created_by': str(request.user.id) if request.user and request.user.is_authenticated and hasattr(request.user, 'id') else None  # Usuario que creó la encuesta
        }
        
        # Agregar sections si existen
        if 'sections' in validated_data:
            survey_doc['sections'] = validated_data['sections']
        
        result = surveys_collection.insert_one(survey_doc)
        new_survey = surveys_collection.find_one({'_id': result.inserted_id})
        new_survey['id'] = str(new_survey['_id'])
        
        # Enriquecer con información del grupo y usuario creador
        groups_collection = get_survey_groups_collection()
        users_collection = get_mongo_collection('users')
        
        # Obtener nombre del grupo
        group_id = new_survey.get('group')
        if group_id:
            try:
                group_obj = groups_collection.find_one({'_id': ObjectId(group_id)})
                if not group_obj:
                    group_obj = groups_collection.find_one({'_id': group_id})
                if group_obj:
                    new_survey['group_name'] = group_obj.get('name', 'Sin grupo')
                else:
                    new_survey['group_name'] = 'Sin grupo'
            except Exception:
                try:
                    group_obj = groups_collection.find_one({'_id': group_id})
                    if group_obj:
                        new_survey['group_name'] = group_obj.get('name', 'Sin grupo')
                    else:
                        new_survey['group_name'] = 'Sin grupo'
                except Exception:
                    new_survey['group_name'] = 'Sin grupo'
        else:
            new_survey['group_name'] = 'Sin grupo'
        
        # Obtener username del usuario creador
        created_by = new_survey.get('created_by')
        if created_by:
            try:
                user_obj = users_collection.find_one({'_id': ObjectId(created_by)})
                if not user_obj:
                    user_obj = users_collection.find_one({'_id': created_by})
                if not user_obj:
                    user_obj = users_collection.find_one({'id': str(created_by)})
                if user_obj:
                    new_survey['created_by_username'] = user_obj.get('username', 'Usuario desconocido')
                else:
                    new_survey['created_by_username'] = 'Usuario desconocido'
            except Exception:
                try:
                    user_obj = users_collection.find_one({'_id': created_by})
                    if user_obj:
                        new_survey['created_by_username'] = user_obj.get('username', 'Usuario desconocido')
                    else:
                        new_survey['created_by_username'] = 'Usuario desconocido'
                except Exception:
                    new_survey['created_by_username'] = 'Usuario desconocido'
        else:
            new_survey['created_by_username'] = None
        
        return Response(SurveySerializer(new_survey).data, status=status.HTTP_201_CREATED)

    def get(self, request):
        # #region agent log
        import json
        import traceback
        import os
        # Detectar la ruta correcta del log (desarrollo vs producción)
        base_paths = [
            '/home/vps/Documentos/survey-app/.cursor/debug.log',  # Desarrollo local
            '/app/.cursor/debug.log',  # Producción Docker
            os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), '.cursor', 'debug.log')  # Fallback
        ]
        log_file_path = None
        for path in base_paths:
            log_dir = os.path.dirname(path)
            if os.path.exists(log_dir) or os.path.exists(os.path.dirname(log_dir)):
                log_file_path = path
                # Crear directorio si no existe
                try:
                    os.makedirs(log_dir, exist_ok=True)
                except:
                    pass
                break
        if not log_file_path:
            log_file_path = '/tmp/survey_debug.log'  # Fallback final
        try:
            with open(log_file_path, 'a') as f:
                f.write(json.dumps({
                    "sessionId": "debug-session",
                    "runId": "run1",
                    "hypothesisId": "B",
                    "location": "views.py:193",
                    "message": "SurveyListCreate.get called",
                    "data": {
                        "user_authenticated": request.user.is_authenticated if request.user else False,
                        "user_id": request.user.id if request.user and hasattr(request.user, 'id') else None
                    },
                    "timestamp": int(__import__('time').time() * 1000)
                }) + '\n')
        except Exception:
            pass
        # #endregion
        
        try:
            surveys_collection = get_surveys_collection()
            # #region agent log
            try:
                with open(log_file_path, 'a') as f:
                    f.write(json.dumps({
                        "sessionId": "debug-session",
                        "runId": "run1",
                        "hypothesisId": "B",
                        "location": "views.py:193",
                        "message": "MongoDB collection obtained",
                        "data": {},
                        "timestamp": int(__import__('time').time() * 1000)
                    }) + '\n')
            except Exception:
                pass
            # #endregion
            
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
            user_group_id = None
            if request.user and hasattr(request.user, 'is_authenticated') and request.user.is_authenticated:
                try:
                    user_role = getattr(request.user, 'role', None)
                    user_group_id = getattr(request.user, 'user_group_id', None)
                except (AttributeError, TypeError):
                    user_role = None
                    user_group_id = None
            
            # Filtrar encuestas por grupo del usuario
            # - Si el usuario NO es root y tiene user_group_id: solo ver encuestas de su grupo
            # - Si el usuario es root: ver todas las encuestas (incluyendo las sin grupo)
            if user_role != 'root' and user_group_id:
                # Usuario con grupo asignado: solo ver encuestas de su grupo
                try:
                    group_filter = {'group': ObjectId(user_group_id)}
                except Exception:
                    group_filter = {'group': user_group_id}
                
                if query:
                    # Combinar con condiciones existentes
                    if '$and' in query:
                        query['$and'].append(group_filter)
                    else:
                        query = {'$and': [query, group_filter]}
                else:
                    query = group_filter
            elif user_role == 'root':
                # Root puede ver todas las encuestas (con o sin grupo)
                # No agregamos filtro de grupo para root
                pass
            else:
                # Usuario sin grupo asignado y no es root: no ver ninguna encuesta
                query = {'_id': None}  # Query que no devuelve resultados
            
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
                    if '$and' in query:
                        query['$and'].append(deleted_condition)
                    else:
                        query = {'$and': [query, deleted_condition]}
                else:
                    query = deleted_condition

            surveys = list(surveys_collection.find(query))
            
            # #region agent log
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
            
            # Enriquecer encuestas con información del grupo y usuario creador
            # Optimización: obtener todos los grupos y usuarios de una vez en lugar de consultas individuales
            groups_collection = get_survey_groups_collection()
            users_collection = get_mongo_collection('users')
            
            # Recopilar todos los IDs únicos de grupos y usuarios creadores
            group_ids = set()
            user_ids = set()
            
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
                
                # Recopilar IDs de grupos
                group_id = survey.get('group')
                if group_id:
                    try:
                        # Intentar convertir a ObjectId para normalizar
                        group_ids.add(ObjectId(group_id) if ObjectId.is_valid(str(group_id)) else group_id)
                    except Exception:
                        group_ids.add(group_id)
                
                # Recopilar IDs de usuarios creadores
                created_by = survey.get('created_by')
                if created_by:
                    try:
                        # Intentar convertir a ObjectId para normalizar
                        user_ids.add(ObjectId(created_by) if ObjectId.is_valid(str(created_by)) else created_by)
                    except Exception:
                        user_ids.add(created_by)
            
            # Obtener todos los grupos de una vez
            groups_dict = {}
            if group_ids:
                try:
                    # Intentar buscar como ObjectId primero
                    objectid_groups = list(groups_collection.find({'_id': {'$in': [g for g in group_ids if isinstance(g, ObjectId)]}}))
                    for group in objectid_groups:
                        groups_dict[str(group['_id'])] = group.get('name', 'Sin grupo')
                    
                    # Buscar los que no se encontraron como ObjectId (pueden ser strings)
                    remaining_ids = [g for g in group_ids if str(g) not in groups_dict]
                    if remaining_ids:
                        # Intentar buscar como strings
                        for gid in remaining_ids:
                            try:
                                group = groups_collection.find_one({'_id': ObjectId(gid)})
                                if group:
                                    groups_dict[str(gid)] = group.get('name', 'Sin grupo')
                            except Exception:
                                pass
                except Exception:
                    pass
            
            # Obtener todos los usuarios de una vez
            users_dict = {}
            if user_ids:
                try:
                    # Intentar buscar como ObjectId primero
                    objectid_users = list(users_collection.find({'_id': {'$in': [u for u in user_ids if isinstance(u, ObjectId)]}}))
                    for user in objectid_users:
                        users_dict[str(user['_id'])] = user.get('username', 'Usuario desconocido')
                    
                    # Buscar los que no se encontraron como ObjectId (pueden ser strings)
                    remaining_ids = [u for u in user_ids if str(u) not in users_dict]
                    if remaining_ids:
                        # Intentar buscar como strings
                        for uid in remaining_ids:
                            try:
                                user = users_collection.find_one({'_id': ObjectId(uid)})
                                if user:
                                    users_dict[str(uid)] = user.get('username', 'Usuario desconocido')
                            except Exception:
                                pass
                except Exception:
                    pass
            
            # Asignar información a cada encuesta
            for survey in surveys:
                # Asignar nombre del grupo
                group_id = survey.get('group')
                if group_id:
                    try:
                        # Intentar normalizar el ID para la búsqueda
                        group_key = str(ObjectId(group_id)) if ObjectId.is_valid(str(group_id)) else str(group_id)
                        survey['group_name'] = groups_dict.get(group_key, 'Sin grupo')
                    except Exception:
                        survey['group_name'] = groups_dict.get(str(group_id), 'Sin grupo')
                else:
                    survey['group_name'] = 'Sin grupo'
                
                # Asignar username del usuario creador
                created_by = survey.get('created_by')
                if created_by:
                    try:
                        # Intentar normalizar el ID para la búsqueda
                        user_key = str(ObjectId(created_by)) if ObjectId.is_valid(str(created_by)) else str(created_by)
                        survey['created_by_username'] = users_dict.get(user_key, 'Usuario desconocido')
                    except Exception:
                        survey['created_by_username'] = users_dict.get(str(created_by), 'Usuario desconocido')
                else:
                    survey['created_by_username'] = None
            
            # #region agent log
            try:
                with open(log_file_path, 'a') as f:
                    f.write(json.dumps({
                        "sessionId": "debug-session",
                        "runId": "run1",
                        "hypothesisId": "B",
                        "location": "views.py:262",
                        "message": "Surveys processed, creating serializer",
                        "data": {
                            "count": len(surveys),
                            "query": str(query)
                        },
                        "timestamp": int(__import__('time').time() * 1000)
                    }) + '\n')
            except Exception:
                pass
            # #endregion
            
            serializer = SurveySerializer(surveys, many=True)
            # #region agent log
            try:
                with open(log_file_path, 'a') as f:
                    f.write(json.dumps({
                        "sessionId": "debug-session",
                        "runId": "run1",
                        "hypothesisId": "B",
                        "location": "views.py:262",
                        "message": "Serializer created, returning response",
                        "data": {
                            "serialized_count": len(serializer.data) if serializer.data else 0
                        },
                        "timestamp": int(__import__('time').time() * 1000)
                    }) + '\n')
            except Exception:
                pass
            # #endregion
            return Response(serializer.data)
        except Exception as e:
            # #region agent log
            try:
                with open(log_file_path, 'a') as f:
                    f.write(json.dumps({
                        "sessionId": "debug-session",
                        "runId": "run1",
                        "hypothesisId": "B",
                        "location": "views.py:193",
                        "message": "SurveyListCreate.get failed",
                        "data": {
                            "error_type": type(e).__name__,
                            "error_message": str(e),
                            "traceback": traceback.format_exc()
                        },
                        "timestamp": int(__import__('time').time() * 1000)
                    }) + '\n')
            except Exception:
                pass
            # #endregion
            raise

    def post(self, request):
        # #region agent log
        import json
        import traceback
        import os
        # Detectar la ruta correcta del log (desarrollo vs producción)
        base_paths = [
            '/home/vps/Documentos/survey-app/.cursor/debug.log',  # Desarrollo local
            '/app/.cursor/debug.log',  # Producción Docker
            os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), '.cursor', 'debug.log')  # Fallback
        ]
        log_file_path = None
        for path in base_paths:
            log_dir = os.path.dirname(path)
            if os.path.exists(log_dir) or os.path.exists(os.path.dirname(log_dir)):
                log_file_path = path
                # Crear directorio si no existe
                try:
                    os.makedirs(log_dir, exist_ok=True)
                except:
                    pass
                break
        if not log_file_path:
            log_file_path = '/tmp/survey_debug.log'  # Fallback final
        try:
            # Obtener información del usuario antes de validar
            user_role = None
            user_group_id = None
            user_id = None
            if request.user and hasattr(request.user, 'is_authenticated') and request.user.is_authenticated:
                try:
                    user_role = getattr(request.user, 'role', None)
                    user_group_id = getattr(request.user, 'user_group_id', None)
                    user_id = getattr(request.user, 'id', None)
                except (AttributeError, TypeError):
                    pass
            
            with open(log_file_path, 'a') as f:
                f.write(json.dumps({
                    "sessionId": "debug-session",
                    "runId": "run1",
                    "hypothesisId": "A",
                    "location": "views.py:747",
                    "message": "SurveyListCreate.post called",
                    "data": {
                        "user_role": user_role,
                        "user_group_id": str(user_group_id) if user_group_id else None,
                        "user_group_id_type": type(user_group_id).__name__ if user_group_id else None,
                        "user_id": str(user_id) if user_id else None,
                        "request_data_keys": list(request.data.keys()) if hasattr(request.data, 'keys') else str(type(request.data)),
                        "has_title": 'title' in request.data if hasattr(request.data, '__contains__') else False,
                        "has_group": 'group' in request.data if hasattr(request.data, '__contains__') else False,
                        "request_group_value": str(request.data.get('group')) if hasattr(request.data, 'get') and 'group' in request.data else None,
                        "has_questions": 'questions' in request.data if hasattr(request.data, '__contains__') else False,
                        "questions_count": len(request.data.get('questions', [])) if hasattr(request.data, 'get') else 0,
                        "has_sections": 'sections' in request.data if hasattr(request.data, '__contains__') else False,
                        "sections_count": len(request.data.get('sections', [])) if hasattr(request.data, 'get') else 0,
                        "request_data_preview": str(request.data)[:1000] if hasattr(request.data, '__str__') else str(type(request.data))
                    },
                    "timestamp": int(__import__('time').time() * 1000)
                }) + '\n')
        except Exception as e:
            try:
                with open(log_file_path, 'a') as f:
                    f.write(json.dumps({
                        "sessionId": "debug-session",
                        "runId": "run1",
                        "hypothesisId": "A",
                        "location": "views.py:747",
                        "message": "Error logging entry data",
                        "data": {"error": str(e)},
                        "timestamp": int(__import__('time').time() * 1000)
                    }) + '\n')
            except:
                pass
        # #endregion
        
        # PRE-VALIDATION: Si es group_admin o usuario de grupo, ajustar el grupo antes de validar
        # Esto evita que el serializer rechace el grupo incorrecto enviado por el frontend
        # Crear una copia mutable de request.data
        try:
            if hasattr(request.data, 'copy'):
                request_data_copy = request.data.copy()
            elif hasattr(request.data, '__dict__'):
                request_data_copy = dict(request.data.__dict__)
            else:
                request_data_copy = dict(request.data)
        except Exception as copy_error:
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Error copying request.data: {copy_error}")
            # Fallback: usar request.data directamente
            request_data_copy = request.data
        
        if user_role == 'group_admin' and user_group_id:
            # Forzar el grupo del admin antes de validar
            request_data_copy['group'] = str(user_group_id)
            # #region agent log
            try:
                with open(log_file_path, 'a') as f:
                    f.write(json.dumps({
                        "sessionId": "debug-session",
                        "runId": "run1",
                        "hypothesisId": "E",
                        "location": "views.py:900",
                        "message": "Pre-validation: Adjusting group for group_admin",
                        "data": {
                            "original_group": str(request.data.get('group')) if hasattr(request.data, 'get') else None,
                            "adjusted_group": str(user_group_id),
                            "user_group_id": str(user_group_id)
                        },
                        "timestamp": int(__import__('time').time() * 1000)
                    }) + '\n')
            except:
                pass
            # #endregion
        elif user_role and user_group_id and user_role != 'root':
            # Usuario regular con grupo: usar su grupo
            request_data_copy['group'] = str(user_group_id)
        
        # Asegurar que request_data_copy es un diccionario mutable
        if not isinstance(request_data_copy, dict):
            try:
                # Si es un QueryDict u otro tipo, convertirlo a dict
                if hasattr(request_data_copy, 'dict'):
                    request_data_copy = request_data_copy.dict()
                else:
                    request_data_copy = dict(request_data_copy)
            except Exception as convert_error:
                import logging
                logger = logging.getLogger(__name__)
                logger.error(f"Error converting request_data_copy to dict: {convert_error}")
                # Usar request.data original
                request_data_copy = dict(request.data) if hasattr(request.data, '__iter__') else {}
        
        serializer = SurveySerializer(data=request_data_copy)
        is_valid = serializer.is_valid()
        
        # #region agent log
        try:
            with open(log_file_path, 'a') as f:
                f.write(json.dumps({
                    "sessionId": "debug-session",
                    "runId": "run1",
                    "hypothesisId": "B",
                    "location": "views.py:774",
                    "message": "Serializer validation result",
                    "data": {
                        "is_valid": is_valid,
                        "errors": dict(serializer.errors) if not is_valid else None,
                        "errors_str": str(serializer.errors) if not is_valid else None,
                        "validated_data_keys": list(serializer.validated_data.keys()) if is_valid else None,
                        "request_group": str(request.data.get('group')) if hasattr(request.data, 'get') else None
                    },
                    "timestamp": int(__import__('time').time() * 1000)
                }) + '\n')
        except Exception as e:
            try:
                with open(log_file_path, 'a') as f:
                    f.write(json.dumps({
                        "sessionId": "debug-session",
                        "runId": "run1",
                        "hypothesisId": "B",
                        "location": "views.py:774",
                        "message": "Error logging validation result",
                        "data": {"error": str(e)},
                        "timestamp": int(__import__('time').time() * 1000)
                    }) + '\n')
            except:
                pass
        # #endregion
        
        if not is_valid:
            # #region agent log
            import logging
            logger = logging.getLogger(__name__)
            # Log detallado a stderr (visible en Gunicorn logs)
            logger.error("=" * 60)
            logger.error("SURVEY CREATION VALIDATION FAILED")
            logger.error(f"User role: {user_role}")
            logger.error(f"User group_id: {user_group_id} (type: {type(user_group_id).__name__ if user_group_id else None})")
            logger.error(f"Request data keys: {list(request.data.keys()) if hasattr(request.data, 'keys') else 'N/A'}")
            logger.error(f"Request group value: {request.data.get('group') if hasattr(request.data, 'get') else 'N/A'}")
            logger.error(f"Serializer errors: {serializer.errors}")
            logger.error("=" * 60)
            
            try:
                with open(log_file_path, 'a') as f:
                    f.write(json.dumps({
                        "sessionId": "debug-session",
                        "runId": "run1",
                        "hypothesisId": "C",
                        "location": "views.py:795",
                        "message": "Serializer validation failed",
                        "data": {
                            "errors": dict(serializer.errors),
                            "errors_str": str(serializer.errors),
                            "request_data_keys": list(request.data.keys()) if hasattr(request.data, 'keys') else None,
                            "request_group": str(request.data.get('group')) if hasattr(request.data, 'get') else None,
                            "request_data_preview": str(request.data)[:1000] if hasattr(request.data, '__str__') else None
                        },
                        "timestamp": int(__import__('time').time() * 1000)
                    }) + '\n')
            except Exception as e:
                try:
                    with open(log_file_path, 'a') as f:
                        f.write(json.dumps({
                            "sessionId": "debug-session",
                            "runId": "run1",
                            "hypothesisId": "C",
                            "location": "views.py:795",
                            "message": "Error logging validation failure",
                            "data": {"error": str(e)},
                            "timestamp": int(__import__('time').time() * 1000)
                        }) + '\n')
                except:
                    pass
            # #endregion
            
            # Mejorar el mensaje de error para que sea más claro y detallado
            import logging
            logger = logging.getLogger(__name__)
            
            # Crear un mensaje de error más descriptivo
            error_messages = []
            for field, errors in serializer.errors.items():
                if isinstance(errors, list):
                    for error in errors:
                        if isinstance(error, dict):
                            error_messages.append(f"{field}: {error}")
                        else:
                            error_messages.append(f"{field}: {error}")
                else:
                    error_messages.append(f"{field}: {errors}")
            
            error_detail = "Error de validación al crear la encuesta. " + "; ".join(error_messages[:5])  # Limitar a 5 errores
            if len(error_messages) > 5:
                error_detail += f" ... y {len(error_messages) - 5} error(es) más."
            
            logger.error(f"Survey creation validation failed: {serializer.errors}")
            logger.error(f"Request data type: {type(request.data)}")
            logger.error(f"Request data keys: {list(request.data.keys()) if hasattr(request.data, 'keys') else 'N/A'}")
            logger.error(f"User role: {user_role}, User group_id: {user_group_id}")
            logger.error(f"Request group value: {request.data.get('group') if hasattr(request.data, 'get') else 'N/A'}")
            logger.error(f"Adjusted group value: {request_data_copy.get('group') if hasattr(request_data_copy, 'get') else 'N/A'}")
            
            # Asegurar que los errores se serialicen correctamente
            try:
                # Convertir errores a formato serializable
                serializable_errors = {}
                for field, errors in serializer.errors.items():
                    try:
                        if isinstance(errors, list):
                            serializable_errors[field] = [str(e) if not isinstance(e, (dict, list)) else json.dumps(e) for e in errors]
                        elif isinstance(errors, dict):
                            serializable_errors[field] = {str(k): str(v) if not isinstance(v, (dict, list)) else json.dumps(v) for k, v in errors.items()}
                        else:
                            serializable_errors[field] = str(errors)
                    except Exception as field_error:
                        logger.error(f"Error serializing field {field}: {field_error}")
                        serializable_errors[field] = ["Error al procesar este campo"]
                
                error_response = {
                    "detail": error_detail[:500] if len(error_detail) > 500 else error_detail,  # Limitar tamaño
                    "errors": serializable_errors
                }
                
                # Validar que la respuesta se puede serializar a JSON
                json.dumps(error_response)
                logger.error(f"Error response prepared: {error_response}")
            except Exception as e:
                # Si hay un error al serializar, devolver un mensaje simple
                logger.error(f"Error serializing error response: {e}")
                logger.error(f"Traceback: {traceback.format_exc()}")
                error_response = {
                    "detail": "Error de validación al crear la encuesta. Por favor, verifica los datos enviados.",
                    "errors": {"general": ["Error al procesar los errores de validación"]}
                }
            
            try:
                return Response(error_response, status=status.HTTP_400_BAD_REQUEST)
            except Exception as e:
                logger.error(f"Error creating Response object: {e}")
                logger.error(f"Traceback: {traceback.format_exc()}")
                # Fallback: respuesta mínima
                return Response(
                    {"detail": "Error de validación al crear la encuesta."},
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        surveys_collection = get_surveys_collection()
        validated_data = serializer.validated_data
        
        # Verificar permisos: si es group_admin, solo puede crear encuestas en su grupo
        user_role = None
        user_group_id = None
        if request.user and hasattr(request.user, 'is_authenticated') and request.user.is_authenticated:
            try:
                user_role = getattr(request.user, 'role', None)
                user_group_id = getattr(request.user, 'user_group_id', None)
            except (AttributeError, TypeError):
                user_role = None
                user_group_id = None
        
        # #region agent log
        try:
            with open(log_file_path, 'a') as f:
                f.write(json.dumps({
                    "sessionId": "debug-session",
                    "runId": "run1",
                    "hypothesisId": "D",
                    "location": "views.py:529",
                    "message": "Checking user role and group",
                    "data": {
                        "user_role": user_role,
                        "user_group_id": str(user_group_id) if user_group_id else None,
                        "user_group_id_type": type(user_group_id).__name__ if user_group_id else None,
                        "validated_data_group": str(validated_data.get('group')) if 'group' in validated_data else None
                    },
                    "timestamp": int(__import__('time').time() * 1000)
                }) + '\n')
        except Exception:
            pass
        # #endregion
        
        # Si es group_admin, forzar el grupo a su grupo
        if user_role == 'group_admin' and user_group_id:
            # #region agent log
            try:
                with open(log_file_path, 'a') as f:
                    f.write(json.dumps({
                        "sessionId": "debug-session",
                        "runId": "run1",
                        "hypothesisId": "D",
                        "location": "views.py:952",
                        "message": "group_admin detected, forcing group",
                        "data": {
                            "user_group_id": str(user_group_id),
                            "user_group_id_type": type(user_group_id).__name__,
                            "validated_data_group_before": str(validated_data.get('group')) if 'group' in validated_data else None
                        },
                        "timestamp": int(__import__('time').time() * 1000)
                    }) + '\n')
            except Exception:
                pass
            # #endregion
            
            # Verificar primero que el grupo existe antes de asignarlo
            groups_collection = get_survey_groups_collection()
            group_obj = None
            
            # Estrategia 1: Intentar buscar el grupo por ObjectId
            try:
                if isinstance(user_group_id, ObjectId):
                    group_obj = groups_collection.find_one({"_id": user_group_id})
                else:
                    # Intentar convertir a ObjectId si es válido
                    if ObjectId.is_valid(str(user_group_id)):
                        group_obj = groups_collection.find_one({"_id": ObjectId(user_group_id)})
            except Exception as e:
                # #region agent log
                try:
                    with open(log_file_path, 'a') as f:
                        f.write(json.dumps({
                            "sessionId": "debug-session",
                            "runId": "run1",
                            "hypothesisId": "D",
                            "location": "views.py:983",
                            "message": "Error converting user_group_id to ObjectId",
                            "data": {
                                "error": str(e),
                                "user_group_id": str(user_group_id),
                                "user_group_id_type": type(user_group_id).__name__
                            },
                            "timestamp": int(__import__('time').time() * 1000)
                        }) + '\n')
                except:
                    pass
                # #endregion
                pass
            
            # Estrategia 2: Si no se encontró, intentar como string directo
            if not group_obj:
                try:
                    group_obj = groups_collection.find_one({"_id": user_group_id})
                except Exception:
                    pass
            
            # Estrategia 3: Buscar todos los grupos y comparar IDs como strings (último recurso)
            if not group_obj:
                try:
                    all_groups = list(groups_collection.find({}, {'_id': 1, 'name': 1}))
                    user_group_id_str = str(user_group_id)
                    for g in all_groups:
                        if str(g.get('_id')) == user_group_id_str:
                            group_obj = g
                            break
                except Exception as e:
                    import logging
                    logger = logging.getLogger(__name__)
                    logger.error(f"Error searching all groups: {e}")
            
            if group_obj:
                # El grupo existe, usar su ObjectId
                validated_data['group'] = group_obj['_id']
                # #region agent log
                try:
                    with open(log_file_path, 'a') as f:
                        f.write(json.dumps({
                            "sessionId": "debug-session",
                            "runId": "run1",
                            "hypothesisId": "D",
                            "location": "views.py:540",
                            "message": "Group found for group_admin, using it",
                            "data": {
                                "group_id": str(group_obj['_id']),
                                "group_name": group_obj.get('name', 'N/A')
                            },
                            "timestamp": int(__import__('time').time() * 1000)
                        }) + '\n')
                except Exception:
                    pass
                # #endregion
            else:
                # El grupo no existe, esto es un error
                # Obtener todos los grupos disponibles para el mensaje de error
                all_groups = []
                try:
                    all_groups = list(groups_collection.find({}, {'_id': 1, 'name': 1})[:10])
                except Exception:
                    pass
                
                # #region agent log
                import logging
                logger = logging.getLogger(__name__)
                logger.error(f"Group not found for user_group_id: {user_group_id}")
                logger.error(f"Available groups: {[str(g.get('_id')) for g in all_groups]}")
                
                try:
                    with open(log_file_path, 'a') as f:
                        f.write(json.dumps({
                            "sessionId": "debug-session",
                            "runId": "run1",
                            "hypothesisId": "D",
                            "location": "views.py:540",
                            "message": "Group not found for group_admin user_group_id",
                            "data": {
                                "user_group_id": str(user_group_id),
                                "user_group_id_type": type(user_group_id).__name__,
                                "all_groups": [{"_id": str(g.get('_id')), "name": g.get('name')} for g in all_groups],
                                "user_id": str(request.user.id) if request.user and hasattr(request.user, 'id') else None,
                                "username": request.user.username if request.user else None
                            },
                            "timestamp": int(__import__('time').time() * 1000)
                        }) + '\n')
                except Exception:
                    pass
                # #endregion
                
                # Mensaje de error más descriptivo
                error_message = f"El grupo asociado a tu usuario (ID: {user_group_id}) no existe en el sistema."
                if all_groups:
                    error_message += f" Grupos disponibles: {', '.join([g.get('name', str(g.get('_id'))) for g in all_groups[:3]])}."
                error_message += " Contacta al administrador para que asigne un grupo válido a tu usuario."
                
                return Response(
                    {"detail": error_message},
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        # Validar que el group_id existe (solo si no es group_admin, porque ya lo validamos arriba)
        if user_role != 'group_admin':
            groups_collection = get_survey_groups_collection()
            group_found = False
            group_to_check = validated_data.get('group')
            
            # #region agent log
            try:
                with open(log_file_path, 'a') as f:
                    f.write(json.dumps({
                        "sessionId": "debug-session",
                        "runId": "run1",
                        "hypothesisId": "D",
                        "location": "views.py:547",
                        "message": "Validating group exists (non-group_admin)",
                        "data": {
                            "group_to_check": str(group_to_check) if group_to_check else None,
                            "group_to_check_type": type(group_to_check).__name__ if group_to_check else None
                        },
                        "timestamp": int(__import__('time').time() * 1000)
                    }) + '\n')
            except Exception:
                pass
            # #endregion
            
            # Try ObjectId first
            try:
                group_obj = groups_collection.find_one({"_id": ObjectId(group_to_check)})
                if group_obj:
                    group_found = True
            except Exception as e:
                pass
            
            # Try as string
            if not group_found:
                group_obj = groups_collection.find_one({"_id": group_to_check})
                if group_obj:
                    group_found = True
            
            if not group_found:
                # #region agent log
                try:
                    with open(log_file_path, 'a') as f:
                        f.write(json.dumps({
                            "sessionId": "debug-session",
                            "runId": "run1",
                            "hypothesisId": "D",
                            "location": "views.py:547",
                            "message": "Group not found",
                            "data": {
                                "group_to_check": str(group_to_check),
                                "all_groups": [str(g.get('_id')) for g in groups_collection.find({}, {'_id': 1})[:10]]
                            },
                            "timestamp": int(__import__('time').time() * 1000)
                        }) + '\n')
                except Exception:
                    pass
                # #endregion
                raise ValidationError(detail="El grupo de encuestas especificado no existe.")

            # Asegurar que el grupo esté asignado (debe estar en validated_data después de las validaciones anteriores)
            if 'group' not in validated_data or validated_data['group'] is None:
                # Si no hay grupo y no es group_admin, esto es un error
                if user_role != 'group_admin':
                    return Response(
                        {"detail": "El campo 'group' es requerido para crear una encuesta."},
                        status=status.HTTP_400_BAD_REQUEST
                    )
                # Si es group_admin y no hay grupo, debería haberse asignado arriba
                # Si llegamos aquí, hay un problema
                return Response(
                    {"detail": "Error: no se pudo asignar el grupo automáticamente. Contacta al administrador."},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
            
            # Preparar datos para insertar
            survey_doc = {
                'title': validated_data['title'],
                'description': validated_data.get('description', ''),
                'group': validated_data['group'],
                'questions': validated_data.get('questions', []),
                'is_public': validated_data.get('is_public', False),
                'is_deleted': False,  # Por defecto no está eliminada
                'created_by': str(request.user.id) if request.user and request.user.is_authenticated and hasattr(request.user, 'id') else None  # Usuario que creó la encuesta
            }
            
            # Agregar sections si existen
            if 'sections' in validated_data:
                survey_doc['sections'] = validated_data['sections']
            
            result = surveys_collection.insert_one(survey_doc)
            new_survey = surveys_collection.find_one({'_id': result.inserted_id})
            new_survey['id'] = str(new_survey['_id'])
            
            # Enriquecer con información del grupo y usuario creador
            groups_collection = get_survey_groups_collection()
            users_collection = get_mongo_collection('users')
            
            # Obtener nombre del grupo
            group_id = new_survey.get('group')
            if group_id:
                try:
                    group_obj = groups_collection.find_one({'_id': ObjectId(group_id)})
                    if not group_obj:
                        group_obj = groups_collection.find_one({'_id': group_id})
                    if group_obj:
                        new_survey['group_name'] = group_obj.get('name', 'Sin grupo')
                    else:
                        new_survey['group_name'] = 'Sin grupo'
                except Exception:
                    try:
                        group_obj = groups_collection.find_one({'_id': group_id})
                        if group_obj:
                            new_survey['group_name'] = group_obj.get('name', 'Sin grupo')
                        else:
                            new_survey['group_name'] = 'Sin grupo'
                    except Exception:
                        new_survey['group_name'] = 'Sin grupo'
            else:
                new_survey['group_name'] = 'Sin grupo'
            
            # Obtener username del usuario creador
            created_by = new_survey.get('created_by')
            if created_by:
                try:
                    user_obj = users_collection.find_one({'_id': ObjectId(created_by)})
                    if not user_obj:
                        user_obj = users_collection.find_one({'_id': created_by})
                    if not user_obj:
                        user_obj = users_collection.find_one({'id': str(created_by)})
                    if user_obj:
                        new_survey['created_by_username'] = user_obj.get('username', 'Usuario desconocido')
                    else:
                        new_survey['created_by_username'] = 'Usuario desconocido'
                except Exception:
                    try:
                        user_obj = users_collection.find_one({'_id': created_by})
                        if user_obj:
                            new_survey['created_by_username'] = user_obj.get('username', 'Usuario desconocido')
                        else:
                            new_survey['created_by_username'] = 'Usuario desconocido'
                    except Exception:
                        new_survey['created_by_username'] = 'Usuario desconocido'
            else:
                new_survey['created_by_username'] = None
            
            return Response(SurveySerializer(new_survey).data, status=status.HTTP_201_CREATED)

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
        
        # Verificar permisos según el grupo del usuario
        user_role = None
        user_group_id = None
        if request.user and hasattr(request.user, 'is_authenticated') and request.user.is_authenticated:
            try:
                user_role = getattr(request.user, 'role', None)
                user_group_id = getattr(request.user, 'user_group_id', None)
            except (AttributeError, TypeError):
                user_role = None
                user_group_id = None
        
        survey_group = survey.get('group')
        
        # Si el usuario NO es root y tiene user_group_id: solo puede ver encuestas de su grupo
        if user_role != 'root' and user_group_id:
            # Verificar que la encuesta pertenece al grupo del usuario
            try:
                if str(survey_group) != str(user_group_id) and str(survey_group) != str(ObjectId(user_group_id)):
                    return Response(
                        {"detail": "No tienes permisos para ver esta encuesta."},
                        status=status.HTTP_403_FORBIDDEN
                    )
            except Exception:
                if str(survey_group) != str(user_group_id):
                    return Response(
                        {"detail": "No tienes permisos para ver esta encuesta."},
                        status=status.HTTP_403_FORBIDDEN
                    )
        elif user_role != 'root' and not user_group_id:
            # Usuario sin grupo asignado y no es root: no puede ver ninguna encuesta
            return Response(
                {"detail": "No tienes permisos para ver esta encuesta."},
                status=status.HTTP_403_FORBIDDEN
            )
        # Si el usuario es root: puede ver todas las encuestas (con o sin grupo)
        
        # Enriquecer con información del grupo y usuario creador
        groups_collection = get_survey_groups_collection()
        users_collection = get_mongo_collection('users')
        
        # Obtener nombre del grupo
        group_id = survey.get('group')
        if group_id:
            try:
                group_obj = groups_collection.find_one({'_id': ObjectId(group_id)})
                if not group_obj:
                    group_obj = groups_collection.find_one({'_id': group_id})
                if group_obj:
                    survey['group_name'] = group_obj.get('name', 'Sin grupo')
                else:
                    survey['group_name'] = 'Sin grupo'
            except Exception:
                try:
                    group_obj = groups_collection.find_one({'_id': group_id})
                    if group_obj:
                        survey['group_name'] = group_obj.get('name', 'Sin grupo')
                    else:
                        survey['group_name'] = 'Sin grupo'
                except Exception:
                    survey['group_name'] = 'Sin grupo'
        else:
            survey['group_name'] = 'Sin grupo'
        
        # Obtener username del usuario creador
        created_by = survey.get('created_by')
        if created_by:
            try:
                user_obj = users_collection.find_one({'_id': ObjectId(created_by)})
                if not user_obj:
                    user_obj = users_collection.find_one({'_id': created_by})
                if not user_obj:
                    user_obj = users_collection.find_one({'id': str(created_by)})
                if user_obj:
                    survey['created_by_username'] = user_obj.get('username', 'Usuario desconocido')
                else:
                    survey['created_by_username'] = 'Usuario desconocido'
            except Exception:
                try:
                    user_obj = users_collection.find_one({'_id': created_by})
                    if user_obj:
                        survey['created_by_username'] = user_obj.get('username', 'Usuario desconocido')
                    else:
                        survey['created_by_username'] = 'Usuario desconocido'
                except Exception:
                    survey['created_by_username'] = 'Usuario desconocido'
        else:
            survey['created_by_username'] = None
        
        serializer = SurveySerializer(survey)
        return Response(serializer.data)

    def put(self, request, pk):
        survey = self.get_object(pk)
        
        # Verificar permisos: si es group_admin, solo puede actualizar encuestas de su grupo
        user_role = None
        user_group_id = None
        if request.user and hasattr(request.user, 'is_authenticated') and request.user.is_authenticated:
            try:
                user_role = getattr(request.user, 'role', None)
                user_group_id = getattr(request.user, 'user_group_id', None)
            except (AttributeError, TypeError):
                user_role = None
                user_group_id = None
        
        if user_role == 'group_admin' and user_group_id:
            # Verificar que la encuesta pertenece al grupo del admin
            survey_group = survey.get('group')
            try:
                if str(survey_group) != str(user_group_id) and str(survey_group) != str(ObjectId(user_group_id)):
                    return Response(
                        {"detail": "No tienes permisos para actualizar esta encuesta."},
                        status=status.HTTP_403_FORBIDDEN
                    )
            except Exception:
                if str(survey_group) != str(user_group_id):
                    return Response(
                        {"detail": "No tienes permisos para actualizar esta encuesta."},
                        status=status.HTTP_403_FORBIDDEN
                    )
        
        serializer = SurveySerializer(survey, data=request.data, partial=True)
        if serializer.is_valid():
            surveys_collection = get_surveys_collection()
            validated_data = serializer.validated_data
            
            # Si el usuario tiene un grupo asignado (no es root), forzar el uso de su grupo
            # Esto garantiza que las encuestas siempre pertenezcan al grupo del usuario
            if user_role and user_group_id and user_role != 'root':
                # Verificar que el grupo existe
                groups_collection = get_survey_groups_collection()
                group_obj = None
                
                try:
                    if isinstance(user_group_id, ObjectId):
                        group_obj = groups_collection.find_one({"_id": user_group_id})
                    else:
                        if ObjectId.is_valid(str(user_group_id)):
                            group_obj = groups_collection.find_one({"_id": ObjectId(user_group_id)})
                except Exception:
                    pass
                
                if not group_obj:
                    try:
                        group_obj = groups_collection.find_one({"_id": user_group_id})
                    except Exception:
                        pass
                
                if group_obj:
                    # Forzar el grupo del usuario (sobrescribir cualquier cambio)
                    validated_data['group'] = group_obj['_id']
                # Si el grupo no existe, mantener el grupo original de la encuesta
            
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
        
        # Verificar permisos: si es group_admin, solo puede eliminar encuestas de su grupo
        user_role = None
        user_group_id = None
        if request.user and hasattr(request.user, 'is_authenticated') and request.user.is_authenticated:
            try:
                user_role = getattr(request.user, 'role', None)
                user_group_id = getattr(request.user, 'user_group_id', None)
            except (AttributeError, TypeError):
                user_role = None
                user_group_id = None
        
        if user_role == 'group_admin' and user_group_id:
            # Verificar que la encuesta pertenece al grupo del admin
            survey_group = survey.get('group')
            try:
                if str(survey_group) != str(user_group_id) and str(survey_group) != str(ObjectId(user_group_id)):
                    return Response(
                        {"detail": "No tienes permisos para eliminar esta encuesta."},
                        status=status.HTTP_403_FORBIDDEN
                    )
            except Exception:
                if str(survey_group) != str(user_group_id):
                    return Response(
                        {"detail": "No tienes permisos para eliminar esta encuesta."},
                        status=status.HTTP_403_FORBIDDEN
                    )
        
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
        """
        Wrapper para capturar excepciones no manejadas y asegurar respuestas JSON válidas.
        """
        try:
            return self._get_impl(request)
        except Exception as e:
            import logging
            import traceback
            logger = logging.getLogger(__name__)
            logger.error("=" * 60)
            logger.error("UNHANDLED EXCEPTION in CurrentUserView.get")
            logger.error(f"Error type: {type(e).__name__}")
            logger.error(f"Error message: {str(e)}")
            logger.error(f"Traceback: {traceback.format_exc()}")
            logger.error("=" * 60)
            
            # Devolver respuesta JSON válida
            try:
                return Response(
                    {
                        "detail": f"Error inesperado al obtener información del usuario: {str(e)[:200]}",
                        "error_type": type(e).__name__
                    },
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
            except Exception as response_error:
                logger.error(f"Error creating error response: {response_error}")
                # Fallback absoluto
                return Response(
                    {"detail": "Error interno del servidor."},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
    
    def _get_impl(self, request):
        # #region agent log
        import json
        import traceback
        import os
        # Detectar la ruta correcta del log (desarrollo vs producción)
        base_paths = [
            '/home/vps/Documentos/survey-app/.cursor/debug.log',  # Desarrollo local
            '/app/.cursor/debug.log',  # Producción Docker
            os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), '.cursor', 'debug.log')  # Fallback
        ]
        log_file_path = None
        for path in base_paths:
            log_dir = os.path.dirname(path)
            if os.path.exists(log_dir) or os.path.exists(os.path.dirname(log_dir)):
                log_file_path = path
                # Crear directorio si no existe
                try:
                    os.makedirs(log_dir, exist_ok=True)
                except:
                    pass
                break
        if not log_file_path:
            log_file_path = '/tmp/survey_debug.log'  # Fallback final
        try:
            with open(log_file_path, 'a') as f:
                f.write(json.dumps({
                    "sessionId": "debug-session",
                    "runId": "run1",
                    "hypothesisId": "A",
                    "location": "views.py:1288",
                    "message": "CurrentUserView.get called",
                    "data": {
                        "user_authenticated": request.user.is_authenticated if request.user else False,
                        "user_id": request.user.id if request.user and hasattr(request.user, 'id') else None,
                        "user_username": request.user.username if request.user else None,
                        "user_type": type(request.user).__name__ if request.user else None
                    },
                    "timestamp": int(__import__('time').time() * 1000)
                }) + '\n')
        except Exception:
            pass
        # #endregion
        
        try:
            # Verificar si es un MongoUser (autenticación MongoDB)
            from .mongo_user_model import MongoUser
            
            # #region agent log
            try:
                with open(log_file_path, 'a') as f:
                    f.write(json.dumps({
                        "sessionId": "debug-session",
                        "runId": "run1",
                        "hypothesisId": "A",
                        "location": "views.py:1313",
                        "message": "CurrentUserView - checking user type",
                        "data": {
                            "user_type": type(request.user).__name__ if request.user else None,
                            "is_mongo_user": isinstance(request.user, MongoUser) if request.user else False,
                            "has_date_joined": hasattr(request.user, 'date_joined') if request.user else False,
                            "date_joined_type": type(request.user.date_joined).__name__ if request.user and hasattr(request.user, 'date_joined') and request.user.date_joined else None
                        },
                        "timestamp": int(__import__('time').time() * 1000)
                    }) + '\n')
            except Exception:
                pass
            # #endregion
            
            if isinstance(request.user, MongoUser):
                # Si es MongoUser, crear un diccionario con los datos
                # Manejar date_joined correctamente (puede ser datetime, string, o None)
                date_joined_value = None
                if request.user.date_joined:
                    if hasattr(request.user.date_joined, 'isoformat'):
                        # Es un objeto datetime
                        date_joined_value = request.user.date_joined.isoformat()
                    elif isinstance(request.user.date_joined, str):
                        # Ya es un string
                        date_joined_value = request.user.date_joined
                    else:
                        # Intentar convertir a string
                        date_joined_value = str(request.user.date_joined)
                
                # Manejar user_group_id de forma segura (puede ser ObjectId, string, o None)
                user_group_id_value = None
                user_group_id_raw = getattr(request.user, 'user_group_id', None)
                if user_group_id_raw:
                    if isinstance(user_group_id_raw, ObjectId):
                        user_group_id_value = str(user_group_id_raw)
                    elif isinstance(user_group_id_raw, str):
                        user_group_id_value = user_group_id_raw
                    else:
                        user_group_id_value = str(user_group_id_raw)
                
                # Construir user_data de forma segura, manejando todos los posibles errores
                user_data = {}
                try:
                    user_data['id'] = str(request.user.id) if hasattr(request.user, 'id') and request.user.id else None
                except Exception as e:
                    import logging
                    logger = logging.getLogger(__name__)
                    logger.error(f"Error getting user.id: {e}")
                    user_data['id'] = None
                
                try:
                    user_data['username'] = str(request.user.username) if hasattr(request.user, 'username') and request.user.username else ''
                except Exception as e:
                    user_data['username'] = ''
                
                try:
                    user_data['first_name'] = str(request.user.first_name) if hasattr(request.user, 'first_name') and request.user.first_name else ''
                except Exception as e:
                    user_data['first_name'] = ''
                
                try:
                    user_data['last_name'] = str(request.user.last_name) if hasattr(request.user, 'last_name') and request.user.last_name else ''
                except Exception as e:
                    user_data['last_name'] = ''
                
                try:
                    user_data['email'] = str(request.user.email) if hasattr(request.user, 'email') and request.user.email else ''
                except Exception as e:
                    user_data['email'] = ''
                
                try:
                    user_data['role'] = str(request.user.role) if hasattr(request.user, 'role') and request.user.role else 'encuestador'
                except Exception as e:
                    user_data['role'] = 'encuestador'
                
                try:
                    user_data['is_active'] = bool(request.user.is_active) if hasattr(request.user, 'is_active') else True
                except Exception as e:
                    user_data['is_active'] = True
                
                user_data['date_joined'] = date_joined_value
                user_data['user_group_id'] = user_group_id_value
                # #region agent log
                try:
                    with open(log_file_path, 'a') as f:
                        f.write(json.dumps({
                            "sessionId": "debug-session",
                            "runId": "run1",
                            "hypothesisId": "A",
                            "location": "views.py:1288",
                            "message": "CurrentUserView - MongoUser detected, returning dict",
                            "data": {
                                "user_data_keys": list(user_data.keys())
                            },
                            "timestamp": int(__import__('time').time() * 1000)
                        }) + '\n')
                except Exception:
                    pass
                # #endregion
                # Validar que user_data se puede serializar
                try:
                    json.dumps(user_data)
                    return Response(user_data)
                except Exception as json_error:
                    import logging
                    logger = logging.getLogger(__name__)
                    logger.error(f"Error serializing user_data in CurrentUserView: {json_error}")
                    logger.error(f"user_data: {user_data}")
                    # Intentar crear una versión simplificada
                    safe_user_data = {
                        'id': str(request.user.id) if request.user.id else None,
                        'username': str(request.user.username) if request.user.username else '',
                        'email': str(request.user.email) if request.user.email else '',
                        'role': str(request.user.role) if request.user.role else 'encuestador',
                        'is_active': True,
                        'user_group_id': None  # Omitir si causa problemas
                    }
                    return Response(safe_user_data)
            else:
                # Si es un modelo de Django normal, usar el serializer
                try:
                    serializer = UserSerializer(request.user)
                    # #region agent log
                    try:
                        with open(log_file_path, 'a') as f:
                            f.write(json.dumps({
                                "sessionId": "debug-session",
                                "runId": "run1",
                                "hypothesisId": "A",
                                "location": "views.py:2469",
                                "message": "UserSerializer created successfully",
                                "data": {
                                    "serializer_data_keys": list(serializer.data.keys()) if serializer.data else []
                                },
                                "timestamp": int(__import__('time').time() * 1000)
                            }) + '\n')
                    except Exception:
                        pass
                    # #endregion
                    return Response(serializer.data)
                except Exception as serializer_error:
                    import logging
                    logger = logging.getLogger(__name__)
                    logger.error(f"Error with UserSerializer in CurrentUserView: {serializer_error}")
                    logger.error(f"Traceback: {traceback.format_exc()}")
                    # Devolver datos mínimos
                    return Response({
                        'id': str(request.user.id) if request.user and hasattr(request.user, 'id') else None,
                        'username': str(request.user.username) if request.user and hasattr(request.user, 'username') else '',
                        'role': 'encuestador'
                    })
        except Exception as e:
            # #region agent log
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"CurrentUserView.get failed: {type(e).__name__} - {str(e)}")
            logger.error(f"Traceback: {traceback.format_exc()}")
            
            try:
                with open(log_file_path, 'a') as f:
                    f.write(json.dumps({
                        "sessionId": "debug-session",
                        "runId": "run1",
                        "hypothesisId": "A",
                        "location": "views.py:1288",
                        "message": "CurrentUserView.get failed",
                        "data": {
                            "error_type": type(e).__name__,
                            "error_message": str(e),
                            "traceback": traceback.format_exc()[:500]
                        },
                        "timestamp": int(__import__('time').time() * 1000)
                    }) + '\n')
            except Exception:
                pass
            # #endregion
            
            # Devolver error JSON en lugar de dejar que Django devuelva HTML
            # Asegurar que el mensaje sea serializable
            try:
                error_message = str(e)[:500]  # Limitar tamaño
                error_response = {
                    "detail": f"Error al obtener información del usuario: {error_message}",
                    "error_type": type(e).__name__
                }
                # Validar que se puede serializar
                json.dumps(error_response)
                return Response(error_response, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            except Exception as final_error:
                # Fallback absoluto
                logger.error(f"Error creating error response: {final_error}")
                return Response(
                    {"detail": "Error interno del servidor al obtener información del usuario."},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )

class UserListCreate(APIView):
    """
    Lista todos los usuarios o crea un nuevo usuario.
    Solo disponible para usuarios 'root'.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        # Verificar que el usuario es 'root' o 'group_admin'
        permission_error = require_admin_permission(request, "ver usuarios")
        if permission_error:
            return permission_error
        
        user_role, user_group_id = get_user_role_and_group(request)

        # Obtener usuarios de MongoDB
        from .mongo_utils import get_mongo_collection
        import json
        import traceback
        log_file_path = '/home/vps/Documentos/survey-app/.cursor/debug.log'
        
        try:
            users_collection = get_mongo_collection('users')
            
            # Si es group_admin, solo mostrar usuarios de su grupo
            if user_role == 'group_admin' and user_group_id:
                try:
                    query = {'user_group_id': ObjectId(user_group_id)}
                except Exception:
                    query = {'user_group_id': user_group_id}
                users_docs = list(users_collection.find(query).sort('date_joined', -1))
            else:
                # Root puede ver todos los usuarios
                users_docs = list(users_collection.find().sort('date_joined', -1))
            
            # Obtener todos los grupos para enriquecer usuarios con nombres de grupos
            groups_collection = get_survey_groups_collection()
            groups_dict = {}
            try:
                all_groups = list(groups_collection.find({}, {'_id': 1, 'name': 1}))
                for group in all_groups:
                    groups_dict[str(group.get('_id'))] = group.get('name', 'Sin nombre')
            except Exception:
                pass
            
            # Convertir documentos de MongoDB a diccionarios para el serializer
            users_data = []
            for user_doc in users_docs:
                # Manejar date_joined correctamente
                date_joined_value = None
                date_joined = user_doc.get('date_joined')
                if date_joined:
                    if hasattr(date_joined, 'isoformat'):
                        # Es un objeto datetime
                        date_joined_value = date_joined.isoformat()
                    elif isinstance(date_joined, str):
                        # Ya es un string
                        date_joined_value = date_joined
                    else:
                        # Intentar convertir a string
                        date_joined_value = str(date_joined)
                
                # Manejar user_group_id de forma segura
                user_group_id_value = None
                user_group_id_raw = user_doc.get('user_group_id')
                if user_group_id_raw:
                    if isinstance(user_group_id_raw, ObjectId):
                        user_group_id_value = str(user_group_id_raw)
                    elif isinstance(user_group_id_raw, str):
                        user_group_id_value = user_group_id_raw
                    else:
                        user_group_id_value = str(user_group_id_raw)
                
                # Obtener nombre del grupo si el usuario tiene user_group_id
                group_name = None
                if user_group_id_value:
                    group_name = groups_dict.get(user_group_id_value)
                    # Si no se encontró, intentar buscar directamente
                    if not group_name:
                        try:
                            group_obj = groups_collection.find_one({"_id": ObjectId(user_group_id_value)})
                            if not group_obj:
                                group_obj = groups_collection.find_one({"_id": user_group_id_value})
                            if group_obj:
                                group_name = group_obj.get('name', 'Sin nombre')
                        except Exception:
                            pass
                
                user_data = {
                    'id': str(user_doc.get('_id', user_doc.get('id'))),
                    'username': user_doc.get('username'),
                    'email': user_doc.get('email', ''),
                    'role': user_doc.get('role', 'encuestador'),
                    'is_active': user_doc.get('is_active', True),
                    'first_name': user_doc.get('first_name', ''),
                    'last_name': user_doc.get('last_name', ''),
                    'date_joined': date_joined_value,
                    'user_group_id': user_group_id_value,
                    'group_name': group_name  # Nombre del grupo asociado
                }
                users_data.append(user_data)
            
            # #region agent log
            try:
                with open(log_file_path, 'a') as f:
                    f.write(json.dumps({
                        "sessionId": "debug-session",
                        "runId": "run1",
                        "hypothesisId": "G",
                        "location": "views.py:1437",
                        "message": "UserListCreate.get - users converted to dicts",
                        "data": {
                            "users_count": len(users_data)
                        },
                        "timestamp": int(__import__('time').time() * 1000)
                    }) + '\n')
            except Exception:
                pass
            # #endregion
            
            # Usar un serializer simple o devolver directamente los datos
            # Como UserSerializer es ModelSerializer, devolvemos los datos directamente
            return Response(users_data)
        except Exception as e:
            # #region agent log
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"UserListCreate.get failed: {type(e).__name__} - {str(e)}")
            logger.error(f"Traceback: {traceback.format_exc()}")
            
            try:
                with open(log_file_path, 'a') as f:
                    f.write(json.dumps({
                        "sessionId": "debug-session",
                        "runId": "run1",
                        "hypothesisId": "G",
                        "location": "views.py:1437",
                        "message": "UserListCreate.get failed",
                        "data": {
                            "error_type": type(e).__name__,
                            "error_message": str(e),
                            "traceback": traceback.format_exc()
                        },
                        "timestamp": int(__import__('time').time() * 1000)
                    }) + '\n')
            except Exception:
                pass
            # #endregion
            raise

    def post(self, request):
        try:
            # Verificar que el usuario es 'root' o 'group_admin'
            permission_error = require_admin_permission(request, "crear usuarios")
            if permission_error:
                return permission_error
            
            user_role, user_group_id = get_user_role_and_group(request)

            serializer = UserCreateSerializer(data=request.data)
            if serializer.is_valid():
                # Si es group_admin, asignar automáticamente el grupo del usuario
                if user_role == 'group_admin' and user_group_id:
                    # Asegurar que el usuario creado pertenece al grupo del admin
                    # Verificar que el role no sea 'root' ni 'group_admin' (solo root puede crear estos roles)
                    requested_role = serializer.validated_data.get('role', 'encuestador')
                    if requested_role == 'root':
                        return Response(
                            {"detail": "No tienes permisos para crear usuarios con rol 'root'."},
                            status=status.HTTP_403_FORBIDDEN
                        )
                    if requested_role == 'group_admin':
                        return Response(
                            {"detail": "No tienes permisos para crear usuarios con rol 'Administrador de Grupo'. Solo puedes crear 'Encuestador' o 'Analista'."},
                            status=status.HTTP_403_FORBIDDEN
                        )
                    
                    from .mongo_user_utils import create_user
                    user_data = serializer.validated_data
                    # Asegurar que el rol sea válido para group_admin (solo encuestador o analista)
                    if requested_role not in ['encuestador', 'analista']:
                        return Response(
                            {"detail": "Solo puedes crear usuarios con rol 'Encuestador' o 'Analista'."},
                            status=status.HTTP_403_FORBIDDEN
                        )
                    # Crear usuario directamente en MongoDB con el grupo asignado automáticamente
                    try:
                        user_doc = create_user(
                            username=user_data['username'],
                            password=user_data['password'],
                            email=user_data.get('email', ''),
                            role=requested_role,  # Solo puede ser 'encuestador' o 'analista'
                            first_name=user_data.get('first_name', ''),
                            last_name=user_data.get('last_name', ''),
                            user_group_id=user_group_id  # Asignar automáticamente al grupo del admin
                        )
                        # Manejar date_joined de forma segura
                        date_joined_value = None
                        if user_doc.get('date_joined'):
                            date_joined = user_doc.get('date_joined')
                            if hasattr(date_joined, 'isoformat'):
                                date_joined_value = date_joined.isoformat()
                            elif isinstance(date_joined, str):
                                date_joined_value = date_joined
                            else:
                                date_joined_value = str(date_joined)
                        
                        # Obtener el nombre del grupo
                        user_group_id_str = str(user_doc.get('user_group_id')) if user_doc.get('user_group_id') else None
                        group_name = None
                        if user_group_id_str:
                            try:
                                groups_collection = get_survey_groups_collection()
                                group_obj = groups_collection.find_one({"_id": ObjectId(user_group_id_str)})
                                if not group_obj:
                                    group_obj = groups_collection.find_one({"_id": user_group_id_str})
                                if group_obj:
                                    group_name = group_obj.get('name', 'Sin nombre')
                            except Exception:
                                pass
                        
                        return Response({
                            'id': str(user_doc.get('_id', user_doc.get('id', ''))),
                            'username': user_doc.get('username', ''),
                            'email': user_doc.get('email', ''),
                            'role': user_doc.get('role', 'encuestador'),
                            'is_active': user_doc.get('is_active', True),
                            'first_name': user_doc.get('first_name', ''),
                            'last_name': user_doc.get('last_name', ''),
                            'date_joined': date_joined_value,
                            'user_group_id': user_group_id_str,
                            'group_name': group_name
                        }, status=status.HTTP_201_CREATED)
                    except ValueError as e:
                        # Usuario ya existe
                        return Response(
                            {"detail": str(e), "username": ["Un usuario con este nombre de usuario ya existe."]},
                            status=status.HTTP_400_BAD_REQUEST
                        )
                    except Exception as e:
                        # Cualquier otro error
                        import traceback
                        import logging
                        logger = logging.getLogger(__name__)
                        logger.error(f"Error creating user (group_admin): {type(e).__name__} - {str(e)}")
                        logger.error(f"Traceback: {traceback.format_exc()}")
                        return Response(
                            {"detail": f"Error al crear usuario: {str(e)}"},
                            status=status.HTTP_500_INTERNAL_SERVER_ERROR
                        )
                else:
                    # Si es root, crear usuario usando el serializer (que maneja MongoDB)
                    from .mongo_user_utils import create_user
                    user_data = serializer.validated_data
                    try:
                        # Convertir user_group_id a ObjectId si es un string válido
                        user_group_id_input = user_data.get('user_group_id')
                        user_group_id_to_save = None
                        if user_group_id_input and user_group_id_input != '':
                            try:
                                if ObjectId.is_valid(str(user_group_id_input)):
                                    user_group_id_to_save = ObjectId(user_group_id_input)
                                else:
                                    user_group_id_to_save = str(user_group_id_input)
                            except Exception:
                                user_group_id_to_save = str(user_group_id_input)
                        
                        user_doc = create_user(
                            username=user_data['username'],
                            password=user_data['password'],
                            email=user_data.get('email', ''),
                            role=user_data.get('role', 'encuestador'),
                            first_name=user_data.get('first_name', ''),
                            last_name=user_data.get('last_name', ''),
                            user_group_id=user_group_id_to_save  # Root puede asignar cualquier grupo
                        )
                        # Manejar date_joined de forma segura
                        date_joined_value = None
                        if user_doc.get('date_joined'):
                            date_joined = user_doc.get('date_joined')
                            if hasattr(date_joined, 'isoformat'):
                                date_joined_value = date_joined.isoformat()
                            elif isinstance(date_joined, str):
                                date_joined_value = date_joined
                            else:
                                date_joined_value = str(date_joined)
                        
                        # Obtener el nombre del grupo
                        user_group_id_str = str(user_doc.get('user_group_id')) if user_doc.get('user_group_id') else None
                        group_name = None
                        if user_group_id_str:
                            try:
                                groups_collection = get_survey_groups_collection()
                                group_obj = groups_collection.find_one({"_id": ObjectId(user_group_id_str)})
                                if not group_obj:
                                    group_obj = groups_collection.find_one({"_id": user_group_id_str})
                                if group_obj:
                                    group_name = group_obj.get('name', 'Sin nombre')
                            except Exception:
                                pass
                        
                        return Response({
                            'id': str(user_doc.get('_id', user_doc.get('id', ''))),
                            'username': user_doc.get('username', ''),
                            'email': user_doc.get('email', ''),
                            'role': user_doc.get('role', 'encuestador'),
                            'is_active': user_doc.get('is_active', True),
                            'first_name': user_doc.get('first_name', ''),
                            'last_name': user_doc.get('last_name', ''),
                            'date_joined': date_joined_value,
                            'user_group_id': user_group_id_str,
                            'group_name': group_name
                        }, status=status.HTTP_201_CREATED)
                    except ValueError as e:
                        # Usuario ya existe
                        return Response(
                            {"detail": str(e), "username": ["Un usuario con este nombre de usuario ya existe."]},
                            status=status.HTTP_400_BAD_REQUEST
                        )
                    except Exception as e:
                        # Cualquier otro error
                        import traceback
                        import logging
                        logger = logging.getLogger(__name__)
                        logger.error(f"Error creating user (root): {type(e).__name__} - {str(e)}")
                        logger.error(f"Traceback: {traceback.format_exc()}")
                        return Response(
                            {"detail": f"Error al crear usuario: {str(e)}"},
                            status=status.HTTP_500_INTERNAL_SERVER_ERROR
                        )
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            # Capturar cualquier excepción no manejada y devolver JSON en lugar de HTML
            import traceback
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Unexpected error in UserListCreate.post: {type(e).__name__} - {str(e)}")
            logger.error(f"Traceback: {traceback.format_exc()}")
            return Response(
                {"detail": f"Error inesperado al crear usuario: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

class UserRetrieveUpdateDestroy(APIView):
    """
    Recupera, actualiza o elimina un usuario específico.
    Solo disponible para usuarios 'root'.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self, pk):
        from .mongo_user_utils import get_user_by_id
        from .mongo_user_model import MongoUser
        
        user_doc = get_user_by_id(pk)
        if user_doc is None:
            raise NotFound(detail="Usuario no encontrado.")
        
        user = MongoUser(
            id=str(user_doc.get('_id', user_doc.get('id'))),
            username=user_doc.get('username'),
            email=user_doc.get('email', ''),
            role=user_doc.get('role', 'encuestador'),
            is_active=user_doc.get('is_active', True),
            is_staff=user_doc.get('is_staff', False),
            is_superuser=user_doc.get('is_superuser', False),
            first_name=user_doc.get('first_name', ''),
            last_name=user_doc.get('last_name', ''),
            date_joined=user_doc.get('date_joined'),
            user_group_id=user_doc.get('user_group_id'),
        )
        return user

    def get(self, request, pk):
        # Verificar que el usuario es 'root' o 'group_admin'
        permission_error = require_admin_permission(request, "ver usuarios")
        if permission_error:
            return permission_error

        user = self.get_object(pk)
        
        # Si es group_admin, verificar que el usuario pertenece a su grupo
        user_role, user_group_id = get_user_role_and_group(request)
        if user_role == 'group_admin' and user_group_id:
            from .mongo_user_utils import get_user_by_id
            user_doc = get_user_by_id(pk)
            if user_doc:
                user_doc_group_id = user_doc.get('user_group_id')
                access_check = check_group_admin_access(
                    user_role, user_group_id, user_doc_group_id,
                    "No tienes permisos para ver este usuario."
                )
                if access_check:
                    return access_check
        
        serializer = UserSerializer(user)
        return Response(serializer.data)

    def put(self, request, pk):
        # Verificar que el usuario es 'root' o 'group_admin'
        permission_error = require_admin_permission(request, "actualizar usuarios")
        if permission_error:
            return permission_error
        
        # Si es group_admin, verificar que el usuario pertenece a su grupo
        user_role, user_group_id = get_user_role_and_group(request)
        if user_role == 'group_admin' and user_group_id:
            from .mongo_user_utils import get_user_by_id
            user_doc = get_user_by_id(pk)
            if user_doc:
                user_doc_group_id = user_doc.get('user_group_id')
                access_check = check_group_admin_access(
                    user_role, user_group_id, user_doc_group_id,
                    "No tienes permisos para actualizar este usuario."
                )
                if access_check:
                    return access_check

        import json
        import traceback
        log_file_path = '/home/vps/Documentos/survey-app/.cursor/debug.log'
        
        # #region agent log
        try:
            with open(log_file_path, 'a') as f:
                f.write(json.dumps({
                    "sessionId": "debug-session",
                    "runId": "run1",
                    "hypothesisId": "H",
                    "location": "views.py:1608",
                    "message": "UserRetrieveUpdateDestroy.put called",
                    "data": {
                        "pk": str(pk),
                        "pk_type": type(pk).__name__
                    },
                    "timestamp": int(__import__('time').time() * 1000)
                }) + '\n')
        except Exception:
            pass
        # #endregion
        
        try:
            user = self.get_object(pk)
            
            # #region agent log
            try:
                with open(log_file_path, 'a') as f:
                    f.write(json.dumps({
                        "sessionId": "debug-session",
                        "runId": "run1",
                        "hypothesisId": "H",
                        "location": "views.py:1608",
                        "message": "User found, updating",
                        "data": {
                            "user_id": str(user.id) if user else None,
                            "username": user.username if user else None
                        },
                        "timestamp": int(__import__('time').time() * 1000)
                    }) + '\n')
            except Exception:
                pass
            # #endregion
            
            serializer = UserUpdateSerializer(user, data=request.data, partial=True)
            if serializer.is_valid():
                # Si es group_admin, no permitir cambiar el user_group_id
                if user_role == 'group_admin' and user_group_id:
                    # Asegurar que el usuario actualizado mantiene su grupo
                    from .mongo_user_utils import get_user_by_id
                    current_user_doc = get_user_by_id(pk)
                    if current_user_doc and 'user_group_id' in request.data:
                        # Remover user_group_id de los datos validados para que no se actualice
                        validated_data = serializer.validated_data
                        validated_data.pop('user_group_id', None)
                        # Reasignar los datos validados sin user_group_id
                        serializer = UserUpdateSerializer(user, data={**request.data, 'user_group_id': None}, partial=True)
                        serializer.is_valid(raise_exception=True)
                
                serializer.save()
                
                # Obtener el usuario actualizado de MongoDB y devolverlo como diccionario
                from .mongo_user_utils import get_user_by_id
                updated_user_doc = get_user_by_id(pk)
                
                if updated_user_doc:
                    # Manejar date_joined correctamente
                    date_joined_value = None
                    date_joined = updated_user_doc.get('date_joined')
                    if date_joined:
                        if hasattr(date_joined, 'isoformat'):
                            date_joined_value = date_joined.isoformat()
                        elif isinstance(date_joined, str):
                            date_joined_value = date_joined
                        else:
                            date_joined_value = str(date_joined)
                    
                    # Manejar user_group_id de forma segura (puede ser ObjectId, string, o None)
                    user_group_id_value = None
                    user_group_id_raw = updated_user_doc.get('user_group_id')
                    if user_group_id_raw:
                        if isinstance(user_group_id_raw, ObjectId):
                            user_group_id_value = str(user_group_id_raw)
                        elif isinstance(user_group_id_raw, str):
                            user_group_id_value = user_group_id_raw
                        else:
                            user_group_id_value = str(user_group_id_raw)
                    
                    # Obtener el nombre del grupo si el usuario tiene uno asignado
                    group_name = None
                    if user_group_id_value:
                        try:
                            groups_collection = get_survey_groups_collection()
                            group_obj = groups_collection.find_one({"_id": ObjectId(user_group_id_value)})
                            if not group_obj:
                                group_obj = groups_collection.find_one({"_id": user_group_id_value})
                            if group_obj:
                                group_name = group_obj.get('name', 'Sin nombre')
                        except Exception:
                            pass
                    
                    user_data = {
                        'id': str(updated_user_doc.get('_id', updated_user_doc.get('id'))),
                        'username': updated_user_doc.get('username'),
                        'email': updated_user_doc.get('email', ''),
                        'role': updated_user_doc.get('role', 'encuestador'),
                        'is_active': updated_user_doc.get('is_active', True),
                        'first_name': updated_user_doc.get('first_name', ''),
                        'last_name': updated_user_doc.get('last_name', ''),
                        'date_joined': date_joined_value,
                        'user_group_id': user_group_id_value,
                        'group_name': group_name
                    }
                    
                    # #region agent log
                    try:
                        with open(log_file_path, 'a') as f:
                            f.write(json.dumps({
                                "sessionId": "debug-session",
                                "runId": "run1",
                                "hypothesisId": "H",
                                "location": "views.py:1608",
                                "message": "User updated successfully",
                                "data": {
                                    "user_id": user_data.get('id')
                                },
                                "timestamp": int(__import__('time').time() * 1000)
                            }) + '\n')
                    except Exception:
                        pass
                    # #endregion
                    
                    return Response(user_data)
                else:
                    # Si no se encuentra, devolver los datos del objeto user actualizado
                    # Obtener user_group_id del objeto user si está disponible
                    user_group_id_value = None
                    if hasattr(user, 'user_group_id') and user.user_group_id:
                        if isinstance(user.user_group_id, ObjectId):
                            user_group_id_value = str(user.user_group_id)
                        else:
                            user_group_id_value = str(user.user_group_id)
                    
                    user_data = {
                        'id': str(user.id),
                        'username': user.username,
                        'email': user.email,
                        'role': user.role,
                        'is_active': user.is_active,
                        'first_name': user.first_name,
                        'last_name': user.last_name,
                        'date_joined': user.date_joined.isoformat() if user.date_joined and hasattr(user.date_joined, 'isoformat') else (str(user.date_joined) if user.date_joined else None),
                        'user_group_id': user_group_id_value
                    }
                    return Response(user_data)
            else:
                # #region agent log
                try:
                    with open(log_file_path, 'a') as f:
                        f.write(json.dumps({
                            "sessionId": "debug-session",
                            "runId": "run1",
                            "hypothesisId": "H",
                            "location": "views.py:1608",
                            "message": "Serializer validation failed",
                            "data": {
                                "errors": serializer.errors
                            },
                            "timestamp": int(__import__('time').time() * 1000)
                        }) + '\n')
                except Exception:
                    pass
                # #endregion
                return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        except NotFound as e:
            # #region agent log
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"UserRetrieveUpdateDestroy.put - User not found: {pk}")
            
            try:
                with open(log_file_path, 'a') as f:
                    f.write(json.dumps({
                        "sessionId": "debug-session",
                        "runId": "run1",
                        "hypothesisId": "H",
                        "location": "views.py:1608",
                        "message": "User not found",
                        "data": {
                            "pk": str(pk)
                        },
                        "timestamp": int(__import__('time').time() * 1000)
                    }) + '\n')
            except Exception:
                pass
            # #endregion
            raise
        except Exception as e:
            # #region agent log
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"UserRetrieveUpdateDestroy.put failed: {type(e).__name__} - {str(e)}")
            logger.error(f"Traceback: {traceback.format_exc()}")
            
            try:
                with open(log_file_path, 'a') as f:
                    f.write(json.dumps({
                        "sessionId": "debug-session",
                        "runId": "run1",
                        "hypothesisId": "H",
                        "location": "views.py:1608",
                        "message": "UserRetrieveUpdateDestroy.put failed",
                        "data": {
                            "error_type": type(e).__name__,
                            "error_message": str(e),
                            "traceback": traceback.format_exc()
                        },
                        "timestamp": int(__import__('time').time() * 1000)
                    }) + '\n')
            except Exception:
                pass
            # #endregion
            raise

    def delete(self, request, pk):
        # Verificar que el usuario es 'root' o 'group_admin'
        try:
            user_role = getattr(request.user, 'role', None) if request.user and request.user.is_authenticated else None
            user_group_id = getattr(request.user, 'user_group_id', None) if request.user and request.user.is_authenticated else None
            
            if user_role not in ['root', 'group_admin']:
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
        
        # Si es group_admin, verificar que el usuario pertenece a su grupo
        if user_role == 'group_admin' and user_group_id:
            from .mongo_user_utils import get_user_by_id
            user_doc = get_user_by_id(pk)
            if user_doc:
                user_doc_group_id = user_doc.get('user_group_id')
                try:
                    if str(user_doc_group_id) != str(user_group_id) and str(user_doc_group_id) != str(ObjectId(user_group_id)):
                        return Response(
                            {"detail": "No tienes permisos para eliminar este usuario."},
                            status=status.HTTP_403_FORBIDDEN
                        )
                except Exception:
                    if str(user_doc_group_id) != str(user_group_id):
                        return Response(
                            {"detail": "No tienes permisos para eliminar este usuario."},
                            status=status.HTTP_403_FORBIDDEN
                        )
        
        # No permitir que un usuario se elimine a sí mismo
        if user.id == request.user.id:
            return Response(
                {"detail": "No puedes eliminar tu propio usuario."},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Eliminar de MongoDB
        from .mongo_utils import get_mongo_collection
        from bson import ObjectId
        
        users_collection = get_mongo_collection('users')
        
        try:
            delete_id = ObjectId(user.id)
        except:
            delete_id = user.id
        
        result = users_collection.delete_one({'_id': delete_id})
        
        if result.deleted_count == 0:
            raise NotFound(detail="Usuario no encontrado.")
        
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
