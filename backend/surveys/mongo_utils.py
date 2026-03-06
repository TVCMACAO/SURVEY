import pymongo
from django.conf import settings

_mongo_client = None
_mongo_db = None

def get_mongo_db():
    """
    Returns the MongoDB database object.
    Initializes the connection if not already established.
    """
    import json
    import traceback
    log_file_path = '/home/vps/Documentos/survey-app/.cursor/debug.log'
    
    global _mongo_client, _mongo_db
    if _mongo_db is None:
        # #region agent log
        try:
            with open(log_file_path, 'a') as f:
                f.write(json.dumps({
                    "sessionId": "debug-session",
                    "runId": "run1",
                    "hypothesisId": "E",
                    "location": "mongo_utils.py:7",
                    "message": "Attempting MongoDB connection",
                    "data": {
                        "mongo_uri": settings.MONGO_URI[:50] + "..." if len(settings.MONGO_URI) > 50 else settings.MONGO_URI,  # Ocultar contraseña completa
                        "mongo_db_name": settings.MONGO_DB_NAME,
                        "mongo_uri_length": len(settings.MONGO_URI)
                    },
                    "timestamp": int(__import__('time').time() * 1000)
                }) + '\n')
        except Exception:
            pass
        # #endregion
        
        try:
            _mongo_client = pymongo.MongoClient(settings.MONGO_URI)
            _mongo_db = _mongo_client[settings.MONGO_DB_NAME]
            # The ismaster command is cheap and does not require auth.
            _mongo_db.command('ismaster')
            
            # #region agent log
            try:
                with open(log_file_path, 'a') as f:
                    f.write(json.dumps({
                        "sessionId": "debug-session",
                        "runId": "run1",
                        "hypothesisId": "E",
                        "location": "mongo_utils.py:7",
                        "message": "MongoDB connection successful",
                        "data": {
                            "database_name": settings.MONGO_DB_NAME,
                            "server_info": str(_mongo_client.server_info()) if _mongo_client else None
                        },
                        "timestamp": int(__import__('time').time() * 1000)
                    }) + '\n')
            except Exception:
                pass
            # #endregion
            
            print("MongoDB connection successful!")
        except Exception as e:
            # #region agent log
            try:
                with open(log_file_path, 'a') as f:
                    f.write(json.dumps({
                        "sessionId": "debug-session",
                        "runId": "run1",
                        "hypothesisId": "E",
                        "location": "mongo_utils.py:7",
                        "message": "MongoDB connection failed",
                        "data": {
                            "error_type": type(e).__name__,
                            "error_message": str(e),
                            "error_args": str(e.args) if hasattr(e, 'args') else None,
                            "traceback": traceback.format_exc(),
                            "mongo_uri_preview": settings.MONGO_URI[:50] + "..." if len(settings.MONGO_URI) > 50 else settings.MONGO_URI
                        },
                        "timestamp": int(__import__('time').time() * 1000)
                    }) + '\n')
            except Exception:
                pass
            # #endregion
            
            print(f"MongoDB connection failed: {e}")
            _mongo_client = None
            _mongo_db = None
            raise # Re-raise the exception to indicate connection failure
    return _mongo_db

def get_mongo_collection(collection_name):
    """
    Returns a specific MongoDB collection object.
    """
    db = get_mongo_db()
    return db[collection_name]

# Helper to define our collections based on the architecture
def get_survey_groups_collection():
    return get_mongo_collection('groups') # User defined Group(name, created_by)
def get_surveys_collection():
    return get_mongo_collection('surveys') # Survey(uuid PK, title, group, questions JSON[])
def get_responses_collection():
    return get_mongo_collection('responses') # Response(uuid PK, survey, surveyor_id, device_id, answers JSON, synced bool)
def get_attachments_collection():
    return get_mongo_collection('attachments')  # Attachment(_id, filename, stored_name, storage?, gridfs_id?)


def get_gridfs():
    """GridFS para adjuntos. Los archivos se guardan en MongoDB (fs.files, fs.chunks)."""
    from gridfs import GridFS
    return GridFS(get_mongo_db(), collection='attachments_fs')
