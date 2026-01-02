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
    class Meta:
        model = User
        fields = ('id', 'username', 'first_name', 'last_name', 'email', 'role', 'is_active', 'date_joined')
        read_only_fields = ('id', 'date_joined')

class UserCreateSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8, style={'input_type': 'password'})
    password_confirm = serializers.CharField(write_only=True, min_length=8, style={'input_type': 'password'})
    
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
        validated_data.pop('password_confirm')
        password = validated_data.pop('password')
        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data.get('email', ''),
            password=password,
            first_name=validated_data.get('first_name', ''),
            last_name=validated_data.get('last_name', ''),
            role=validated_data.get('role', 'encuestador'),
            is_active=validated_data.get('is_active', True),
        )
        return user

class UserUpdateSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8, required=False, style={'input_type': 'password'})
    password_confirm = serializers.CharField(write_only=True, min_length=8, required=False, style={'input_type': 'password'})
    
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
        password = validated_data.pop('password', None)
        validated_data.pop('password_confirm', None)
        
        if password:
            instance.set_password(password)
        
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        
        instance.save()
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