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
  const [activeView, setActiveView] = useState('dashboard'); // 'dashboard', 'surveys', 'responses'

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
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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

