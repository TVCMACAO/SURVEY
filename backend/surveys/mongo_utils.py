import pymongo
from django.conf import settings

_mongo_client = None
_mongo_db = None


def get_mongo_db():
    """Returns the MongoDB database object, initializing the connection if needed."""
    global _mongo_client, _mongo_db
    if _mongo_db is None:
        try:
            _mongo_client = pymongo.MongoClient(settings.MONGO_URI)
            _mongo_db = _mongo_client[settings.MONGO_DB_NAME]
            _mongo_db.command('ismaster')
        except Exception:
            _mongo_client = None
            _mongo_db = None
            raise
    return _mongo_db


def get_mongo_collection(collection_name):
    return get_mongo_db()[collection_name]


def get_survey_groups_collection():
    return get_mongo_collection('groups')


def get_surveys_collection():
    return get_mongo_collection('surveys')


def get_responses_collection():
    return get_mongo_collection('responses')


def get_attachments_collection():
    return get_mongo_collection('attachments')


def get_gridfs():
    from gridfs import GridFS
    return GridFS(get_mongo_db(), collection='attachments_fs')


def get_consent_otps_collection():
    return get_mongo_collection('consent_otps')


def get_email_outbox_collection():
    return get_mongo_collection('email_outbox')
