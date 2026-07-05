from rest_framework.throttling import AnonRateThrottle, UserRateThrottle


class LoginRateThrottle(AnonRateThrottle):
    scope = 'login'


class ReferenceLookupRateThrottle(AnonRateThrottle):
    scope = 'reference_lookup'


class AttachmentUploadRateThrottle(AnonRateThrottle):
    scope = 'attachment_upload'


class ResponseSyncRateThrottle(UserRateThrottle):
    scope = 'response_sync'
