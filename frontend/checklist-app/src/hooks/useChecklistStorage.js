import { useState, useEffect, useCallback } from 'react';

const LOCAL_STORAGE_KEY = 'checklistOperativoData';

/**
 * Hook para manejar datos de checklist operativo
 * Maneja estado local (localStorage) y sincronización con backend
 */
export const useChecklistStorage = () => {
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
   * Obtiene la clave para un chequeo específico
   */
  const getCheckKey = useCallback((area, checkNumber, date = null) => {
    const checkDate = date || new Date().toISOString().split('T')[0];
    return `${area}_check${checkNumber}_${checkDate}`;
  }, []);

  /**
   * Actualiza la respuesta de una pregunta en un chequeo
   */
  const updateCheckResponse = useCallback((area, checkNumber, questionIndex, answer) => {
    const data = loadChecklistData();
    const key = getCheckKey(area, checkNumber);
    const today = new Date().toISOString().split('T')[0];
    
    if (!data[key]) {
      data[key] = {
        area: area,
        checkNumber: checkNumber,
        date: today,
        q1: null,
        q2: null,
        synced: false,
        isLocked: false,
      };
    }
    
    data[key][`q${questionIndex + 1}`] = answer;
    data[key].synced = false;
    
    saveChecklistData(data);
    return data[key];
  }, [loadChecklistData, saveChecklistData, getCheckKey]);

  /**
   * Obtiene los datos de un chequeo específico
   */
  const getCheckData = useCallback((area, checkNumber, date = null) => {
    const data = loadChecklistData();
    const key = getCheckKey(area, checkNumber, date);
    return data[key] || null;
  }, [loadChecklistData, getCheckKey]);

  /**
   * Verifica si un chequeo está completo
   */
  const isCheckComplete = useCallback((area, checkNumber, date = null) => {
    const checkData = getCheckData(area, checkNumber, date);
    if (!checkData) return false;
    return checkData.q1 !== null && checkData.q1 !== undefined &&
           checkData.q2 !== null && checkData.q2 !== undefined;
  }, [getCheckData]);

  /**
   * Verifica si un chequeo está bloqueado
   */
  const isCheckLocked = useCallback((area, checkNumber, date = null) => {
    const checkData = getCheckData(area, checkNumber, date);
    if (!checkData) return false;
    return checkData.isLocked === true || checkData.synced === true;
  }, [getCheckData]);

  /**
   * Obtiene todos los chequeos pendientes de sincronización
   */
  const getUnsyncedChecks = useCallback(() => {
    const data = loadChecklistData();
    return Object.values(data).filter(check => 
      !check.synced && check.q1 !== null && check.q2 !== null
    );
  }, [loadChecklistData]);

  /**
   * Sincroniza un chequeo con el backend
   */
  const syncCheck = useCallback(async (checkData, checklistId, userId) => {
    // Esta función será implementada usando syncService
    // Por ahora retornamos un placeholder
    return { success: false, error: 'Not implemented' };
  }, []);

  /**
   * Obtiene la clave para un chequeo (helper para componentes)
   */
  const getCheckKeyHelper = useCallback((area, checkNumber, date = null) => {
    return getCheckKey(area, checkNumber, date);
  }, [getCheckKey]);

  /**
   * Sincroniza todos los chequeos pendientes
   */
  const syncAllChecks = useCallback(async (checklistId, userId) => {
    const unsynced = getUnsyncedChecks();
    const results = [];
    
    for (const checkData of unsynced) {
      const result = await syncCheck(checkData, checklistId, userId);
      results.push({ ...result, checkData });
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

  return {
    localData,
    isOnline,
    unsyncedCount,
    loadChecklistData,
    saveChecklistData,
    updateCheckResponse,
    getCheckData,
    isCheckComplete,
    isCheckLocked,
    getUnsyncedChecks,
    syncCheck,
    syncAllChecks,
    getCheckKey,
    getCheckKeyHelper,
  };
};

