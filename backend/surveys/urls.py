from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from .views import (
    CustomTokenObtainPairView,
    SurveyGroupListCreate, SurveyGroupRetrieveUpdateDestroy,
    UserGroupListCreate, UserGroupRetrieveUpdateDestroy,
    UserGroupUsersListCreate, UserGroupUsersRetrieveUpdateDestroy,
    SurveyListCreate, SurveyRetrieveUpdateDestroy,
    SurveyRestoreView, SurveyPermanentDeleteView,
    ResponseListCreate, ResponseRetrieve,
    CurrentUserView, UserListCreate, UserRetrieveUpdateDestroy,
    PublicSurveyView, PublicResponseCreate,
    ResponseSyncView, SyncStatusView,
    ChecklistMonthlySummaryView
)

urlpatterns = [
    # Autenticación JWT
    path('token/', CustomTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    
    # Rutas de usuario
    path('me/', CurrentUserView.as_view(), name='current_user'),
    path('users/', UserListCreate.as_view(), name='user-list-create'),
    path('users/<str:pk>/', UserRetrieveUpdateDestroy.as_view(), name='user-detail'),  # Cambiado a str para ObjectId de MongoDB

    # Rutas para Grupos de Encuestas
    path('groups/', SurveyGroupListCreate.as_view(), name='surveygroup-list-create'),
    path('groups/<str:pk>/', SurveyGroupRetrieveUpdateDestroy.as_view(), name='surveygroup-detail'),

    # Rutas para Grupos de Usuarios
    path('user-groups/', UserGroupListCreate.as_view(), name='usergroup-list-create'),
    path('user-groups/<str:pk>/', UserGroupRetrieveUpdateDestroy.as_view(), name='usergroup-detail'),
    path('user-groups/<str:group_id>/users/', UserGroupUsersListCreate.as_view(), name='usergroup-users-list-create'),
    path('user-groups/<str:group_id>/users/<str:user_id>/', UserGroupUsersRetrieveUpdateDestroy.as_view(), name='usergroup-users-detail'),  # Cambiado a str para ObjectId de MongoDB

    # Rutas para Encuestas
    path('surveys/', SurveyListCreate.as_view(), name='survey-list-create'),
    path('surveys/<str:pk>/', SurveyRetrieveUpdateDestroy.as_view(), name='survey-detail'),
    path('surveys/<str:pk>/restore/', SurveyRestoreView.as_view(), name='survey-restore'),
    path('surveys/<str:pk>/permanent-delete/', SurveyPermanentDeleteView.as_view(), name='survey-permanent-delete'),
    
    # Rutas para Checklists
    path('checklists/<str:survey_id>/monthly-summary/', ChecklistMonthlySummaryView.as_view(), name='checklist-monthly-summary'),

    # Rutas para Respuestas
    path('responses/', ResponseListCreate.as_view(), name='response-list-create'),
    
    # Rutas de sincronización (DEBEN estar ANTES de responses/<str:pk>/ para evitar conflictos)
    path('responses/sync/', ResponseSyncView.as_view(), name='response-sync'),
    path('responses/sync-status/', SyncStatusView.as_view(), name='response-sync-status'),
    
    # Rutas para Respuestas individuales (después de las rutas específicas)
    path('responses/<str:pk>/', ResponseRetrieve.as_view(), name='response-detail'),
    
    # Rutas públicas (sin autenticación)
    path('public/surveys/<str:pk>/', PublicSurveyView.as_view(), name='public-survey-detail'),
    path('public/responses/', PublicResponseCreate.as_view(), name='public-response-create'),
]