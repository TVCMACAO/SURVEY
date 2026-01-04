"""
Custom middleware for debugging and logging
"""
import logging

logger = logging.getLogger(__name__)

class HostHeaderLoggingMiddleware:
    """
    Middleware to log Host headers for debugging ALLOWED_HOSTS issues
    """
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        # #region agent log
        host = request.get_host()
        logger.info(f"Request Host: {host}, Path: {request.path}, Method: {request.method}")
        # #endregion
        
        try:
            response = self.get_response(request)
            return response
        except Exception as e:
            # #region agent log
            logger.error(f"Request failed - Host: {host}, Path: {request.path}, Error: {str(e)}")
            # #endregion
            raise


