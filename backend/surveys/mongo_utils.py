import pymongo
from django.conf import settings

_mongo_client = None
_mongo_db = None

def get_mongo_db():
    """
    Returns the MongoDB database object.
    Initializes the connection if not already established.
    """
    global _mongo_client, _mongo_db
    if _mongo_db is None:
        try:
            _mongo_client = pymongo.MongoClient(settings.MONGO_URI)
            _mongo_db = _mongo_client[settings.MONGO_DB_NAME]
            # The ismaster command is cheap and does not require auth.
            _mongo_db.command('ismaster')
            print("MongoDB connection successful!")
        except pymongo.errors.ConnectionFailure as e:
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
