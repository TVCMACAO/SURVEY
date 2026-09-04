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
        
        # Manejar user_group_id solo si viene en el request (partial update seguro)
        user_group_id_provided = 'user_group_id' in validated_data
        user_group_id = validated_data.pop('user_group_id', None) if user_group_id_provided else None
        if user_group_id_provided:
            if user_group_id == '' or user_group_id is None:
                user_group_id = None
            else:
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
        
        # Solo escribir user_group_id si el cliente lo envió
        if user_group_id_provided:
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
        
        # Actualizar user_group_id en el instance solo si se envió
        if user_group_id_provided and hasattr(instance, 'user_group_id'):
            instance.user_group_id = user_group_id
        
        if password:
            # No podemos usar set_password en MongoUser, pero ya lo actualizamos en MongoDB
            pass
        
        return instance

class SurveyGroupSerializer(serializers.Serializer):
    id = ObjectIdField(read_only=True)
    name = serializers.CharField(max_length=255)
    created_by = serializers.CharField(read_only=True, required=False)
    # SMTP (departamento / grupo) — alineado a SMTP_HOST, PORT, USER, PASS, FROM, FROM_NAME, REPLY_TO
    smtp_host = serializers.CharField(max_length=255, required=False, allow_blank=True, default='')
    smtp_port = serializers.IntegerField(required=False, default=465)
    smtp_user = serializers.CharField(max_length=255, required=False, allow_blank=True, default='')
    smtp_password = serializers.CharField(max_length=500, required=False, allow_blank=True, default='', write_only=True)
    smtp_use_tls = serializers.BooleanField(required=False, default=True)
    smtp_from_email = serializers.EmailField(required=False, allow_blank=True, default='')
    smtp_from_name = serializers.CharField(max_length=255, required=False, allow_blank=True, default='')
    smtp_reply_to = serializers.EmailField(required=False, allow_blank=True, default='')
    smtp_configured = serializers.SerializerMethodField(read_only=True)
    smtp_password_set = serializers.SerializerMethodField(read_only=True)

    def get_smtp_configured(self, obj):
        if not isinstance(obj, dict):
            return False
        host = (obj.get('smtp_host') or '').strip()
        from_email = (obj.get('smtp_from_email') or obj.get('smtp_user') or '').strip()
        return bool(host and from_email)

    def get_smtp_password_set(self, obj):
        if not isinstance(obj, dict):
            return False
        return bool((obj.get('smtp_password') or '').strip())

    def to_representation(self, instance):
        data = super().to_representation(instance)
        # Never expose password
        data.pop('smtp_password', None)
        if isinstance(instance, dict):
            data['smtp_configured'] = self.get_smtp_configured(instance)
            data['smtp_password_set'] = self.get_smtp_password_set(instance)
            data['smtp_host'] = instance.get('smtp_host') or ''
            data['smtp_port'] = instance.get('smtp_port') if instance.get('smtp_port') is not None else 465
            data['smtp_user'] = instance.get('smtp_user') or ''
            data['smtp_use_tls'] = bool(instance.get('smtp_use_tls', True))
            data['smtp_from_email'] = instance.get('smtp_from_email') or ''
            data['smtp_from_name'] = instance.get('smtp_from_name') or ''
            data['smtp_reply_to'] = instance.get('smtp_reply_to') or ''
        return data

    def create(self, validated_data):
        pass

    def update(self, instance, validated_data):
        pass

