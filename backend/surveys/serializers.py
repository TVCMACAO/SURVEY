from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from django.contrib.auth import get_user_model
from bson import ObjectId
import json # Import the json module

User = get_user_model()

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

class UserSerializer(serializers.ModelSerializer):
    # Campo role personalizado que acepta todos los roles válidos incluyendo group_admin
    role = serializers.ChoiceField(
        choices=[
            ('root', 'Root'),
            ('group_admin', 'Administrador de Grupo'),
            ('encuestador', 'Encuestador'),
            ('analista', 'Analista'),
        ],
        required=False
    )
    
    class Meta:
        model = User
        fields = ('id', 'username', 'first_name', 'last_name', 'email', 'role', 'is_active', 'date_joined')
        read_only_fields = ('id', 'date_joined')

class UserCreateSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8, style={'input_type': 'password'})
    password_confirm = serializers.CharField(write_only=True, min_length=8, style={'input_type': 'password'})
    # Campo role personalizado que acepta todos los roles válidos incluyendo group_admin
    role = serializers.ChoiceField(
        choices=[
            ('root', 'Root'),
            ('group_admin', 'Administrador de Grupo'),
            ('encuestador', 'Encuestador'),
            ('analista', 'Analista'),
        ],
        required=False,
        default='encuestador'
    )
    
    class Meta:
        model = User
        fields = ('username', 'first_name', 'last_name', 'email', 'password', 'password_confirm', 'role', 'is_active')
        extra_kwargs = {
            'password': {'write_only': True},
            'password_confirm': {'write_only': True},
        }
    
    def validate(self, attrs):
        if attrs['password'] != attrs['password_confirm']:
            raise serializers.ValidationError({"password_confirm": "Las contraseñas no coinciden."})
        return attrs
    
    def create(self, validated_data):
        from .mongo_user_utils import create_user
        
        validated_data.pop('password_confirm')
        password = validated_data.pop('password')
        
        # Crear usuario en MongoDB
        user_doc = create_user(
            username=validated_data['username'],
            email=validated_data.get('email', ''),
            password=password,
            first_name=validated_data.get('first_name', ''),
            last_name=validated_data.get('last_name', ''),
            role=validated_data.get('role', 'encuestador'),
            is_staff=validated_data.get('is_staff', False),
            is_superuser=validated_data.get('is_superuser', False),
        )
        
        # Convertir a objeto MongoUser para compatibilidad
        from .mongo_user_model import MongoUser
        from datetime import datetime
        user = MongoUser(
            id=str(user_doc['_id']),
            username=user_doc['username'],
            email=user_doc.get('email', ''),
            role=user_doc.get('role', 'encuestador'),
            is_active=user_doc.get('is_active', True),
            is_staff=user_doc.get('is_staff', False),
            is_superuser=user_doc.get('is_superuser', False),
            first_name=user_doc.get('first_name', ''),
            last_name=user_doc.get('last_name', ''),
            date_joined=user_doc.get('date_joined'),
        )
        return user

class UserUpdateSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8, required=False, style={'input_type': 'password'})
    password_confirm = serializers.CharField(write_only=True, min_length=8, required=False, style={'input_type': 'password'})
    # Campo role personalizado que acepta todos los roles válidos incluyendo group_admin
    role = serializers.ChoiceField(
        choices=[
            ('root', 'Root'),
            ('group_admin', 'Administrador de Grupo'),
            ('encuestador', 'Encuestador'),
            ('analista', 'Analista'),
        ],
        required=False
    )
    
    class Meta:
        model = User
        fields = ('username', 'first_name', 'last_name', 'email', 'password', 'password_confirm', 'role', 'is_active')
        extra_kwargs = {
            'username': {'read_only': True},  # No permitir cambiar username
            'password': {'write_only': True, 'required': False},
            'password_confirm': {'write_only': True, 'required': False},
        }
    
    def validate(self, attrs):
        password = attrs.get('password')
        password_confirm = attrs.get('password_confirm')
        
        if password or password_confirm:
            if password != password_confirm:
                raise serializers.ValidationError({"password_confirm": "Las contraseñas no coinciden."})
        
        return attrs
    
    def update(self, instance, validated_data):
        from .mongo_utils import get_mongo_collection
        from bson import ObjectId
        from django.contrib.auth.hashers import make_password
        
        password = validated_data.pop('password', None)
        validated_data.pop('password_confirm', None)
        
        # Actualizar en MongoDB
        users_collection = get_mongo_collection('users')
        user_id = instance.id if hasattr(instance, 'id') else instance.pk
        
        try:
            # Intentar convertir a ObjectId
            update_id = ObjectId(user_id)
        except:
            update_id = user_id
        
        update_data = {}
        for attr, value in validated_data.items():
            update_data[attr] = value
        
        if password:
            update_data['password'] = make_password(password)
        
        if update_data:
            users_collection.update_one(
                {'_id': update_id},
                {'$set': update_data}
            )
        
        # Actualizar el objeto instance con los nuevos valores
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        
        if password:
            # No podemos usar set_password en MongoUser, pero ya lo actualizamos en MongoDB
            pass
        
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
    
    def to_internal_value(self, data):
        # Normalizar los datos para aceptar tanto question_text como text, y question_type como type
        normalized_data = dict(data)
        
        # Si viene question_text pero no text, mapear question_text a text
        if 'question_text' in normalized_data and 'text' not in normalized_data:
            normalized_data['text'] = normalized_data.get('question_text', '')
        
        # Si viene question_type pero no type, mapear question_type a type
        if 'question_type' in normalized_data and 'type' not in normalized_data:
            normalized_data['type'] = normalized_data.get('question_type', '')
        
        # Llamar al método padre con los datos normalizados
        return super().to_internal_value(normalized_data)
    
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
    group_name = serializers.CharField(read_only=True, required=False) # Nombre del grupo
    questions = QuestionSerializer(many=True)
    sections = SectionSerializer(many=True, required=False) # Optional sections array
    is_public = serializers.BooleanField(required=False, default=False) # Indica si la encuesta es pública
    is_deleted = serializers.BooleanField(required=False, default=False) # Indica si la encuesta está eliminada (soft delete)
    created_by = serializers.CharField(read_only=True, required=False) # ID del usuario que creó la encuesta
    created_by_username = serializers.CharField(read_only=True, required=False) # Username del usuario que creó la encuesta

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
        # #region agent log
        import json
        import traceback
        from django.contrib.auth import authenticate
        log_file_path = '/home/vps/Documentos/survey-app/.cursor/debug.log'
        try:
            with open(log_file_path, 'a') as f:
                f.write(json.dumps({
                    "sessionId": "debug-session",
                    "runId": "run1",
                    "hypothesisId": "B",
                    "location": "serializers.py:234",
                    "message": "validate() called - before authenticate",
                    "data": {
                        "username_field": self.username_field,
                        "has_username": self.username_field in attrs,
                        "has_password": "password" in attrs,
                        "username_value": attrs.get(self.username_field, None) if self.username_field in attrs else None
                    },
                    "timestamp": int(__import__('time').time() * 1000)
                }) + '\n')
        except Exception:
            pass
        # #endregion
        
        try:
            # Llamar al método validate del padre
            result = super().validate(attrs)
            
            # #region agent log
            try:
                with open(log_file_path, 'a') as f:
                    f.write(json.dumps({
                        "sessionId": "debug-session",
                        "runId": "run1",
                        "hypothesisId": "B",
                        "location": "serializers.py:234",
                        "message": "validate() - after super().validate()",
                        "data": {
                            "user_authenticated": hasattr(self, 'user') and self.user is not None,
                            "user_id": self.user.id if hasattr(self, 'user') and self.user else None,
                            "user_username": self.user.username if hasattr(self, 'user') and self.user else None,
                            "user_is_active": self.user.is_active if hasattr(self, 'user') and self.user else None
                        },
                        "timestamp": int(__import__('time').time() * 1000)
                    }) + '\n')
            except Exception:
                pass
            # #endregion
            
            return result
        except Exception as e:
            # #region agent log
            import logging
            logger = logging.getLogger(__name__)
            
            error_info = {
                "error_type": type(e).__name__,
                "error_message": str(e),
                "error_args": str(e.args) if hasattr(e, 'args') else None,
                "traceback": traceback.format_exc()
            }
            
            # Log a stderr (visible en Gunicorn logs)
            logger.error(f"validate() exception: {error_info['error_type']} - {error_info['error_message']}")
            logger.error(f"Traceback: {error_info['traceback']}")
            
            try:
                with open(log_file_path, 'a') as f:
                    f.write(json.dumps({
                        "sessionId": "debug-session",
                        "runId": "run1",
                        "hypothesisId": "B",
                        "location": "serializers.py:234",
                        "message": "validate() - exception in super().validate()",
                        "data": error_info,
                        "timestamp": int(__import__('time').time() * 1000)
                    }) + '\n')
            except Exception:
                pass
            # #endregion
            raise
    
    @classmethod
    def get_token(cls, user):
        # #region agent log
        import json
        import os
        log_file_path = '/home/vps/Documentos/survey-app/.cursor/debug.log'
        try:
            with open(log_file_path, 'a') as f:
                f.write(json.dumps({
                    "sessionId": "debug-session",
                    "runId": "run1",
                    "hypothesisId": "A",
                    "location": "serializers.py:146",
                    "message": "get_token called",
                    "data": {
                        "user_id": str(user.id) if user else None,
                        "user_type": type(user).__name__ if user else None,
                        "has_username": hasattr(user, 'username') if user else False,
                        "has_email": hasattr(user, 'email') if user else False,
                        "has_role": hasattr(user, 'role') if user else False
                    },
                    "timestamp": int(__import__('time').time() * 1000)
                }) + '\n')
        except Exception as e:
            pass
        # #endregion
        
        try:
            token = super().get_token(user)
        except Exception as e:
            # #region agent log
            try:
                with open(log_file_path, 'a') as f:
                    f.write(json.dumps({
                        "sessionId": "debug-session",
                        "runId": "run1",
                        "hypothesisId": "C",
                        "location": "serializers.py:147",
                        "message": "Error in super().get_token",
                        "data": {
                            "error_type": type(e).__name__,
                            "error_message": str(e)
                        },
                        "timestamp": int(__import__('time').time() * 1000)
                    }) + '\n')
            except Exception:
                pass
            # #endregion
            raise
        
        # #region agent log
        try:
            with open(log_file_path, 'a') as f:
                f.write(json.dumps({
                    "sessionId": "debug-session",
                    "runId": "run1",
                    "hypothesisId": "A",
                    "location": "serializers.py:148",
                    "message": "Token base created, accessing user fields",
                    "data": {
                        "username_value": getattr(user, 'username', None) if user else None,
                        "email_value": getattr(user, 'email', None) if user else None,
                        "role_value": getattr(user, 'role', None) if user else None
                    },
                    "timestamp": int(__import__('time').time() * 1000)
                }) + '\n')
        except Exception:
            pass
        # #endregion
        
        try:
            token['username'] = user.username
            token['email'] = user.email
            token['role'] = user.role
        except Exception as e:
            # #region agent log
            try:
                with open(log_file_path, 'a') as f:
                    f.write(json.dumps({
                        "sessionId": "debug-session",
                        "runId": "run1",
                        "hypothesisId": "A",
                        "location": "serializers.py:150",
                        "message": "Error accessing user fields",
                        "data": {
                            "error_type": type(e).__name__,
                            "error_message": str(e),
                            "field_accessed": "username/email/role"
                        },
                        "timestamp": int(__import__('time').time() * 1000)
                    }) + '\n')
            except Exception:
                pass
            # #endregion
            raise
        
        # #region agent log
        try:
            with open(log_file_path, 'a') as f:
                f.write(json.dumps({
                    "sessionId": "debug-session",
                    "runId": "run1",
                    "hypothesisId": "A",
                    "location": "serializers.py:151",
                    "message": "Token created successfully",
                    "data": {
                        "token_keys": list(token.keys()) if token else None
                    },
                    "timestamp": int(__import__('time').time() * 1000)
                }) + '\n')
        except Exception:
            pass
        # #endregion
        
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