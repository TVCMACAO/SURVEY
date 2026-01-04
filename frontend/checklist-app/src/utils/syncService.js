/**
 * Servicio de sincronización con el backend
 */

import { authenticatedFetch } from '../auth';

/**
 * Sincroniza un chequeo individual con el backend
 * @param {Object} checkData - Datos del chequeo a sincronizar
 * @param {string} checklistId - ID de la checklist
 * @param {number} userId - ID del usuario
 * @returns {Promise<Object>} Resultado de la sincronización
 */
export const syncCheckToBackend = async (checkData, checklistId, userId) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    
    // Convertir respuestas al formato esperado por el backend
    const answers = [];
    if (checkData.q1 !== null && checkData.q1 !== undefined) {
      answers.push({
        question_id: 'q1',
        answer: checkData.q1
      });
    }
    if (checkData.q2 !== null && checkData.q2 !== undefined) {
      answers.push({
        question_id: 'q2',
        answer: checkData.q2
      });
    }
    
    const responseData = {
      survey: checklistId,
      surveyor_id: userId,
      answers: answers,
      check_number: checkData.checkNumber,
      check_date: checkData.date || today,
      is_locked: true, // Bloquear después de sincronizar
    };

    const response = await authenticatedFetch('/api/responses/', {
      method: 'POST',
      body: JSON.stringify(responseData),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || 'Error al sincronizar chequeo');
    }

    return {
      success: true,
      data: await response.json(),
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
};

/**
 * Sincroniza todos los chequeos pendientes
 * @param {Array} unsyncedChecks - Array de chequeos pendientes
 * @param {string} checklistId - ID de la checklist
 * @param {number} userId - ID del usuario
 * @returns {Promise<Array>} Resultados de la sincronización
 */
export const syncAllPendingChecks = async (unsyncedChecks, checklistId, userId) => {
  const results = [];
  
  for (const checkData of unsyncedChecks) {
    const result = await syncCheckToBackend(checkData, checklistId, userId);
    results.push({
      ...result,
      checkData,
    });
  }

  return results;
};

