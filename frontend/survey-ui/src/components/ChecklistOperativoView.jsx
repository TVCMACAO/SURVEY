import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSync, faCheckCircle, faExclamationTriangle } from '@fortawesome/free-solid-svg-icons';
import { authenticatedFetch } from '../auth';
import { useChecklistData } from '../hooks/useChecklistData';

const ChecklistOperativoView = ({ onBack, onViewSummary, hasChecklists, onLogout }) => {
  const [checklists, setChecklists] = useState([]);
  const [selectedChecklist, setSelectedChecklist] = useState(null);
  const [selectedArea, setSelectedArea] = useState('');
  const [activeCheck, setActiveCheck] = useState(1);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [message, setMessage] = useState(null);

  const {
    localData,
    isOnline,
    unsyncedCount,
    updateCompliance,
    getCheckData,
    syncAllChecks,
    isCheckLocked,
    isLimitReached,
    getTodayChecksCount
  } = useChecklistData();

  // Cargar checklists asignadas al usuario
  useEffect(() => {
    fetchChecklists();
  }, []);

  const fetchChecklists = async () => {
    try {
      setLoading(true);
      const response = await authenticatedFetch('/api/surveys/');
      if (response.ok) {
        const data = await response.json();
        // Filtrar solo checklists
        const checklistSurveys = data.filter(s => s.survey_type === 'checklist');
        setChecklists(checklistSurveys);
        
        if (checklistSurveys.length > 0) {
          setSelectedChecklist(checklistSurveys[0]);
          // Extraer áreas de las preguntas o usar un valor por defecto
          const areas = extractAreasFromChecklist(checklistSurveys[0]);
          if (areas.length > 0) {
            setSelectedArea(areas[0]);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching checklists:', error);
      setMessage({ type: 'error', text: 'Error al cargar las checklists' });
    } finally {
      setLoading(false);
    }
  };

  // Extraer áreas de un checklist
  // Si el checklist tiene secciones, usar los nombres de las secciones como áreas
  // Si no, usar un valor por defecto o extraer de las preguntas
  const extractAreasFromChecklist = (checklist) => {
    if (!checklist) return [];
    
    // Si tiene secciones, usar los nombres de las secciones
    if (checklist.sections && checklist.sections.length > 0) {
      return checklist.sections.map(s => s.title || s.name);
    }
    
    // Si no tiene secciones, usar áreas predefinidas como fallback
    // Estas áreas vienen del HTML original
    return [
      "ADMINISTRATIVO", "CONSULTA NUEVO", "FISIOTERAPIA", 
      "HOSPITALIZACION SEGUNDO PISO", "HOSPITALIZACION 4 PISO LADO B", 
      "HOSPITALIZACION 5 PISO LADO C", "HOSP 6TO PISO LADO C",
      "HOSPITALIZACION PEDIATRICA", "IMÁGENES", "LABORATORIO", 
      "URGENCIA PEDIATRICA", "BANCO DE SANGRE", "CIRUGIA Y QUIROFANOS", 
      "HEMODINAMIA Y CARDIOLOGIA", "UNIDAD RENAL", "SALA DE PARTOS", 
      "UCI ADULTO 4 PSIO LADO C", "UCI B SEGUBNDO PISO", "URGENCIAS ADULTO",
      "UCI NEONATAL Y PEDIATRICA"
    ];
  };

  const handleComplianceChange = (questionIndex, compliance) => {
    if (!selectedChecklist || !selectedArea) return;
    
    const checkData = getCheckData(selectedArea, activeCheck);
    
    // Verificar si el chequeo está bloqueado
    if (isCheckLocked(selectedArea, activeCheck)) {
      setMessage({ type: 'error', text: 'Este chequeo está bloqueado y no puede ser modificado' });
      return;
    }

    updateCompliance(
      selectedArea,
      questionIndex,
      compliance,
      activeCheck,
      selectedChecklist.id || selectedChecklist._id
    );

    setMessage({ type: 'success', text: `Respuesta guardada localmente para ${selectedArea} (Chequeo ${activeCheck})` });
    
    // Ocultar mensaje después de 3 segundos
    setTimeout(() => setMessage(null), 3000);
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      // Crear mapa de surveys para pasar las preguntas a syncAllChecks
      const surveysMap = {};
      checklists.forEach(checklist => {
        surveysMap[checklist.id || checklist._id] = checklist;
      });

      const results = await syncAllChecks(surveysMap);
      const successCount = results.filter(r => r.success).length;
      const failCount = results.filter(r => !r.success).length;

      if (successCount > 0) {
        setMessage({ 
          type: 'success', 
          text: `Sincronización completa: ${successCount} chequeos enviados${failCount > 0 ? `, ${failCount} fallaron` : ''}` 
        });
        // Refrescar datos después de sincronizar
        await fetchChecklists();
      } else if (failCount > 0) {
        setMessage({ type: 'error', text: `Error al sincronizar: ${failCount} chequeos fallaron` });
      } else {
        setMessage({ type: 'info', text: 'No hay chequeos pendientes para sincronizar' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Error al sincronizar: ' + error.message });
    } finally {
      setSyncing(false);
      setTimeout(() => setMessage(null), 5000);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando checklists...</p>
        </div>
      </div>
    );
  }

  if (checklists.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full text-center">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">No hay checklists asignadas</h2>
          <p className="text-gray-600 mb-6">No tienes checklists operativas asignadas a tu grupo.</p>
          <button
            onClick={onBack}
            className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
          >
            Volver
          </button>
        </div>
      </div>
    );
  }

  const areas = extractAreasFromChecklist(selectedChecklist);
  const currentCheckData = getCheckData(selectedArea, activeCheck);
  const isLocked = isCheckLocked(selectedArea, activeCheck);
  const limitReached = isLimitReached(selectedArea);
  const todayChecks = getTodayChecksCount(selectedArea);

  // Obtener preguntas del checklist
  const questions = selectedChecklist.questions || [];
  const questionsAnswered = currentCheckData 
    ? (currentCheckData.q1 !== null ? 1 : 0) + (currentCheckData.q2 !== null ? 1 : 0)
    : 0;

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      {/* Header */}
      <header className="bg-white p-4 rounded-xl shadow-md mb-6">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h1 className="text-3xl font-bold text-green-600">Checklist Operativo Gestion Ambiental</h1>
            <p className="text-sm text-gray-600 mt-1">
              Verificación de Áreas (Modo: <span className={`font-semibold ${isOnline ? 'text-green-600' : 'text-red-500'}`}>
                {isOnline ? 'Conectado' : 'Sin Conexión'}
              </span>)
            </p>
          </div>
          <div className="flex space-x-2">
            {onBack && (
              <button
                onClick={onBack}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
              >
                Ir a Encuestas
              </button>
            )}
            {onLogout && (
              <button
                onClick={onLogout}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition"
              >
                Cerrar Sesión
              </button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex justify-center space-x-2 border-b border-gray-200 mb-4">
          <button
            onClick={() => setActiveCheck(1)}
            className={`py-2 px-4 font-medium border-b-2 transition ${
              activeCheck === 1
                ? 'text-green-600 border-green-600 bg-green-50'
                : 'text-gray-600 border-transparent hover:text-gray-800'
            }`}
          >
            Chequeo 1
          </button>
          <button
            onClick={() => setActiveCheck(2)}
            className={`py-2 px-4 font-medium border-b-2 transition ${
              activeCheck === 2
                ? 'text-green-600 border-green-600 bg-green-50'
                : 'text-gray-600 border-transparent hover:text-gray-800'
            }`}
          >
            Chequeo 2
          </button>
          <button
            onClick={() => {
              if (onViewSummary && selectedChecklist) {
                onViewSummary(selectedChecklist);
              }
            }}
            className="py-2 px-4 font-medium border-b-2 border-transparent text-gray-600 hover:text-gray-800 hover:border-gray-300 transition"
          >
            Resumen Mensual
          </button>
        </div>

        {/* Controles */}
        <div className="flex flex-col md:flex-row justify-between items-center space-y-3 md:space-y-0 md:space-x-4">
          <select
            value={selectedArea}
            onChange={(e) => setSelectedArea(e.target.value)}
            className="w-full md:w-1/2 p-3 border border-gray-300 rounded-lg focus:ring-green-500 focus:border-green-500"
          >
            {areas.map(area => (
              <option key={area} value={area}>{area}</option>
            ))}
          </select>
          <button
            onClick={fetchChecklists}
            className="w-full md:w-auto bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-3 px-4 rounded-lg transition"
          >
            Refrescar Datos
          </button>
          <button
            onClick={handleSync}
            disabled={syncing || unsyncedCount === 0}
            className="w-full md:w-1/2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 px-4 rounded-lg transition flex items-center justify-center"
          >
            {syncing ? (
              <>
                <FontAwesomeIcon icon={faSync} className="animate-spin mr-3 h-5 w-5" />
                Sincronizando...
              </>
            ) : (
              <>
                <FontAwesomeIcon icon={faSync} className="mr-3 h-5 w-5" />
                Sincronizar Datos ({unsyncedCount})
              </>
            )}
          </button>
        </div>
      </header>

      {/* Mensaje de estado */}
      {message && (
        <div className={`mb-4 p-4 rounded-lg ${
          message.type === 'success' ? 'bg-green-100 text-green-800' :
          message.type === 'error' ? 'bg-red-100 text-red-800' :
          'bg-blue-100 text-blue-800'
        }`}>
          {message.text}
        </div>
      )}

      {/* Contenido del checklist */}
      <div className="bg-white p-6 rounded-xl shadow-md border-l-4 border-green-600">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">{selectedArea}</h2>
        <p className="text-sm text-gray-500 mb-4">
          Revisión del día: {new Date().toISOString().split('T')[0]}
        </p>

        {isLocked ? (
          <div className="bg-green-100 text-green-800 p-4 rounded-lg mb-4">
            <p className="font-bold">COMPLETADO Y SINCRONIZADO:</p>
            <p>Este chequeo ya ha sido finalizado y enviado. No puede ser modificado.</p>
          </div>
        ) : currentCheckData && currentCheckData.q1 !== null && currentCheckData.q2 !== null ? (
          <div className="bg-orange-100 text-orange-800 p-4 rounded-lg mb-4">
            <p className="font-bold">COMPLETADO LOCALMENTE:</p>
            <p>Este chequeo está listo para sincronizar.</p>
          </div>
        ) : (
          <div className={`p-4 rounded-lg mb-4 ${
            limitReached ? 'bg-red-100' : 'bg-green-100'
          }`}>
            <p>
              Chequeo activo <span className="font-bold text-green-600">#{activeCheck}</span>: {questionsAnswered}/{questions.length} preguntas respondidas.
            </p>
            {limitReached && (
              <p className="text-red-600 font-semibold mt-2">
                Se ha alcanzado el límite de {todayChecks} chequeos para hoy en esta área.
              </p>
            )}
          </div>
        )}

        {/* Preguntas */}
        <div className="space-y-4 mt-4">
          {questions.map((question, index) => {
            const qKey = `q${index + 1}`;
            const currentStatus = currentCheckData ? currentCheckData[qKey] : null;
            const isDisabled = isLocked;

            return (
              <div key={question.id || index} className="border border-gray-200 p-4 rounded-lg">
                <p className="font-medium text-gray-700 mb-3">
                  {index + 1}. {question.text || question.label || `Pregunta ${index + 1}`}
                </p>
                <div className="flex space-x-3">
                  <button
                    onClick={() => handleComplianceChange(index, 'Cumple')}
                    disabled={isDisabled}
                    className={`w-1/2 p-3 font-semibold rounded-lg transition ${
                      currentStatus === 'Cumple'
                        ? 'bg-green-600 text-white'
                        : 'bg-green-100 text-green-600 hover:bg-green-200'
                    } ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    Cumple
                  </button>
                  <button
                    onClick={() => handleComplianceChange(index, 'No cumple')}
                    disabled={isDisabled}
                    className={`w-1/2 p-3 font-semibold rounded-lg transition ${
                      currentStatus === 'No cumple'
                        ? 'bg-red-600 text-white'
                        : 'bg-red-100 text-red-600 hover:bg-red-200'
                    } ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    No cumple
                  </button>
                </div>
                {currentStatus && (
                  <p className={`text-xs mt-2 text-right ${
                    currentStatus === 'Cumple' ? 'text-green-600' : 'text-red-600'
                  }`}>
                    Estado: {currentStatus}
                  </p>
                )}
              </div>
            );
          })}
        </div>

        {/* Estado de sincronización */}
        {currentCheckData && (
          <div className="mt-4 flex items-center space-x-2 text-sm font-medium">
            {currentCheckData.synced ? (
              <>
                <FontAwesomeIcon icon={faCheckCircle} className="h-5 w-5 text-green-600" />
                <span className="text-green-600">
                  Estado de Sincronización (Chequeo Activo): Sincronizado
                </span>
              </>
            ) : (
              <>
                <FontAwesomeIcon icon={faExclamationTriangle} className="h-5 w-5 text-yellow-500" />
                <span className="text-yellow-500">
                  Estado de Sincronización (Chequeo Activo): Pendiente
                </span>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ChecklistOperativoView;

