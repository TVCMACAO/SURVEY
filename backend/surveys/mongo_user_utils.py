"""
Utilidades para gestionar usuarios en MongoDB
"""
from django.contrib.auth.hashers import make_password, check_password
from bson import ObjectId
from datetime import datetime
from .mongo_utils import get_users_collection


def create_user_in_mongo(username, password, email='', first_name='', last_name='', role='encuestador', 
                        user_group_id=None, is_active=True, is_staff=False, is_superuser=False):
    """
    Crea un nuevo usuario en MongoDB
    """
    users_collection = get_users_collection()
    
    # Verificar que el username no exista
    if users_collection.find_one({'username': username}):
        raise ValueError(f"El usuario '{username}' ya existe")
    
    user_doc = {
        'username': username,
        'password_hash': make_password(password),
        'email': email,
        'first_name': first_name,
        'last_name': last_name,
        'role': role,
        'user_group_id': user_group_id,
        'is_active': is_active,
        'is_staff': is_staff,
        'is_superuser': is_superuser,
        'date_joined': datetime.utcnow(),
        'last_login': None
    }
    
    result = users_collection.insert_one(user_doc)
    user_doc['_id'] = result.inserted_id
    user_doc['id'] = str(result.inserted_id)
    return user_doc


def get_user_by_username(username):
    """
    Obtiene un usuario por username desde MongoDB
    """
    users_collection = get_users_collection()
    user = users_collection.find_one({'username': username})
    if user:
        user['id'] = str(user['_id'])
    return user


def get_user_by_id(user_id):
    """
    Obtiene un usuario por ID desde MongoDB
    """
    users_collection = get_users_collection()
    try:
        user = users_collection.find_one({'_id': ObjectId(user_id)})
        if user:
            user['id'] = str(user['_id'])
        return user
    except Exception:
        return None


def authenticate_user(username, password):
    """
    Autentica un usuario verificando username y password
    Retorna el usuario si las credenciales son correctas, None en caso contrario
    """
    user = get_user_by_username(username)
    if not user:
        return None
    
    if not user.get('is_active', True):
        return None
    
    if check_password(password, user.get('password_hash', '')):
        # Actualizar last_login
        users_collection = get_users_collection()
        users_collection.update_one(
            {'_id': user['_id']},
            {'$set': {'last_login': datetime.utcnow()}}
        )
        user['last_login'] = datetime.utcnow()
        return user
    
    return None


def update_user_in_mongo(user_id, **updates):
    """
    Actualiza un usuario en MongoDB
    """
    users_collection = get_users_collection()
    
    # Si se actualiza la contraseña, hashearla
    if 'password' in updates:
        updates['password_hash'] = make_password(updates.pop('password'))
    
    # Convertir user_id a ObjectId si es string
    try:
        user_oid = ObjectId(user_id) if isinstance(user_id, str) else user_id
    except Exception:
        return None
    
    result = users_collection.update_one(
        {'_id': user_oid},
        {'$set': updates}
    )
    
    if result.modified_count > 0:
        return get_user_by_id(user_id)
    return None


def delete_user_from_mongo(user_id):
    """
    Elimina un usuario de MongoDB
    """
    users_collection = get_users_collection()
    try:
        user_oid = ObjectId(user_id) if isinstance(user_id, str) else user_id
        result = users_collection.delete_one({'_id': user_oid})
        return result.deleted_count > 0
    except Exception:
        return False


def list_users_from_mongo(filter_dict=None, order_by='-date_joined'):
    """
    Lista usuarios de MongoDB con filtros opcionales
    """
    users_collection = get_users_collection()
    
    query = filter_dict or {}
    users = list(users_collection.find(query))
    
    # Ordenar
    if order_by.startswith('-'):
        reverse = True
        field = order_by[1:]
    else:
        reverse = False
        field = order_by
    
    if field == 'date_joined':
        users.sort(key=lambda x: x.get('date_joined', datetime.min), reverse=reverse)
    elif field == 'username':
        users.sort(key=lambda x: x.get('username', ''), reverse=reverse)
    
    # Agregar id como string
    for user in users:
        user['id'] = str(user['_id'])
    
    return users


def user_exists_in_mongo(username):
    """
    Verifica si un usuario existe en MongoDB
    """
    users_collection = get_users_collection()
    return users_collection.find_one({'username': username}) is not None

