import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faUsers, faFileLines, faChartBar, faUserPlus, faEdit, faTrash, 
  faEye, faPlus, faChevronLeft, faXmark, faShareNodes, faTable,
  faDownload, faFileExcel, faArrowLeft
} from '@fortawesome/free-solid-svg-icons';
import { authenticatedFetch } from '../auth';
import GroupUsersManager from './GroupUsersManager';

const GroupAdminDashboard = ({ currentUser, onBack, onNewSurvey, onEditSurvey, onDeleteSurvey, onViewResponses, onLogout }) => {
  const [groupInfo, setGroupInfo] = useState(null);
  const [surveys, setSurveys] = useState([]);
  const [responses, setResponses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showUsersManager, setShowUsersManager] = useState(false);
  const [showCreateUserForm, setShowCreateUserForm] = useState(false);
  const [activeView, setActiveView] = useState('dashboard'); // 'dashboard', 'surveys', 'responses'
  const [userFormData, setUserFormData] = useState({
    username: '',
    first_name: '',
    last_name: '',
    email: '',
    password: '',
    password_confirm: '',
    role: 'encuestador',
    is_active: true
  });
  const [userFormError, setUserFormError] = useState('');

  useEffect(() => {
    if (currentUser && currentUser.user_group_id) {
      loadGroupInfo();
      loadSurveys();
      loadResponses();
    }
  }, [currentUser]);

  const loadGroupInfo = async () => {
    try {
      const response = await authenticatedFetch(`/api/user-groups/${currentUser.user_group_id}/`);
      if (response.ok) {
        const data = await response.json();
        setGroupInfo(data);
      }
    } catch (err) {
      console.error('Error al cargar información del grupo:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadSurveys = async () => {
    try {
      const response = await authenticatedFetch('/api/surveys/');
      if (response.ok) {
        const data = await response.json();
        // Filtrar solo encuestas del grupo del usuario
        const groupSurveys = data.filter(survey => 
          survey.user_group_id === currentUser.user_group_id
        );
        setSurveys(groupSurveys);
      }
    } catch (err) {
      console.error('Error al cargar encuestas:', err);
    }
  };

  const loadResponses = async () => {
    try {
      const response = await authenticatedFetch('/api/responses/');
      if (response.ok) {
        const data = await response.json();
        // Filtrar solo respuestas de encuestas del grupo
        const groupSurveyIds = surveys.map(s => s.id || s._id);
        const groupResponses = data.filter(response => 
          groupSurveyIds.includes(response.survey)
        );
        setResponses(groupResponses);
      }
    } catch (err) {
      console.error('Error al cargar respuestas:', err);
    }
  };

  const handleDeleteSurvey = async (surveyId) => {
    if (!window.confirm('¿Estás seguro de eliminar esta encuesta?')) {
      return;
    }
    try {
      if (onDeleteSurvey) {
        await onDeleteSurvey(surveyId);
        await loadSurveys();
      }
    } catch (err) {
      console.error('Error al eliminar encuesta:', err);
      alert('Error al eliminar la encuesta');
    }
  };

  const handleEditSurvey = (survey) => {
    if (onEditSurvey) {
      onEditSurvey(survey);
    }
  };

  const handleViewSurveyResponses = (survey) => {
    if (onViewResponses) {
      onViewResponses(survey);
    }
  };

  const handleNewSurvey = () => {
    if (onNewSurvey) {
      onNewSurvey();
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setUserFormError('');

    if (userFormData.password !== userFormData.password_confirm) {
      setUserFormError('Las contraseñas no coinciden.');
      return;
    }

    if (userFormData.password.length < 8) {
      setUserFormError('La contraseña debe tener al menos 8 caracteres.');
      return;
    }

    try {
      // Crear usuario con el grupo del administrador asignado automáticamente
      const userData = {
        ...userFormData,
        user_group_id: currentUser.user_group_id, // Asignar automáticamente al grupo del admin
        password_confirm: userFormData.password
      };
      delete userData.password_confirm;

      const response = await authenticatedFetch('/api/users/', {
        method: 'POST',
        body: JSON.stringify(userData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || JSON.stringify(errorData));
      }

      // Recargar usuarios del grupo
      if (showUsersManager) {
        // Si está en el gestor de usuarios, recargar la lista
        window.location.reload(); // O mejor, pasar un callback para recargar
      } else {
        // Recargar información del grupo para actualizar el contador
        await loadGroupInfo();
      }

      setShowCreateUserForm(false);
      setUserFormData({
        username: '',
        first_name: '',
        last_name: '',
        email: '',
        password: '',
        password_confirm: '',
        role: 'encuestador',
        is_active: true
      });
      alert('Usuario creado exitosamente y asignado al grupo.');
    } catch (error) {
      console.error("Error creating user:", error);
      setUserFormError(error.message);
    }
  };

  if (loading) {
    return (
      <main className="flex-1 relative z-10">
        <div className="w-full max-w-7xl mx-auto px-4 py-8 md:py-12">
          <div className="text-center py-20">
            <p className="text-gray-500">Cargando dashboard...</p>
          </div>
        </div>
      </main>
    );
  }

  if (!groupInfo) {
    return (
      <main className="flex-1 relative z-10">
        <div className="w-full max-w-7xl mx-auto px-4 py-8 md:py-12">
          <div className="text-center py-20">
            <p className="text-red-600">No se pudo cargar la información del grupo</p>
            {onBack && (
              <button
                onClick={onBack}
                className="mt-4 px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl font-bold text-sm shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105 active:scale-95 flex items-center gap-2 mx-auto"
              >
                <FontAwesomeIcon icon={faArrowLeft} size="sm" /> Volver
              </button>
            )}
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 relative z-10">
      <header className="sticky top-0 z-40 px-4 py-5 md:px-12 md:py-6 bg-white/70 backdrop-blur-xl border-b border-white/60 shadow-sm">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-black bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent tracking-tight mb-1">
              {groupInfo.name}
            </h1>
            <p className="text-sm text-gray-600 font-medium">
              {groupInfo.description || 'Panel de administración del grupo'}
            </p>
          </div>
          <div className="flex gap-3">
            {!showUsersManager && activeView === 'dashboard' && (
              <button
                onClick={handleNewSurvey}
                className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-xl font-bold text-sm shadow-xl hover:shadow-2xl flex items-center gap-2 transition-all duration-200 hover:scale-105 active:scale-95"
              >
                <FontAwesomeIcon icon={faPlus} size="sm" className="fa-icon-force-white" /> Nueva Encuesta
              </button>
            )}
            {onBack && (
              <button
                onClick={onBack}
                className="px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl font-bold text-sm shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105 active:scale-95 flex items-center gap-2"
              >
                <FontAwesomeIcon icon={faChevronLeft} size="sm" className="fa-icon-force-current" /> Volver
              </button>
            )}
            {onLogout && (
              <button
                onClick={onLogout}
                className="px-6 py-3 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white rounded-xl font-bold text-sm shadow-xl hover:shadow-2xl transition-all duration-200 hover:scale-105 active:scale-95"
              >
                Salir
              </button>
            )}
          </div>
        </div>
      </header>

      <div className="w-full max-w-7xl mx-auto px-4 py-8 md:py-12">
        {showUsersManager ? (
          <GroupUsersManager
            groupId={currentUser.user_group_id}
            onClose={() => setShowUsersManager(false)}
          />
        ) : showCreateUserForm ? (
          <div className="bg-white/90 backdrop-blur-xl rounded-3xl border border-white/80 p-6 md:p-8 shadow-lg">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-2xl font-black text-gray-800">Crear Nuevo Usuario</h2>
                <p className="text-sm text-gray-500 mt-1">El usuario se asignará automáticamente a tu grupo: <strong>{groupInfo.name}</strong></p>
              </div>
              <button 
                onClick={() => {
                  setShowCreateUserForm(false);
                  setUserFormError('');
                  setUserFormData({
                    username: '',
                    first_name: '',
                    last_name: '',
                    email: '',
                    password: '',
                    password_confirm: '',
                    role: 'encuestador',
                    is_active: true
                  });
                }}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <FontAwesomeIcon icon={faXmark} size="lg" className="text-gray-500" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-4">
              {userFormError && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
                  {userFormError}
                </div>
              )}

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Usuario <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={userFormData.username}
                  onChange={(e) => setUserFormData({...userFormData, username: e.target.value})}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  required
                  autoComplete="username"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    Nombre
                  </label>
                  <input
                    type="text"
                    value={userFormData.first_name}
                    onChange={(e) => setUserFormData({...userFormData, first_name: e.target.value})}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    autoComplete="given-name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    Apellido
                  </label>
                  <input
                    type="text"
                    value={userFormData.last_name}
                    onChange={(e) => setUserFormData({...userFormData, last_name: e.target.value})}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    autoComplete="family-name"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={userFormData.email}
                  onChange={(e) => setUserFormData({...userFormData, email: e.target.value})}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  autoComplete="email"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Contraseña <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  value={userFormData.password}
                  onChange={(e) => setUserFormData({...userFormData, password: e.target.value})}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  autoComplete="new-password"
                  required
                  minLength={8}
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Confirmar Contraseña <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  value={userFormData.password_confirm}
                  onChange={(e) => setUserFormData({...userFormData, password_confirm: e.target.value})}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  autoComplete="new-password"
                  required
                  minLength={8}
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Rol <span className="text-red-500">*</span>
                </label>
                <select
                  value={userFormData.role}
                  onChange={(e) => setUserFormData({...userFormData, role: e.target.value})}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  required
                >
                  <option value="encuestador">Encuestador</option>
                  <option value="analista">Analista</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Los usuarios creados desde aquí se asignan automáticamente a tu grupo.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={userFormData.is_active}
                  onChange={(e) => setUserFormData({...userFormData, is_active: e.target.checked})}
                  className="w-5 h-5 text-indigo-600 focus:ring-indigo-500 rounded"
                />
                <label htmlFor="is_active" className="text-sm font-bold text-gray-700 cursor-pointer">
                  Usuario activo
                </label>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-xl font-bold shadow-xl hover:shadow-2xl transition-all duration-200 hover:scale-105 active:scale-95"
                >
                  Crear Usuario
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateUserForm(false);
                    setUserFormError('');
                    setUserFormData({
                      username: '',
                      first_name: '',
                      last_name: '',
                      email: '',
                      password: '',
                      password_confirm: '',
                      role: 'encuestador',
                      is_active: true
                    });
                  }}
                  className="px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl font-bold transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        ) : (
          <>

            {/* Estadísticas */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl p-5 text-white shadow-lg hover:shadow-xl transition-shadow cursor-pointer" onClick={() => setShowUsersManager(true)}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm opacity-90 font-medium mb-1">Usuarios en el Grupo</p>
                    <p className="text-3xl font-black">{groupInfo.user_count || 0}</p>
                  </div>
                  <div className="p-3 bg-white/20 rounded-lg">
                    <FontAwesomeIcon icon={faUsers} className="text-2xl" />
                  </div>
                </div>
                <p className="text-xs opacity-75 mt-2">Click para gestionar</p>
              </div>

              <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl p-5 text-white shadow-lg hover:shadow-xl transition-shadow">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm opacity-90 font-medium mb-1">Encuestas</p>
                    <p className="text-3xl font-black">{surveys.length}</p>
                  </div>
                  <div className="p-3 bg-white/20 rounded-lg">
                    <FontAwesomeIcon icon={faFileLines} className="text-2xl" />
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-purple-500 to-pink-600 rounded-2xl p-5 text-white shadow-lg hover:shadow-xl transition-shadow">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm opacity-90 font-medium mb-1">Respuestas</p>
                    <p className="text-3xl font-black">{responses.length}</p>
                  </div>
                  <div className="p-3 bg-white/20 rounded-lg">
                    <FontAwesomeIcon icon={faChartBar} className="text-2xl" />
                  </div>
                </div>
              </div>
            </div>

            {/* Acciones Rápidas */}
            <div className="bg-white/90 backdrop-blur-xl rounded-3xl border border-white/80 p-6 shadow-lg mb-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4">Acciones Rápidas</h2>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <button
                  onClick={() => setShowCreateUserForm(true)}
                  className="p-4 bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl border border-purple-200 hover:shadow-lg transition-all flex items-center gap-3"
                >
                  <div className="p-3 bg-purple-100 rounded-lg">
                    <FontAwesomeIcon icon={faUserPlus} className="text-purple-600 text-xl" />
                  </div>
                  <div className="text-left">
                    <p className="font-bold text-gray-800">Crear Usuario</p>
                    <p className="text-xs text-gray-500">Crear nuevo usuario en el grupo</p>
                  </div>
                </button>
                <button
                  onClick={() => setShowUsersManager(true)}
                  className="p-4 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl border border-indigo-200 hover:shadow-lg transition-all flex items-center gap-3"
                >
                  <div className="p-3 bg-indigo-100 rounded-lg">
                    <FontAwesomeIcon icon={faUsers} className="text-indigo-600 text-xl" />
                  </div>
                  <div className="text-left">
                    <p className="font-bold text-gray-800">Gestionar Usuarios</p>
                    <p className="text-xs text-gray-500">Agregar o remover usuarios del grupo</p>
                  </div>
                </button>
                <button
                  onClick={handleNewSurvey}
                  className="p-4 bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl border border-green-200 hover:shadow-lg transition-all flex items-center gap-3"
                >
                  <div className="p-3 bg-green-100 rounded-lg">
                    <FontAwesomeIcon icon={faPlus} className="text-green-600 text-xl" />
                  </div>
                  <div className="text-left">
                    <p className="font-bold text-gray-800">Nueva Encuesta</p>
                    <p className="text-xs text-gray-500">Crear una nueva encuesta para el grupo</p>
                  </div>
                </button>
                <button
                  onClick={() => setActiveView('surveys')}
                  className="p-4 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl border border-blue-200 hover:shadow-lg transition-all flex items-center gap-3"
                >
                  <div className="p-3 bg-blue-100 rounded-lg">
                    <FontAwesomeIcon icon={faFileLines} className="text-blue-600 text-xl" />
                  </div>
                  <div className="text-left">
                    <p className="font-bold text-gray-800">Ver Todas las Encuestas</p>
                    <p className="text-xs text-gray-500">Ver y gestionar todas las encuestas</p>
                  </div>
                </button>
              </div>
            </div>

            {/* Encuestas del Grupo */}
            <div className="bg-white/90 backdrop-blur-xl rounded-3xl border border-white/80 shadow-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-800">Encuestas del Grupo</h2>
                <button
                  onClick={handleNewSurvey}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-2 text-sm font-bold"
                >
                  <FontAwesomeIcon icon={faPlus} size="sm" /> Nueva Encuesta
                </button>
              </div>
              {surveys.length === 0 ? (
                <div className="text-center py-12 border-2 border-dashed border-gray-300/60 rounded-2xl bg-gray-50/50">
                  <div className="w-16 h-16 bg-gradient-to-br from-indigo-100 to-purple-200 rounded-full flex items-center justify-center mx-auto mb-4 text-indigo-400">
                    <FontAwesomeIcon icon={faFileLines} size="2x" />
                  </div>
                  <p className="text-lg font-bold text-gray-700 mb-2">No hay encuestas en este grupo</p>
                  <p className="text-gray-500 mb-4">Crea tu primera encuesta para comenzar</p>
                  <button
                    onClick={handleNewSurvey}
                    className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-xl font-bold shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105 active:scale-95 flex items-center gap-2 mx-auto"
                  >
                    <FontAwesomeIcon icon={faPlus} size="sm" /> Crear Primera Encuesta
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {surveys.map(survey => (
                    <div
                      key={survey.id || survey._id}
                      className="p-4 border-2 border-gray-200 rounded-xl hover:shadow-lg transition-all bg-white"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <h3 className="font-bold text-gray-800 mb-1 line-clamp-2">{survey.title || 'Sin título'}</h3>
                          {survey.description && (
                            <p className="text-sm text-gray-500 line-clamp-2 mb-2">{survey.description}</p>
                          )}
                          <div className="flex items-center gap-3 text-xs text-gray-400">
                            <span className="flex items-center gap-1">
                              <FontAwesomeIcon icon={faListUl} size="sm" />
                              {survey.questions?.length || 0} preguntas
                            </span>
                            {survey.is_public && (
                              <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full font-bold">
                                Pública
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
                        <button
                          onClick={() => handleViewSurveyResponses(survey)}
                          className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                          title="Ver respuestas"
                        >
                          <FontAwesomeIcon icon={faChartBar} size="sm" />
                        </button>
                        <button
                          onClick={() => handleEditSurvey(survey)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Editar"
                        >
                          <FontAwesomeIcon icon={faEdit} size="sm" />
                        </button>
                        <button
                          onClick={() => handleDeleteSurvey(survey.id || survey._id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Eliminar"
                        >
                          <FontAwesomeIcon icon={faTrash} size="sm" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </main>
  );
};

export default GroupAdminDashboard;

