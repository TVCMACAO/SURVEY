import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheckCircle } from '@fortawesome/free-solid-svg-icons';
import AreaSelector from './AreaSelector';
import CheckForm from './CheckForm';
import SyncStatus from './SyncStatus';
import { useChecklistStorage } from '../hooks/useChecklistStorage';
import { validateCheckComplete, getAnsweredQuestionsCount } from '../utils/checklistValidator';
import { syncAllPendingChecks } from '../utils/syncService';
import { authenticatedFetch } from '../auth';

const ChecklistOperativoTab = () => {
  const [selectedArea, setSelectedArea] = useState('');
  const [activeCheck, setActiveCheck] = useState(1);
  const [checklists, setChecklists] = useState([]);
  const [selectedChecklist, setSelectedChecklist] = useState(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [message, setMessage] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);

  const {
    localData,
    isOnline,
    unsyncedCount,
    updateCheckResponse,
    getCheckData,
    isCheckComplete,
    isCheckLocked: checkIsLocked,
    getUnsyncedChecks,
    loadChecklistData,
    saveChecklistData,
    getCheckKeyHelper,
  } = useChecklistStorage();

  // Cargar checklists y usuario al montar
  useEffect(() => {
    fetchChecklists();
    fetchCurrentUser();
  }, []);

  const fetchChecklists = async () => {
    try {
      setLoading(true);
      const response = await authenticatedFetch('/api/surveys/');
      if (response.ok) {
        const data = await response.json();
        const checklistSurveys = data.filter(s => s.survey_type === 'checklist');
        setChecklists(checklistSurveys);
        
        if (checklistSurveys.length > 0) {
          setSelectedChecklist(checklistSurveys[0]);
        }
      }
    } catch (error) {
      console.error('Error fetching checklists:', error);
      setMessage({ type: 'error', text: 'Error al cargar las checklists' });
    } finally {
      setLoading(false);
    }
  };

  const fetchCurrentUser = async () => {
    try {
      const response = await authenticatedFetch('/api/users/me/');
      if (response.ok) {
        const user = await response.json();
        setCurrentUser(user);
      }
    } catch (error) {
      console.error('Error fetching user:', error);
    }
  };

  const handleAreaChange = (area) => {
    setSelectedArea(area);
    // Resetear al chequeo 1 cuando cambia el área
    setActiveCheck(1);
  };

  const handleAnswerChange = (questionIndex, answer) => {
    if (!selectedArea) {
      setMessage({ type: 'error', text: 'Por favor seleccione un área primero' });
      return;
    }

    // Verificar si el chequeo actual está bloqueado
    const checkData = getCheckData(selectedArea, activeCheck);
    if (checkIsLocked(selectedArea, activeCheck)) {
      setMessage({ type: 'error', text: 'Este chequeo está bloqueado y no puede ser modificado' });
      return;
    }

    // Actualizar respuesta
    updateCheckResponse(selectedArea, activeCheck, questionIndex, answer);
    
    // Verificar si el chequeo está completo después de la actualización
    const updatedCheckData = getCheckData(selectedArea, activeCheck);
    if (validateCheckComplete(updatedCheckData)) {
      setMessage({ 
        type: 'success', 
        text: `Chequeo ${activeCheck} completado. Puede proceder al Chequeo ${activeCheck === 1 ? 2 : 1}.` 
      });
      
      // Si es Chequeo 1 y está completo, habilitar Chequeo 2
      if (activeCheck === 1) {
        setTimeout(() => {
          setActiveCheck(2);
        }, 1000);
      }
    } else {
      setMessage({ type: 'success', text: 'Respuesta guardada localmente' });
    }
    
    setTimeout(() => setMessage(null), 3000);
  };

  const handleSync = async () => {
    if (!selectedChecklist || !currentUser) {
      setMessage({ type: 'error', text: 'No se puede sincronizar: falta información' });
      return;
    }

    setSyncing(true);
    try {
      const unsynced = getUnsyncedChecks();
      const results = await syncAllPendingChecks(
        unsynced,
        selectedChecklist.id || selectedChecklist._id,
        currentUser.id || currentUser._id
      );

      const successCount = results.filter(r => r.success).length;
      const failCount = results.filter(r => !r.success).length;

      if (successCount > 0) {
        // Actualizar datos locales marcando como sincronizados
        const data = loadChecklistData();
        results.forEach((result) => {
          if (result.success && result.checkData) {
            const checkKey = getCheckKeyHelper(
              result.checkData.area,
              result.checkData.checkNumber,
              result.checkData.date
            );
            if (data[checkKey]) {
              data[checkKey].synced = true;
              data[checkKey].isLocked = true;
            }
          }
        });
        saveChecklistData(data);
        
        setMessage({ 
          type: 'success', 
          text: `Sincronización completa: ${successCount} chequeo${successCount !== 1 ? 's' : ''} enviado${successCount !== 1 ? 's' : ''}${failCount > 0 ? `, ${failCount} fallaron` : ''}` 
        });
      } else if (failCount > 0) {
        setMessage({ type: 'error', text: `Error al sincronizar: ${failCount} chequeo${failCount !== 1 ? 's' : ''} fallaron` });
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

  // Obtener datos del chequeo actual
  const currentCheckData = selectedArea ? getCheckData(selectedArea, activeCheck) : null;
  const check1Data = selectedArea ? getCheckData(selectedArea, 1) : null;
  const check2Data = selectedArea ? getCheckData(selectedArea, 2) : null;

  // Validaciones
  const check1Complete = check1Data ? validateCheckComplete(check1Data) : false;
  const check1Locked = check1Data ? checkIsLocked(selectedArea, 1) : false;
  const check2Locked = check2Data ? checkIsLocked(selectedArea, 2) : false;
  const canAccessCheck2Tab = check1Complete && !check1Locked;

  // Contador de preguntas respondidas
  const answeredCount = currentCheckData ? getAnsweredQuestionsCount(currentCheckData) : 0;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando checklists...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      {/* Header */}
      <header className="bg-white p-4 rounded-xl shadow-md mb-6">
        <h1 className="text-3xl font-bold text-green-600 mb-2">
          Checklist Operativo Gestión Ambiental
        </h1>
        <p className="text-sm text-gray-600">
          Verificación de Áreas
        </p>
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

      {/* Selector de área */}
      <div className="bg-white p-6 rounded-xl shadow-md mb-6">
        <AreaSelector 
          selectedArea={selectedArea}
          onAreaChange={handleAreaChange}
        />
      </div>

      {selectedArea && (
        <>
          {/* Tabs de Chequeo */}
          <div className="bg-white p-6 rounded-xl shadow-md mb-6">
            <div className="flex justify-center space-x-2 border-b border-gray-200 mb-4">
              <button
                onClick={() => setActiveCheck(1)}
                disabled={check1Locked}
                className={`py-2 px-4 font-medium border-b-2 transition ${
                  activeCheck === 1
                    ? 'text-green-600 border-green-600 bg-green-50'
                    : 'text-gray-600 border-transparent hover:text-gray-800'
                } ${check1Locked ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                Chequeo 1
                {check1Complete && (
                  <FontAwesomeIcon icon={faCheckCircle} className="ml-2 text-green-600" />
                )}
              </button>
              <button
                onClick={() => setActiveCheck(2)}
                disabled={!canAccessCheck2Tab || check2Locked}
                className={`py-2 px-4 font-medium border-b-2 transition ${
                  activeCheck === 2
                    ? 'text-green-600 border-green-600 bg-green-50'
                    : 'text-gray-600 border-transparent hover:text-gray-800'
                } ${!canAccessCheck2Tab || check2Locked ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                Chequeo 2
                {check2Data && validateCheckComplete(check2Data) && (
                  <FontAwesomeIcon icon={faCheckCircle} className="ml-2 text-green-600" />
                )}
              </button>
            </div>

            {/* Estado del chequeo activo */}
            {activeCheck === 1 && check1Complete && !check1Locked && (
              <div className="bg-green-100 text-green-800 p-4 rounded-lg mb-4">
                <p className="font-bold">Chequeo 1 completado</p>
                <p className="text-sm">Puede proceder al Chequeo 2</p>
              </div>
            )}

            {activeCheck === 1 && check1Locked && (
              <div className="bg-blue-100 text-blue-800 p-4 rounded-lg mb-4">
                <p className="font-bold">Chequeo 1 bloqueado</p>
                <p className="text-sm">Este chequeo ya ha sido completado y sincronizado</p>
              </div>
            )}

            {activeCheck === 2 && !canAccessCheck2Tab && (
              <div className="bg-yellow-100 text-yellow-800 p-4 rounded-lg mb-4">
                <p className="font-bold">Complete el Chequeo 1 primero</p>
                <p className="text-sm">Debe completar ambas preguntas del Chequeo 1 antes de acceder al Chequeo 2</p>
              </div>
            )}

            {/* Contador de preguntas respondidas */}
            <div className="mb-4">
              <p className="text-sm text-gray-600">
                Chequeo activo #{activeCheck}: {answeredCount}/2 preguntas respondidas
              </p>
            </div>

            {/* Formulario de chequeo */}
            <CheckForm
              checkNumber={activeCheck}
              checkData={currentCheckData}
              onAnswerChange={handleAnswerChange}
              isDisabled={activeCheck === 1 ? check1Locked : check2Locked}
            />
          </div>

          {/* Estado de sincronización */}
          <SyncStatus
            isOnline={isOnline}
            unsyncedCount={unsyncedCount}
            onSync={handleSync}
            isSyncing={syncing}
          />
        </>
      )}

      {!selectedArea && (
        <div className="bg-white p-6 rounded-xl shadow-md text-center">
          <p className="text-gray-600">Por favor seleccione un área para comenzar</p>
        </div>
      )}
    </div>
  );
};

export default ChecklistOperativoTab;

