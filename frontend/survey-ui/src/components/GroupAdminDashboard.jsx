import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUsers, faFileLines, faChartBar, faUserPlus, faEdit } from '@fortawesome/free-solid-svg-icons';
import { authenticatedFetch } from '../auth';
import GroupUsersManager from './GroupUsersManager';

const GroupAdminDashboard = ({ currentUser }) => {
  const [groupInfo, setGroupInfo] = useState(null);
  const [surveys, setSurveys] = useState([]);
  const [responses, setResponses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showUsersManager, setShowUsersManager] = useState(false);

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
        setResponses(data);
      }
    } catch (err) {
      console.error('Error al cargar respuestas:', err);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <p>Cargando dashboard...</p>
      </div>
    );
  }

  if (!groupInfo) {
    return (
      <div className="p-6">
        <p className="text-red-600">No se pudo cargar la información del grupo</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {showUsersManager ? (
        <GroupUsersManager
          groupId={currentUser.user_group_id}
          onClose={() => setShowUsersManager(false)}
        />
      ) : (
        <>
          {/* Header del Grupo */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-800 mb-2">{groupInfo.name}</h1>
                {groupInfo.description && (
                  <p className="text-gray-600">{groupInfo.description}</p>
                )}
              </div>
              <button
                onClick={() => setShowUsersManager(true)}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-2"
              >
                <FontAwesomeIcon icon={faUsers} /> Gestionar Usuarios
              </button>
            </div>
          </div>

          {/* Estadísticas */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-500 text-sm mb-1">Usuarios en el Grupo</p>
                  <p className="text-3xl font-bold text-gray-800">{groupInfo.user_count || 0}</p>
                </div>
                <div className="p-3 bg-indigo-100 rounded-lg">
                  <FontAwesomeIcon icon={faUsers} className="text-indigo-600 text-2xl" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-500 text-sm mb-1">Encuestas</p>
                  <p className="text-3xl font-bold text-gray-800">{surveys.length}</p>
                </div>
                <div className="p-3 bg-green-100 rounded-lg">
                  <FontAwesomeIcon icon={faFileLines} className="text-green-600 text-2xl" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-500 text-sm mb-1">Respuestas</p>
                  <p className="text-3xl font-bold text-gray-800">{responses.length}</p>
                </div>
                <div className="p-3 bg-purple-100 rounded-lg">
                  <FontAwesomeIcon icon={faChartBar} className="text-purple-600 text-2xl" />
                </div>
              </div>
            </div>
          </div>

          {/* Encuestas Recientes */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Encuestas del Grupo</h2>
            {surveys.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No hay encuestas en este grupo</p>
            ) : (
              <div className="space-y-3">
                {surveys.slice(0, 5).map(survey => (
                  <div
                    key={survey.id}
                    className="p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-bold text-gray-800">{survey.title}</h3>
                        {survey.description && (
                          <p className="text-sm text-gray-500 mt-1">{survey.description}</p>
                        )}
                        <p className="text-xs text-gray-400 mt-2">
                          {survey.questions?.length || 0} preguntas
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg"
                          title="Editar"
                        >
                          <FontAwesomeIcon icon={faEdit} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default GroupAdminDashboard;

