import { useState, useEffect, useCallback } from 'react';
import { authenticatedFetch } from '../auth';

const LOCAL_STORAGE_KEY = 'maicaoChecklistData';
const CHECK_LIMIT_PER_DAY = 2;

/**
 * Hook para manejar datos de checklist operativo
 * Maneja estado local (localStorage) y sincronización con backend
 */
export const useChecklistData = () => {
  const [localData, setLocalData] = useState({});
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [unsyncedCount, setUnsyncedCount] = useState(0);

  // Cargar datos del localStorage al montar
  useEffect(() => {
    const data = loadChecklistData();
    setLocalData(data);
    updateUnsyncedCount(data);
  }, []);

  // Detectar cambios en conexión
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  /**
   * Carga los datos del checklist desde el almacenamiento local
   */
  const loadChecklistData = useCallback(() => {
    const data = localStorage.getItem(LOCAL_STORAGE_KEY);
    return data ? JSON.parse(data) : {};
  }, []);

  /**
   * Guarda los datos del checklist en el almacenamiento local
   */
  const saveChecklistData = useCallback((data) => {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data));
    setLocalData(data);
    updateUnsyncedCount(data);
  }, []);

  /**
   * Obtiene la clave base para las revisiones de un área en la fecha actual
   */
  const getCheckKeyBase = useCallback((area) => {
    const date = new Date().toISOString().split('T')[0];
    return `${area}-${date}`;
  }, []);

  /**
   * Obtiene la clave completa para un chequeo específico
   */
  const getCurrentCheckKey = useCallback((area, checkNumber) => {
    const keyBase = getCheckKeyBase(area);
    return `${keyBase}-${checkNumber}`;
  }, [getCheckKeyBase]);

  /**
   * Actualiza el estado de cumplimiento de una pregunta
   */
  const updateCompliance = useCallback((area, questionIndex, compliance, checkNumber, surveyId) => {
    const data = loadChecklistData();
    const key = getCurrentCheckKey(area, checkNumber);
    
    if (!data[key]) {
      data[key] = {
        area: area,
        date: new Date().toISOString().split('T')[0],
        check_number: checkNumber,
        q1: null,
        q2: null,
        synced: false,
        survey_id: surveyId
      };
    }
    
    data[key][`q${questionIndex + 1}`] = compliance;
    data[key].synced = false;
    
    saveChecklistData(data);
    
    return data[key];
  }, [loadChecklistData, saveChecklistData, getCurrentCheckKey]);

  /**
   * Obtiene el estado actual de un chequeo
   */
  const getCheckData = useCallback((area, checkNumber) => {
    const data = loadChecklistData();
    const key = getCurrentCheckKey(area, checkNumber);
    return data[key] || null;
  }, [loadChecklistData, getCurrentCheckKey]);

  /**
   * Obtiene todos los chequeos pendientes de sincronización
   */
  const getUnsyncedChecks = useCallback(() => {
    const data = loadChecklistData();
    return Object.entries(data).filter(([key, check]) => 
      !check.synced && check.q1 !== null && check.q2 !== null
    );
  }, [loadChecklistData]);

  /**
   * Sincroniza un chequeo con el backend
   */
  const syncCheck = useCallback(async (checkKey, checkData, surveyQuestions = null) => {
    try {
      // Convertir formato local a formato del backend
      const answers = [];
      
      // Si tenemos las preguntas del survey, usar sus IDs
      if (surveyQuestions && Array.isArray(surveyQuestions)) {
        if (checkData.q1 !== null && surveyQuestions[0]) {
          const q1Id = surveyQuestions[0].id || surveyQuestions[0]._id || 'q1';
          answers.push({
            question_id: q1Id,
            answer: checkData.q1
          });
        }
        if (checkData.q2 !== null && surveyQuestions[1]) {
          const q2Id = surveyQuestions[1].id || surveyQuestions[1]._id || 'q2';
          answers.push({
            question_id: q2Id,
            answer: checkData.q2
          });
        }
      } else {
        // Fallback: usar índices si no tenemos las preguntas
        if (checkData.q1 !== null) {
          answers.push({
            question_id: 'q1',
            answer: checkData.q1
          });
        }
        if (checkData.q2 !== null) {
          answers.push({
            question_id: 'q2',
            answer: checkData.q2
          });
        }
      }

      // Determinar si debe estar bloqueado (si está completo)
      const isComplete = checkData.q1 !== null && checkData.q2 !== null;

      const responseData = {
        survey: checkData.survey_id,
        surveyor_id: null, // Se puede obtener del usuario actual si es necesario
        answers: answers,
        check_number: checkData.check_number,
        check_date: checkData.date,
        is_locked: isComplete // Bloquear si está completo
      };

      const response = await authenticatedFetch('/api/responses/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(responseData)
      });

      if (response.ok) {
        // Marcar como sincronizado
        const data = loadChecklistData();
        if (data[checkKey]) {
          data[checkKey].synced = true;
          saveChecklistData(data);
        }
        return { success: true };
      } else {
        const errorData = await response.json().catch(() => ({}));
        return { success: false, error: errorData.detail || 'Error al sincronizar' };
      }
    } catch (error) {
      return { success: false, error: error.message };
    }
  }, [loadChecklistData, saveChecklistData]);

  /**
   * Sincroniza todos los chequeos pendientes
   * @param {Object} surveysMap - Mapa de survey_id a survey object (opcional, para obtener preguntas)
   */
  const syncAllChecks = useCallback(async (surveysMap = {}) => {
    const unsynced = getUnsyncedChecks();
    const results = [];

    for (const [key, checkData] of unsynced) {
      const survey = surveysMap[checkData.survey_id];
      const surveyQuestions = survey ? (survey.questions || []) : null;
      const result = await syncCheck(key, checkData, surveyQuestions);
      results.push({ key, ...result });
    }

    return results;
  }, [getUnsyncedChecks, syncCheck]);

  /**
   * Actualiza el contador de chequeos no sincronizados
   */
  const updateUnsyncedCount = useCallback((data) => {
    const count = Object.values(data).filter(check => 
      !check.synced && check.q1 !== null && check.q2 !== null
    ).length;
    setUnsyncedCount(count);
  }, []);

  /**
   * Verifica si un chequeo está bloqueado (completado y sincronizado)
   */
  const isCheckLocked = useCallback((area, checkNumber) => {
    const checkData = getCheckData(area, checkNumber);
    if (!checkData) return false;
    
    // Un chequeo está bloqueado si está completo y sincronizado
    return checkData.q1 !== null && 
           checkData.q2 !== null && 
           checkData.synced === true;
  }, [getCheckData]);

  /**
   * Obtiene el número de chequeos completados para un área en el día actual
   */
  const getTodayChecksCount = useCallback((area) => {
    const data = loadChecklistData();
    const today = new Date().toISOString().split('T')[0];
    
    return Object.values(data).filter(check => {
      return check.area === area && 
             check.date === today && 
             check.q1 !== null && 
             check.q2 !== null;
    }).length;
  }, [loadChecklistData]);

  /**
   * Verifica si se alcanzó el límite de chequeos por día
   */
  const isLimitReached = useCallback((area) => {
    return getTodayChecksCount(area) >= CHECK_LIMIT_PER_DAY;
  }, [getTodayChecksCount]);

  return {
    localData,
    isOnline,
    unsyncedCount,
    loadChecklistData,
    saveChecklistData,
    updateCompliance,
    getCheckData,
    getUnsyncedChecks,
    syncCheck,
    syncAllChecks,
    isCheckLocked,
    isLimitReached,
    getTodayChecksCount,
    getCurrentCheckKey,
    getCheckKeyBase,
    CHECK_LIMIT_PER_DAY
  };
};

