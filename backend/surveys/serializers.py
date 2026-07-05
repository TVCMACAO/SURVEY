from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from django.contrib.auth import get_user_model
from bson import ObjectId
import json # Import the json module

User = get_user_model()

# Custom field for MongoDB ObjectId
class ObjectIdField(serializers.Field):
    def to_internal_value(self, data):
        # Aceptar None si el campo lo permite (required=False, allow_null=True)
        if data is None:
            return None
        
        # Si es una cadena "None", tratarla como None
        if isinstance(data, str) and data.lower() == 'none':
            return None
        
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
    user_group_id = serializers.SerializerMethodField()  # Campo para obtener el user_group_id del objeto
    
    class Meta:
        model = User
        fields = ('id', 'username', 'first_name', 'last_name', 'email', 'role', 'is_active', 'date_joined', 'user_group_id')
        read_only_fields = ('id', 'date_joined', 'user_group_id')
    
    def get_user_group_id(self, obj):
        """Obtener user_group_id del objeto, manejando ObjectId y None"""
        if hasattr(obj, 'user_group_id') and obj.user_group_id:
            from bson import ObjectId
            if isinstance(obj.user_group_id, ObjectId):
                return str(obj.user_group_id)
            return str(obj.user_group_id)
        return None

class UserCreateSerializer(serializers.Serializer):
    """
    Serializer para crear usuarios en MongoDB.
    Usa Serializer en lugar de ModelSerializer para evitar acceso a tablas SQL.
    """
    username = serializers.CharField(max_length=150, required=True)
    password = serializers.CharField(write_only=True, min_length=8, style={'input_type': 'password'}, required=True)
    password_confirm = serializers.CharField(write_only=True, min_length=8, style={'input_type': 'password'}, required=True)
    email = serializers.EmailField(required=False, allow_blank=True, default='')
    first_name = serializers.CharField(max_length=150, required=False, allow_blank=True, default='')
    last_name = serializers.CharField(max_length=150, required=False, allow_blank=True, default='')
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
    is_active = serializers.BooleanField(required=False, default=True)
    user_group_id = serializers.CharField(required=False, allow_null=True, allow_blank=True)  # Campo para asignar grupo
    
    def validate(self, attrs):
        if attrs.get('password') != attrs.get('password_confirm'):
            raise serializers.ValidationError({"password_confirm": "Las contraseñas no coinciden."})
        return attrs
    
    def create(self, validated_data):
        from .mongo_user_utils import create_user
        
        validated_data.pop('password_confirm', None)
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
    user_group_id = serializers.CharField(required=False, allow_null=True, allow_blank=True)  # Campo para asignar grupo
    
    class Meta:
        model = User
        fields = ('username', 'first_name', 'last_name', 'email', 'password', 'password_confirm', 'role', 'is_active', 'user_group_id')
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
        
        # Manejar user_group_id: convertir string a ObjectId si es necesario
        user_group_id = validated_data.pop('user_group_id', None)
        if user_group_id:
            # Si viene como string vacío, establecer como None
            if user_group_id == '':
                user_group_id = None
            else:
                # Intentar convertir a ObjectId si es un string válido
                try:
                    if ObjectId.is_valid(str(user_group_id)):
                        user_group_id = ObjectId(user_group_id)
                    else:
                        user_group_id = str(user_group_id)
                except Exception:
                    user_group_id = str(user_group_id)
        
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
        
        # Agregar user_group_id al update_data (puede ser None para limpiar el grupo)
        update_data['user_group_id'] = user_group_id
        
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
        
        # Actualizar user_group_id en el instance
        if hasattr(instance, 'user_group_id'):
            instance.user_group_id = user_group_id
        
        if password:
            # No podemos usar set_password en MongoUser, pero ya lo actualizamos en MongoDB
            pass
        
        return instance

class SurveyGroupSerializer(serializers.Serializer):
    id = ObjectIdField(read_only=True)
    name = serializers.CharField(max_length=255)
    created_by = serializers.CharField(read_only=True, required=False) # Se establece automáticamente en la vista

    def create(self, validated_data):
        # Esto será manejado en la vista, ya que no estamos usando modelos de Django para MongoDB
        pass

    def update(self, instance, validated_data):
        # Esto será manejado en la vista
        pass

class QuestionSerializer(serializers.Serializer):
    # Support both formats: 'text'/'type' (from MongoDB) and 'question_text'/'question_type' (from API)
    # IMPORTANT: allow explicit question IDs so conditional_logic can reference stable IDs.
    id = serializers.CharField(max_length=255, required=False, allow_blank=True)
    text = serializers.CharField(max_length=500, required=False, allow_blank=True, default='')
    question_text = serializers.CharField(max_length=500, required=False, allow_blank=True, source='text', default='')
    type = serializers.CharField(max_length=50, required=False, allow_blank=True, default='short_text')
    question_type = serializers.CharField(max_length=50, required=False, allow_blank=True, source='type', default='short_text') # e.g., 'text', 'radio', 'checkbox'
    options = serializers.ListField(child=serializers.CharField(max_length=200), required=False, allow_empty=True, default=list)
    description = serializers.CharField(max_length=1000, required=False, allow_blank=True, default='')
    required = serializers.BooleanField(required=False, default=False)
    # Section support
    section_id = serializers.CharField(max_length=255, required=False, allow_null=True, allow_blank=True) # ID of the section this question belongs to
    # Conditional logic support
    conditional_logic = serializers.JSONField(required=False, allow_null=True) # Structure: {"type": "show_if", "question_id": "...", "operator": "equals", "value": "..."}
    # Evaluation table: items (rows) and columns (e.g. CUMPLE, NO CUMPLE, OBSERVACIONES)
    evaluation_items = serializers.JSONField(required=False, allow_null=True)  # [{"id": "...", "label": "Item1"}, ...]
    evaluation_columns = serializers.JSONField(required=False, allow_null=True)  # [{"id": "...", "label": "CUMPLE", "inputType": "checkbox"}, {"id": "...", "label": "OBSERVACIONES", "inputType": "text"}, ...]
    date_include_time = serializers.BooleanField(required=False, default=False)  # For type date: if True, show datetime picker
    accept = serializers.CharField(max_length=255, required=False, allow_blank=True, default='')  # For file_upload: e.g. "image/*,application/pdf"

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
        if 'evaluation_items' in data:
            result['evaluation_items'] = data['evaluation_items']
        if 'evaluation_columns' in data:
            result['evaluation_columns'] = data['evaluation_columns']
        if 'date_include_time' in data:
            result['date_include_time'] = data['date_include_time']
        if 'accept' in data:
            result['accept'] = data['accept']
        return result

