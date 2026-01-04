/**
 * Utilidades de validación para checklist operativo
 */

/**
 * Valida que un chequeo esté completo (ambas preguntas respondidas)
 * @param {Object} checkData - Datos del chequeo
 * @returns {boolean}
 */
export const validateCheckComplete = (checkData) => {
  if (!checkData) return false;
  return checkData.q1 !== null && checkData.q1 !== undefined &&
         checkData.q2 !== null && checkData.q2 !== undefined;
};

/**
 * Verifica si se puede acceder al Chequeo 2
 * @param {string} area - Área seleccionada
 * @param {Function} getCheckData - Función para obtener datos del chequeo
 * @returns {boolean}
 */
export const canAccessCheck2 = (area, getCheckData) => {
  if (!area) return false;
  const check1Data = getCheckData(area, 1);
  return validateCheckComplete(check1Data);
};

/**
 * Verifica si un chequeo está bloqueado
 * @param {Object} checkData - Datos del chequeo
 * @returns {boolean}
 */
export const isCheckLocked = (checkData) => {
  if (!checkData) return false;
  return checkData.isLocked === true || checkData.synced === true;
};

/**
 * Obtiene el número de preguntas respondidas en un chequeo
 * @param {Object} checkData - Datos del chequeo
 * @returns {number}
 */
export const getAnsweredQuestionsCount = (checkData) => {
  if (!checkData) return 0;
  let count = 0;
  if (checkData.q1 !== null && checkData.q1 !== undefined) count++;
  if (checkData.q2 !== null && checkData.q2 !== undefined) count++;
  return count;
};

