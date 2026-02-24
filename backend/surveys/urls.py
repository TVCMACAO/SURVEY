from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from .views import (
    CustomTokenObtainPairView,
    SurveyGroupListCreate, SurveyGroupRetrieveUpdateDestroy,
    SurveyListCreate, SurveyRetrieveUpdateDestroy,
    SurveyRestoreView, SurveyPermanentDeleteView,
    SurveyReferenceFileUpload,
    ResponseListCreate, ResponseRetrieve,
    CurrentUserView, UserListCreate, UserRetrieveUpdateDestroy,
    PublicSurveyView, ReferenceLookup, PublicResponseCreate,
    ResponseSyncView, SyncStatusView
)

urlpatterns = [
    # Autenticación JWT
    path('token/', CustomTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    
    # Rutas de usuario
    path('me/', CurrentUserView.as_view(), name='current_user'),
    path('users/', UserListCreate.as_view(), name='user-list-create'),
    path('users/<str:pk>/', UserRetrieveUpdateDestroy.as_view(), name='user-detail'),

    # Rutas para Grupos de Encuestas
    path('groups/', SurveyGroupListCreate.as_view(), name='surveygroup-list-create'),
    path('groups/<str:pk>/', SurveyGroupRetrieveUpdateDestroy.as_view(), name='surveygroup-detail'),

    # Rutas para Encuestas
    path('surveys/', SurveyListCreate.as_view(), name='survey-list-create'),
    path('surveys/<str:pk>/', SurveyRetrieveUpdateDestroy.as_view(), name='survey-detail'),
    path('surveys/<str:pk>/reference-file/', SurveyReferenceFileUpload.as_view(), name='survey-reference-file'),
    path('surveys/<str:pk>/restore/', SurveyRestoreView.as_view(), name='survey-restore'),
    path('surveys/<str:pk>/permanent-delete/', SurveyPermanentDeleteView.as_view(), name='survey-permanent-delete'),

    # Rutas para Respuestas
    path('responses/', ResponseListCreate.as_view(), name='response-list-create'),
    
    # Rutas de sincronización (DEBEN estar ANTES de responses/<str:pk>/ para evitar conflictos)
    path('responses/sync/', ResponseSyncView.as_view(), name='response-sync'),
    path('responses/sync-status/', SyncStatusView.as_view(), name='response-sync-status'),
    
    # Rutas para Respuestas individuales (después de las rutas específicas)
    path('responses/<str:pk>/', ResponseRetrieve.as_view(), name='response-detail'),
    
    # Rutas públicas (sin autenticación)
    path('public/surveys/<str:pk>/', PublicSurveyView.as_view(), name='public-survey-detail'),
    path('public/surveys/<str:pk>/reference-lookup/', ReferenceLookup.as_view(), name='reference-lookup'),
    path('public/responses/', PublicResponseCreate.as_view(), name='public-response-create'),
]