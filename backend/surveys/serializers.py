from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from django.contrib.auth import get_user_model
from bson import ObjectId
import json # Import the json module
from .mongo_user_utils import (
    create_user_in_mongo, get_user_by_username, get_user_by_id,
    update_user_in_mongo, list_users_from_mongo, user_exists_in_mongo
)

User = get_user_model()  # Mantener para compatibilidad, pero usar funciones de MongoDB

# Custom field for MongoDB ObjectId
class ObjectIdField(serializers.Field):
    def to_internal_value(self, data):
        # Aceptar ObjectId válido, string que puede convertirse a ObjectId, o mantener como string
        if data is None:
            raise serializers.ValidationError("ObjectId cannot be None.")
        
        data_str = str(data)
        
        # Si es un ObjectId válido, convertirlo
        if ObjectId.is_valid(data_str):
            return ObjectId(data_str)
        
        # Si no es válido pero es un string no vacío, mantenerlo como string
        # (algunos IDs pueden ser UUIDs u otros formatos)
        if data_str:
            return data_str
        
            raise serializers.ValidationError("Invalid ObjectId format.")

    def to_representation(self, value):
        if isinstance(value, ObjectId):
            return str(value)
        return str(value) if value else None

class UserSerializer(serializers.Serializer):
    """Serializer para usuarios de MongoDB"""
    id = serializers.CharField(read_only=True)
    username = serializers.CharField()
    first_name = serializers.CharField(required=False, allow_blank=True)
    last_name = serializers.CharField(required=False, allow_blank=True)
    email = serializers.EmailField(required=False, allow_blank=True)
    role = serializers.CharField()
    user_group_id = serializers.CharField(required=False, allow_null=True)
    user_group_name = serializers.SerializerMethodField()
    is_active = serializers.BooleanField()
    is_staff = serializers.BooleanField(read_only=True)
    is_superuser = serializers.BooleanField(read_only=True)
    date_joined = serializers.DateTimeField(read_only=True)
    last_login = serializers.DateTimeField(read_only=True, allow_null=True)
    created_by = serializers.CharField(read_only=True, allow_null=True)
    created_by_username = serializers.SerializerMethodField()
    
    def get_created_by_username(self, obj):
        """Obtiene el username del usuario que creó este usuario"""
        created_by = obj.get('created_by') if isinstance(obj, dict) else getattr(obj, 'created_by', None)
        if created_by:
            try:
                from .mongo_user_utils import get_user_by_id
                creator = get_user_by_id(created_by)
                if creator:
                    return creator.get('username', '')
            except Exception:
                pass
        return None
    
    def get_user_group_name(self, obj):
        """Obtiene el nombre del grupo de usuarios desde MongoDB"""
        user_group_id = obj.get('user_group_id') if isinstance(obj, dict) else getattr(obj, 'user_group_id', None)
        if user_group_id:
            try:
                from .mongo_utils import get_user_groups_collection
                from bson import ObjectId
                groups_collection = get_user_groups_collection()
                group = groups_collection.find_one({'_id': ObjectId(user_group_id)})
                return group.get('name') if group else None
            except Exception:
                return None
        return None
    
    def to_representation(self, instance):
        """Convierte el documento de MongoDB o MongoUser a dict"""
        # #region agent log
        import json
        import time
        log_file_path = '/app/debug.log'
        try:
            log_data = {
                "timestamp": int(time.time() * 1000),
                "location": "serializers.py:UserSerializer.to_representation:entry",
                "message": "to_representation called",
                "data": {
                    "instance_type": type(instance).__name__,
                    "is_dict": isinstance(instance, dict),
                    "has_user_doc": hasattr(instance, '_user_doc') if instance else False,
                    "hypothesisId": "E"
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
            if isinstance(instance, dict):
                data = instance.copy()
                data['id'] = str(data.get('_id', data.get('id', '')))
                if '_id' in data:
                    del data['_id']
                if 'password_hash' in data:
                    del data['password_hash']
                return data
            elif hasattr(instance, '_user_doc'):
                # Es un MongoUser
                data = instance._user_doc.copy() if hasattr(instance, '_user_doc') and instance._user_doc else {}
                data['id'] = str(instance.id) if hasattr(instance, 'id') else str(data.get('_id', ''))
                data['username'] = getattr(instance, 'username', data.get('username', ''))
                data['email'] = getattr(instance, 'email', data.get('email', ''))
                data['first_name'] = getattr(instance, 'first_name', data.get('first_name', ''))
                data['last_name'] = getattr(instance, 'last_name', data.get('last_name', ''))
                data['role'] = getattr(instance, 'role', data.get('role', 'encuestador'))
                data['user_group_id'] = getattr(instance, 'user_group_id', data.get('user_group_id'))
                data['is_active'] = getattr(instance, 'is_active', data.get('is_active', True))
                data['is_staff'] = getattr(instance, 'is_staff', data.get('is_staff', False))
                data['is_superuser'] = getattr(instance, 'is_superuser', data.get('is_superuser', False))
                data['date_joined'] = getattr(instance, 'date_joined', data.get('date_joined'))
                data['last_login'] = getattr(instance, 'last_login', data.get('last_login'))
                if '_id' in data:
                    del data['_id']
                if 'password_hash' in data:
                    del data['password_hash']
                return data
            else:
                # Es un modelo Django tradicional (fallback)
                return {
                    'id': str(instance.id),
                    'username': instance.username,
                    'first_name': instance.first_name,
                    'last_name': instance.last_name,
                    'email': instance.email,
                    'role': getattr(instance, 'role', 'encuestador'),
                    'user_group_id': getattr(instance, 'user_group_id', None),
                    'is_active': instance.is_active,
                    'is_staff': instance.is_staff,
                    'is_superuser': instance.is_superuser,
                    'date_joined': instance.date_joined,
                    'last_login': instance.last_login,
                }
        except Exception as e:
            # Fallback seguro en caso de error
            # #region agent log
            import logging
            import traceback
            logger = logging.getLogger(__name__)
            logger.error(f"Error serializing user: {type(e).__name__}: {str(e)}")
            try:
                log_data = {
                    "timestamp": int(time.time() * 1000),
                    "location": "serializers.py:UserSerializer.to_representation:error",
                    "message": "Error in to_representation",
                    "data": {
                        "error_type": type(e).__name__,
                        "error_message": str(e),
                        "traceback": ''.join(traceback.format_exception(type(e), e, e.__traceback__)),
                        "hypothesisId": "F"
                    },
                    "sessionId": "debug-session",
                    "runId": "run1"
                }
                with open(log_file_path, 'a') as f:
                    f.write(json.dumps(log_data) + '\n')
            except Exception:
                pass
            # #endregion
            return {
                'id': str(getattr(instance, 'id', '')),
                'username': getattr(instance, 'username', ''),
                'first_name': getattr(instance, 'first_name', ''),
                'last_name': getattr(instance, 'last_name', ''),
                'email': getattr(instance, 'email', ''),
                'role': getattr(instance, 'role', 'encuestador'),
                'user_group_id': getattr(instance, 'user_group_id', None),
                'is_active': getattr(instance, 'is_active', True),
                'is_staff': getattr(instance, 'is_staff', False),
                'is_superuser': getattr(instance, 'is_superuser', False),
                'date_joined': getattr(instance, 'date_joined', None),
                'last_login': getattr(instance, 'last_login', None),
            }

class UserCreateSerializer(serializers.Serializer):
    """Serializer para crear usuarios en MongoDB"""
    username = serializers.CharField(max_length=150)
    password = serializers.CharField(write_only=True, min_length=8, style={'input_type': 'password'})
    password_confirm = serializers.CharField(write_only=True, min_length=8, style={'input_type': 'password'})
    first_name = serializers.CharField(required=False, allow_blank=True, max_length=150)
    last_name = serializers.CharField(required=False, allow_blank=True, max_length=150)
    email = serializers.EmailField(required=False, allow_blank=True)
    role = serializers.CharField(default='encuestador')
    user_group_id = serializers.CharField(required=False, allow_null=True)
    is_active = serializers.BooleanField(default=True)
    
    def validate(self, attrs):
        if attrs['password'] != attrs['password_confirm']:
            raise serializers.ValidationError({"password_confirm": "Las contraseñas no coinciden."})
        
        # Verificar que el username no exista
        if user_exists_in_mongo(attrs['username']):
            raise serializers.ValidationError({"username": "Este nombre de usuario ya está en uso."})
        
        return attrs
    
    def create(self, validated_data):
        validated_data.pop('password_confirm')
        password = validated_data.pop('password')
        
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
            is_superuser=(validated_data.get('role') == 'root')
        )
        return user

class UserUpdateSerializer(serializers.Serializer):
    """Serializer para actualizar usuarios en MongoDB"""
    username = serializers.CharField(read_only=True)  # No permitir cambiar username
    first_name = serializers.CharField(required=False, allow_blank=True, max_length=150)
    last_name = serializers.CharField(required=False, allow_blank=True, max_length=150)
    email = serializers.EmailField(required=False, allow_blank=True)
    password = serializers.CharField(write_only=True, min_length=8, required=False, style={'input_type': 'password'})
    password_confirm = serializers.CharField(write_only=True, min_length=8, required=False, style={'input_type': 'password'})
    role = serializers.CharField(required=False)
    user_group_id = serializers.CharField(required=False, allow_null=True, allow_blank=True)
    is_active = serializers.BooleanField(required=False)
    
    def validate(self, attrs):
        password = attrs.get('password')
        password_confirm = attrs.get('password_confirm')
        
        if password or password_confirm:
            if password != password_confirm:
                raise serializers.ValidationError({"password_confirm": "Las contraseñas no coinciden."})
        
        return attrs
    
    def update(self, instance, validated_data):
        # instance puede ser un dict (documento MongoDB) o un MongoUser
        user_id = instance.get('id') if isinstance(instance, dict) else instance.id
        if not user_id:
            user_id = str(instance.get('_id')) if isinstance(instance, dict) else str(instance._id)
        
        password = validated_data.pop('password', None)
        validated_data.pop('password_confirm', None)
        
        # Convertir user_group_id vacío a None
        if 'user_group_id' in validated_data and validated_data['user_group_id'] == '':
            validated_data['user_group_id'] = None
        
        if password:
            validated_data['password'] = password
        
        updated_user = update_user_in_mongo(user_id, **validated_data)
        if updated_user:
            return updated_user
        return instance

class SurveyGroupSerializer(serializers.Serializer):
    id = ObjectIdField(read_only=True)
    name = serializers.CharField(max_length=255)
    created_by = serializers.IntegerField() # Usamos IntegerField para el ID de usuario de Django

    def create(self, validated_data):
        # Esto será manejado en la vista, ya que no estamos usando modelos de Django para MongoDB
        pass

    def update(self, instance, validated_data):
        # Esto será manejado en la vista
        pass

class UserGroupSerializer(serializers.Serializer):
    """Serializer para grupos de usuarios en MongoDB"""
    id = ObjectIdField(read_only=True)
    name = serializers.CharField(max_length=255)
    description = serializers.CharField(max_length=1000, required=False, allow_blank=True)
    created_by = serializers.CharField(read_only=True)  # Cambiado a CharField para ObjectId
    admin_user_id = serializers.CharField()  # Cambiado a CharField para ObjectId de MongoDB
    created_at = serializers.DateTimeField(read_only=True)
    is_active = serializers.BooleanField(default=True)
    admin_username = serializers.SerializerMethodField()
    user_count = serializers.SerializerMethodField()
    
    def get_admin_username(self, obj):
        """Obtiene el username del administrador del grupo"""
        admin_id = obj.get('admin_user_id')
        if admin_id:
            try:
                from .mongo_user_utils import get_user_by_id
                user = get_user_by_id(admin_id)
                return user.get('username') if user else None
            except Exception:
                return None
        return None
    
    def get_user_count(self, obj):
        """Obtiene el número de usuarios en el grupo"""
        group_id = str(obj.get('_id', obj.get('id', '')))
        if group_id:
            try:
                from .mongo_user_utils import list_users_from_mongo
                users = list_users_from_mongo({'user_group_id': group_id})
                return len(users)
            except Exception:
                return 0
        return 0

class UserGroupCreateSerializer(serializers.Serializer):
    """Serializer para crear grupos de usuarios"""
    name = serializers.CharField(max_length=255)
    description = serializers.CharField(max_length=1000, required=False, allow_blank=True)
    admin_user_id = serializers.CharField()  # Cambiado a CharField para ObjectId de MongoDB
    is_active = serializers.BooleanField(default=True)
    
    def validate_admin_user_id(self, value):
        """Valida que el usuario administrador exista"""
        from .mongo_user_utils import get_user_by_id
        user = get_user_by_id(value)
        if not user:
            raise serializers.ValidationError("El usuario administrador no existe")
        if user.get('role') != 'group_admin':
            raise serializers.ValidationError("El usuario debe tener el rol 'group_admin'")
        return value

class UserGroupUpdateSerializer(serializers.Serializer):
    """Serializer para actualizar grupos de usuarios"""
    name = serializers.CharField(max_length=255, required=False)
    description = serializers.CharField(max_length=1000, required=False, allow_blank=True)
    admin_user_id = serializers.CharField(required=False)  # Cambiado a CharField para ObjectId de MongoDB
    is_active = serializers.BooleanField(required=False)
    
    def validate_admin_user_id(self, value):
        """Valida que el usuario administrador exista"""
        if value is not None and value != '':
            from .mongo_user_utils import get_user_by_id
            user = get_user_by_id(value)
            if not user:
                raise serializers.ValidationError("El usuario administrador no existe")
            if user.get('role') != 'group_admin':
                raise serializers.ValidationError("El usuario debe tener el rol 'group_admin'")
            return value
        return value

class QuestionSerializer(serializers.Serializer):
    # Support both formats: 'text'/'type' (from MongoDB) and 'question_text'/'question_type' (from API)
    text = serializers.CharField(max_length=500, required=False, allow_blank=True)
    question_text = serializers.CharField(max_length=500, required=False, allow_blank=True, source='text')
    type = serializers.CharField(max_length=50, required=False)
    question_type = serializers.CharField(max_length=50, required=False, source='type') # e.g., 'text', 'radio', 'checkbox'
    options = serializers.ListField(child=serializers.CharField(max_length=200), required=False)
    description = serializers.CharField(max_length=1000, required=False, allow_blank=True)
    required = serializers.BooleanField(required=False, default=False)
    # Section support
    section_id = serializers.CharField(max_length=255, required=False, allow_null=True) # ID of the section this question belongs to
    # Conditional logic support
    conditional_logic = serializers.JSONField(required=False, allow_null=True) # Structure: {"type": "show_if", "question_id": "...", "operator": "equals", "value": "..."}
    
    def to_representation(self, instance):
        # Normalize the data structure for output
        data = dict(instance) if isinstance(instance, dict) else instance
        result = {}
        
        # Include ID if it exists, otherwise generate one based on index
        if 'id' in data:
            result['id'] = str(data['id'])
        elif '_id' in data:
            result['id'] = str(data['_id'])
        # If no ID and we have a parent survey context, use index-based ID
        # (This will be handled by SurveySerializer if needed)
        
        # Map 'text' to 'question_text' for API consistency
        if 'text' in data:
            result['question_text'] = data['text']
        elif 'question_text' in data:
            result['question_text'] = data['question_text']
        # Map 'type' to 'question_type' for API consistency
        if 'type' in data:
            result['question_type'] = data['type']
        elif 'question_type' in data:
            result['question_type'] = data['question_type']
        # Include other fields
        if 'options' in data:
            result['options'] = data['options']
        if 'description' in data:
            result['description'] = data['description']
        if 'required' in data:
            result['required'] = data['required']
        if 'section_id' in data:
            result['section_id'] = data['section_id']
        if 'conditional_logic' in data:
            result['conditional_logic'] = data['conditional_logic']
        return result

class SectionSerializer(serializers.Serializer):
    """Serializer for survey sections"""
    id = serializers.CharField(max_length=255, required=False) # Section ID (generated if not provided)
    title = serializers.CharField(max_length=255)
    description = serializers.CharField(max_length=1000, required=False, allow_blank=True)
    order = serializers.IntegerField(required=False, default=0) # Order of the section

class SurveySerializer(serializers.Serializer):
    id = ObjectIdField(read_only=True)
    title = serializers.CharField(max_length=255)
    description = serializers.CharField(max_length=1000, required=False, allow_blank=True)
    group = ObjectIdField() # Referencia al ObjectId de SurveyGroup
    questions = QuestionSerializer(many=True)
    sections = SectionSerializer(many=True, required=False) # Optional sections array
    is_public = serializers.BooleanField(required=False, default=False) # Indica si la encuesta es pública
    is_deleted = serializers.BooleanField(required=False, default=False) # Indica si la encuesta está eliminada (soft delete)
    created_by = serializers.CharField(read_only=True, allow_null=True)
    created_by_username = serializers.SerializerMethodField()
    user_group_id = serializers.CharField(required=False, allow_null=True)
    user_group_name = serializers.SerializerMethodField()
    
    def get_created_by_username(self, obj):
        """Obtiene el username del usuario que creó esta encuesta"""
        created_by = obj.get('created_by') if isinstance(obj, dict) else getattr(obj, 'created_by', None)
        if created_by:
            try:
                from .mongo_user_utils import get_user_by_id
                creator = get_user_by_id(created_by)
                if creator:
                    return creator.get('username', '')
            except Exception:
                pass
        return None
    
    def get_user_group_name(self, obj):
        """Obtiene el nombre del grupo de usuarios desde MongoDB"""
        user_group_id = obj.get('user_group_id') if isinstance(obj, dict) else getattr(obj, 'user_group_id', None)
        if user_group_id:
            try:
                from .mongo_utils import get_user_groups_collection
                from bson import ObjectId
                groups_collection = get_user_groups_collection()
                group = groups_collection.find_one({'_id': ObjectId(user_group_id)})
                return group.get('name') if group else None
            except Exception:
                return None
        return None

    def to_representation(self, instance):
        # Get base representation
        data = super().to_representation(instance)
        survey_id = data.get('id', '')
        
        # Ensure all questions have IDs
        if 'questions' in data and isinstance(data['questions'], list):
            for index, question in enumerate(data['questions']):
                if 'id' not in question or not question.get('id'):
                    # Generate ID based on survey ID and index
                    question['id'] = f'q_{survey_id}_{index}'
        
        # Ensure all sections have IDs if they exist
        if 'sections' in data and isinstance(data['sections'], list):
            for index, section in enumerate(data['sections']):
                if 'id' not in section or not section.get('id'):
                    # Generate ID based on survey ID and index
                    section['id'] = f'section_{survey_id}_{index}'
        
        return data

    def create(self, validated_data):
        pass

    def update(self, instance, validated_data):
        pass

class AnswerSerializer(serializers.Serializer):
    question_id = serializers.CharField(max_length=255) # Asumiendo que los IDs de pregunta son strings
    answer_text = serializers.CharField(allow_blank=True, required=False)
    selected_options = serializers.ListField(child=serializers.CharField(max_length=200), required=False)

class ResponseSerializer(serializers.Serializer):
    id = ObjectIdField(read_only=True)
    survey = ObjectIdField() # Referencia al ObjectId de Survey
    surveyor_id = serializers.IntegerField(required=False, allow_null=True) # Opcional para respuestas públicas
    device_id = serializers.CharField(max_length=255, required=False)
    answers = serializers.JSONField() # Almacena las respuestas como un campo JSON flexible
    synced = serializers.BooleanField(default=False)
    created_at = serializers.DateTimeField(read_only=True, required=False) # Fecha de creación

    def create(self, validated_data):
        pass

    def update(self, instance, validated_data):
        pass

class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        """Override validate to use MongoDB authentication"""
        # #region agent log
        import logging
        logger = logging.getLogger(__name__)
        username = attrs.get(self.username_field, '')
        logger.info(f"Token validation started - username: {username}")
        # #endregion
        
        try:
            # Autenticar usando MongoDB
            from .mongo_user_utils import authenticate_user
            from .mongo_user_model import MongoUser
            
            password = attrs.get('password', '')
            user_doc = authenticate_user(username, password)
            
            if not user_doc:
                from rest_framework_simplejwt.exceptions import AuthenticationFailed
                raise AuthenticationFailed('No active account found with the given credentials')
            
            # Crear objeto MongoUser para compatibilidad con JWT
            user = MongoUser(user_doc)
            self.user = user
            
            # Generar token
            refresh = self.get_token(user)
            
            # #region agent log
            logger.info(f"Token validation successful - user_id: {user.id}, username: {user.username}, is_active: {user.is_active}")
            # #endregion
            
            return {
                'refresh': str(refresh),
                'access': str(refresh.access_token),
            }
        except Exception as e:
            # #region agent log
            logger.error(f"Token validation failed - username: {username}, error_type: {type(e).__name__}, error_message: {str(e)}", exc_info=True)
            # #endregion
            raise
    
    @classmethod
    def get_token(cls, user):
        # #region agent log
        import logging
        logger = logging.getLogger(__name__)
        logger.info(f"get_token called - user_id: {user.id if user else None}, user_type: {type(user).__name__ if user else None}")
        logger.info(f"User attributes - has_username: {hasattr(user, 'username') if user else False}, has_email: {hasattr(user, 'email') if user else False}, has_role: {hasattr(user, 'role') if user else False}")
        # #endregion
        
        try:
            token = super().get_token(user)
            # #region agent log
            logger.info(f"Token base created successfully")
            # #endregion
        except Exception as e:
            # #region agent log
            logger.error(f"Error in super().get_token - type: {type(e).__name__}, message: {str(e)}", exc_info=True)
            # #endregion
            raise
        
        # #region agent log
        logger.info(f"Accessing user fields - username: {getattr(user, 'username', None) if user else None}, email: {getattr(user, 'email', None) if user else None}, role: {getattr(user, 'role', None) if user else None}")
        # #endregion
        
        try:
            token['username'] = user.username
            token['email'] = user.email if hasattr(user, 'email') and user.email else None
            token['role'] = user.role if hasattr(user, 'role') else None
            # #region agent log
            logger.info(f"Token created successfully with keys: {list(token.keys())}")
            # #endregion
        except AttributeError as e:
            # #region agent log
            logger.error(f"Error accessing user fields - type: {type(e).__name__}, message: {str(e)}, field: {e.name if hasattr(e, 'name') else 'unknown'}", exc_info=True)
            # #endregion
            # Don't fail if optional fields are missing
            if 'username' not in token:
                token['username'] = getattr(user, 'username', None)
            if 'email' not in token:
                token['email'] = getattr(user, 'email', None) if hasattr(user, 'email') else None
            if 'role' not in token:
                token['role'] = getattr(user, 'role', None) if hasattr(user, 'role') else None
        except Exception as e:
            # #region agent log
            logger.error(f"Unexpected error accessing user fields - type: {type(e).__name__}, message: {str(e)}", exc_info=True)
            # #endregion
            raise
        
        return token

# Serializer for batch sync operations
class BatchResponseItemSerializer(serializers.Serializer):
    """Serializer for individual response in batch sync"""
    local_id = serializers.CharField(required=False)  # Local ID from mobile device
    survey = ObjectIdField()
    surveyor_id = serializers.IntegerField(required=False, allow_null=True)
    device_id = serializers.CharField(max_length=255, required=False)
    answers = serializers.JSONField()
    synced = serializers.BooleanField(default=False)

class BatchResponseSerializer(serializers.Serializer):
    """Serializer for batch response sync"""
    responses = BatchResponseItemSerializer(many=True)

class SyncStatusItemSerializer(serializers.Serializer):
    """Serializer for sync status check item"""
    local_id = serializers.CharField()
    survey = ObjectIdField()
    device_id = serializers.CharField(max_length=255, required=False)

class SyncStatusRequestSerializer(serializers.Serializer):
    """Serializer for sync status check request"""
    local_ids = serializers.ListField(
        child=serializers.CharField(),
        required=False
    )
    items = SyncStatusItemSerializer(many=True, required=False)

class SyncStatusResponseSerializer(serializers.Serializer):
    """Serializer for sync status response"""
    local_id = serializers.CharField()
    synced = serializers.BooleanField()
    server_id = serializers.CharField(required=False, allow_null=True)