class QuestionSerializer(serializers.Serializer):
    # Canonical write fields: text / type. Aliases question_text / question_type
    # are accepted only via to_internal_value (no dual source+default wipe).
    # IMPORTANT: allow explicit question IDs so conditional_logic can reference stable IDs.
    id = serializers.CharField(max_length=255, required=False, allow_blank=True)
    text = serializers.CharField(max_length=10000, required=False, allow_blank=True, default='')
    type = serializers.CharField(max_length=50, required=False, allow_blank=True, default='short_text')
    options = serializers.ListField(child=serializers.CharField(max_length=200), required=False, allow_empty=True, default=list)
    description = serializers.CharField(max_length=10000, required=False, allow_blank=True, default='')
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
    question_image = serializers.CharField(max_length=500000, required=False, allow_blank=True, default='')

    CONDITION_OPERATORS = {
        'equals', 'not_equals', 'contains',
        'greater_than', 'less_than', 'greater_than_or_equal', 'less_than_or_equal',
    }

    def to_internal_value(self, data):
        # Normalizar aliases sin campos dual-source
        normalized_data = dict(data) if not isinstance(data, dict) else dict(data)

        if 'question_text' in normalized_data:
            if 'text' not in normalized_data or normalized_data.get('text') in (None, ''):
                normalized_data['text'] = normalized_data.get('question_text') or ''
            normalized_data.pop('question_text', None)

        if 'question_type' in normalized_data:
            if 'type' not in normalized_data or normalized_data.get('type') in (None, ''):
                normalized_data['type'] = normalized_data.get('question_type') or 'short_text'
            normalized_data.pop('question_type', None)

        return super().to_internal_value(normalized_data)

    def validate_conditional_logic(self, value):
        if value is None:
            return value
        if not isinstance(value, dict):
            raise serializers.ValidationError('conditional_logic debe ser un objeto.')
        question_id = value.get('question_id')
        if not question_id:
            raise serializers.ValidationError('conditional_logic requiere question_id.')
        operator = value.get('operator') or 'equals'
        if operator not in self.CONDITION_OPERATORS:
            raise serializers.ValidationError(f'Operador de condición no válido: {operator}')
        raw_val = value.get('value')
        if raw_val is None or (isinstance(raw_val, str) and raw_val.strip() == ''):
            raise serializers.ValidationError('conditional_logic requiere un valor no vacío.')
        return {
            'type': value.get('type') or 'show_if',
            'question_id': str(question_id),
            'operator': operator,
            'value': raw_val if not isinstance(raw_val, str) else raw_val,
        }
    
    def to_representation(self, instance):
        # Normalize the data structure for output
        data = dict(instance) if isinstance(instance, dict) else instance
        result = {}
        
        # Include ID if it exists, otherwise generate one based on index
        if 'id' in data:
            result['id'] = str(data['id'])
        elif '_id' in data:
            result['id'] = str(data['_id'])
        
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
        if 'question_image' in data and data['question_image']:
            result['question_image'] = data['question_image']
        return result

class SectionSerializer(serializers.Serializer):
    """Serializer for survey sections"""
    id = serializers.CharField(max_length=255, required=False) # Section ID (generated if not provided)
    title = serializers.CharField(max_length=255, required=False, allow_blank=True, default='')
    description = serializers.CharField(max_length=10000, required=False, allow_blank=True)
    order = serializers.IntegerField(required=False, default=0) # Order of the section

class SurveySerializer(serializers.Serializer):
    id = ObjectIdField(read_only=True)
    title = serializers.CharField(max_length=255)
    description = serializers.CharField(max_length=10000, required=False, allow_blank=True)
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
    header_image = serializers.CharField(max_length=500000, required=False, allow_blank=True, default='')
    # Consentimiento informado (plantilla rellenada desde respuestas; PDF en cliente)
    informed_consent_enabled = serializers.BooleanField(required=False, default=False)
    informed_consent = serializers.JSONField(required=False, default=dict)

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
        data['informed_consent_enabled'] = bool(instance.get('informed_consent_enabled', False))
        ic = instance.get('informed_consent') or {}
        data['informed_consent'] = ic if isinstance(ic, dict) else {}

        return data

    def validate(self, attrs):
        questions = attrs.get('questions') or []
        if not isinstance(questions, list):
            return attrs
        question_ids = {str(q.get('id')) for q in questions if isinstance(q, dict) and q.get('id')}
        for idx, q in enumerate(questions):
            if not isinstance(q, dict):
                continue
            cl = q.get('conditional_logic')
            if not cl:
                continue
            ref = str(cl.get('question_id') or '')
            if ref and question_ids and ref not in question_ids:
                raise serializers.ValidationError({
                    'questions': {
                        idx: {
                            'conditional_logic': f'question_id "{ref}" no existe en esta encuesta.'
                        }
                    }
                })
        return attrs

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
    consent_email = serializers.EmailField(required=False, allow_blank=True, allow_null=True)
    consent_token = serializers.CharField(required=False, allow_blank=True, write_only=True)
    consent_otp_verified_at = serializers.DateTimeField(required=False, allow_null=True, read_only=True)

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