class SectionSerializer(serializers.Serializer):
    """Serializer for survey sections"""
    id = serializers.CharField(max_length=255, required=False) # Section ID (generated if not provided)
    title = serializers.CharField(max_length=255, required=False, allow_blank=True, default='')
    description = serializers.CharField(max_length=1000, required=False, allow_blank=True)
    order = serializers.IntegerField(required=False, default=0) # Order of the section

class SurveySerializer(serializers.Serializer):
    id = ObjectIdField(read_only=True)
    title = serializers.CharField(max_length=255)
    description = serializers.CharField(max_length=1000, required=False, allow_blank=True)
    group = ObjectIdField(required=False, allow_null=True) # Referencia al ObjectId de SurveyGroup (opcional, se asigna automáticamente para group_admin)
    group_name = serializers.CharField(read_only=True, required=False) # Nombre del grupo
    questions = QuestionSerializer(many=True, required=False, allow_empty=True) # Opcional para permitir encuestas sin preguntas inicialmente
    sections = SectionSerializer(many=True, required=False) # Optional sections array
    is_public = serializers.BooleanField(required=False, default=False) # Indica si la encuesta es pública
    is_deleted = serializers.BooleanField(required=False, default=False) # Indica si la encuesta está eliminada (soft delete)
    created_by = serializers.CharField(read_only=True, required=False) # ID del usuario que creó la encuesta
    created_by_username = serializers.CharField(read_only=True, required=False) # Username del usuario que creó la encuesta
    # Campos para configurar texto legal del consentimiento de firma (Ley 1581/2012 Colombia)
    consent_responsible = serializers.CharField(max_length=500, required=False, allow_blank=True, default='') # Nombre del responsable del tratamiento de datos
    consent_purpose = serializers.CharField(max_length=1000, required=False, allow_blank=True, default='') # Finalidad del tratamiento de la firma
    # Archivo de referenciación (Excel): clave de búsqueda, mapeo pregunta -> columna, datos parseados
    reference_key_column = serializers.CharField(max_length=255, required=False, allow_blank=True, default='')
    reference_mapping = serializers.JSONField(required=False, default=dict)  # { question_id: column_name }
    reference_data = serializers.ListField(child=serializers.DictField(), required=False, allow_null=True)  # list of row dicts (not sent to client)
    reference_row_count = serializers.IntegerField(read_only=True, required=False, default=0)  # set on upload
    # IDs de preguntas para nombrar adjuntos: documento_empleado-documento_votante.ext
    documento_empleado_question_id = serializers.CharField(max_length=255, required=False, allow_blank=True, default='')
    documento_votante_question_id = serializers.CharField(max_length=255, required=False, allow_blank=True, default='')

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
        
        # Para clientes anónimos (vista pública): no enviar reference_data.
        # Para autenticados (sync APK): incluir reference_data para uso offline.
        request = self.context.get('request')
        if request and getattr(request.user, 'is_authenticated', False):
            data['reference_data'] = instance.get('reference_data') or []
        else:
            data['reference_data'] = None
        data['reference_row_count'] = instance.get('reference_row_count') or 0

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
    surveyor_id = serializers.CharField(max_length=50, required=False, allow_null=True, allow_blank=True) # MongoDB ObjectId como String
    surveyor_name = serializers.CharField(max_length=255, required=False, allow_null=True, allow_blank=True) # Nombre para mostrar del encuestador
    device_id = serializers.CharField(max_length=255, required=False)
    answers = serializers.JSONField() # Almacena las respuestas como un campo JSON flexible
    attachment_links = serializers.JSONField(required=False, read_only=True)  # Map attachment_id -> public preview_link (URL pública)
    synced = serializers.BooleanField(required=False, default=True)
    created_at = serializers.DateTimeField(read_only=True, required=False) # Fecha de creación
    signature_consent_at = serializers.DateTimeField(required=False, allow_null=True) # Timestamp del consentimiento de firma (Ley 1581/2012 Colombia)

    def create(self, validated_data):
        pass

    def update(self, instance, validated_data):
        pass

class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        
        try:
            # Llamar al método validate del padre
            result = super().validate(attrs)
            
            
            return result
        except Exception as e:
            raise
    
    @classmethod
    def get_token(cls, user):
        from .tokens import MongoRefreshToken

        token = MongoRefreshToken.for_user(user)
        token['username'] = user.username
        token['email'] = user.email
        token['role'] = user.role
        return token

# Serializer for batch sync operations
class BatchResponseItemSerializer(serializers.Serializer):
    """Serializer for individual response in batch sync"""
    local_id = serializers.CharField(required=False)  # Local ID from mobile device
    survey = ObjectIdField()
    surveyor_id = serializers.CharField(max_length=50, required=False, allow_null=True, allow_blank=True)  # MongoDB ObjectId como String
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