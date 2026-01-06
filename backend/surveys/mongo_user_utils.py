"""
Utilidades para gestionar usuarios en MongoDB
"""
from datetime import datetime
from django.contrib.auth.hashers import make_password
from .mongo_utils import get_mongo_collection
from bson import ObjectId


def create_user(username, password, email='', role='encuestador', 
                is_staff=False, is_superuser=False, first_name='', last_name='', user_group_id=None):
    """
    Crea un nuevo usuario en MongoDB.
    """
    users_collection = get_mongo_collection('users')
    
    # Verificar si el usuario ya existe
    existing_user = users_collection.find_one({'username': username})
    if existing_user:
        raise ValueError(f"El usuario '{username}' ya existe")
    
    # Crear documento de usuario
    user_doc = {
        'username': username,
        'password': make_password(password),
        'email': email,
        'role': role,
        'is_active': True,
        'is_staff': is_staff,
        'is_superuser': is_superuser,
        'first_name': first_name,
        'last_name': last_name,
        'date_joined': datetime.utcnow(),
    }
    
    # Agregar user_group_id si se proporciona
    if user_group_id is not None:
        try:
            user_doc['user_group_id'] = ObjectId(user_group_id)
        except Exception:
            user_doc['user_group_id'] = user_group_id
    
    # Insertar en MongoDB
    result = users_collection.insert_one(user_doc)
    user_doc['_id'] = result.inserted_id
    user_doc['id'] = str(result.inserted_id)
    
    return user_doc


def get_user_by_username(username):
    """
    Obtiene un usuario por su username.
    """
    users_collection = get_mongo_collection('users')
    return users_collection.find_one({'username': username})


def get_user_by_id(user_id):
    """
    Obtiene un usuario por su ID.
    """
    users_collection = get_mongo_collection('users')
    
    try:
        # Intentar buscar por ObjectId
        return users_collection.find_one({'_id': ObjectId(user_id)})
    except:
        # Si falla, intentar buscar por string ID
        return users_collection.find_one({'_id': user_id})


def update_user_password(username, new_password):
    """
    Actualiza la contraseña de un usuario.
    """
    users_collection = get_mongo_collection('users')
    users_collection.update_one(
        {'username': username},
        {'$set': {'password': make_password(new_password)}}
    )


def update_user(user_id, **kwargs):
    """
    Actualiza un usuario en MongoDB.
    """
    users_collection = get_mongo_collection('users')
    
    # Preparar datos de actualización
    update_data = {}
    if 'password' in kwargs:
        update_data['password'] = make_password(kwargs['password'])
    if 'email' in kwargs:
        update_data['email'] = kwargs['email']
    if 'role' in kwargs:
        update_data['role'] = kwargs['role']
    if 'is_active' in kwargs:
        update_data['is_active'] = kwargs['is_active']
    if 'first_name' in kwargs:
        update_data['first_name'] = kwargs['first_name']
    if 'last_name' in kwargs:
        update_data['last_name'] = kwargs['last_name']
    if 'user_group_id' in kwargs:
        update_data['user_group_id'] = kwargs['user_group_id']
    
    if not update_data:
        return None
    
    # Buscar y actualizar
    try:
        users_collection.update_one(
            {'_id': ObjectId(user_id)},
            {'$set': update_data}
        )
        return get_user_by_id(user_id)
    except Exception:
        try:
            users_collection.update_one(
                {'_id': user_id},
                {'$set': update_data}
            )
            return get_user_by_id(user_id)
        except Exception:
            return None


def ensure_root_user(password='root123'):
    """
    Asegura que el usuario root existe en MongoDB.
    """
    users_collection = get_mongo_collection('users')
    
    root_user = users_collection.find_one({'username': 'root'})
    
    if root_user:
        print(f"Usuario 'root' ya existe (ID: {root_user.get('_id')})")
        return root_user
    
    print("Creando usuario 'root' en MongoDB...")
    user_doc = create_user(
        username='root',
        password=password,
        email='root@example.com',
        role='root',
        is_staff=True,
        is_superuser=True
    )
    print(f"Usuario 'root' creado exitosamente (ID: {user_doc['_id']})")
    return user_doc

