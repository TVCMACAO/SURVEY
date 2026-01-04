/**
 * Utilidades de validación para checklists operativos
 */

/**
 * Valida que todas las preguntas requeridas estén respondidas
 * @param {Object} checkData - Datos del chequeo actual
 * @param {Array} questions - Array de preguntas del checklist
 * @returns {Object} { valid: boolean, missingQuestions: Array }
 */
export const validateRequiredQuestions = (checkData, questions) => {
  if (!checkData || !questions) {
    return { valid: false, missingQuestions: [] };
  }

  const missingQuestions = questions
    .map((q, index) => {
      const qKey = `q${index + 1}`;
      const isRequired = q.required !== false; // Por defecto todas son requeridas
      const isAnswered = checkData[qKey] !== null && checkData[qKey] !== undefined;
      
      if (isRequired && !isAnswered) {
        return {
          questionIndex: index,
          questionText: q.text || q.label || `Pregunta ${index + 1}`,
          questionId: q.id || qKey
        };
      }
      return null;
    })
    .filter(q => q !== null);

  return {
    valid: missingQuestions.length === 0,
    missingQuestions
  };
};

/**
 * Valida el formato de una respuesta según el tipo de pregunta
 * @param {*} answer - Respuesta a validar
 * @param {Object} question - Objeto de pregunta con tipo y opciones
 * @returns {Object} { valid: boolean, error: string }
 */
export const validateAnswerFormat = (answer, question) => {
  if (!question) {
    return { valid: false, error: 'Pregunta no válida' };
  }

  const questionType = question.type || question.question_type;

  switch (questionType) {
    case 'single_choice':
    case 'Opción Única':
      if (!question.options || !Array.isArray(question.options)) {
        return { valid: false, error: 'La pregunta no tiene opciones válidas' };
      }
      if (!question.options.includes(answer)) {
        return { 
          valid: false, 
          error: `La respuesta debe ser una de: ${question.options.join(', ')}` 
        };
      }
      return { valid: true };

    case 'checkbox':
    case 'Casillas':
      if (!Array.isArray(answer)) {
        return { valid: false, error: 'La respuesta debe ser un array' };
      }
      if (!question.options || !Array.isArray(question.options)) {
        return { valid: false, error: 'La pregunta no tiene opciones válidas' };
      }
      const invalidOptions = answer.filter(opt => !question.options.includes(opt));
      if (invalidOptions.length > 0) {
        return { 
          valid: false, 
          error: `Opciones inválidas: ${invalidOptions.join(', ')}` 
        };
      }
      return { valid: true };

    case 'number':
    case 'Número':
      if (typeof answer !== 'number' && isNaN(Number(answer))) {
        return { valid: false, error: 'La respuesta debe ser un número' };
      }
      const numValue = Number(answer);
      if (question.min !== undefined && numValue < question.min) {
        return { valid: false, error: `El valor mínimo es ${question.min}` };
      }
      if (question.max !== undefined && numValue > question.max) {
        return { valid: false, error: `El valor máximo es ${question.max}` };
      }
      return { valid: true };

    case 'date':
    case 'Fecha':
      if (!answer || !Date.parse(answer)) {
        return { valid: false, error: 'La respuesta debe ser una fecha válida' };
      }
      return { valid: true };

    case 'email':
    case 'Correo Electrónico':
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(answer)) {
        return { valid: false, error: 'La respuesta debe ser un email válido' };
      }
      return { valid: true };

    case 'text':
    case 'short_text':
    case 'Texto Corto':
    case 'long_text':
    case 'Párrafo':
      if (typeof answer !== 'string') {
        return { valid: false, error: 'La respuesta debe ser texto' };
      }
      if (question.maxLength && answer.length > question.maxLength) {
        return { 
          valid: false, 
          error: `El texto no puede exceder ${question.maxLength} caracteres` 
        };
      }
      if (question.minLength && answer.length < question.minLength) {
        return { 
          valid: false, 
          error: `El texto debe tener al menos ${question.minLength} caracteres` 
        };
      }
      return { valid: true };

    default:
      return { valid: true }; // Por defecto aceptar cualquier respuesta
  }
};

/**
 * Valida que no se exceda el límite de chequeos por día
 * @param {number} currentChecksCount - Número de chequeos completados hoy
 * @param {number} maxChecksPerDay - Límite máximo de chequeos por día
 * @returns {Object} { valid: boolean, error: string }
 */
export const validateCheckLimit = (currentChecksCount, maxChecksPerDay = 2) => {
  if (currentChecksCount >= maxChecksPerDay) {
    return {
      valid: false,
      error: `Se ha alcanzado el límite de ${maxChecksPerDay} chequeos por día`
    };
  }
  return { valid: true };
};

/**
 * Valida que un chequeo no esté bloqueado
 * @param {Object} checkData - Datos del chequeo
 * @returns {Object} { valid: boolean, error: string }
 */
export const validateCheckNotLocked = (checkData) => {
  if (!checkData) {
    return { valid: true }; // Si no hay datos, no está bloqueado
  }

  if (checkData.is_locked || (checkData.synced && checkData.q1 !== null && checkData.q2 !== null)) {
    return {
      valid: false,
      error: 'Este chequeo está bloqueado y no puede ser modificado'
    };
  }

  return { valid: true };
};

/**
 * Valida un chequeo completo antes de permitir bloqueo/sincronización
 * @param {Object} checkData - Datos del chequeo
 * @param {Array} questions - Array de preguntas del checklist
 * @returns {Object} { valid: boolean, errors: Array }
 */
export const validateCompleteCheck = (checkData, questions) => {
  const errors = [];

  // Validar preguntas requeridas
  const requiredValidation = validateRequiredQuestions(checkData, questions);
  if (!requiredValidation.valid) {
    errors.push(...requiredValidation.missingQuestions.map(q => 
      `Pregunta requerida sin responder: ${q.questionText}`
    ));
  }

  // Validar formato de cada respuesta
  questions.forEach((question, index) => {
    const qKey = `q${index + 1}`;
    const answer = checkData[qKey];
    
    if (answer !== null && answer !== undefined) {
      const formatValidation = validateAnswerFormat(answer, question);
      if (!formatValidation.valid) {
        errors.push(`Pregunta ${index + 1}: ${formatValidation.error}`);
      }
    }
  });

  return {
    valid: errors.length === 0,
    errors
  };
};

/**
 * Valida que las áreas sean válidas según la configuración del checklist
 * @param {string} area - Área a validar
 * @param {Object} checklist - Objeto del checklist con configuración
 * @returns {Object} { valid: boolean, error: string }
 */
export const validateArea = (area, checklist) => {
  if (!area) {
    return { valid: false, error: 'Debe seleccionar un área' };
  }

  // Si el checklist tiene secciones, validar contra ellas
  if (checklist.sections && Array.isArray(checklist.sections)) {
    const validAreas = checklist.sections.map(s => s.title || s.name);
    if (!validAreas.includes(area)) {
      return { 
        valid: false, 
        error: `El área "${area}" no es válida para este checklist` 
      };
    }
  }

  // Si el checklist tiene áreas en la configuración
  if (checklist.checklist_config && checklist.checklist_config.areas) {
    const validAreas = checklist.checklist_config.areas;
    if (!validAreas.includes(area)) {
      return { 
        valid: false, 
        error: `El área "${area}" no es válida para este checklist` 
      };
    }
  }

  return { valid: true };
};

