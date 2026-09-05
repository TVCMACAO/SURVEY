import React, { useState, useEffect, useRef, useMemo } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faPlus, faGear, faFont, faListUl, faSquareCheck, faStar, faCalendarDays, 
  faShareNodes, faTrash, faXmark, faBars, faEllipsisVertical, faChevronLeft, 
  faPenToSquare, faFileLines, faHashtag, faAlignLeft, faImage, faEye, faChartBar, faCheck,
  faPaperPlane, faTable, faFileExcel, faDownload, faChartPie, faChartLine, faUsers, faUserPlus, faUser,
  faSignature, faEraser, faEnvelope, faHeading, faCopy,
  faChevronUp, faChevronDown, faGripVertical, faPaperclip, faSearch, faFilter
} from '@fortawesome/free-solid-svg-icons';
import { authenticatedFetch, isAuthenticated, login, logout, ensureFreshToken } from './auth';
import { useBreakpoint } from './hooks/useBreakpoint';
import { APP_VERSION_LABEL, APP_VERSION, GIT_SHA, BUILD_TIME } from './version';
import * as XLSX from 'xlsx';
import ExcelJS from 'exceljs';
import JSZip from 'jszip';
import {
  buildDefaultInformedConsent,
  extractConsentPlaceholders,
  mergeConsentTemplate,
  buildConsentMeta,
  buildPersonalDataConsentText,
  buildConsentPdfBytes,
  downloadConsentPdf,
  buildConsentPdfFileBaseName,
  readLetterheadPdfFile,
  resolveConsentSignature,
} from './consentDocument';

const parseSignatureDataUrl = (dataUrl) => {
  if (typeof dataUrl !== 'string' || !dataUrl.startsWith('data:image')) return null;
  const m = dataUrl.match(/^data:image\/(png|jpeg|jpg|webp);base64,(.+)$/i);
  if (!m) return null;
  let ext = m[1].toLowerCase();
  if (ext === 'jpg') ext = 'jpeg';
  // ExcelJS accepts png | jpeg | gif
  if (ext === 'webp') ext = 'png';
  return { extension: ext === 'jpeg' ? 'jpeg' : 'png', base64: m[2] };
};
const uint8ToBase64 = (bytes) => {
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < arr.length; i += chunk) {
    binary += String.fromCharCode.apply(null, arr.subarray(i, i + chunk));
  }
  return btoa(binary);
};
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Bar, Doughnut, Line } from 'react-chartjs-2';

// Registrar componentes de Chart.js
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const DELUXE_PALETTE = [
  ['#4f46e5', '#818cf8'],
  ['#7c3aed', '#a78bfa'],
  ['#db2777', '#f472b6'],
  ['#059669', '#34d399'],
  ['#0284c7', '#38bdf8'],
  ['#d97706', '#fbbf24'],
  ['#dc2626', '#f87171'],
  ['#9333ea', '#c084fc'],
  ['#0d9488', '#2dd4bf'],
  ['#ea580c', '#fb923c'],
  ['#4f46e5', '#a5b4fc'],
  ['#be185d', '#f9a8d4'],
];

const deluxeColor = (index, shade = 0) =>
  DELUXE_PALETTE[index % DELUXE_PALETTE.length][shade];

const makeLineAreaGradient = (context) => {
  const { chart } = context;
  const { ctx, chartArea } = chart;
  if (!chartArea) return 'rgba(99, 102, 241, 0.15)';
  const gradient = ctx.createLinearGradient(0, chartArea.bottom, 0, chartArea.top);
  gradient.addColorStop(0, 'rgba(99, 102, 241, 0.02)');
  gradient.addColorStop(0.5, 'rgba(139, 92, 246, 0.18)');
  gradient.addColorStop(1, 'rgba(167, 139, 250, 0.45)');
  return gradient;
};

const buildDeluxeChartData = (stat, chartType) => {
  const labels = Object.keys(stat.data || {});
  const data = Object.values(stat.data || {});

  if (chartType === 'line') {
    return {
      labels,
      datasets: [{
        label: 'Respuestas',
        data,
        borderColor: labels.map((_, i) => deluxeColor(i, 0)),
        backgroundColor: (ctx) => makeLineAreaGradient(ctx),
        segment: {
          borderColor: (ctx) => deluxeColor(ctx.p0DataIndex, 0),
        },
        borderWidth: 3,
        fill: true,
        tension: 0.42,
        pointBackgroundColor: labels.map((_, i) => deluxeColor(i, 0)),
        pointBorderColor: '#ffffff',
        pointBorderWidth: 3,
        pointRadius: 7,
        pointHoverRadius: 10,
        pointHoverBackgroundColor: labels.map((_, i) => deluxeColor(i, 1)),
        pointHoverBorderColor: '#ffffff',
        pointHoverBorderWidth: 3,
      }],
    };
  }

  if (chartType === 'doughnut') {
    return {
      labels,
      datasets: [{
        label: 'Respuestas',
        data,
        backgroundColor: labels.map((_, i) => deluxeColor(i, 0)),
        hoverBackgroundColor: labels.map((_, i) => deluxeColor(i, 1)),
        borderColor: '#ffffff',
        borderWidth: 4,
        hoverBorderColor: '#ffffff',
        hoverOffset: 16,
        spacing: 2,
      }],
    };
  }

  return {
    labels,
    datasets: [{
      label: 'Respuestas',
      data,
      backgroundColor: labels.map((_, i) => deluxeColor(i, 0)),
      hoverBackgroundColor: labels.map((_, i) => deluxeColor(i, 1)),
      borderColor: labels.map((_, i) => deluxeColor(i, 0)),
      borderWidth: 0,
      borderRadius: { topLeft: 12, topRight: 12, bottomLeft: 4, bottomRight: 4 },
      borderSkipped: false,
      maxBarThickness: 58,
    }],
  };
};

const buildDeluxeChartOptions = (stat, chartType) => {
  const deluxeTooltip = {
    backgroundColor: 'rgba(15, 23, 42, 0.94)',
    titleColor: '#f8fafc',
    bodyColor: '#e2e8f0',
    footerColor: '#cbd5e1',
    padding: 14,
    cornerRadius: 12,
    displayColors: true,
    boxPadding: 8,
    titleFont: { size: 13, weight: 'bold', family: 'system-ui, sans-serif' },
    bodyFont: { size: 12, weight: '600', family: 'system-ui, sans-serif' },
    borderColor: 'rgba(99, 102, 241, 0.35)',
    borderWidth: 1,
    callbacks: {
      label(context) {
        const label = context.label || '';
        const value = context.parsed.y ?? context.parsed ?? context.raw ?? 0;
        const percentage = stat.totalAnswers > 0 ? ((value / stat.totalAnswers) * 100).toFixed(1) : '0.0';
        return ` ${label}: ${value} respuestas (${percentage}%)`;
      },
    },
  };

  const deluxeAnimation = {
    duration: 1100,
    easing: 'easeOutQuart',
  };

  const deluxeLegend = {
    display: chartType === 'doughnut',
    position: 'right',
    labels: {
      color: '#374151',
      font: { size: 11, weight: '600', family: 'system-ui, sans-serif' },
      padding: 14,
      usePointStyle: true,
      pointStyle: 'circle',
      boxWidth: 8,
      boxHeight: 8,
    },
  };

  if (chartType === 'doughnut') {
    return {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '64%',
      animation: deluxeAnimation,
      plugins: {
        legend: deluxeLegend,
        tooltip: deluxeTooltip,
      },
    };
  }

  return {
    responsive: true,
    maintainAspectRatio: false,
    animation: deluxeAnimation,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: { display: false },
      tooltip: deluxeTooltip,
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          stepSize: 1,
          color: '#6b7280',
          font: { size: 11, weight: '600', family: 'system-ui, sans-serif' },
          padding: 8,
        },
        grid: {
          color: 'rgba(99, 102, 241, 0.08)',
          drawBorder: false,
        },
        border: { display: false },
      },
      x: {
        ticks: {
          color: '#374151',
          font: { size: 11, weight: '600', family: 'system-ui, sans-serif' },
          maxRotation: 45,
          minRotation: 0,
        },
        grid: { display: false },
        border: { display: false },
      },
    },
  };
};

// --- UTILIDADES ---
const generateId = () => `q_${Math.random().toString(36).substr(2, 9)}`;

// --- COMPONENTE DE FIRMA ---
const SignaturePad = ({
  value,
  onChange,
  requirePersonalDataConsent = false,
  personalDataConsentText = '',
  consentAccepted = false,
  onConsentAcceptedChange,
}) => {
  const canvasRef = React.useRef(null);
  const [isDrawing, setIsDrawing] = React.useState(false);
  const [hasSignature, setHasSignature] = React.useState(!!value);
  const [consentExpanded, setConsentExpanded] = React.useState(true);
  const drawingEnabled = !requirePersonalDataConsent || consentAccepted;

  // Convierte coordenadas pantalla → canvas para que el punto de contacto coincida con lo dibujado/guardado
  const getCanvasCoords = (canvas, e) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
      scaleX,
      scaleY
    };
  };

  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    ctx.strokeStyle = '#1e40af';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Si hay un valor guardado, restaurar la firma (rellenar todo el canvas)
    if (value) {
      const img = new Image();
      img.onload = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        setHasSignature(true);
      };
      img.src = value;
    }
  }, [value]);

  const startDrawing = (e) => {
    if (!drawingEnabled) return;
    if (e.touches) e.preventDefault();
    setIsDrawing(true);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const { x, y, scaleX, scaleY } = getCanvasCoords(canvas, e);
    ctx.lineWidth = 2 * Math.min(scaleX, scaleY);
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e) => {
    if (!drawingEnabled || !isDrawing) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const { x, y } = getCanvasCoords(canvas, e);
    ctx.lineTo(x, y);
    ctx.stroke();
    setHasSignature(true);
  };

  const stopDrawing = () => {
    if (isDrawing) {
      setIsDrawing(false);
      const canvas = canvasRef.current;
      if (canvas && onChange) {
        const signatureData = canvas.toDataURL('image/png');
        onChange(signatureData);
      }
    }
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      setHasSignature(false);
      onChange('');
    }
  };

  const handleConsentToggle = (checked) => {
    if (onConsentAcceptedChange) {
      onConsentAcceptedChange(checked ? new Date().toISOString() : null);
    }
    if (!checked) {
      clearSignature();
    }
  };

  return (
    <div className="w-full space-y-3">
      {requirePersonalDataConsent && (
        <div className="rounded-xl border border-slate-200 bg-slate-50/90 overflow-hidden">
          <button
            type="button"
            onClick={() => setConsentExpanded((v) => !v)}
            className="w-full flex items-center justify-between gap-2 px-4 py-3 text-left hover:bg-slate-100/80"
          >
            <span className="text-sm font-bold text-slate-800">
              Consentimiento de uso de datos personales (Ley 1581 de 2012)
            </span>
            <FontAwesomeIcon icon={consentExpanded ? faChevronUp : faChevronDown} className="text-slate-500" />
          </button>
          {consentExpanded && (
            <div className="px-4 pb-3">
              <div className="max-h-48 overflow-y-auto rounded-lg border border-slate-200 bg-white p-3 text-xs text-slate-700 whitespace-pre-wrap leading-relaxed">
                {personalDataConsentText}
              </div>
            </div>
          )}
          <label className="flex items-start gap-3 px-4 py-3 border-t border-slate-200 bg-white cursor-pointer">
            <input
              type="checkbox"
              className="mt-0.5 w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
              checked={consentAccepted}
              onChange={(e) => handleConsentToggle(e.target.checked)}
            />
            <span className="text-sm text-slate-800 font-medium leading-snug">
              He leído y acepto el tratamiento de mis datos personales conforme al texto anterior. Al firmar, autorizo su uso para las finalidades indicadas.
            </span>
          </label>
        </div>
      )}
      <div className={`border-2 rounded-xl bg-white overflow-hidden shadow-inner ${drawingEnabled ? 'border-gray-300' : 'border-amber-200 opacity-60'}`}>
        <canvas
          ref={canvasRef}
          width={600}
          height={200}
          className={`w-full h-48 touch-none ${drawingEnabled ? 'cursor-crosshair' : 'cursor-not-allowed pointer-events-none'}`}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
        />
      </div>
      <div className="flex justify-between items-center">
        <p className="text-xs text-gray-500 italic">
          {requirePersonalDataConsent && !consentAccepted
            ? 'Acepta el consentimiento de datos personales para habilitar la firma'
            : 'Firma en el área de arriba'}
        </p>
        <button
          type="button"
          onClick={clearSignature}
          className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-bold transition-colors flex items-center gap-2"
        >
          <FontAwesomeIcon icon={faEraser} size="sm" className="fa-icon-force-current" />
          Limpiar
        </button>
      </div>
    </div>
  );
};

// --- SUB-COMPONENTES REUTILIZABLES ---

const TOOL_BUTTON_COLORS = {
  blue: 'bg-blue-500 group-hover:shadow-blue-500/40',
  gray: 'bg-gray-500 group-hover:shadow-gray-500/40',
  purple: 'bg-purple-500 group-hover:shadow-purple-500/40',
  green: 'bg-green-500 group-hover:shadow-green-500/40',
  orange: 'bg-orange-500 group-hover:shadow-orange-500/40',
  yellow: 'bg-yellow-500 group-hover:shadow-yellow-500/40',
  pink: 'bg-pink-500 group-hover:shadow-pink-500/40',
  red: 'bg-red-500 group-hover:shadow-red-500/40',
  indigo: 'bg-indigo-500 group-hover:shadow-indigo-500/40',
  teal: 'bg-teal-500 group-hover:shadow-teal-500/40',
};

const ToolButton = ({ icon, label, onClick, color }) => (
  <button 
    onClick={onClick}
    className="group flex md:flex-col flex-row items-center justify-center md:gap-1.5 gap-1 sm:gap-1.5 p-1.5 sm:p-2 md:p-2.5 md:w-full hover:bg-white/50 rounded-lg sm:rounded-xl transition-all duration-300 md:hover:scale-105 active:scale-95 flex-shrink-0 min-w-[44px] sm:min-w-[52px] md:min-w-0 md:flex-none"
    title={label}
    style={{
      flexBasis: 'auto',
      flexGrow: 0,
      flexShrink: 0
    }}
  >
    <div className={`tool-button-icon-container w-8 h-8 sm:w-9 sm:h-9 md:w-9 md:h-9 rounded-lg sm:rounded-xl md:rounded-xl flex items-center justify-center shadow-md md:shadow-lg text-white flex-shrink-0 ${TOOL_BUTTON_COLORS[color] || 'bg-gray-500 group-hover:shadow-gray-500/40'}`}>
      <FontAwesomeIcon icon={icon} size="xs" className="fa-icon-force-white text-xs sm:text-sm" />
    </div>
    <span className="text-[9px] sm:text-[10px] md:text-[10px] font-bold text-gray-500 uppercase tracking-wider group-hover:text-gray-800 hidden md:block text-center leading-tight" style={{ wordBreak: 'break-word', overflowWrap: 'break-word', whiteSpace: 'normal', maxWidth: '100%' }}>{label}</span>
  </button>
);

// --- VISTA PREVIA DE ADJUNTOS (para respuestas file_upload) ---
const AttachmentPreview = ({ attachmentId, compact = false }) => {
  const [blobUrl, setBlobUrl] = useState(null);
  const [contentType, setContentType] = useState(null);
  const [error, setError] = useState(null);
  const blobUrlRef = React.useRef(null);

  useEffect(() => {
    if (!attachmentId) return;
    blobUrlRef.current = null;
    authenticatedFetch(`/api/attachments/${attachmentId}/`)
      .then((res) => {
        if (!res.ok) {
          if (res.status === 404) throw new Error('no_available');
          throw new Error('Adjunto no encontrado');
        }
        const ct = res.headers.get('Content-Type') || '';
        setContentType(ct);
        return res.blob();
      })
      .then((blob) => {
        const url = URL.createObjectURL(blob);
        blobUrlRef.current = url;
        setBlobUrl(url);
      })
      .catch((err) => setError(err.message));

    return () => {
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
        blobUrlRef.current = null;
      }
    };
  }, [attachmentId]);

  if (error) {
    return (
      <span className="text-amber-600 text-sm italic">
        {error === 'no_available' ? 'Archivo no disponible' : `Error: ${error}`}
      </span>
    );
  }
  if (!blobUrl) {
    return <span className="text-gray-400 text-sm italic">Cargando...</span>;
  }
  const isImage = contentType && contentType.startsWith('image/');
  if (isImage) {
    return (
      <a href={blobUrl} target="_blank" rel="noopener noreferrer" className="inline-block cursor-pointer" title="Abrir en tamaño real">
        <img
          src={blobUrl}
          alt="Adjunto"
          className={`border border-gray-300 rounded-lg shadow-sm object-contain hover:opacity-90 transition-opacity ${compact ? 'max-h-[60px]' : 'max-h-[200px]'}`}
        />
      </a>
    );
  }
  return (
    <a href={blobUrl} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline text-sm">
      Ver documento
    </a>
  );
};

// --- VISTA: EDITOR DE ENCUESTAS ---

const CONDITION_OPERATORS = [
  { value: 'equals', label: 'es igual a' },
  { value: 'not_equals', label: 'no es igual a' },
  { value: 'contains', label: 'contiene' },
  { value: 'greater_than', label: 'es mayor que' },
  { value: 'less_than', label: 'es menor que' },
  { value: 'greater_than_or_equal', label: 'es mayor o igual que' },
  { value: 'less_than_or_equal', label: 'es menor o igual que' },
];

const FRONTEND_TYPE_LABELS = [
  'Texto Corto', 'Párrafo', 'Opción Única', 'Casillas', 'Desplegable',
  'Número', 'Fecha', 'Puntuación', 'Firma', 'Adjuntar archivos',
  'Correo Electrónico', 'Título', 'Evaluación',
];

const OPTION_QUESTION_TYPES = ['Opción Única', 'Casillas', 'Desplegable', 'single_choice', 'checkbox', 'dropdown'];

/** Shared conditional evaluator (editor preview, public form). Handles checkbox arrays. */
const evaluateCondition = (condition, answers) => {
  if (!condition || !condition.question_id) return true;

  const questionId = condition.question_id;
  const answer = answers[questionId];
  const operator = condition.operator || 'equals';
  const value = condition.value;

  if (answer === undefined || answer === null || answer === '') return false;
  if (Array.isArray(answer)) {
    if (answer.length === 0) return false;
    const valStr = String(value ?? '');
    switch (operator) {
      case 'equals':
        return answer.some((a) => String(a) === valStr);
      case 'not_equals':
        return answer.every((a) => String(a) !== valStr);
      case 'contains':
        return answer.some((a) => String(a).toLowerCase().includes(valStr.toLowerCase()));
      default:
        return answer.some((a) => String(a) === valStr);
    }
  }

  switch (operator) {
    case 'equals':
      return String(answer) === String(value);
    case 'not_equals':
      return String(answer) !== String(value);
    case 'contains':
      return String(answer).toLowerCase().includes(String(value).toLowerCase());
    case 'greater_than':
      return Number(answer) > Number(value);
    case 'less_than':
      return Number(answer) < Number(value);
    case 'greater_than_or_equal':
      return Number(answer) >= Number(value);
    case 'less_than_or_equal':
      return Number(answer) <= Number(value);
    default:
      return true;
  }
};

const mapBackendTypeToFrontend = (backendType) => {
  const reverseTypeMapping = {
    short_text: 'Texto Corto',
    long_text: 'Párrafo',
    single_choice: 'Opción Única',
    checkbox: 'Casillas',
    dropdown: 'Desplegable',
    number: 'Número',
    date: 'Fecha',
    rating: 'Puntuación',
    signature: 'Firma',
    file_upload: 'Adjuntar archivos',
    email: 'Correo Electrónico',
    titulo: 'Título',
    evaluation_table: 'Evaluación',
  };
  if (reverseTypeMapping[backendType]) return reverseTypeMapping[backendType];
  if (FRONTEND_TYPE_LABELS.includes(backendType)) return backendType;
  return 'Texto Corto';
};

/** Normalize API survey shape (question_text / question_type) into editor shape (text / type) before first paint. */
const normalizeSurveyForEditor = (raw) => {
  if (!raw) {
    return {
      title: 'Mi Nueva Encuesta',
      description: 'Descripción breve de la encuesta',
      questions: [],
      sections: [],
      informed_consent_enabled: false,
      informed_consent: buildDefaultInformedConsent(),
    };
  }
  const questions = (raw.questions || []).map((q) => {
    const backendType = q.question_type || q.type || 'short_text';
    const {
      question_text: _dropQuestionText,
      question_type: _dropQuestionType,
      ...rest
    } = q;
    return {
      ...rest,
      id: q.id || generateId(),
      text: q.text || q.question_text || '',
      type: mapBackendTypeToFrontend(backendType),
      description: q.description || '',
      required: q.required || false,
      options: Array.isArray(q.options) ? q.options : [],
      section_id: q.section_id || null,
      conditional_logic: q.conditional_logic || null,
    };
  });
  const sections = (raw.sections || []).map((s, index) => ({
    ...s,
    id: s.id || `section_${index}`,
    order: s.order || index,
  })).sort((a, b) => (a.order || 0) - (b.order || 0));
  return {
    ...raw,
    questions,
    sections,
    reference_key_column: raw.reference_key_column || '',
    reference_mapping: raw.reference_mapping || {},
    reference_row_count: raw.reference_row_count ?? 0,
    documento_empleado_question_id: raw.documento_empleado_question_id || '',
    documento_votante_question_id: raw.documento_votante_question_id || '',
    consent_responsible: raw.consent_responsible || '',
    consent_purpose: raw.consent_purpose || '',
    informed_consent_enabled: Boolean(raw.informed_consent_enabled),
    informed_consent: (() => {
      const ic = raw.informed_consent && typeof raw.informed_consent === 'object'
        ? raw.informed_consent
        : {};
      const defaults = buildDefaultInformedConsent();
      const body = ic.body || defaults.body;
      const keys = extractConsentPlaceholders(body);
      const existingMaps = Array.isArray(ic.mappings) ? ic.mappings : [];
      const mapByKey = Object.fromEntries(existingMaps.filter((m) => m?.key).map((m) => [m.key, m.question_id || '']));
      return {
        title: ic.title || defaults.title,
        body,
        letterhead: ic.letterhead || 'membrete2',
        letterhead_pdf: ic.letterhead_pdf || '',
        letterhead_filename: ic.letterhead_filename || '',
        signature_question_id: ic.signature_question_id || '',
        acceptance_question_id: ic.acceptance_question_id || '',
        acceptance_value: ic.acceptance_value || 'SI, AUTORIZO',
        denial_value: ic.denial_value || 'NO AUTORIZO',
        mappings: keys.map((key) => ({ key, question_id: mapByKey[key] || '' })),
      };
    })(),
  };
};

const compressSurveyImageFile = (file, maxWidth = 1000, quality = 0.82) => new Promise((resolve, reject) => {
  if (!file?.type?.startsWith('image/')) {
    reject(new Error('Selecciona un archivo de imagen válido (JPG, PNG, etc.)'));
    return;
  }
  if (file.size > 5 * 1024 * 1024) {
    reject(new Error('La imagen no puede superar 5 MB'));
    return;
  }
  const reader = new FileReader();
  reader.onload = () => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxWidth / Math.max(img.width, 1));
      const w = Math.max(1, Math.round(img.width * scale));
      const h = Math.max(1, Math.round(img.height * scale));
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => reject(new Error('No se pudo procesar la imagen'));
    img.src = reader.result;
  };
  reader.onerror = () => reject(new Error('No se pudo leer el archivo'));
  reader.readAsDataURL(file);
});

const QuestionImageDisplay = ({ src, className = '' }) => (
  src ? (
    <img
      src={src}
      alt="Imagen de la pregunta"
      className={`rounded-lg border border-gray-100 max-h-52 w-auto max-w-full object-contain ${className}`}
    />
  ) : null
);

const QuestionImageEditor = ({ image, onChange, onRemove }) => {
  const ref = useRef(null);

  const handleFile = async (e) => {
    e.stopPropagation();
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await compressSurveyImageFile(file);
      onChange?.(dataUrl);
    } catch (err) {
      alert(err.message || 'Error al cargar la imagen');
    }
    e.target.value = '';
  };

  return (
    <div className="mt-3" onClick={(e) => e.stopPropagation()}>
      {image ? (
        <div className="max-w-md">
          <QuestionImageDisplay src={image} className="mb-2" />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => ref.current?.click()}
              className="text-[11px] font-semibold text-indigo-600 hover:underline"
            >
              Cambiar imagen
            </button>
            <button
              type="button"
              onClick={() => onRemove?.()}
              className="text-[11px] font-semibold text-red-500 hover:underline"
            >
              Quitar imagen
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => ref.current?.click()}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-indigo-600 px-2 py-1.5 rounded-lg hover:bg-indigo-50 transition-colors"
        >
          <FontAwesomeIcon icon={faImage} size="sm" className="fa-icon-force-current" />
          Agregar imagen (opcional)
        </button>
      )}
      <input
        ref={ref}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={handleFile}
      />
    </div>
  );
};

const QuestionBlock = ({ data, isActive, onClick, onDelete, onUpdate, sections = [], onAssignSection, allQuestions = [], onMoveUp, onMoveDown, canMoveUp = false, canMoveDown = false }) => {
  const isOptionType = ['Opción Única', 'Casillas', 'Desplegable'].includes(data.type);
  const isEvaluationType = data.type === 'Evaluación';
  const fileInputRef = React.useRef(null);
  const otherQuestions = (allQuestions || []).filter(q => q.id && q.id !== data.id);
  const hasCondition = !!(data.conditional_logic && data.conditional_logic.question_id);

  const handleExcelImport = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const buf = new Uint8Array(ev.target.result);
        const workbook = XLSX.read(buf, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[firstSheetName];
        const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
        const MAX_LEN = 200;
        const options = rows
          .map(row => (row && row[0] != null ? String(row[0]).trim() : ''))
          .filter(s => s.length > 0)
          .map(s => s.length > MAX_LEN ? s.slice(0, MAX_LEN) : s);
        onUpdate({ options });
      } catch (err) {
        console.error(err);
        alert('No se pudo leer el archivo Excel.');
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = '';
  };

  return (
    <div 
      onClick={onClick}
      className={`relative group transition-all duration-300 mb-6 cursor-pointer ${isActive ? 'scale-[1.01] shadow-2xl shadow-indigo-500/10 z-10 translate-y-[-4px]' : 'hover:scale-[1.005] hover:shadow-lg opacity-95 hover:opacity-100 bg-white/60'}`}
    >
      <div className={`backdrop-blur-xl rounded-2xl border overflow-hidden transition-colors duration-300 ${isActive ? 'bg-white border-indigo-500 ring-1 ring-indigo-500/20' : 'bg-white/40 border-white/60 hover:bg-white/80'}`}>
        <div className={`absolute left-0 top-0 bottom-0 w-1.5 transition-colors ${isActive ? 'bg-indigo-500' : 'bg-transparent'}`} />
        <div className="flex gap-2 sm:gap-3 p-4 sm:p-5 md:p-6 lg:p-8">
          {/* Orden: asas de reordenar (subir/bajar) */}
          {(onMoveUp != null || onMoveDown != null) && (
            <div className="flex flex-col items-center justify-start pt-1 gap-0.5 shrink-0" onClick={e => e.stopPropagation()}>
              <span className="text-gray-400 mb-1" title="Orden de la pregunta">
                <FontAwesomeIcon icon={faGripVertical} size="sm" className="fa-icon-force-current" />
              </span>
              {canMoveUp && (
                <button type="button" onClick={onMoveUp} className="p-1.5 rounded-lg text-gray-400 hover:bg-indigo-50 hover:text-indigo-600 transition-colors" title="Subir pregunta">
                  <FontAwesomeIcon icon={faChevronUp} size="sm" className="fa-icon-force-current" />
                </button>
              )}
              {canMoveDown && (
                <button type="button" onClick={onMoveDown} className="p-1.5 rounded-lg text-gray-400 hover:bg-indigo-50 hover:text-indigo-600 transition-colors" title="Bajar pregunta">
                  <FontAwesomeIcon icon={faChevronDown} size="sm" className="fa-icon-force-current" />
                </button>
              )}
            </div>
          )}
          <div className="flex-1 min-w-0">
          {isActive ? (
            <div className="animate-fadeIn w-full">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 sm:gap-0 mb-4">
                <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-md uppercase tracking-wide border border-indigo-100">{data.type}</span>
                <button onClick={(e) => { e.stopPropagation(); onDelete(); }} className="p-2 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded-lg transition-colors self-end sm:self-auto">
                  <FontAwesomeIcon icon={faTrash} size="sm" className="fa-icon-force-current" />
                </button>
              </div>
              
              {data.type === 'Párrafo' ? (
                <textarea
                  autoFocus
                  value={data.text}
                  onChange={(e) => onUpdate({ text: e.target.value })}
                  placeholder="Escribe tu pregunta de párrafo aquí..."
                  className="w-full text-lg sm:text-xl md:text-2xl font-bold bg-transparent border-none focus:ring-0 p-0 text-gray-800 placeholder-gray-300 leading-tight h-20 resize-none"
                />
              ) : data.type === 'Título' ? (
                <div className="space-y-3">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Contenido informativo (no se pide respuesta)</p>
                  <input
                    type="text"
                    value={data.text}
                    onChange={(e) => onUpdate({ text: e.target.value })}
                    placeholder="Ej: 1. OBJETIVO DE LA RONDA"
                    className="w-full text-lg sm:text-xl md:text-2xl font-bold bg-transparent border-none focus:ring-0 p-0 text-gray-800 placeholder-gray-300 leading-tight"
                  />
                  <textarea
                    value={data.description || ''}
                    onChange={(e) => onUpdate({ description: e.target.value })}
                    placeholder="Párrafo informativo (ej: Realizar seguimiento continuo al comportamiento laboral...)"
                    className="w-full text-sm sm:text-base bg-transparent border-none focus:ring-0 p-0 text-gray-600 placeholder-gray-400 leading-relaxed min-h-[80px] resize-none"
                  />
                </div>
              ) : (
                <input 
                  autoFocus 
                  type="text"
                  value={data.text} 
                  onChange={(e) => onUpdate({ text: e.target.value })} 
                  placeholder="Escribe tu pregunta aquí..." 
                  className="w-full text-lg sm:text-xl md:text-2xl font-bold bg-transparent border-none focus:ring-0 p-0 text-gray-800 placeholder-gray-300 leading-tight" 
                />
              )}
              
              {data.type !== 'Título' && (
              <input type="text" value={data.description || ''} onChange={(e) => onUpdate({ description: e.target.value })} placeholder="Añade una descripción (opcional)" className="w-full text-xs sm:text-sm md:text-base mt-2 md:mt-3 bg-transparent border-none focus:ring-0 p-0 text-gray-500 placeholder-gray-400" />
              )}

              <QuestionImageEditor
                image={data.question_image}
                onChange={(question_image) => onUpdate({ question_image })}
                onRemove={() => onUpdate({ question_image: '' })}
              />
              
              <div className="mt-4 sm:mt-6 pt-4 sm:pt-6 border-t border-gray-100/50">
                {isOptionType && (
                  <div className="space-y-2 sm:space-y-3">
                     {data.options?.map((opt, idx) => (
                       <div key={idx} className="flex items-center gap-2 sm:gap-3 animate-fadeIn">
                         {data.type === 'Opción Única' && <div className="w-4 h-4 sm:w-5 sm:h-5 rounded-full border-2 border-indigo-200 flex-shrink-0" />}
                         {data.type === 'Casillas' && <div className="w-4 h-4 sm:w-5 sm:h-5 rounded border-2 border-indigo-200 flex-shrink-0" />}
                         {data.type === 'Desplegable' && <span className="text-gray-400 text-xs sm:text-sm flex-shrink-0">{idx + 1}.</span>}

                         <input value={opt} onChange={(e) => { const newOpts = [...(data.options || [])]; newOpts[idx] = e.target.value; onUpdate({ options: newOpts }); }} className="flex-1 bg-gray-50/80 hover:bg-white rounded-lg px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm focus:bg-white focus:ring-2 focus:ring-indigo-100 transition-all border-transparent focus:border-indigo-200 shadow-sm" />
                         <button type="button" onClick={(ev) => { ev.stopPropagation(); onUpdate({ options: (data.options || []).filter((_, i) => i !== idx) }); }} className="flex-shrink-0 p-1"><FontAwesomeIcon icon={faXmark} size="sm" className="text-gray-300 hover:text-red-400 fa-icon-force-current" /></button>
                       </div>
                     ))}
                     <div className="flex flex-wrap items-center gap-2 mt-2 sm:mt-3">
                       <button type="button" onClick={(ev) => { ev.stopPropagation(); onUpdate({ options: [...(data.options || []), `Opción ${(data.options?.length || 0) + 1}`] }); }} className="text-xs font-bold text-indigo-500 hover:text-indigo-700 flex items-center gap-1 pl-1 py-1.5 sm:py-2 px-2 sm:px-3 hover:bg-indigo-50 rounded-lg w-fit transition-colors"><FontAwesomeIcon icon={faPlus} size="sm" className="fa-icon-force-current" /> Añadir opción</button>
                       <input type="file" ref={fileInputRef} accept=".xlsx,.xls" className="hidden" onChange={(ev) => { ev.stopPropagation(); handleExcelImport(ev); }} />
                       <button type="button" onClick={(ev) => { ev.stopPropagation(); fileInputRef.current?.click(); }} className="text-xs font-bold text-gray-600 hover:text-gray-800 flex items-center gap-1 py-1.5 sm:py-2 px-2 sm:px-3 hover:bg-gray-100 rounded-lg w-fit transition-colors border border-gray-200"><FontAwesomeIcon icon={faFileExcel} size="sm" className="fa-icon-force-current" /> Importar desde Excel</button>
                     </div>
                    </div>
                )}
                {isEvaluationType && (
                  <div className="space-y-4" onClick={(e) => e.stopPropagation()}>
                    <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Ítems a evaluar (filas)</p>
                    {(data.evaluation_items || []).map((item, idx) => (
                      <div key={item.id} className="flex items-center gap-2">
                        <input
                          value={item.label}
                          onChange={(e) => {
                            const items = [...(data.evaluation_items || [])];
                            items[idx] = { ...item, label: e.target.value };
                            onUpdate({ evaluation_items: items });
                          }}
                          className="flex-1 bg-gray-50 rounded-lg px-2 py-1.5 text-sm border border-gray-200"
                          placeholder="Nombre del ítem"
                        />
                        <button type="button" onClick={() => onUpdate({ evaluation_items: (data.evaluation_items || []).filter((_, i) => i !== idx) })} className="p-1 text-gray-400 hover:text-red-500"><FontAwesomeIcon icon={faXmark} size="sm" className="fa-icon-force-current" /></button>
                      </div>
                    ))}
                    <button type="button" onClick={() => onUpdate({ evaluation_items: [...(data.evaluation_items || []), { id: generateId(), label: `Item${(data.evaluation_items?.length || 0) + 1}` }] })} className="text-xs font-bold text-indigo-500 hover:bg-indigo-50 rounded-lg px-2 py-1.5 flex items-center gap-1"><FontAwesomeIcon icon={faPlus} size="sm" className="fa-icon-force-current" /> Añadir ítem</button>
                    <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide mt-4">Columnas de calificación</p>
                    {(data.evaluation_columns || []).map((col, idx) => (
                      <div key={col.id} className="flex items-center gap-2 flex-wrap">
                        <input
                          value={col.label}
                          onChange={(e) => {
                            const cols = [...(data.evaluation_columns || [])];
                            cols[idx] = { ...col, label: e.target.value };
                            onUpdate({ evaluation_columns: cols });
                          }}
                          className="flex-1 min-w-[100px] bg-gray-50 rounded-lg px-2 py-1.5 text-sm border border-gray-200"
                          placeholder="Ej: CUMPLE"
                        />
                        <select
                          value={col.inputType || 'checkbox'}
                          onChange={(e) => {
                            const cols = [...(data.evaluation_columns || [])];
                            cols[idx] = { ...col, inputType: e.target.value };
                            onUpdate({ evaluation_columns: cols });
                          }}
                          className="rounded-lg px-2 py-1.5 text-sm border border-gray-200 bg-white"
                        >
                          <option value="checkbox">Casilla</option>
                          <option value="text">Texto (observaciones)</option>
                        </select>
                        <button type="button" onClick={() => onUpdate({ evaluation_columns: (data.evaluation_columns || []).filter((_, i) => i !== idx) })} className="p-1 text-gray-400 hover:text-red-500"><FontAwesomeIcon icon={faXmark} size="sm" className="fa-icon-force-current" /></button>
                      </div>
                    ))}
                    <button type="button" onClick={() => onUpdate({ evaluation_columns: [...(data.evaluation_columns || []), { id: generateId(), label: 'Nueva columna', inputType: 'checkbox' }] })} className="text-xs font-bold text-indigo-500 hover:bg-indigo-50 rounded-lg px-2 py-1.5 flex items-center gap-1"><FontAwesomeIcon icon={faPlus} size="sm" className="fa-icon-force-current" /> Añadir columna</button>
                  </div>
                )}
                {data.type === 'Puntuación' && <div className="flex gap-4 justify-center py-6 bg-gray-50/50 rounded-xl border border-dashed border-gray-200">{[1,2,3,4,5].map(i => <FontAwesomeIcon key={i} icon={faStar} size="lg" className="text-gray-300 fa-icon-force-current" />)}</div>}
                {data.type === 'Título' && <div className="py-4 px-4 bg-slate-50/80 rounded-xl border border-dashed border-slate-200 text-slate-500 text-sm italic">Solo texto informativo. No se espera respuesta.</div>}
                {data.type === 'Texto Corto' && <div className="h-14 bg-gray-50 rounded-xl border border-gray-200/60 flex items-center px-4 text-gray-400 text-sm italic shadow-inner">El usuario escribirá su respuesta aquí...</div>}
                {data.type === 'Párrafo' && <div className="h-20 bg-gray-50 rounded-xl border border-gray-200/60 flex items-center px-4 text-gray-400 text-sm italic shadow-inner">El usuario escribirá un párrafo aquí...</div>}
                {data.type === 'Número' && <div className="h-14 bg-gray-50 rounded-xl border border-gray-200/60 flex items-center px-4 text-gray-400 text-sm italic shadow-inner">El usuario introducirá un número aquí...</div>}
                {data.type === 'Fecha' && <div className="h-14 bg-gray-50 rounded-xl border border-gray-200/60 flex items-center px-4 text-gray-400 text-sm italic shadow-inner">{data.date_include_time ? 'El usuario seleccionará fecha y hora aquí...' : 'El usuario seleccionará una fecha aquí...'}</div>}
                {data.type === 'Correo Electrónico' && <div className="h-14 bg-gray-50 rounded-xl border border-gray-200/60 flex items-center px-4 text-gray-400 text-sm italic shadow-inner">El usuario ingresará su correo electrónico aquí...</div>}
                {data.type === 'Firma' && <div className="h-32 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300 flex flex-col items-center justify-center gap-2 shadow-inner">
                  <FontAwesomeIcon icon={faSignature} size="2x" className="text-gray-400 fa-icon-force-current" />
                  <span className="text-gray-400 text-sm italic">El usuario firmará aquí...</span>
                </div>}
                {data.type === 'Adjuntar archivos' && <div className="h-24 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300 flex flex-col items-center justify-center gap-2 shadow-inner">
                  <FontAwesomeIcon icon={faPaperclip} size="lg" className="text-gray-400 fa-icon-force-current" />
                  <span className="text-gray-400 text-sm italic">El usuario adjuntará documentos o fotos aquí...</span>
                </div>}
              </div>

              {/* Configuración: al final del bloque, compacta y secundaria */}
              <div className="mt-4 pt-3 border-t border-gray-200/80 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] text-gray-500">
                {data.type !== 'Título' && (
                  <label className="flex items-center gap-1.5 cursor-pointer shrink-0">
                    <input type="checkbox" checked={!!data.required} onChange={() => onUpdate({ required: !data.required })} className="rounded border-gray-300 text-indigo-500 focus:ring-indigo-500 w-3 h-3" onClick={e => e.stopPropagation()} />
                    <span>Obligatorio</span>
                  </label>
                )}
                {data.type === 'Fecha' && (
                  <label className="flex items-center gap-1.5 cursor-pointer shrink-0">
                    <input type="checkbox" checked={!!data.date_include_time} onChange={() => onUpdate({ date_include_time: !data.date_include_time })} className="rounded border-gray-300 text-indigo-500 focus:ring-indigo-500 w-3 h-3" onClick={e => e.stopPropagation()} />
                    <span>Incluir hora</span>
                  </label>
                )}
                {sections.length > 0 && (
                  <div className="flex items-center gap-1.5 shrink-0" onClick={e => e.stopPropagation()}>
                    <span className="text-gray-400">Sección</span>
                    <select value={data.section_id || ''} onChange={(e) => onUpdate({ section_id: e.target.value || null })} className="px-1.5 py-0.5 border border-gray-200 rounded text-[11px] bg-white focus:ring-1 focus:ring-indigo-400 min-w-0 max-w-[140px]">
                      <option value="">Sin sección</option>
                      {sections.map(section => <option key={section.id} value={section.id}>{section.title}</option>)}
                    </select>
                  </div>
                )}
                {data.type !== 'Título' && otherQuestions.length > 0 && (() => {
                  const refQ = otherQuestions.find(q => q.id === data.conditional_logic?.question_id) || otherQuestions[0];
                  const refIsOption = OPTION_QUESTION_TYPES.includes(refQ?.type);
                  const refOptions = Array.isArray(refQ?.options) ? refQ.options : [];
                  const patchCondition = (patch) => onUpdate({
                    conditional_logic: {
                      type: 'show_if',
                      question_id: data.conditional_logic?.question_id || otherQuestions[0]?.id || '',
                      operator: data.conditional_logic?.operator || 'equals',
                      value: data.conditional_logic?.value ?? '',
                      ...patch,
                    },
                  });
                  return (
                  <div className="w-full flex flex-wrap items-center gap-x-3 gap-y-1">
                    <label className="flex items-center gap-1.5 cursor-pointer shrink-0">
                      <input type="checkbox" checked={hasCondition} onChange={(e) => {
                        if (!e.target.checked) {
                          onUpdate({ conditional_logic: null });
                          return;
                        }
                        const first = otherQuestions[0];
                        const firstOpts = OPTION_QUESTION_TYPES.includes(first?.type) ? (first.options || []) : [];
                        onUpdate({
                          conditional_logic: {
                            type: 'show_if',
                            question_id: first?.id || '',
                            operator: 'equals',
                            value: firstOpts[0] || '',
                          },
                        });
                      }} className="rounded border-gray-300 text-indigo-500 w-3 h-3" onClick={e => e.stopPropagation()} />
                      <span>Mostrar solo si…</span>
                    </label>
                    {hasCondition && (
                      <span className="flex flex-wrap items-center gap-1.5">
                        <select value={data.conditional_logic?.question_id || ''} onChange={(e) => {
                          const nextRef = otherQuestions.find(q => q.id === e.target.value);
                          const nextOpts = OPTION_QUESTION_TYPES.includes(nextRef?.type) ? (nextRef.options || []) : [];
                          patchCondition({ question_id: e.target.value, value: nextOpts[0] || '' });
                        }} className="px-1.5 py-0.5 border border-gray-200 rounded text-[11px] bg-white min-w-0 max-w-[120px]" onClick={e => e.stopPropagation()}>
                          {otherQuestions.map(q => { const t = (q.text || q.question_text || ''); return <option key={q.id} value={q.id}>{t.length > 25 ? t.slice(0, 25) + '…' : t || 'Pregunta'}</option>; })}
                        </select>
                        <select value={data.conditional_logic?.operator || 'equals'} onChange={(e) => patchCondition({ operator: e.target.value })} className="px-1.5 py-0.5 border border-gray-200 rounded text-[11px] bg-white" onClick={e => e.stopPropagation()}>
                          {CONDITION_OPERATORS.map(op => <option key={op.value} value={op.value}>{op.label}</option>)}
                        </select>
                        {refIsOption && refOptions.length > 0 ? (
                          <select value={data.conditional_logic?.value ?? ''} onChange={(e) => patchCondition({ value: e.target.value })} className="px-1.5 py-0.5 border border-gray-200 rounded text-[11px] bg-white min-w-0 max-w-[140px]" onClick={e => e.stopPropagation()}>
                            {refOptions.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                          </select>
                        ) : (
                          <input type="text" value={data.conditional_logic?.value ?? ''} onChange={(e) => patchCondition({ value: e.target.value })} placeholder="Valor" className="px-1.5 py-0.5 border border-gray-200 rounded text-[11px] w-20" onClick={e => e.stopPropagation()} />
                        )}
                      </span>
                    )}
                  </div>
                  );
                })()}
              </div>
            </div>
          ) : (
            <div className="md:pr-10">
              <h3 className="text-base sm:text-lg md:text-xl font-semibold text-gray-700 mb-2 break-words">{(data.text || data.question_text) || ((data.type === 'Título' || data.question_type === 'titulo') ? 'Título sin texto' : 'Sin pregunta definida')}</h3>
              {data.description && <p className="text-xs sm:text-sm text-gray-400 mb-3 sm:mb-4 break-words">{data.description}</p>}
              {data.question_image && (
                <QuestionImageDisplay src={data.question_image} className="mb-3 opacity-80" />
              )}
              
              {data.type !== 'Título' && (
              <div className="opacity-60 pointer-events-none grayscale-[0.5]">
                 {isOptionType && (
                   <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                     {data.options?.slice(0, 4).map((opt, i) => (
                       <div key={i} className="flex items-center gap-2 bg-gray-50 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg border border-gray-100 min-w-0">
                         {data.type === 'Opción Única' && <div className="w-4 h-4 rounded-full border border-gray-300 flex-shrink-0" />}
                         {data.type === 'Casillas' && <div className="w-4 h-4 rounded border border-gray-300 flex-shrink-0" />}
                         {data.type === 'Desplegable' && <div className="w-4 h-4 bg-gray-200 rounded flex-shrink-0" />} 
                         <span className="text-xs sm:text-sm text-gray-600 truncate min-w-0">{opt}</span>
                       </div>
                     ))}
                   </div>
                 )}
                 {data.type === 'Texto Corto' && <div className="h-10 bg-gray-100/80 rounded-lg w-full" />}
                 {data.type === 'Párrafo' && <div className="h-16 bg-gray-100/80 rounded-lg w-full" />}
                 {data.type === 'Número' && <div className="h-10 bg-gray-100/80 rounded-lg w-full" />}
                 {data.type === 'Fecha' && <div className="h-10 bg-gray-100/80 rounded-lg w-full" />}
                 {data.type === 'Correo Electrónico' && <div className="h-10 bg-gray-100/80 rounded-lg w-full" />}
                 {data.type === 'Firma' && <div className="h-20 bg-gray-100/80 rounded-lg w-full border-2 border-dashed border-gray-300 flex items-center justify-center">
                   <FontAwesomeIcon icon={faSignature} size="lg" className="text-gray-400 fa-icon-force-current" />
                 </div>}
                 {data.type === 'Adjuntar archivos' && <div className="h-14 bg-gray-100/80 rounded-lg w-full border-2 border-dashed border-gray-300 flex items-center justify-center gap-2">
                   <FontAwesomeIcon icon={faPaperclip} size="sm" className="text-gray-400 fa-icon-force-current" />
                   <span className="text-gray-400 text-xs">Adjuntar archivos</span>
                 </div>}
                 {data.type === 'Puntuación' && <div className="flex gap-2"><FontAwesomeIcon icon={faStar} size="sm" className="text-gray-300 fa-icon-force-current" /><FontAwesomeIcon icon={faStar} size="sm" className="text-gray-300 fa-icon-force-current" /><FontAwesomeIcon icon={faStar} size="sm" className="text-gray-300 fa-icon-force-current" /></div>}
                 {data.type === 'Evaluación' && (
                   <div className="border border-gray-200 rounded-lg overflow-hidden">
                     <table className="w-full text-xs">
                       <thead><tr className="bg-gray-50"><th className="text-left p-2 border-b">Ítem</th>{(data.evaluation_columns || []).slice(0, 3).map(c => <th key={c.id} className="p-2 border-b">{c.label}</th>)}</tr></thead>
                       <tbody>{(data.evaluation_items || []).slice(0, 3).map(item => <tr key={item.id}><td className="p-2 border-b">{item.label}</td>{(data.evaluation_columns || []).slice(0, 3).map(c => <td key={c.id} className="p-2 border-b"><div className="w-4 h-4 border border-gray-300 rounded" /></td>)}</tr>)}</tbody>
                     </table>
                   </div>
                 )}
              </div>
              )}
            </div>
          )}
        </div>
      </div>
        </div>
    </div>
  );
};

const compressHeaderImageFile = compressSurveyImageFile;

const SurveyFormHeader = ({
  title,
  description,
  headerImage,
  editable = false,
  centered = false,
  onTitleChange,
  onDescriptionChange,
  onHeaderImageChange,
  onHeaderImageRemove,
}) => {
  const fileInputRef = useRef(null);

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !onHeaderImageChange) return;
    try {
      const dataUrl = await compressHeaderImageFile(file);
      onHeaderImageChange(dataUrl);
    } catch (err) {
      alert(err.message || 'Error al cargar la imagen');
    }
    e.target.value = '';
  };

  const alignClass = centered ? 'text-center' : '';

  return (
    <div className="mb-6 md:mb-10 rounded-t-xl overflow-hidden border border-gray-200 bg-white shadow-sm">
      <div className="h-2 bg-purple-600 rounded-t-xl" aria-hidden="true" />
      <div className={`border-l-4 border-l-blue-500 px-4 py-4 md:px-5 md:py-5 ${alignClass}`}>
        {headerImage && (
          <div className={`relative mb-4 ${editable ? 'group' : ''}`}>
            <img
              src={headerImage}
              alt="Imagen de encabezado"
              className={`w-full max-h-56 object-cover rounded-lg border border-gray-100 ${centered ? 'mx-auto' : ''}`}
            />
            {editable && (
              <div className="absolute top-2 right-2 flex gap-1">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-2 py-1 text-[11px] font-semibold bg-white/95 text-gray-700 rounded-md shadow-sm hover:bg-white border border-gray-200"
                >
                  Cambiar
                </button>
                <button
                  type="button"
                  onClick={onHeaderImageRemove}
                  className="px-2 py-1 text-[11px] font-semibold bg-red-50 text-red-600 rounded-md shadow-sm hover:bg-red-100 border border-red-200"
                >
                  Quitar
                </button>
              </div>
            )}
          </div>
        )}
        {editable && !headerImage && (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="w-full mb-4 flex flex-col items-center justify-center gap-2 py-6 border-2 border-dashed border-gray-200 rounded-lg text-gray-500 hover:border-indigo-300 hover:bg-indigo-50/40 hover:text-indigo-600 transition-colors"
          >
            <FontAwesomeIcon icon={faImage} size="lg" className="fa-icon-force-current" />
            <span className="text-sm font-semibold">Agregar imagen de encabezado</span>
            <span className="text-xs text-gray-400">JPG o PNG, máx. 5 MB</span>
          </button>
        )}
        {editable ? (
          <>
            <textarea
              value={title}
              onChange={(e) => {
                const newTitle = e.target.value;
                const titleInput = e.target;
                titleInput.style.height = 'auto';
                titleInput.style.height = `${titleInput.scrollHeight}px`;
                onTitleChange?.(newTitle);
              }}
              onInput={(e) => {
                e.target.style.height = 'auto';
                e.target.style.height = `${e.target.scrollHeight}px`;
              }}
              className={`w-full text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black text-gray-900 bg-transparent border-none focus:ring-0 p-0 placeholder-gray-300 resize-none overflow-hidden border-b border-gray-200 pb-1 focus:outline-none ${centered ? 'text-center' : ''}`}
              placeholder="Formulario sin título"
              rows={1}
              style={{
                wordBreak: 'break-word',
                overflowWrap: 'break-word',
                whiteSpace: 'pre-wrap',
                overflow: 'hidden',
                lineHeight: '1.2',
                maxWidth: '100%',
                boxSizing: 'border-box',
              }}
            />
            <input
              value={description}
              onChange={(e) => onDescriptionChange?.(e.target.value)}
              className={`w-full mt-3 md:mt-4 text-base md:text-lg text-gray-500 bg-transparent border-none focus:ring-0 p-0 placeholder-gray-400 border-b border-gray-100 pb-1 focus:outline-none ${centered ? 'text-center' : ''}`}
              placeholder="Descripción del formulario"
            />
          </>
        ) : (
          <>
            <h1 className={`text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black text-gray-900 leading-tight ${centered ? 'mx-auto max-w-3xl' : ''}`}>
              {title || 'Formulario sin título'}
            </h1>
            <p className={`mt-2 md:mt-3 text-base md:text-lg text-gray-500 leading-relaxed ${centered ? 'mx-auto max-w-3xl' : ''}`}>
              {description || 'Descripción del formulario'}
            </p>
          </>
        )}
      </div>
      {editable && (
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="hidden"
          onChange={handleFile}
        />
      )}
    </div>
  );
};

// --- VISTA: PREVIEW DE ENCUESTAS ---

const SurveyPreview = ({ surveyData, onBack }) => {
  const [answers, setAnswers] = useState({});

  const handleAnswerChange = (questionId, value) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }));
  };

  const renderQuestion = (question) => {
    const questionId = question.id;
    if (question.conditional_logic && !evaluateCondition(question.conditional_logic, answers)) {
      return null;
    }
    if (question.type === 'Título') {
      return (
        <div key={questionId} className="mb-8 bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
          <h3 className="text-lg font-bold text-gray-800 mb-2">{question.text || question.question_text || 'Título'}</h3>
          {question.description && (
            <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{question.description}</p>
          )}
          {question.question_image && (
            <QuestionImageDisplay src={question.question_image} className="mt-3" />
          )}
        </div>
      );
    }
    const isOptionType = ['Opción Única', 'Casillas', 'Desplegable'].includes(question.type);

    return (
      <div key={questionId} className="mb-8 bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
        <div className="mb-4">
          <h3 className="text-lg font-bold text-gray-800 mb-2">
            {question.text || question.question_text || 'Pregunta sin texto'}
            {question.required && <span className="text-red-500 ml-1">*</span>}
          </h3>
          {question.description && (
            <p className="text-sm text-gray-500">{question.description}</p>
          )}
          {question.question_image && (
            <QuestionImageDisplay src={question.question_image} className="mt-3" />
          )}
        </div>

        <div className="mt-4">
          {question.type === 'Texto Corto' && (
            <input
              type="text"
              value={answers[questionId] || ''}
              onChange={(e) => handleAnswerChange(questionId, e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder="Escribe tu respuesta aquí..."
            />
          )}

          {question.type === 'Párrafo' && (
            <textarea
              value={answers[questionId] || ''}
              onChange={(e) => handleAnswerChange(questionId, e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent min-h-[120px]"
              placeholder="Escribe tu respuesta aquí..."
            />
          )}

          {question.type === 'Número' && (
            <input
              type="number"
              value={answers[questionId] || ''}
              onChange={(e) => handleAnswerChange(questionId, e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder="Ingresa un número..."
            />
          )}

          {question.type === 'Fecha' && (
            <input
              type={question.date_include_time ? 'datetime-local' : 'date'}
              value={answers[questionId] || ''}
              onChange={(e) => handleAnswerChange(questionId, e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          )}

          {question.type === 'Correo Electrónico' && (
            <input
              type="email"
              value={answers[questionId] || ''}
              onChange={(e) => handleAnswerChange(questionId, e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder="ejemplo@correo.com"
            />
          )}

          {question.type === 'Opción Única' && question.options && (
            <div className="space-y-3">
              {question.options.map((option, idx) => (
                <label key={idx} className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                  <input
                    type="radio"
                    name={`question_${questionId}`}
                    value={option}
                    checked={answers[questionId] === option}
                    onChange={(e) => handleAnswerChange(questionId, e.target.value)}
                    className="w-5 h-5 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-gray-700">{option}</span>
                </label>
              ))}
            </div>
          )}

          {question.type === 'Casillas' && question.options && (
            <div className="space-y-3">
              {question.options.map((option, idx) => (
                <label key={idx} className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={(answers[questionId] || []).includes(option)}
                    onChange={(e) => {
                      const currentAnswers = answers[questionId] || [];
                      const newAnswers = e.target.checked
                        ? [...currentAnswers, option]
                        : currentAnswers.filter(a => a !== option);
                      handleAnswerChange(questionId, newAnswers);
                    }}
                    className="w-5 h-5 text-indigo-600 focus:ring-indigo-500 rounded"
                  />
                  <span className="text-gray-700">{option}</span>
                </label>
              ))}
            </div>
          )}

          {question.type === 'Desplegable' && question.options && (
            <select
              value={answers[questionId] || ''}
              onChange={(e) => handleAnswerChange(questionId, e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            >
              <option value="">Selecciona una opción...</option>
              {question.options.map((option, idx) => (
                <option key={idx} value={option}>{option}</option>
              ))}
            </select>
          )}

          {question.type === 'Puntuación' && (
            <div className="flex gap-2 justify-center py-4">
              {[1, 2, 3, 4, 5].map((rating) => (
                <button
                  key={rating}
                  type="button"
                  onClick={() => handleAnswerChange(questionId, rating)}
                  className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
                    answers[questionId] >= rating
                      ? 'bg-yellow-400 text-white'
                      : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                  }`}
                >
                  <FontAwesomeIcon icon={faStar} size="lg" />
                </button>
              ))}
            </div>
          )}

          {question.type === 'Firma' && (
            <SignaturePad 
              value={answers[questionId] || ''}
              onChange={(signatureData) => handleAnswerChange(questionId, signatureData)}
            />
          )}

          {question.type === 'Evaluación' && (question.evaluation_items?.length > 0 || question.evaluation_columns?.length > 0) && (
            <div className="overflow-x-auto border border-gray-200 rounded-xl text-sm">
              <table className="w-full min-w-[300px]">
                <thead><tr className="bg-gray-100 border-b"><th className="text-left p-2">ITEM EVALUADO</th>{(question.evaluation_columns || []).map(c => <th key={c.id} className="p-2 text-center">{c.label}</th>)}</tr></thead>
                <tbody>{(question.evaluation_items || []).map(item => <tr key={item.id} className="border-b"><td className="p-2">{item.label}</td>{(question.evaluation_columns || []).map(c => <td key={c.id} className="p-2 text-center">{c.inputType === 'text' ? <span className="text-gray-400 italic">Texto</span> : <div className="w-4 h-4 border border-gray-300 rounded mx-auto" />}</td>)}</tr>)}</tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <main className="flex-1 relative z-10 w-full">
      <header className="sticky top-0 z-40 px-4 py-4 md:px-12 md:py-6 flex justify-between items-center bg-white/50 backdrop-blur-md border-b border-white/40">
        <div className="flex items-center gap-3">
          <button 
            className="p-2 -ml-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer" 
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (onBack) {
                onBack();
              }
            }} 
            title="Volver al editor"
          >
            <FontAwesomeIcon icon={faChevronLeft} size="sm" className="fa-icon-force-current" />
          </button>
          <div>
            <h1 className="text-xl md:text-2xl font-black text-gray-800 tracking-tight leading-none">Vista Previa</h1>
            <span className="text-xs font-bold text-indigo-500 uppercase tracking-widest hidden md:inline-block mt-1">Modo Previsualización</span>
          </div>
        </div>
      </header>

      <div className="w-full max-w-3xl mx-auto px-4 py-8 md:py-12">
        <SurveyFormHeader
          title={surveyData.title}
          description={surveyData.description}
          headerImage={surveyData.header_image}
        />

        {surveyData.questions && surveyData.questions.length > 0 ? (
          <div className="space-y-6">
            {surveyData.questions.map(renderQuestion)}
          </div>
        ) : (
          <div className="text-center py-20 border-2 border-dashed border-gray-300 rounded-3xl bg-white/30">
            <p className="text-xl font-bold text-gray-400">No hay preguntas en esta encuesta</p>
          </div>
        )}

        <div className="mt-8 pt-8 border-t border-gray-200">
          <button
            className="w-full px-6 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-lg shadow-xl transition-transform active:scale-95"
            onClick={() => alert('En una versión completa, esto enviaría las respuestas al servidor.')}
          >
            Enviar Respuestas
          </button>
        </div>
      </div>
    </main>
  );
};

// --- VISTA: ENCUESTA PÚBLICA (SIN AUTENTICACIÓN) ---

const PersonalDataConsentModal = ({ open, text, surveyTitle, onAccept }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[95] flex items-center justify-center p-4 bg-black/60">
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="personal-data-consent-title"
      >
        <div className="px-5 py-4 border-b border-gray-200">
          <h2 id="personal-data-consent-title" className="text-lg font-black text-slate-800">
            Autorización de tratamiento de datos personales
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            {surveyTitle
              ? `Antes de continuar con «${surveyTitle}», debes leer y aceptar esta autorización (Ley 1581 de 2012).`
              : 'Antes de continuar, debes leer y aceptar esta autorización (Ley 1581 de 2012).'}
          </p>
        </div>
        <div className="px-5 py-4 overflow-y-auto flex-1">
          <div className="text-xs sm:text-sm text-slate-700 whitespace-pre-wrap leading-relaxed border border-slate-200 rounded-xl bg-slate-50 p-4 max-h-[50vh] overflow-y-auto">
            {text}
          </div>
        </div>
        <div className="px-5 py-4 border-t border-gray-200 bg-white space-y-2">
          <button
            type="button"
            onClick={onAccept}
            className="w-full px-4 py-3 rounded-xl font-bold text-sm text-white bg-emerald-600 hover:bg-emerald-700"
          >
            He leído y acepto el tratamiento de mis datos personales
          </button>
          <p className="text-[11px] text-center text-slate-500">
            Si no aceptas, no podrás diligenciar ni enviar esta encuesta.
          </p>
        </div>
      </div>
    </div>
  );
};

const ConsentOtpModal = ({
  open,
  email,
  otpCode,
  sending,
  verifying,
  error,
  info,
  sentAtLabel,
  resendCooldownLeft,
  onEmailChange,
  onOtpChange,
  onSend,
  onVerify,
  onCancel,
}) => {
  if (!open) return null;
  const canResend = !sending && email.trim() && (resendCooldownLeft == null || resendCooldownLeft <= 0);
  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-black/55">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="px-5 py-4 border-b border-gray-200">
          <h2 className="text-lg font-black text-gray-800">Verificación de autorización</h2>
          <p className="text-xs text-gray-500 mt-1">
            Ingresa tu correo, solicita el código y confírmalo aquí para continuar.
          </p>
        </div>
        <div className="px-5 py-4 space-y-3">
          <div>
            <label className="block text-xs font-bold text-gray-600 mb-1">Correo electrónico</label>
            <input
              type="email"
              value={email}
              onChange={(e) => onEmailChange(e.target.value)}
              className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500"
              placeholder="tu@correo.com"
              autoComplete="email"
            />
          </div>
          <button
            type="button"
            disabled={!canResend}
            onClick={onSend}
            className="w-full px-4 py-2.5 rounded-xl font-bold text-sm text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
          >
            {sending
              ? 'Enviando…'
              : resendCooldownLeft > 0
                ? `Reenviar en ${resendCooldownLeft}s`
                : 'Enviar código a este correo'}
          </button>
          <p className="text-[11px] text-slate-500 leading-relaxed">
            El código puede tardar 1–2 minutos. Revisa también Spam o Promociones.
            Si reenvías antes de que expire, se manda el mismo código vigente.
          </p>
          {sentAtLabel && (
            <p className="text-[11px] text-slate-600">Último envío: {sentAtLabel}</p>
          )}
          <div>
            <label className="block text-xs font-bold text-gray-600 mb-1">Código recibido</label>
            <input
              type="text"
              inputMode="numeric"
              value={otpCode}
              onChange={(e) => onOtpChange(e.target.value.replace(/\D/g, '').slice(0, 8))}
              className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm tracking-widest font-mono focus:ring-2 focus:ring-emerald-500"
              placeholder="••••••"
            />
          </div>
          {info && <p className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-2">{info}</p>}
          {error && <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>}
        </div>
        <div className="px-5 py-4 border-t border-gray-200 flex gap-2 justify-end">
          <button type="button" onClick={onCancel} className="px-4 py-2 rounded-xl font-bold text-sm text-gray-600 hover:bg-gray-100">
            Cancelar
          </button>
          <button
            type="button"
            disabled={verifying || !otpCode.trim()}
            onClick={onVerify}
            className="px-4 py-2 rounded-xl font-bold text-sm text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50"
          >
            {verifying ? 'Verificando…' : 'Confirmar código y continuar'}
          </button>
        </div>
      </div>
    </div>
  );
};

const PublicSurveyView = ({ surveyId }) => {
  const [surveyData, setSurveyData] = useState(null);
  const [answers, setAnswers] = useState({});
  const [fileLists, setFileLists] = useState({}); // questionId -> File[] for file_upload questions
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState(null);
  // Section state
  const [currentSection, setCurrentSection] = useState(null);
  const [sectionHistory, setSectionHistory] = useState([]);
  const [visibleSections, setVisibleSections] = useState([]);
  const [referenceLookupNotFound, setReferenceLookupNotFound] = useState(false);
  const referenceLookupDebounceRef = React.useRef(null);
  // Consent OTP gate: locked | verified | denied
  const [consentGate, setConsentGate] = useState('locked');
  const [consentModalOpen, setConsentModalOpen] = useState(false);
  const [consentEmail, setConsentEmail] = useState('');
  const [consentOtp, setConsentOtp] = useState('');
  const [consentToken, setConsentToken] = useState('');
  const [consentSending, setConsentSending] = useState(false);
  const [consentVerifying, setConsentVerifying] = useState(false);
  const [consentError, setConsentError] = useState('');
  const [consentInfo, setConsentInfo] = useState('');
  const [consentSentAt, setConsentSentAt] = useState(null);
  const [consentResendCooldown, setConsentResendCooldown] = useState(0);
  const [signatureConsentAt, setSignatureConsentAt] = useState(null);
  const [submitEmailStatus, setSubmitEmailStatus] = useState(''); // '', sending, queued, sent, error

  useEffect(() => {
    if (consentResendCooldown <= 0) return undefined;
    const t = setInterval(() => {
      setConsentResendCooldown((s) => (s > 0 ? s - 1 : 0));
    }, 1000);
    return () => clearInterval(t);
  }, [consentResendCooldown]);

  // Function to evaluate conditional logic (shared module-level evaluateCondition)
  const getVisibleSections = (sections) => {
    if (!sections || sections.length === 0) return [];
    return [...sections];
  };

  const consentCfg = surveyData?.informed_consent_enabled ? (surveyData.informed_consent || {}) : null;
  const personalDataConsentText = useMemo(
    () => buildPersonalDataConsentText({ survey: surveyData }),
    [surveyData]
  );
  const acceptanceQId = consentCfg?.acceptance_question_id || '';
  const acceptanceValue = (consentCfg?.acceptance_value || 'SI, AUTORIZO').trim();
  const denialValue = (consentCfg?.denial_value || 'NO AUTORIZO').trim();
  const acceptanceQuestionIndex = useMemo(() => {
    if (!surveyData?.questions || !acceptanceQId) return -1;
    return surveyData.questions.findIndex((q) => (q.id || q._id) === acceptanceQId);
  }, [surveyData, acceptanceQId]);

  const isQuestionBlockedByConsent = (questionIndex) => {
    if (!consentCfg || !acceptanceQId || acceptanceQuestionIndex < 0) return false;
    if (questionIndex <= acceptanceQuestionIndex) return false;
    if (consentGate === 'verified') return false;
    // denied or locked: block questions after acceptance
    return true;
  };

  useEffect(() => {
    const fetchSurvey = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/public/surveys/${surveyId}/`);
        if (!response.ok) {
          let message = 'Encuesta no encontrada';
          try {
            const err = await response.json();
            if (response.status === 403 && err.detail) message = err.detail;
            else if (err.detail) message = typeof err.detail === 'string' ? err.detail : message;
          } catch (_) {}
          throw new Error(message);
        }
        const data = await response.json();
        
        const questionsWithIds = (data.questions || []).map((q, index) => ({
          ...q,
          id: q.id || `q_${index}`,
          type: mapBackendTypeToFrontend(q.question_type || q.type),
          text: q.text || q.question_text || '',
          options: q.options || [],
          section_id: q.section_id || null,
          conditional_logic: q.conditional_logic || null,
          evaluation_items: q.evaluation_items || [],
          evaluation_columns: q.evaluation_columns || [],
          accept: q.accept || 'image/*,application/pdf'
        }));
        
        // Process sections
        const sections = (data.sections || []).map((s, index) => ({
          ...s,
          id: s.id || `section_${index}`,
          order: s.order || index
        })).sort((a, b) => (a.order || 0) - (b.order || 0));
        
        setSurveyData({
          ...data,
          questions: questionsWithIds,
          sections: sections
        });
        
        // Set initial section
        if (sections.length > 0) {
          setCurrentSection(sections[0].id);
          setVisibleSections(sections.map(s => s.id));
        } else {
          setCurrentSection(null);
          setVisibleSections([]);
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (surveyId) {
      fetchSurvey();
    }
  }, [surveyId]);

  // Update visible sections when answers change
  useEffect(() => {
    if (surveyData && surveyData.sections && surveyData.sections.length > 0) {
      const visible = getVisibleSections(surveyData.sections);
      setVisibleSections(visible.map(s => s.id));
      
      // If current section is no longer visible, move to first visible section
      if (currentSection && !visible.find(s => s.id === currentSection)) {
        if (visible.length > 0) {
          setCurrentSection(visible[0].id);
        }
      }
    }
  }, [answers, surveyData]);

  // Referenciación: pregunta cuya columna mapeada es la clave de búsqueda
  const referenceKeyQuestionId = surveyData?.reference_key_column && surveyData?.reference_mapping
    ? (surveyData.questions || []).find(q => (surveyData.reference_mapping || {})[q.id] === surveyData.reference_key_column)?.id
    : null;

  const handleAnswerChange = (questionId, value) => {
    if (questionId === referenceKeyQuestionId) {
      setReferenceLookupNotFound(false);
      if (referenceLookupDebounceRef.current) clearTimeout(referenceLookupDebounceRef.current);
      referenceLookupDebounceRef.current = setTimeout(() => {
        doReferenceLookup(value);
        referenceLookupDebounceRef.current = null;
      }, 500);
    }

    if (consentCfg && acceptanceQId && questionId === acceptanceQId) {
      const v = String(value || '').trim();
      setConsentToken('');
      setConsentOtp('');
      setConsentError('');
      setConsentInfo('');
      if (v === acceptanceValue) {
        setConsentGate('locked');
        setConsentModalOpen(true);
      } else if (v === denialValue) {
        setConsentGate('denied');
        setConsentModalOpen(false);
      } else {
        setConsentGate('locked');
        setConsentModalOpen(false);
      }
    }

    setAnswers(prev => ({ ...prev, [questionId]: value }));
  };

  const cancelConsentModal = () => {
    setConsentModalOpen(false);
    setConsentError('');
    setConsentInfo('');
    setConsentOtp('');
    setConsentGate('locked');
    if (acceptanceQId) {
      setAnswers((prev) => {
        const next = { ...prev };
        delete next[acceptanceQId];
        return next;
      });
    }
  };

  const sendConsentOtp = async () => {
    setConsentSending(true);
    setConsentError('');
    setConsentInfo('');
    try {
      const sid = surveyData.id || surveyData._id || surveyId;
      const res = await fetch(`/api/public/surveys/${sid}/consent-otp/send/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: consentEmail.trim(),
          acceptance_answer: acceptanceValue,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (res.status === 429) {
          const wait = Number(data.retry_after) || Number(data.cooldown_seconds) || 45;
          setConsentResendCooldown(wait);
        }
        throw new Error(data.detail || 'No se pudo enviar el código');
      }
      const cooldown = Number(data.resend_cooldown) || 45;
      setConsentResendCooldown(cooldown);
      setConsentSentAt(new Date());
      setConsentInfo(
        data.message
        || (data.queued
          ? 'Código encolado. Puede tardar 1–2 minutos; revisa también Spam.'
          : 'Código enviado. Revisa tu correo (y Spam) e ingrésalo aquí.')
      );
    } catch (e) {
      setConsentError(e.message || 'Error al enviar el código');
    } finally {
      setConsentSending(false);
    }
  };

  const verifyConsentOtp = async () => {
    setConsentVerifying(true);
    setConsentError('');
    try {
      const sid = surveyData.id || surveyData._id || surveyId;
      const res = await fetch(`/api/public/surveys/${sid}/consent-otp/verify/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: consentEmail.trim(),
          code: consentOtp.trim(),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.detail || 'Código inválido');
      setConsentToken(data.consent_token || '');
      setConsentGate('verified');
      setConsentModalOpen(false);
      setConsentInfo('');
    } catch (e) {
      setConsentError(e.message || 'No se pudo verificar el OTP');
    } finally {
      setConsentVerifying(false);
    }
  };

  const formatDateForInput = (val, includeTime) => {
    if (val == null) return '';
    const s = String(val).trim();
    if (!s) return '';
    const num = Number(val);
    let date;
    if (!Number.isNaN(num) && num > 0) {
      date = new Date((num - 25569) * 86400 * 1000);
    } else {
      date = new Date(s.replace(/(\d{1,2})\/(\d{1,2})\/(\d{4})/, (_, d, m, y) => `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`));
    }
    if (Number.isNaN(date.getTime())) return s;
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    if (includeTime) {
      const h = String(date.getHours()).padStart(2, '0');
      const min = String(date.getMinutes()).padStart(2, '0');
      return `${y}-${m}-${d}T${h}:${min}`;
    }
    return `${y}-${m}-${d}`;
  };

  const doReferenceLookup = async (keyValue) => {
    const key = String(keyValue || '').trim();
    if (!key || !surveyId || !surveyData?.reference_key_column || !surveyData?.reference_mapping) return;
    setReferenceLookupNotFound(false);
    try {
      const response = await fetch(`/api/public/surveys/${surveyId}/reference-lookup/?key=${encodeURIComponent(key)}`);
      if (!response.ok) {
        setReferenceLookupNotFound(true);
        return;
      }
      const row = await response.json();
      if (!row || typeof row !== 'object' || Object.keys(row).length === 0) {
        setReferenceLookupNotFound(true);
        return;
      }
      setReferenceLookupNotFound(false);
      const questions = surveyData.questions || [];
      setAnswers(prev => {
        const next = { ...prev };
        Object.entries(surveyData.reference_mapping || {}).forEach(([qid, colName]) => {
          let val = row[colName];
          if (val === undefined || val === null) return;
          const question = questions.find(q => q.id === qid);
          if (question && (question.type === 'Fecha' || question.type === 'date')) {
            val = formatDateForInput(val, question.date_include_time);
          } else if (typeof val === 'number' && question && question.type !== 'Número' && question.type !== 'number') {
            val = String(val);
          }
          next[qid] = val;
        });
        return next;
      });
    } catch (_) {
      setReferenceLookupNotFound(true);
    }
  };

  const isQuestionAnswerMissing = (q) => {
    const qid = q.id || q._id;
    if (q.type === 'Adjuntar archivos') {
      const files = fileLists[qid];
      return !files || files.length === 0;
    }
    const val = answers[qid];
    if (val === undefined || val === null) return true;
    if (typeof val === 'string' && val.trim() === '') return true;
    if (Array.isArray(val) && val.length === 0) return true;
    return false;
  };

  const getVisibleRequiredQuestions = () => {
    const questions = surveyData?.questions || [];
    const isVisible = (q) => {
      if (q.conditional_logic && !evaluateCondition(q.conditional_logic, answers)) return false;
      const idx = questions.findIndex((qq) => (qq.id || qq._id) === (q.id || q._id));
      if (isQuestionBlockedByConsent(idx)) return false;
      if (surveyData.sections && surveyData.sections.length > 0) {
        return q.section_id === currentSection;
      }
      return true;
    };
    return questions.filter(q => q.required && q.type !== 'Título' && q.type !== 'titulo' && isVisible(q));
  };

  /** Preguntas obligatorias visibles (no bloqueadas) pendientes en una sección. */
  const getMissingRequiredInSection = (sectionId) => {
    const questions = surveyData?.questions || [];
    return questions.filter((q) => {
      if (!q.required || q.type === 'Título' || q.type === 'titulo') return false;
      if (q.section_id !== sectionId) return false;
      if (q.conditional_logic && !evaluateCondition(q.conditional_logic, answers)) return false;
      const idx = questions.findIndex((qq) => (qq.id || qq._id) === (q.id || q._id));
      if (isQuestionBlockedByConsent(idx)) return false;
      return isQuestionAnswerMissing(q);
    });
  };

  /**
   * Avanza a otra sección solo si, al ir hacia adelante, todas las secciones
   * intermedias (incluida la actual) tienen sus obligatorias completas.
   * Retroceder siempre está permitido.
   */
  const tryGoToSection = (targetSectionId) => {
    const sections = surveyData?.sections || [];
    if (!sections.length || !targetSectionId) return false;
    const currentIndex = sections.findIndex((s) => s.id === currentSection);
    const targetIndex = sections.findIndex((s) => s.id === targetSectionId);
    if (targetIndex < 0) return false;

    if (targetIndex > currentIndex) {
      for (let i = currentIndex; i < targetIndex; i += 1) {
        if (i < 0) continue;
        const section = sections[i];
        const missing = getMissingRequiredInSection(section.id);
        if (missing.length > 0) {
          const names = missing
            .map((q) => (q.text || q.question_text || 'Pregunta'))
            .slice(0, 3)
            .join(', ');
          alert(
            `Completa las preguntas obligatorias de «${section.title || 'esta sección'}» antes de continuar.`
            + ` Faltan: ${names}${missing.length > 3 ? '...' : ''}`
          );
          if (section.id !== currentSection) {
            setCurrentSection(section.id);
          }
          return false;
        }
      }
      setSectionHistory((prev) => [...prev, currentSection]);
    } else if (targetIndex < currentIndex) {
      setSectionHistory((prev) => prev.slice(0, Math.max(0, prev.length - (currentIndex - targetIndex))));
    }

    setCurrentSection(targetSectionId);
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!signatureConsentAt) {
      alert('Debes aceptar el consentimiento de uso de datos personales para continuar con la encuesta.');
      return;
    }

    if (consentCfg && acceptanceQId) {
      const ans = String(answers[acceptanceQId] || '').trim();
      if (ans === acceptanceValue && consentGate !== 'verified') {
        alert('Debes verificar el OTP de autorización antes de enviar.');
        setConsentModalOpen(true);
        return;
      }
    }

    const requiredQuestions = getVisibleRequiredQuestions();
    const missing = requiredQuestions.filter((q) => isQuestionAnswerMissing(q));
    if (missing.length > 0) {
      const names = missing.map(q => (q.text || q.question_text || 'Pregunta')).slice(0, 3).join(', ');
      alert(`Completa los campos obligatorios (marcados con *). Faltan: ${names}${missing.length > 3 ? '...' : ''}`);
      return;
    }

    setSubmitting(true);
    try {
      // Generate device ID if not exists
      let deviceId = localStorage.getItem('device_id');
      if (!deviceId) {
        deviceId = `device_${Math.random().toString(36).substr(2, 9)}_${Date.now()}`;
        localStorage.setItem('device_id', deviceId);
      }

      // Upload file_upload question files first and collect attachment IDs
      const docEmpleadoQId = surveyData.documento_empleado_question_id || '';
      const docVotanteQId = surveyData.documento_votante_question_id || '';
      const docEmpleado = docEmpleadoQId ? String(answers[docEmpleadoQId] || '').trim() : '';
      const docVotante = docVotanteQId ? String(answers[docVotanteQId] || '').trim() : '';

      const attachmentIdsByQuestion = {};
      const fileUploadQuestions = surveyData.questions.filter(q => q.type === 'Adjuntar archivos');
      for (const question of fileUploadQuestions) {
        const qid = question.id || question._id;
        const files = fileLists[qid] || [];
        const ids = [];
        for (const file of files) {
          const formData = new FormData();
          formData.append('documento_empleado', docEmpleado);
          formData.append('documento_votante', docVotante);
          formData.append('file', file);
          const uploadRes = await fetch('/api/attachments/', {
            method: 'POST',
            body: formData
          });
          if (!uploadRes.ok) {
            const errData = await uploadRes.json().catch(() => ({}));
            throw new Error(errData.detail || `Error al subir ${file.name}`);
          }
          const { id } = await uploadRes.json();
          ids.push(id);
        }
        attachmentIdsByQuestion[qid] = ids;
      }

      // Map frontend question IDs to backend format
      const formattedAnswers = {};
      Object.entries(answers).forEach(([questionId, answer]) => {
        const question = surveyData.questions.find(q => q.id === questionId);
        if (question) {
          const backendId = question._id || question.id;
          formattedAnswers[backendId] = answer;
        }
      });
      Object.entries(attachmentIdsByQuestion).forEach(([questionId, ids]) => {
        const question = surveyData.questions.find(q => q.id === questionId);
        if (question) {
          const backendId = question._id || question.id;
          formattedAnswers[backendId] = ids;
        }
      });

      const response = await fetch('/api/public/responses/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          survey: surveyData.id || surveyData._id,
          device_id: deviceId,
          answers: formattedAnswers,
          ...(signatureConsentAt ? { signature_consent_at: signatureConsentAt } : {}),
          ...(consentGate === 'verified' && consentToken
            ? { consent_token: consentToken, consent_email: consentEmail.trim() }
            : {}),
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Error al enviar las respuestas');
      }

      const saved = await response.json().catch(() => ({}));
      const savedId = saved?.id || saved?._id || '';

      const shouldEmailPdf = Boolean(
        consentCfg
        && consentGate === 'verified'
        && (consentEmail || '').trim()
        && savedId
      );

      setSubmitted(true);

      if (shouldEmailPdf) {
        setSubmitEmailStatus('sending');
        try {
          const ic = surveyData.informed_consent || {};
          const pdfBytes = await buildConsentPdfBytes({
            title: ic.title || 'Consentimiento informado',
            mergedBody: mergeConsentTemplate(ic.body || '', ic.mappings || [], answers),
            response: {
              id: savedId,
              answers,
              created_at: saved.created_at || new Date().toISOString(),
              consent_email: consentEmail.trim(),
              consent_otp_verified_at: saved.consent_otp_verified_at || new Date().toISOString(),
              signature_consent_at: signatureConsentAt,
            },
            survey: surveyData,
            letterheadUrl: '/membrete2.pdf',
            letterheadPdf: ic.letterhead_pdf || '',
            signatureDataUrl: resolveConsentSignature({
              answers,
              mappings: ic.mappings || [],
              survey: surveyData,
              signatureQuestionId: ic.signature_question_id || '',
            }),
          });
          const sid = surveyData.id || surveyData._id;
          const mailRes = await fetch(`/api/public/surveys/${sid}/consent-pdf/email/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: consentEmail.trim(),
              response_id: savedId,
              pdf_base64: uint8ToBase64(pdfBytes),
            }),
          });
          const mailBody = await mailRes.json().catch(() => ({}));
          if (!mailRes.ok) {
            throw new Error(mailBody.detail || 'No se pudo enviar el PDF');
          }
          setSubmitEmailStatus(mailBody.queued ? 'queued' : 'sent');
        } catch (mailErr) {
          console.error(mailErr);
          setSubmitEmailStatus('error');
        }
      } else {
        setSubmitEmailStatus('');
      }
    } catch (err) {
      alert('Error al enviar las respuestas: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <p className="text-gray-500">Cargando encuesta...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <p className="text-red-500 text-xl font-bold mb-4">Error</p>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-indigo-50 to-purple-50">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <FontAwesomeIcon icon={faCheck} size="2x" className="text-green-600" />
          </div>
          <h2 className="text-2xl font-black text-gray-800 mb-2">¡Gracias por tu respuesta!</h2>
          <p className="text-gray-600">Tu respuesta ha sido enviada exitosamente.</p>
          {submitEmailStatus === 'sending' && (
            <p className="text-sm text-indigo-700 mt-3">Preparando el PDF de autorización…</p>
          )}
          {submitEmailStatus === 'queued' && (
            <p className="text-sm text-indigo-700 mt-3">
              Tu autorización se enviará por correo a <span className="font-semibold">{consentEmail.trim()}</span> en breve.
              Revisa también Spam si no lo ves pronto.
            </p>
          )}
          {submitEmailStatus === 'sent' && (
            <p className="text-sm text-emerald-700 mt-3">
              También enviamos el PDF de tu autorización a <span className="font-semibold">{consentEmail.trim()}</span>.
            </p>
          )}
          {submitEmailStatus === 'error' && (
            <p className="text-sm text-amber-700 mt-3">
              Tu respuesta se guardó, pero no pudimos enviar el PDF al correo. Puedes solicitarlo a la organización.
            </p>
          )}
        </div>
      </div>
    );
  }

  if (!surveyData) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-gray-100">
        <p className="text-gray-500">No se pudo cargar la encuesta</p>
      </div>
    );
  }

  // Section Navigator Component
  const SectionNavigator = ({ sections, currentSection, visibleSections }) => {
    if (!sections || sections.length === 0) return null;
    
    const currentIndex = sections.findIndex(s => s.id === currentSection);
    const canGoNext = currentIndex < sections.length - 1;
    const canGoPrev = currentIndex > 0;
    
    const handleNext = () => {
      if (!canGoNext) return;
      const nextSection = sections[currentIndex + 1];
      if (!visibleSections.includes(nextSection.id)) return;
      tryGoToSection(nextSection.id);
    };
    
    const handlePrev = () => {
      if (!canGoPrev) return;
      const prevSection = sections[currentIndex - 1];
      tryGoToSection(prevSection.id);
    };
    
    return (
      <div className="mb-8 bg-white/90 backdrop-blur-xl rounded-2xl border border-white/80 p-6 shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-800">Progreso de la Encuesta</h3>
          <span className="text-sm text-gray-500">
            Sección {currentIndex + 1} de {sections.length}
          </span>
        </div>
        
        {/* Section Progress Indicators */}
        <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2">
          {sections.map((section, idx) => {
            const isVisible = visibleSections.includes(section.id);
            const isCurrent = section.id === currentSection;
            const isCompleted = idx < currentIndex;
            
            return (
              <button
                key={section.id}
                type="button"
                onClick={() => {
                  if (!isVisible) return;
                  tryGoToSection(section.id);
                }}
                disabled={!isVisible}
                className={`flex-shrink-0 px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                  isCurrent
                    ? 'bg-indigo-600 text-white shadow-lg'
                    : isCompleted
                    ? 'bg-green-100 text-green-700'
                    : isVisible
                    ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    : 'bg-gray-50 text-gray-400 cursor-not-allowed opacity-50'
                }`}
                title={section.title}
              >
                {idx + 1}. {section.title.length > 15 ? section.title.substring(0, 15) + '...' : section.title}
              </button>
            );
          })}
        </div>
        
        {/* Navigation Buttons */}
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={handlePrev}
            disabled={!canGoPrev}
            className={`px-6 py-2 rounded-xl font-bold transition-all ${
              canGoPrev
                ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            <FontAwesomeIcon icon={faChevronLeft} className="mr-2" />
            Anterior
          </button>
          
          <div className="text-center">
            <p className="text-lg font-bold text-gray-800">
              {sections[currentIndex]?.title || 'Sin título'}
            </p>
            {sections[currentIndex]?.description && (
              <p className="text-sm text-gray-600 mt-1">
                {sections[currentIndex].description}
              </p>
            )}
          </div>
          
          <button
            type="button"
            onClick={handleNext}
            disabled={!canGoNext}
            className={`px-6 py-2 rounded-xl font-bold transition-all ${
              canGoNext
                ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            Siguiente
            <FontAwesomeIcon icon={faChevronLeft} className="ml-2 rotate-180" />
          </button>
        </div>
      </div>
    );
  };

  const renderQuestion = (question, index) => {
    const questionId = question.id || question._id;
    if (!questionId) return null;

    if (isQuestionBlockedByConsent(index)) {
      return null;
    }
    
    // Check if question should be visible based on conditional logic
    if (question.conditional_logic && !evaluateCondition(question.conditional_logic, answers)) {
      return null;
    }

    if (question.type === 'Título') {
      return (
        <div key={questionId} className="bg-white/90 backdrop-blur-xl rounded-3xl border border-white/80 p-6 md:p-8 shadow-lg hover:shadow-xl transition-all duration-300 group">
          <div className="min-w-0">
            <h3 className="text-xl md:text-2xl font-black text-gray-800 mb-3 leading-tight">
              {question.text || question.question_text}
            </h3>
            {question.description && (
              <p className="text-sm md:text-base text-gray-700 leading-relaxed whitespace-pre-wrap">{question.description}</p>
            )}
            {question.question_image && (
              <QuestionImageDisplay src={question.question_image} className="mt-4" />
            )}
          </div>
        </div>
      );
    }

    return (
      <div key={questionId} className="bg-white/90 backdrop-blur-xl rounded-3xl border border-white/80 p-6 md:p-8 shadow-lg hover:shadow-xl transition-all duration-300 group">
        {/* Header de la pregunta */}
        <div className="mb-6 pb-4 border-b border-gray-200/60">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-black text-lg shadow-lg">
              {index + 1}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-xl md:text-2xl font-black text-gray-800 mb-2 leading-tight">
                {question.text || question.question_text}
                {question.required && <span className="text-red-500 ml-2 text-2xl">*</span>}
              </h3>
              {question.description && (
                <p className="text-sm md:text-base text-gray-600 leading-relaxed mt-2">{question.description}</p>
              )}
              {question.question_image && (
                <QuestionImageDisplay src={question.question_image} className="mt-4" />
              )}
            </div>
          </div>
        </div>

        {/* Campo de respuesta mejorado */}
        <div className="mt-6">
          {question.type === 'Texto Corto' && (
            <>
              <input
                type="text"
                value={answers[questionId] || ''}
                onChange={(e) => handleAnswerChange(questionId, e.target.value)}
                onBlur={(e) => { if (questionId === referenceKeyQuestionId) doReferenceLookup(e.target.value); }}
                className="w-full px-5 py-4 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 text-base bg-gray-50/50 hover:bg-white focus:bg-white"
                placeholder="Escribe tu respuesta aquí..."
              />
              {questionId === referenceKeyQuestionId && surveyData.reference_key_column && (
                <p className="text-xs text-indigo-600 mt-2">Si ingresas tu documento, el resto de datos se completarán automáticamente.</p>
              )}
              {questionId === referenceKeyQuestionId && referenceLookupNotFound && (
                <p className="text-xs text-amber-600 mt-2">No se encontraron datos para este documento.</p>
              )}
            </>
          )}

          {question.type === 'Párrafo' && (
            <textarea
              value={answers[questionId] || ''}
              onChange={(e) => handleAnswerChange(questionId, e.target.value)}
              className="w-full px-5 py-4 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 min-h-[140px] text-base bg-gray-50/50 hover:bg-white focus:bg-white resize-y"
              placeholder="Escribe tu respuesta aquí..."
            />
          )}

          {question.type === 'Número' && (
            <>
              <input
                type="number"
                value={answers[questionId] || ''}
                onChange={(e) => handleAnswerChange(questionId, e.target.value)}
                onBlur={(e) => { if (questionId === referenceKeyQuestionId) doReferenceLookup(e.target.value); }}
                className="w-full px-5 py-4 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 text-base bg-gray-50/50 hover:bg-white focus:bg-white"
                placeholder="Ingresa un número..."
              />
              {questionId === referenceKeyQuestionId && surveyData.reference_key_column && (
                <p className="text-xs text-indigo-600 mt-2">Si ingresas tu documento, el resto de datos se completarán automáticamente.</p>
              )}
              {questionId === referenceKeyQuestionId && referenceLookupNotFound && (
                <p className="text-xs text-amber-600 mt-2">No se encontraron datos para este documento.</p>
              )}
            </>
          )}

          {question.type === 'Fecha' && (
            <input
              type={question.date_include_time ? 'datetime-local' : 'date'}
              value={answers[questionId] || ''}
              onChange={(e) => handleAnswerChange(questionId, e.target.value)}
              className="w-full px-5 py-4 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 text-base bg-gray-50/50 hover:bg-white focus:bg-white"
            />
          )}

          {question.type === 'Opción Única' && question.options && (
            <div className="space-y-3">
              {question.options.map((option, idx) => (
                <label key={idx} className="flex items-center gap-4 p-4 border-2 border-gray-200 rounded-xl hover:border-indigo-300 hover:bg-indigo-50/50 cursor-pointer transition-all duration-200 group">
                  <input
                    type="radio"
                    name={`question_${questionId}`}
                    value={option}
                    checked={answers[questionId] === option}
                    onChange={(e) => handleAnswerChange(questionId, e.target.value)}
                    className="w-5 h-5 text-indigo-600 focus:ring-indigo-500 focus:ring-2"
                  />
                  <span className="text-gray-700 font-medium group-hover:text-indigo-700 transition-colors flex-1">{option}</span>
                  {answers[questionId] === option && (
                    <div className="w-6 h-6 bg-indigo-600 rounded-full flex items-center justify-center">
                      <FontAwesomeIcon icon={faCheck} size="xs" className="text-white" />
                    </div>
                  )}
                </label>
              ))}
            </div>
          )}

          {question.type === 'Casillas' && question.options && (
            <div className="space-y-3">
              {question.options.map((option, idx) => (
                <label key={idx} className="flex items-center gap-4 p-4 border-2 border-gray-200 rounded-xl hover:border-indigo-300 hover:bg-indigo-50/50 cursor-pointer transition-all duration-200 group">
                  <input
                    type="checkbox"
                    checked={(answers[questionId] || []).includes(option)}
                    onChange={(e) => {
                      const currentAnswers = answers[questionId] || [];
                      const newAnswers = e.target.checked
                        ? [...currentAnswers, option]
                        : currentAnswers.filter(a => a !== option);
                      handleAnswerChange(questionId, newAnswers);
                    }}
                    className="w-5 h-5 text-indigo-600 focus:ring-indigo-500 focus:ring-2 rounded"
                  />
                  <span className="text-gray-700 font-medium group-hover:text-indigo-700 transition-colors flex-1">{option}</span>
                  {(answers[questionId] || []).includes(option) && (
                    <div className="w-6 h-6 bg-indigo-600 rounded-lg flex items-center justify-center">
                      <FontAwesomeIcon icon={faCheck} size="xs" className="text-white" />
                    </div>
                  )}
                </label>
              ))}
            </div>
          )}

          {question.type === 'Desplegable' && question.options && (
            <select
              value={answers[questionId] || ''}
              onChange={(e) => handleAnswerChange(questionId, e.target.value)}
              className="w-full px-5 py-4 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 text-base bg-gray-50/50 hover:bg-white focus:bg-white appearance-none cursor-pointer"
            >
              <option value="">Selecciona una opción...</option>
              {question.options.map((option, idx) => (
                <option key={idx} value={option}>{option}</option>
              ))}
            </select>
          )}

          {question.type === 'Puntuación' && (
            <div className="flex gap-3 justify-center py-6 bg-gray-50/50 rounded-xl">
              {[1, 2, 3, 4, 5].map((rating) => (
                <button
                  key={rating}
                  type="button"
                  onClick={() => handleAnswerChange(questionId, rating)}
                  className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-200 shadow-lg hover:scale-110 active:scale-95 ${
                    answers[questionId] >= rating
                      ? 'bg-gradient-to-br from-yellow-400 to-orange-500 text-white shadow-yellow-500/50 scale-110'
                      : 'bg-white text-gray-400 hover:bg-gray-100 border-2 border-gray-200'
                  }`}
                >
                  <FontAwesomeIcon icon={faStar} size="lg" />
                </button>
              ))}
            </div>
          )}

          {question.type === 'Firma' && (
            <SignaturePad 
              value={answers[questionId] || ''}
              onChange={(signatureData) => handleAnswerChange(questionId, signatureData)}
            />
          )}

          {question.type === 'Adjuntar archivos' && (
            <div className="space-y-3">
              <label className="flex flex-col gap-2 cursor-pointer">
                <span className="inline-flex items-center gap-2 px-4 py-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-medium rounded-xl border-2 border-indigo-200 transition-colors">
                  <FontAwesomeIcon icon={faPaperclip} className="fa-icon-force-current" />
                  Adjuntar documentos o fotografías
                </span>
                <input
                  type="file"
                  accept={question.accept || 'image/*,application/pdf'}
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    const files = e.target.files ? Array.from(e.target.files) : [];
                    setFileLists(prev => ({ ...prev, [questionId]: files }));
                    e.target.value = '';
                  }}
                />
              </label>
              {(fileLists[questionId] || []).length > 0 && (
                <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                  {(fileLists[questionId] || []).map((f, i) => (
                    <li key={i} className="flex items-center justify-between gap-2">
                      <span className="truncate">{f.name}</span>
                      <button
                        type="button"
                        onClick={() => {
                          setFileLists(prev => ({
                            ...prev,
                            [questionId]: (prev[questionId] || []).filter((_, j) => j !== i)
                          }));
                        }}
                        className="text-red-500 hover:text-red-700 p-1"
                        title="Quitar"
                      >
                        <FontAwesomeIcon icon={faXmark} size="sm" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {question.type === 'Evaluación' && (question.evaluation_items?.length > 0 || question.evaluation_columns?.length > 0) && (
            <div className="overflow-x-auto border-2 border-gray-200 rounded-xl overflow-hidden">
              <table className="w-full min-w-[400px] text-sm">
                <thead>
                  <tr className="bg-gray-100 border-b border-gray-200">
                    <th className="text-left p-3 font-semibold text-gray-700">ITEM EVALUADO</th>
                    {(question.evaluation_columns || []).map((col) => (
                      <th key={col.id} className="p-3 font-semibold text-gray-700 text-center whitespace-nowrap">{col.label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(question.evaluation_items || []).map((item) => (
                    <tr key={item.id} className="border-b border-gray-100 hover:bg-gray-50/50">
                      <td className="p-3 font-medium text-gray-800 align-top">{item.label}</td>
                      {(question.evaluation_columns || []).map((col) => {
                        const cellValue = (answers[questionId] || {})[item.id]?.[col.id];
                        return (
                          <td key={col.id} className="p-2 text-center align-middle">
                            {col.inputType === 'text' ? (
                              <input
                                type="text"
                                value={typeof cellValue === 'string' ? cellValue : ''}
                                onChange={(e) => {
                                  const prev = answers[questionId] || {};
                                  const prevItem = prev[item.id] || {};
                                  handleAnswerChange(questionId, { ...prev, [item.id]: { ...prevItem, [col.id]: e.target.value } });
                                }}
                                placeholder="Observación"
                                className="w-full max-w-[200px] mx-auto px-2 py-1.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                              />
                            ) : (
                              <label className="inline-flex items-center justify-center cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={!!cellValue}
                                  onChange={(e) => {
                                    const prev = answers[questionId] || {};
                                    const prevItem = prev[item.id] || {};
                                    handleAnswerChange(questionId, { ...prev, [item.id]: { ...prevItem, [col.id]: e.target.checked } });
                                  }}
                                  className="w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500 focus:ring-2"
                                />
                              </label>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 relative overflow-hidden">
      {/* Background decorative elements */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-purple-200/30 rounded-full mix-blend-multiply filter blur-[120px] animate-blob" />
        <div className="absolute top-[20%] right-[-10%] w-[40%] h-[40%] bg-blue-200/30 rounded-full mix-blend-multiply filter blur-[120px] animate-blob animation-delay-2000" />
        <div className="absolute bottom-[-10%] left-[20%] w-[60%] h-[40%] bg-pink-200/20 rounded-full mix-blend-multiply filter blur-[120px] animate-blob animation-delay-4000" />
      </div>

      <div className="relative z-10 w-full max-w-4xl mx-auto px-4 py-8 md:py-12">
        {/* Título y descripción del formulario */}
        <div className="mb-12">
          <SurveyFormHeader
            title={surveyData.title}
            description={surveyData.description}
            headerImage={surveyData.header_image}
            centered
          />
          <div className="flex items-center justify-center gap-4 text-sm text-gray-500 -mt-6 mb-2">
            <span className="flex items-center gap-2">
              <FontAwesomeIcon icon={faListUl} size="sm" className="fa-icon-force-current" />
              {surveyData.questions?.length || 0} {surveyData.questions?.length === 1 ? 'Pregunta' : 'Preguntas'}
            </span>
          </div>
        </div>

        {/* Section Navigator */}
        {surveyData.sections && surveyData.sections.length > 0 && (
          <SectionNavigator
            sections={surveyData.sections}
            currentSection={currentSection}
            visibleSections={visibleSections}
          />
        )}

        {/* Formulario mejorado: Enter en input no envía; solo el botón Enviar envía */}
        <form
          onSubmit={handleSubmit}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA' && e.target.type !== 'submit') {
              e.preventDefault();
            }
          }}
          className="space-y-6"
        >
          {surveyData.questions && surveyData.questions.length > 0 ? (
            <div className="space-y-6">
              {(() => {
                // Group questions by section if sections exist
                if (surveyData.sections && surveyData.sections.length > 0) {
                  // Get questions for current section
                  const currentSectionQuestions = surveyData.questions.filter(q => {
                    // If question has section_id, filter by current section
                    if (q.section_id) {
                      return q.section_id === currentSection;
                    }
                    // If no section_id, show in first section or if no current section
                    return !currentSection || currentSection === surveyData.sections[0]?.id;
                  });
                  
                  // Render questions with section context
                  return currentSectionQuestions.map((q, index) => {
                    // Find global index for numbering
                    const globalIndex = surveyData.questions.findIndex(q2 => q2.id === q.id);
                    return renderQuestion(q, globalIndex >= 0 ? globalIndex : index);
                  });
                } else {
                  // No sections, render all questions
                  return surveyData.questions.map((q, index) => renderQuestion(q, index));
                }
              })()}
              {consentCfg && acceptanceQId && consentGate !== 'verified' && acceptanceQuestionIndex >= 0 && (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                  {consentGate === 'denied'
                    ? 'Has indicado que NO autorizas. Las preguntas siguientes permanecen bloqueadas. Puedes enviar la encuesta con la información capturada.'
                    : answers[acceptanceQId] === acceptanceValue
                      ? 'Completa la verificación OTP en el modal para liberar el resto de la encuesta.'
                      : 'Responde la pregunta de autorización para continuar. Si aceptas, se te pedirá un OTP por correo.'}
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-20 border-2 border-dashed border-gray-300/60 rounded-3xl bg-white/40 backdrop-blur-sm">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-400">
                <FontAwesomeIcon icon={faFileLines} size="2x" className="fa-icon-force-current" />
              </div>
              <p className="text-xl font-bold text-gray-500">No hay preguntas en esta encuesta</p>
            </div>
          )}

          {/* Progreso al final de cada sección (solo si hay secciones) */}
          {surveyData.sections && surveyData.sections.length > 0 && (
            <SectionNavigator
              sections={surveyData.sections}
              currentSection={currentSection}
              visibleSections={visibleSections}
            />
          )}

          {/* Botón Enviar solo en la última sección (o siempre si no hay secciones) */}
          {((!surveyData.sections || surveyData.sections.length === 0) ||
            currentSection === surveyData.sections[surveyData.sections.length - 1]?.id) && (
          <div className="mt-12 pt-8 border-t border-gray-200/60">
            <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-6 shadow-lg border border-white/60">
              <button
                type="submit"
                disabled={submitting}
                className="w-full px-8 py-4 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-700 hover:via-purple-700 hover:to-pink-700 disabled:from-gray-400 disabled:via-gray-400 disabled:to-gray-400 text-white rounded-xl font-black text-lg shadow-2xl hover:shadow-3xl transition-all duration-200 hover:scale-[1.02] active:scale-95 disabled:cursor-not-allowed flex items-center justify-center gap-3"
              >
                {submitting ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Enviando...</span>
                  </>
                ) : (
                  <>
                    <FontAwesomeIcon icon={faPaperPlane} size="sm" className="fa-icon-force-white" />
                    <span>Enviar Respuestas</span>
                  </>
                )}
              </button>
              <p className="text-xs text-gray-500 text-center mt-3">
                * Campos marcados con asterisco son obligatorios
              </p>
            </div>
          </div>
          )}
        </form>
      </div>
      <PersonalDataConsentModal
        open={Boolean(surveyData) && !signatureConsentAt}
        text={personalDataConsentText}
        surveyTitle={surveyData?.title || ''}
        onAccept={() => setSignatureConsentAt(new Date().toISOString())}
      />
      <ConsentOtpModal
        open={consentModalOpen}
        email={consentEmail}
        otpCode={consentOtp}
        sending={consentSending}
        verifying={consentVerifying}
        error={consentError}
        info={consentInfo}
        sentAtLabel={
          consentSentAt
            ? consentSentAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
            : ''
        }
        resendCooldownLeft={consentResendCooldown}
        onEmailChange={setConsentEmail}
        onOtpChange={setConsentOtp}
        onSend={sendConsentOtp}
        onVerify={verifyConsentOtp}
        onCancel={cancelConsentModal}
      />
    </div>
  );
};

const SurveyEditor = ({ onSave, onBack, initialSurveyData }) => { // Added initialSurveyData
  const [activeQuestionId, setActiveQuestionId] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const [surveyData, setSurveyData] = useState(() => normalizeSurveyForEditor(initialSurveyData));
  const [showSectionManager, setShowSectionManager] = useState(false);
  const [showReferenceSection, setShowReferenceSection] = useState(false);
  const [showGearMenu, setShowGearMenu] = useState(false);
  const [referenceColumns, setReferenceColumns] = useState(() => {
    if (!initialSurveyData) return [];
    const refKey = initialSurveyData.reference_key_column || '';
    const refMap = initialSurveyData.reference_mapping || {};
    return [...new Set([refKey, ...Object.values(refMap)].filter(Boolean))];
  });
  const [referenceUploading, setReferenceUploading] = useState(false);
  const gearMenuDesktopRef = useRef(null);
  const gearMenuMobileRef = useRef(null);

  useEffect(() => {
    if (!showGearMenu) return undefined;
    const close = (e) => {
      const insideDesktop = gearMenuDesktopRef.current?.contains(e.target);
      const insideMobile = gearMenuMobileRef.current?.contains(e.target);
      if (!insideDesktop && !insideMobile) {
        setShowGearMenu(false);
      }
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [showGearMenu]);

  // Auto-resize textarea when title changes
  React.useEffect(() => {
    const titleInput = document.querySelector('textarea[placeholder="Título de la Encuesta"]');
    if (titleInput) {
      titleInput.style.height = 'auto';
      titleInput.style.height = `${titleInput.scrollHeight}px`;
    }
  }, [surveyData.title]);

  // Update surveyData if initialSurveyData changes (e.g., when editing a new survey)
  useEffect(() => {
    if (initialSurveyData) {
      const normalized = normalizeSurveyForEditor(initialSurveyData);

      const refKey = normalized.reference_key_column || '';
      const refMap = normalized.reference_mapping || {};
      const derivedColumns = [...new Set([refKey, ...Object.values(refMap)].filter(Boolean))];
      if (derivedColumns.length > 0) setReferenceColumns(derivedColumns);
      setSurveyData(normalized);
    } else {
      setSurveyData(normalizeSurveyForEditor(null));
    }
  }, [initialSurveyData]);

  const questionTools = [
    { label: 'Texto Corto', icon: faFont, color: 'blue', type: 'Texto Corto' },
    { label: 'Párrafo', icon: faAlignLeft, color: 'gray', type: 'Párrafo' },
    { label: 'Título', icon: faHeading, color: 'gray', type: 'Título' },
    { label: 'Opción Única', icon: faListUl, color: 'purple', type: 'Opción Única' },
    { label: 'Casillas', icon: faSquareCheck, color: 'green', type: 'Casillas' },
    { label: 'Desplegable', icon: faListUl, color: 'orange', type: 'Desplegable' },
    { label: 'Número', icon: faHashtag, color: 'yellow', type: 'Número' },
    { label: 'Fecha', icon: faCalendarDays, color: 'pink', type: 'Fecha' },
    { label: 'Puntuación', icon: faStar, color: 'red', type: 'Puntuación' },
    { label: 'Firma', icon: faSignature, color: 'indigo', type: 'Firma' },
    { label: 'Adjuntar archivos', icon: faPaperclip, color: 'teal', type: 'Adjuntar archivos' },
    { label: 'Correo Electrónico', icon: faEnvelope, color: 'blue', type: 'Correo Electrónico' },
    { label: 'Evaluación', icon: faTable, color: 'teal', type: 'Evaluación' },
  ];

  const addQuestion = (type) => {
    const num = (surveyData.questions || []).length + 1;
    const defaultText = `Pregunta ${num}`;
    const base = { id: generateId(), type, text: defaultText, description: '', required: false, section_id: null, conditional_logic: null };
    const newQ = type === 'Evaluación'
      ? {
          ...base,
          options: [],
          evaluation_items: [
            { id: generateId(), label: 'Item1' },
            { id: generateId(), label: 'Item2' },
            { id: generateId(), label: 'Item3' },
          ],
          evaluation_columns: [
            { id: generateId(), label: 'CUMPLE', inputType: 'checkbox' },
            { id: generateId(), label: 'NO CUMPLE', inputType: 'checkbox' },
            { id: generateId(), label: 'OBSERVACIONES', inputType: 'text' },
          ],
        }
      : { ...base, options: ['Opción Única', 'Casillas', 'Desplegable'].includes(type) ? ['Opción 1'] : [] };
    setSurveyData(prev => ({ ...prev, questions: [...(prev.questions || []), newQ] }));
    setActiveQuestionId(newQ.id);
    window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
  };

  const addSection = () => {
    const newSection = {
      id: generateId(),
      title: `Sección ${(surveyData.sections || []).length + 1}`,
      description: '',
      order: (surveyData.sections || []).length
    };
    setSurveyData(prev => ({
      ...prev,
      sections: [...(prev.sections || []), newSection]
    }));
  };

  const updateSection = (id, newData) => {
    setSurveyData(prev => {
      const updatedSections = (prev.sections || []).map(s =>
        s.id === id ? { ...s, ...newData, id } : s
      );
      return { ...prev, sections: updatedSections };
    });
  };

  const deleteSection = (id) => {
    setSurveyData(prev => {
      // Remove section
      const updatedSections = (prev.sections || []).filter(s => s.id !== id);
      // Remove section_id from questions in this section
      const updatedQuestions = prev.questions.map(q => 
        q.section_id === id ? { ...q, section_id: null } : q
      );
      return { ...prev, sections: updatedSections, questions: updatedQuestions };
    });
  };

  const assignQuestionToSection = (questionId, sectionId) => {
    setSurveyData(prev => ({
      ...prev,
      questions: prev.questions.map(q => 
        q.id === questionId ? { ...q, section_id: sectionId || null } : q
      )
    }));
  };

  const updateQuestion = (id, newData) => {
    setSurveyData(prev => {
      const updatedQuestions = prev.questions.map(q => {
        if (q.id === id) {
          const merged = { ...q, ...newData, id };
          if (newData.text !== undefined) {
            delete merged.question_text;
          }
          if (newData.type !== undefined) {
            delete merged.question_type;
          }
          return merged;
        }
        return q;
      });
      return { ...prev, questions: updatedQuestions };
    });
  };

  const deleteQuestion = (id) => {
    setSurveyData(prev => ({ ...prev, questions: prev.questions.filter(q => q.id !== id) }));
  };

  const moveQuestionUp = (id) => {
    setSurveyData(prev => {
      const idx = prev.questions.findIndex(q => q.id === id);
      if (idx <= 0) return prev;
      const newQuestions = [...prev.questions];
      [newQuestions[idx - 1], newQuestions[idx]] = [newQuestions[idx], newQuestions[idx - 1]];
      return { ...prev, questions: newQuestions };
    });
  };

  const moveQuestionDown = (id) => {
    setSurveyData(prev => {
      const idx = prev.questions.findIndex(q => q.id === id);
      if (idx === -1 || idx >= prev.questions.length - 1) return prev;
      const newQuestions = [...prev.questions];
      [newQuestions[idx], newQuestions[idx + 1]] = [newQuestions[idx + 1], newQuestions[idx]];
      return { ...prev, questions: newQuestions };
    });
  };

  const handlePublish = () => onSave(surveyData);

  const openSectionsFromGear = () => {
    setShowSectionManager(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const openReferenceFromGear = () => {
    setShowReferenceSection(true);
    setTimeout(() => document.getElementById('archivo-referenciacion')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
  };

  const gearMenu = showGearMenu && (
    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-44 bg-white rounded-xl border border-gray-200 shadow-xl py-1 z-[60]">
      <button
        type="button"
        onClick={() => { openSectionsFromGear(); setShowGearMenu(false); }}
        className="w-full px-3 py-2 text-left text-xs font-semibold text-gray-700 hover:bg-purple-50 flex items-center gap-2"
      >
        <FontAwesomeIcon icon={faListUl} size="sm" className="text-purple-600 fa-icon-force-current" />
        Secciones
      </button>
      <button
        type="button"
        onClick={() => { openReferenceFromGear(); setShowGearMenu(false); }}
        className="w-full px-3 py-2 text-left text-xs font-semibold text-gray-700 hover:bg-green-50 flex items-center gap-2"
      >
        <FontAwesomeIcon icon={faFileExcel} size="sm" className="text-green-600 fa-icon-force-current" />
        Referenciación
      </button>
    </div>
  );

  return (
    <>
      {!showPreview && (
      <nav className={`fixed z-50 transition-all duration-300 border-gray-200/50 backdrop-blur-xl bg-white/70 md:w-[135px] md:h-screen md:left-0 md:top-0 md:border-r md:flex-col bottom-0 w-full h-auto border-t flex flex-row items-center md:justify-start px-2 sm:px-3 py-2 sm:py-2.5 md:py-4 gap-1.5 sm:gap-2 md:gap-2 shadow-2xl md:shadow-none overflow-x-auto md:overflow-y-auto md:overflow-x-hidden scrollbar-hide`}>
        <div className="hidden md:flex md:flex-col md:h-full md:w-full">
          
          {/* Contenedor scrollable para las herramientas */}
          <div className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-hide md:flex md:flex-col md:gap-2 md:px-2">
            {questionTools.map(tool => <ToolButton key={tool.label} icon={tool.icon} label={tool.label} color={tool.color} onClick={() => addQuestion(tool.type)} />)}
          </div>

          <div className="mt-auto p-2 flex-shrink-0 border-t border-gray-200/50 relative" ref={gearMenuDesktopRef}>
            {gearMenu}
            <button
              type="button"
              onClick={() => setShowGearMenu((v) => !v)}
              className={`w-full p-3 transition-colors rounded-xl flex items-center justify-center ${showGearMenu ? 'text-indigo-600 bg-indigo-50' : 'text-gray-400 hover:text-gray-800 hover:bg-gray-100'}`}
              title="Atajos: secciones y referenciación"
            >
              <FontAwesomeIcon icon={faGear} size="sm" className="fa-icon-force-current" />
            </button>
          </div>
        </div>
        
        {/* Vista móvil - sidebar horizontal */}
        <div className="flex md:hidden flex-row items-center gap-1.5 sm:gap-2 flex-shrink-0 min-w-0">
          {questionTools.map(tool => <ToolButton key={tool.label} icon={tool.icon} label={tool.label} color={tool.color} onClick={() => addQuestion(tool.type)} />)}
          <div className="relative shrink-0" ref={gearMenuMobileRef}>
            {gearMenu}
            <button
              type="button"
              onClick={() => setShowGearMenu((v) => !v)}
              className={`p-2 rounded-xl ${showGearMenu ? 'text-indigo-600 bg-indigo-50' : 'text-gray-400 hover:text-gray-700 hover:bg-gray-100'}`}
              title="Atajos"
            >
              <FontAwesomeIcon icon={faGear} size="sm" className="fa-icon-force-current" />
            </button>
          </div>
        </div>
        
      </nav>
      )}

      {showPreview ? (
        <SurveyPreview 
          surveyData={surveyData} 
          onBack={() => setShowPreview(false)} 
        />
      ) : (
      <main className="flex-1 relative z-10 md:pl-[135px] pb-24 md:pb-0 min-h-screen">
        <header className="sticky top-0 z-40 px-4 py-3 md:py-4 md:px-12 flex flex-col md:flex-row justify-between items-start md:items-center gap-3 bg-white/50 backdrop-blur-md border-b border-white/40">
           <div className="flex items-center gap-3 flex-1 min-w-0">
             <button className="p-2 -ml-2 text-gray-500 flex-shrink-0" onClick={onBack} title="Volver">
               <FontAwesomeIcon icon={faChevronLeft} size="sm" className="fa-icon-force-current" />
             </button>
             <div className="min-w-0 flex-1">
               <h1 className="text-lg md:text-xl lg:text-2xl font-black text-gray-800 tracking-tight leading-tight break-words">{surveyData.title}</h1>
               <span className="text-xs font-bold text-indigo-500 uppercase tracking-widest hidden md:inline-block mt-1">Modo Edición</span>
             </div>
           </div>
           <div className="flex gap-2 flex-shrink-0 w-full md:w-auto">
             <button 
               onClick={() => setShowSectionManager(!showSectionManager)} 
               className="flex-1 md:flex-none px-4 md:px-5 py-2 md:py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold text-xs md:text-sm shadow-xl flex items-center justify-center gap-2 transition-transform active:scale-95"
               title="Gestionar Secciones"
             >
               <FontAwesomeIcon icon={faListUl} size="sm" className="fa-icon-force-white" /> 
               <span className="hidden sm:inline">Secciones</span>
             </button>
             <button 
               onClick={() => {
                 setShowReferenceSection(prev => !prev);
                 if (!showReferenceSection) setTimeout(() => document.getElementById('archivo-referenciacion')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
               }} 
               className={`flex-1 md:flex-none px-4 md:px-5 py-2 md:py-2.5 rounded-xl font-bold text-xs md:text-sm shadow-xl flex items-center justify-center gap-2 transition-transform active:scale-95 ${showReferenceSection ? 'bg-green-600 hover:bg-green-700 text-white' : 'bg-green-500/90 hover:bg-green-600 text-white'}`}
               title="Archivo de referenciación (Excel)"
             >
               <FontAwesomeIcon icon={faFileExcel} size="sm" className="fa-icon-force-white" /> 
               <span className="hidden sm:inline">Referenciación</span>
             </button>
             <button onClick={() => setShowPreview(true)} className="flex-1 md:flex-none px-4 md:px-5 py-2 md:py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs md:text-sm shadow-xl flex items-center justify-center gap-2 transition-transform active:scale-95">
               <FontAwesomeIcon icon={faEye} size="sm" className="fa-icon-force-white" /> 
               <span className="hidden sm:inline">Vista Previa</span>
               <span className="sm:hidden">Vista</span>
             </button>
             <button onClick={handlePublish} className="flex-1 md:flex-none px-4 md:px-5 py-2 md:py-2.5 bg-gray-900 hover:bg-black text-white rounded-xl font-bold text-xs md:text-sm shadow-xl shadow-gray-900/10 flex items-center justify-center gap-2 transition-transform active:scale-95">
               Publicar
             </button>
           </div>
        </header>

        <div 
          className="w-full max-w-6xl mx-auto px-4 py-6 md:py-8 lg:py-12"
        >
           <SurveyFormHeader
             title={surveyData.title}
             description={surveyData.description}
             headerImage={surveyData.header_image}
             editable
             onTitleChange={(newTitle) => setSurveyData((prev) => ({ ...prev, title: newTitle }))}
             onDescriptionChange={(newDesc) => setSurveyData((prev) => ({ ...prev, description: newDesc }))}
             onHeaderImageChange={(header_image) => setSurveyData((prev) => ({ ...prev, header_image }))}
             onHeaderImageRemove={() => setSurveyData((prev) => ({ ...prev, header_image: '' }))}
           />

           {/* Archivo de referenciación - arriba, al abrir desde el botón del header */}
           <div id="archivo-referenciacion" className="mb-6 bg-white/90 backdrop-blur-xl rounded-2xl border border-white/80 p-6 shadow-lg">
             <button
               type="button"
               onClick={() => setShowReferenceSection(!showReferenceSection)}
               className="w-full flex items-center justify-between text-left"
             >
               <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                 <FontAwesomeIcon icon={faFileExcel} size="sm" className="text-green-600" />
                 Archivo de referenciación
               </h3>
               <FontAwesomeIcon icon={showReferenceSection ? faChevronUp : faChevronDown} size="sm" className="text-gray-500" />
             </button>
             {showReferenceSection && (
               <div className="mt-4 space-y-4">
                 {!surveyData.id ? (
                   <p className="text-sm text-amber-600 bg-amber-50 p-3 rounded-lg">Guarda la encuesta primero para poder subir el archivo Excel.</p>
                 ) : (
                   <>
                     <div>
                       <label className="block text-sm font-medium text-gray-700 mb-1">Subir Excel (.xlsx)</label>
                       <input
                         type="file"
                         accept=".xlsx,.xls"
                         className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:bg-indigo-50 file:text-indigo-700"
                         onChange={async (e) => {
                           const file = e.target?.files?.[0];
                           if (!file || !surveyData.id) return;
                           setReferenceUploading(true);
                           try {
                             const formData = new FormData();
                             formData.append('reference_file', file);
                             const response = await authenticatedFetch(`/api/surveys/${surveyData.id}/reference-file/`, {
                               method: 'POST',
                               body: formData
                             });
                             if (!response.ok) {
                               let errMsg = 'Error al subir el archivo';
                               try {
                                 const text = await response.text();
                                 const err = text ? (() => { try { return JSON.parse(text); } catch (_) { return {}; } })() : {};
                                 errMsg = err.detail || errMsg;
                               } catch (_) {}
                               throw new Error(errMsg);
                             }
                             let data = {};
                             try {
                               const text = await response.text();
                               data = text ? JSON.parse(text) : {};
                             } catch (_) {
                               throw new Error('Respuesta del servidor no válida');
                             }
                             setReferenceColumns(data.columns || []);
                             setSurveyData(prev => ({ ...prev, reference_row_count: data.row_count ?? 0 }));
                             e.target.value = '';
                           } catch (err) {
                             alert(err.message || 'Error al subir el archivo');
                           } finally {
                             setReferenceUploading(false);
                           }
                         }}
                         disabled={referenceUploading}
                       />
                       {(surveyData.reference_row_count > 0 || referenceColumns.length > 0) && (
                         <p className="text-sm text-gray-500 mt-1">
                           Archivo cargado: {surveyData.reference_row_count || 0} filas. Columnas: {referenceColumns.length ? referenceColumns.join(', ') : '(sube de nuevo para ver)'}
                         </p>
                       )}
                     </div>
                     {(referenceColumns.length > 0 || surveyData.reference_key_column || Object.keys(surveyData.reference_mapping || {}).length > 0) && (
                       <>
                         <div>
                           <label className="block text-sm font-medium text-gray-700 mb-1">Clave de búsqueda (columna del documento)</label>
                           <select
                             value={surveyData.reference_key_column || ''}
                             onChange={(e) => setSurveyData(prev => ({ ...prev, reference_key_column: e.target.value }))}
                             className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                           >
                             <option value="">— Ninguna —</option>
                             {(referenceColumns.length ? referenceColumns : [...new Set([surveyData.reference_key_column, ...Object.values(surveyData.reference_mapping || {})].filter(Boolean))]).map(col => (
                               <option key={col} value={col}>{col}</option>
                             ))}
                           </select>
                         </div>
                         <div>
                           <label className="block text-sm font-medium text-gray-700 mb-2">Mapear preguntas a columnas</label>
                           <div className="space-y-2">
                             {(surveyData.questions || []).filter(q => q.type && !['Título', 'titulo'].includes(q.type)).map(q => (
                               <div key={q.id} className="flex items-center gap-2 flex-wrap">
                                 <span className="text-sm text-gray-600 min-w-[120px] truncate" title={q.text}>{q.text || q.id}</span>
                                 <select
                                   value={(surveyData.reference_mapping || {})[q.id] ?? ''}
                                   onChange={(e) => {
                                     const val = e.target.value;
                                     setSurveyData(prev => {
                                       const next = { ...(prev.reference_mapping || {}) };
                                       if (val) next[q.id] = val; else delete next[q.id];
                                       return { ...prev, reference_mapping: next };
                                     });
                                   }}
                                   className="flex-1 min-w-[140px] px-3 py-1.5 border border-gray-200 rounded-lg text-sm"
                                 >
                                   <option value="">Ninguna</option>
                                   {(referenceColumns.length ? referenceColumns : [...new Set([surveyData.reference_key_column, ...Object.values(surveyData.reference_mapping || {})].filter(Boolean))]).map(col => (
                                     <option key={col} value={col}>{col}</option>
                                   ))}
                                 </select>
                               </div>
                             ))}
                           </div>
                         </div>
                       </>
                     )}
                   </>
                 )}
               </div>
             )}
           </div>

           {/* Nombre de adjuntos: documento_empleado-documento_votante */}
           {(surveyData.questions || []).some(q => q.type === 'Adjuntar archivos') && (
             <div className="mb-6 bg-white/90 backdrop-blur-xl rounded-2xl border border-white/80 p-6 shadow-lg">
               <h3 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
                 <FontAwesomeIcon icon={faPaperclip} size="sm" className="text-teal-600" />
                 Nombre de adjuntos
               </h3>
               <p className="text-sm text-gray-600 mb-4">Los archivos adjuntos se guardarán como documento_empleado-documento_votante.ext</p>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <div>
                   <label className="block text-sm font-medium text-gray-700 mb-1">Pregunta documento empleado (encuestador)</label>
                   <select
                     value={surveyData.documento_empleado_question_id || ''}
                     onChange={(e) => setSurveyData(prev => ({ ...prev, documento_empleado_question_id: e.target.value }))}
                     className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                   >
                     <option value="">— Ninguna —</option>
                     {(surveyData.questions || []).filter(q => q.type && ['Texto Corto', 'Texto corto', 'short_text', 'Número', 'Correo Electrónico'].includes(q.type)).map(q => (
                       <option key={q.id} value={q.id}>{q.text || q.question_text || q.id}</option>
                     ))}
                   </select>
                 </div>
                 <div>
                   <label className="block text-sm font-medium text-gray-700 mb-1">Pregunta documento votante (evaluado)</label>
                   <select
                     value={surveyData.documento_votante_question_id || ''}
                     onChange={(e) => setSurveyData(prev => ({ ...prev, documento_votante_question_id: e.target.value }))}
                     className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                   >
                     <option value="">— Ninguna —</option>
                     {(surveyData.questions || []).filter(q => q.type && ['Texto Corto', 'Texto corto', 'short_text', 'Número', 'Correo Electrónico'].includes(q.type)).map(q => (
                       <option key={q.id} value={q.id}>{q.text || q.question_text || q.id}</option>
                     ))}
                   </select>
                 </div>
               </div>
             </div>
           )}

           {/* Consentimiento informado */}
           <div className="mb-6 bg-white/90 backdrop-blur-xl rounded-2xl border border-white/80 p-6 shadow-lg">
             <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
               <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                 <FontAwesomeIcon icon={faFileLines} size="sm" className="text-emerald-600" />
                 Consentimiento informado
               </h3>
               <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                 <input
                   type="checkbox"
                   className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                   checked={Boolean(surveyData.informed_consent_enabled)}
                   onChange={(e) => {
                     const enabled = e.target.checked;
                     setSurveyData((prev) => ({
                       ...prev,
                       informed_consent_enabled: enabled,
                       informed_consent: prev.informed_consent?.body
                         ? prev.informed_consent
                         : buildDefaultInformedConsent(),
                     }));
                   }}
                 />
                 <span className="text-sm font-semibold text-gray-700">Incluir consentimiento informado</span>
               </label>
             </div>
             <div className="mb-4 grid grid-cols-1 md:grid-cols-2 gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
               <div>
                 <label className="block text-xs font-bold text-slate-600 mb-1">Responsable del tratamiento (Ley 1581)</label>
                 <input
                   type="text"
                   value={surveyData.consent_responsible || ''}
                   onChange={(e) => setSurveyData((prev) => ({ ...prev, consent_responsible: e.target.value }))}
                   placeholder="Ej. SOCIEDAD MEDICA CLINICA MAICAO S.A."
                   className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500"
                 />
               </div>
               <div>
                 <label className="block text-xs font-bold text-slate-600 mb-1">Finalidad del tratamiento de datos / firma</label>
                 <input
                   type="text"
                   value={surveyData.consent_purpose || ''}
                   onChange={(e) => setSurveyData((prev) => ({ ...prev, consent_purpose: e.target.value }))}
                   placeholder="Finalidad que verá el declarante al firmar"
                   className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500"
                 />
               </div>
               <p className="md:col-span-2 text-xs text-slate-500">
                 Este texto se muestra al firmar (datos personales) y en el PDF del consentimiento. Si lo dejas vacío se usa un texto estándar con los datos que captura la app.
               </p>
             </div>
             <p className="text-sm text-gray-600 mb-3">
               Primero se capturan las respuestas de la encuesta. Luego, en Resultados podrás ver el consentimiento ya rellenado.
               El PDF se marcará como <strong>Consentimiento capturado en línea</strong>.
             </p>
             {surveyData.informed_consent_enabled && (
               <div className="space-y-4 border-t border-gray-100 pt-4">
                 <div>
                   <label className="block text-sm font-medium text-gray-700 mb-1">Título del documento</label>
                   <input
                     type="text"
                     value={surveyData.informed_consent?.title || ''}
                     onChange={(e) => setSurveyData((prev) => ({
                       ...prev,
                       informed_consent: { ...(prev.informed_consent || buildDefaultInformedConsent()), title: e.target.value },
                     }))}
                     className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500"
                   />
                 </div>
                 <div>
                   <label className="block text-sm font-medium text-gray-700 mb-1">Plantilla (usa {'{{clave}}'} para campos)</label>
                   <textarea
                     rows={10}
                     value={surveyData.informed_consent?.body || ''}
                     onChange={(e) => {
                       const body = e.target.value;
                       const keys = extractConsentPlaceholders(body);
                       setSurveyData((prev) => {
                         const prevMaps = Array.isArray(prev.informed_consent?.mappings) ? prev.informed_consent.mappings : [];
                         const byKey = Object.fromEntries(prevMaps.filter((m) => m?.key).map((m) => [m.key, m.question_id || '']));
                         return {
                           ...prev,
                           informed_consent: {
                             ...(prev.informed_consent || buildDefaultInformedConsent()),
                             body,
                             letterhead: 'membrete2',
                             mappings: keys.map((key) => ({ key, question_id: byKey[key] || '' })),
                           },
                         };
                       });
                     }}
                     className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 font-mono text-sm"
                   />
                 </div>
                 <div>
                   <p className="text-sm font-medium text-gray-700 mb-2">Mapeo de campos a preguntas</p>
                   <div className="space-y-2">
                     {(surveyData.informed_consent?.mappings || []).length === 0 ? (
                       <p className="text-xs text-gray-500">No hay placeholders {'{{...}}'} en la plantilla.</p>
                     ) : (
                       (surveyData.informed_consent.mappings || []).map((m) => (
                         <div key={m.key} className="grid grid-cols-1 sm:grid-cols-2 gap-2 items-center">
                           <code className="text-xs bg-gray-100 px-2 py-1.5 rounded border border-gray-200">{`{{${m.key}}}`}</code>
                           <select
                             value={m.question_id || ''}
                             onChange={(e) => {
                               const qid = e.target.value;
                               setSurveyData((prev) => ({
                                 ...prev,
                                 informed_consent: {
                                   ...(prev.informed_consent || buildDefaultInformedConsent()),
                                   mappings: (prev.informed_consent?.mappings || []).map((row) =>
                                     row.key === m.key ? { ...row, question_id: qid } : row
                                   ),
                                 },
                               }));
                             }}
                             className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 text-sm"
                           >
                             <option value="">— Seleccionar pregunta —</option>
                             {(surveyData.questions || [])
                               .filter((q) => q.type !== 'Título')
                               .map((q) => (
                                 <option key={q.id} value={q.id}>{q.text || q.id}</option>
                               ))}
                           </select>
                         </div>
                       ))
                     )}
                   </div>
                 </div>
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                   <div className="md:col-span-3">
                     <label className="block text-sm font-medium text-gray-700 mb-1">Pregunta de aceptación / negación</label>
                     <select
                       value={surveyData.informed_consent?.acceptance_question_id || ''}
                       onChange={(e) => setSurveyData((prev) => ({
                         ...prev,
                         informed_consent: {
                           ...(prev.informed_consent || buildDefaultInformedConsent()),
                           acceptance_question_id: e.target.value,
                         },
                       }))}
                       className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 text-sm"
                     >
                       <option value="">— Seleccionar pregunta (p. ej. AUTORIZA) —</option>
                       {(surveyData.questions || [])
                         .filter((q) => ['Opción Única', 'Casillas', 'Desplegable', 'single_choice', 'checkbox', 'dropdown'].includes(q.type))
                         .map((q) => (
                           <option key={q.id} value={q.id}>{q.text || q.id}</option>
                         ))}
                     </select>
                   </div>
                   <div>
                     <label className="block text-sm font-medium text-gray-700 mb-1">Valor que acepta (dispara OTP)</label>
                     <input
                       type="text"
                       value={surveyData.informed_consent?.acceptance_value || 'SI, AUTORIZO'}
                       onChange={(e) => setSurveyData((prev) => ({
                         ...prev,
                         informed_consent: {
                           ...(prev.informed_consent || buildDefaultInformedConsent()),
                           acceptance_value: e.target.value,
                         },
                       }))}
                       className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 text-sm"
                       placeholder="SI, AUTORIZO"
                     />
                   </div>
                   <div>
                     <label className="block text-sm font-medium text-gray-700 mb-1">Valor que niega</label>
                     <input
                       type="text"
                       value={surveyData.informed_consent?.denial_value || 'NO AUTORIZO'}
                       onChange={(e) => setSurveyData((prev) => ({
                         ...prev,
                         informed_consent: {
                           ...(prev.informed_consent || buildDefaultInformedConsent()),
                           denial_value: e.target.value,
                         },
                       }))}
                       className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 text-sm"
                       placeholder="NO AUTORIZO"
                     />
                   </div>
                   <div className="md:col-span-3">
                     <p className="text-xs text-gray-500">
                       Al marcar el valor de aceptación se abre un modal para correo + OTP. Hasta verificar el OTP no se liberan las preguntas siguientes.
                     </p>
                   </div>
                 </div>
                 <div>
                   <label className="block text-sm font-medium text-gray-700 mb-1">Pregunta de firma (obligatoria para el PDF)</label>
                   <select
                     value={surveyData.informed_consent?.signature_question_id || ''}
                     onChange={(e) => {
                       const qid = e.target.value;
                       setSurveyData((prev) => {
                         const base = prev.informed_consent || buildDefaultInformedConsent();
                         const mappings = (base.mappings || []).map((row) =>
                           row.key === 'firma' ? { ...row, question_id: qid } : row
                         );
                         const hasFirma = mappings.some((m) => m.key === 'firma');
                         return {
                           ...prev,
                           informed_consent: {
                             ...base,
                             signature_question_id: qid,
                             mappings: hasFirma ? mappings : [...mappings, { key: 'firma', question_id: qid }],
                           },
                         };
                       });
                     }}
                     className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 text-sm"
                   >
                     <option value="">— Seleccionar pregunta de firma —</option>
                     {(surveyData.questions || [])
                       .filter((q) => q.type === 'Firma' || q.type === 'signature')
                       .map((q) => (
                         <option key={q.id} value={q.id}>{q.text || 'Firma'}</option>
                       ))}
                   </select>
                   {!(surveyData.questions || []).some((q) => q.type === 'Firma' || q.type === 'signature') && (
                     <p className="text-xs text-amber-700 mt-1">Añade una pregunta tipo Firma a la encuesta para incluirla en el consentimiento.</p>
                   )}
                 </div>
                 <div>
                   <p className="text-sm font-medium text-gray-700 mb-2">Membrete PDF</p>
                   <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                     <label className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm text-white bg-emerald-600 hover:bg-emerald-700 cursor-pointer shadow-sm">
                       <FontAwesomeIcon icon={faPaperclip} size="sm" />
                       Subir membrete PDF
                       <input
                         type="file"
                         accept="application/pdf,.pdf"
                         className="hidden"
                         onChange={async (e) => {
                           const file = e.target.files?.[0];
                           e.target.value = '';
                           if (!file) return;
                           try {
                             const { dataUrl, filename } = await readLetterheadPdfFile(file);
                             setSurveyData((prev) => ({
                               ...prev,
                               informed_consent: {
                                 ...(prev.informed_consent || buildDefaultInformedConsent()),
                                 letterhead: 'custom',
                                 letterhead_pdf: dataUrl,
                                 letterhead_filename: filename,
                               },
                             }));
                           } catch (err) {
                             alert(err.message || 'No se pudo cargar el PDF');
                           }
                         }}
                       />
                     </label>
                     {surveyData.informed_consent?.letterhead_pdf ? (
                       <div className="flex items-center gap-2 min-w-0">
                         <span className="text-sm text-emerald-800 font-medium truncate" title={surveyData.informed_consent.letterhead_filename}>
                           {surveyData.informed_consent.letterhead_filename || 'membrete.pdf'}
                         </span>
                         <button
                           type="button"
                           className="text-xs font-bold text-red-600 hover:underline shrink-0"
                           onClick={() => setSurveyData((prev) => ({
                             ...prev,
                             informed_consent: {
                               ...(prev.informed_consent || buildDefaultInformedConsent()),
                               letterhead: 'membrete2',
                               letterhead_pdf: '',
                               letterhead_filename: '',
                             },
                           }))}
                         >
                           Quitar
                         </button>
                       </div>
                     ) : (
                       <span className="text-xs text-gray-500">Si no subes uno, se usará el membrete por defecto.</span>
                     )}
                   </div>
                 </div>
                 <p className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-2">
                   Sube aquí tu PDF oficial de membrete (máx. 4&nbsp;MB). Se usará al generar el consentimiento capturado en línea.
                 </p>
               </div>
             )}
           </div>

           {/* Section Manager */}
           {showSectionManager && (
             <div className="mb-6 bg-white/90 backdrop-blur-xl rounded-2xl border border-white/80 p-6 shadow-lg">
               <div className="flex items-center justify-between mb-4">
                 <h3 className="text-lg font-bold text-gray-800">Gestionar Secciones</h3>
                 <button
                   onClick={() => setShowSectionManager(false)}
                   className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
                 >
                   <FontAwesomeIcon icon={faXmark} size="sm" />
                 </button>
               </div>
               <div className="space-y-3 mb-4">
                 {(surveyData.sections || []).map((section, index) => (
                   <div key={section.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                     <input
                       type="text"
                       value={section.title}
                       onChange={(e) => updateSection(section.id, { ...section, title: e.target.value })}
                       className="flex-1 px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                       placeholder="Título de la sección"
                     />
                     <button
                       onClick={() => deleteSection(section.id)}
                       className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                       title="Eliminar sección"
                     >
                       <FontAwesomeIcon icon={faTrash} size="sm" />
                     </button>
                   </div>
                 ))}
               </div>
               <button
                 onClick={addSection}
                 className="w-full px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-bold flex items-center justify-center gap-2"
               >
                 <FontAwesomeIcon icon={faPlus} size="sm" />
                 Agregar Sección
               </button>
             </div>
           )}

           <div className="space-y-2 sm:space-y-3">
             {surveyData.questions.length === 0 ? (
               <div className="text-center py-12 sm:py-16 md:py-20 px-4 border-2 border-dashed border-gray-300 rounded-2xl sm:rounded-3xl bg-white/30">
                 <p className="text-lg sm:text-xl font-bold text-gray-400">Tu lienzo está vacío</p>
                 <p className="text-sm sm:text-base text-gray-400 mt-2">Usa la barra de herramientas para comenzar</p>
               </div>
             ) : (
               surveyData.questions.map((q, index) => (
                 <QuestionBlock 
                   key={q.id} 
                   data={q} 
                   isActive={activeQuestionId === q.id} 
                   onClick={() => setActiveQuestionId(q.id)} 
                   onDelete={() => deleteQuestion(q.id)} 
                   onUpdate={(newData) => updateQuestion(q.id, newData)}
                   sections={surveyData.sections || []}
                   onAssignSection={(sectionId) => assignQuestionToSection(q.id, sectionId)}
                   allQuestions={surveyData.questions}
                   onMoveUp={() => moveQuestionUp(q.id)}
                   onMoveDown={() => moveQuestionDown(q.id)}
                   canMoveUp={index > 0}
                   canMoveDown={index < surveyData.questions.length - 1}
                 />
               ))
             )}
           </div>
           <div 
             onClick={() => setActiveQuestionId(null)} 
             className="mt-6 sm:mt-8 h-24 sm:h-28 md:h-32 rounded-xl sm:rounded-2xl border-2 border-dashed border-gray-200 hover:border-indigo-300 hover:bg-indigo-50/30 transition-all flex items-center justify-center cursor-pointer group px-4"
           >
             <div className="text-center">
               <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gray-100 group-hover:bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-2 text-gray-400 group-hover:text-indigo-500 transition-colors">
                 <FontAwesomeIcon icon={faPlus} size="sm" className="fa-icon-force-current" />
               </div>
               <span className="text-xs sm:text-sm font-bold text-gray-400 group-hover:text-indigo-500">Toca para deseleccionar</span>
             </div>
           </div>
        </div>
      </main>
      )}
    </>
  );
};


// --- Helpers y tarjeta: estadísticas por pregunta ---

const STAT_CATEGORICAL_TYPES = ['single_choice', 'Opción Única', 'dropdown', 'Desplegable', 'checkbox', 'Casillas'];
const STAT_NUMERIC_TYPES = ['rating', 'Puntuación', 'number', 'Número'];
const STAT_FREQUENCY_TYPES = ['short_text', 'Texto Corto', 'Texto corto', 'text', 'Párrafo', 'paragraph', 'Correo Electrónico', 'email', 'Fecha', 'date'];
const STAT_SIGNATURE_TYPES = ['Firma', 'signature'];
const STAT_FILE_TYPES = ['file_upload', 'Adjuntar archivos'];

const isStatAnswerSignature = (answer) => {
  if (typeof answer !== 'string') return false;
  return answer.startsWith('data:image/png;base64,') ||
    answer.startsWith('data:image/jpeg;base64,') ||
    (answer.length > 100 && /^[A-Za-z0-9+/=]+$/.test(answer.split(',')[1] || answer));
};

const isIdentifierQuestion = (questionText, answers) => {
  const text = (questionText || '').toLowerCase();
  const idKeywords = ['documento', 'cedula', 'cédula', 'identificacion', 'identificación', 'identidad', 'nit'];
  if (idKeywords.some((k) => text.includes(k))) return true;
  if (answers.length === 0) return false;
  const normalized = answers.map((a) => String(a).trim()).filter(Boolean);
  const unique = new Set(normalized).size;
  return unique / answers.length > 0.8;
};

const getStatKind = (questionType, questionText, answers) => {
  if (STAT_CATEGORICAL_TYPES.includes(questionType)) return 'categorical';
  if (STAT_SIGNATURE_TYPES.includes(questionType)) return 'signature';
  if (STAT_FILE_TYPES.includes(questionType)) return 'files';
  if (STAT_FREQUENCY_TYPES.includes(questionType)) return 'frequency';
  if (STAT_NUMERIC_TYPES.includes(questionType)) {
    if (questionType === 'rating' || questionType === 'Puntuación') return 'numeric';
    if (isIdentifierQuestion(questionText, answers)) return 'frequency';
    return 'numeric';
  }
  return 'frequency';
};

const getQuestionTypeLabel = (questionType) => {
  const labels = {
    single_choice: 'Opción Única',
    'Opción Única': 'Opción Única',
    dropdown: 'Desplegable',
    Desplegable: 'Desplegable',
    checkbox: 'Casillas',
    Casillas: 'Casillas',
    short_text: 'Texto Corto',
    'Texto Corto': 'Texto Corto',
    text: 'Texto',
    Párrafo: 'Párrafo',
    paragraph: 'Párrafo',
    number: 'Número',
    Número: 'Número',
    rating: 'Puntuación',
    Puntuación: 'Puntuación',
    date: 'Fecha',
    Fecha: 'Fecha',
    email: 'Correo',
    'Correo Electrónico': 'Correo',
    signature: 'Firma',
    Firma: 'Firma',
    file_upload: 'Adjuntos',
    'Adjuntar archivos': 'Adjuntos',
  };
  return labels[questionType] || questionType || 'Pregunta';
};

const formatStatNumber = (value) => {
  if (value === undefined || value === null || Number.isNaN(value)) return '-';
  if (Number.isInteger(value)) return String(value);
  return Number(value).toFixed(2);
};

const answerToFrequencyKey = (answer) => {
  if (answer === undefined || answer === null || answer === '') return '(vacío)';
  if (isStatAnswerSignature(answer)) return 'Con firma';
  if (Array.isArray(answer)) return answer.length > 0 ? `${answer.length} archivo(s)` : 'Sin adjunto';
  if (typeof answer === 'object') return JSON.stringify(answer);
  const str = String(answer).trim();
  return str || '(vacío)';
};

const calculateResponseStats = (survey, responsesList) => {
  if (!responsesList.length || !survey.questions) return {};

  const stats = {};
  survey.questions.forEach((q) => {
    const questionId = q.id || q._id;
    const questionType = q.type || q.question_type;
    const questionText = q.text || q.question_text;

    if (!questionId) return;
    if (questionType === 'titulo' || questionType === 'Título') return;
    if (questionType === 'evaluation_table' || questionType === 'Evaluación') return;

    const answers = responsesList
      .map((r) => r.answers && r.answers[questionId])
      .filter((a) => a !== undefined && a !== null && a !== '');

    if (answers.length === 0) return;

    const statKind = getStatKind(questionType, questionText, answers);
    stats[questionId] = {
      questionText,
      questionType,
      statKind,
      totalAnswers: answers.length,
      data: {},
    };

    if (statKind === 'categorical') {
      if (['checkbox', 'Casillas'].includes(questionType)) {
        answers.forEach((answer) => {
          const options = Array.isArray(answer) ? answer : [answer];
          options.forEach((opt) => {
            const key = String(opt);
            stats[questionId].data[key] = (stats[questionId].data[key] || 0) + 1;
          });
        });
      } else {
        answers.forEach((answer) => {
          const key = String(answer);
          stats[questionId].data[key] = (stats[questionId].data[key] || 0) + 1;
        });
      }
    } else if (statKind === 'frequency') {
      answers.forEach((answer) => {
        const key = answerToFrequencyKey(answer);
        stats[questionId].data[key] = (stats[questionId].data[key] || 0) + 1;
      });
      stats[questionId].uniqueCount = new Set(answers.map((a) => answerToFrequencyKey(a))).size;
    } else if (statKind === 'numeric') {
      const numbers = answers.map((a) => Number(a)).filter((n) => !Number.isNaN(n));
      if (numbers.length > 0) {
        stats[questionId].average = numbers.reduce((a, b) => a + b, 0) / numbers.length;
        stats[questionId].min = Math.min(...numbers);
        stats[questionId].max = Math.max(...numbers);
      }
    } else if (statKind === 'signature') {
      const signedCount = answers.filter(isStatAnswerSignature).length;
      stats[questionId].signedCount = signedCount;
      stats[questionId].unsignedCount = answers.length - signedCount;
      stats[questionId].data = { 'Con firma': signedCount, 'Sin firma': answers.length - signedCount };
      stats[questionId].statKind = 'frequency';
      stats[questionId].uniqueCount = signedCount > 0 && answers.length - signedCount > 0 ? 2 : 1;
    } else if (statKind === 'files') {
      const withFilesCount = answers.filter((a) => Array.isArray(a) && a.length > 0).length;
      stats[questionId].withFilesCount = withFilesCount;
      stats[questionId].totalFiles = answers.reduce((sum, a) => sum + (Array.isArray(a) ? a.length : 0), 0);
      stats[questionId].data = {
        'Con adjuntos': withFilesCount,
        'Sin adjuntos': answers.length - withFilesCount,
      };
      stats[questionId].statKind = 'frequency';
    }
  });

  return stats;
};

const DistributionTable = ({ stat, showAll, onToggleShowAll, maxRows = 8 }) => {
  const entries = Object.entries(stat.data || {}).sort((a, b) => b[1] - a[1]);
  const visible = showAll ? entries : entries.slice(0, maxRows);
  const hiddenCount = entries.length - maxRows;

  if (entries.length === 0) {
    return <p className="text-xs text-gray-400 italic">Sin datos para mostrar</p>;
  }

  return (
    <div className="space-y-1.5">
      {visible.map(([option, count]) => {
        const percentage = stat.totalAnswers > 0 ? (count / stat.totalAnswers) * 100 : 0;
        return (
          <div key={option} className="flex items-center gap-2 text-xs">
            <span className="w-24 sm:w-32 truncate shrink-0 text-gray-700" title={option}>{option}</span>
            <div className="flex-1 h-2 bg-indigo-50 rounded-full overflow-hidden min-w-[40px] border border-indigo-100/50">
              <div
                className="h-2 rounded-full transition-all duration-500 bg-gradient-to-r from-indigo-500 via-purple-500 to-violet-500 shadow-sm"
                style={{ width: `${Math.max(percentage, count > 0 ? 2 : 0)}%` }}
              />
            </div>
            <span className="w-8 text-right font-bold text-gray-800 shrink-0">{count}</span>
            <span className="w-10 text-right text-gray-400 shrink-0">{percentage.toFixed(1)}%</span>
          </div>
        );
      })}
      {hiddenCount > 0 && (
        <button
          type="button"
          onClick={onToggleShowAll}
          className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 mt-1"
        >
          {showAll ? 'Ver menos' : `Ver todas (${entries.length})`}
        </button>
      )}
    </div>
  );
};

const sanitizeFilename = (text) =>
  (text || 'grafico')
    .replace(/[^a-z0-9áéíóúñü\s-]/gi, '')
    .trim()
    .replace(/\s+/g, '_')
    .slice(0, 60) || 'grafico';

const wrapCanvasText = (ctx, text, maxWidth, maxLines = 3) => {
  const words = String(text || '').split(/\s+/);
  const lines = [];
  let line = '';
  words.forEach((word) => {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  });
  if (line) lines.push(line);
  return lines.slice(0, maxLines);
};

const downloadChartWithData = (chartInstance, stat, questionId) => {
  if (!chartInstance || typeof chartInstance.toBase64Image !== 'function') return;

  const chartImage = chartInstance.toBase64Image('image/png', 1);
  const img = new Image();
  img.onload = () => {
    const padding = 28;
    const contentWidth = Math.max(img.width, 520);
    const tableRows = Object.entries(stat.data || {}).sort((a, b) => b[1] - a[1]);
    const rowHeight = 22;
    const tableHeight = Math.max(tableRows.length, 1) * rowHeight + 72;
    const titleLines = [];
    const metaLine = `${stat.totalAnswers} respuesta${stat.totalAnswers === 1 ? '' : 's'}`;

    const canvas = document.createElement('canvas');
    const titleCanvas = document.createElement('canvas');
    const titleCtx = titleCanvas.getContext('2d');
    titleCtx.font = 'bold 16px system-ui, sans-serif';
    const wrappedTitle = wrapCanvasText(titleCtx, stat.questionText, contentWidth - padding * 2, 3);
    titleLines.push(...wrappedTitle);

    canvas.width = contentWidth + padding * 2;
    canvas.height = padding + titleLines.length * 20 + 24 + img.height + tableHeight + padding;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = '#111827';
    ctx.font = 'bold 16px system-ui, sans-serif';
    let y = padding + 16;
    titleLines.forEach((tLine) => {
      ctx.fillText(tLine, padding, y);
      y += 20;
    });

    ctx.fillStyle = '#6b7280';
    ctx.font = '12px system-ui, sans-serif';
    ctx.fillText(metaLine, padding, y + 4);
    y += 28;

    const chartX = padding + Math.max(0, (contentWidth - img.width) / 2);
    ctx.drawImage(img, chartX, y, img.width, img.height);
    y += img.height + 24;

    ctx.fillStyle = '#374151';
    ctx.font = 'bold 12px system-ui, sans-serif';
    ctx.fillText('Datos', padding, y);
    y += 18;

    ctx.strokeStyle = '#e5e7eb';
    ctx.beginPath();
    ctx.moveTo(padding, y);
    ctx.lineTo(canvas.width - padding, y);
    ctx.stroke();
    y += 16;

    ctx.font = 'bold 11px system-ui, sans-serif';
    ctx.fillStyle = '#4b5563';
    ctx.fillText('Opción', padding, y);
    ctx.fillText('Cantidad', canvas.width - padding - 100, y);
    ctx.fillText('%', canvas.width - padding - 36, y);
    y += 14;

    ctx.font = '11px system-ui, sans-serif';
    ctx.fillStyle = '#111827';
    tableRows.forEach(([label, count]) => {
      const pct = stat.totalAnswers > 0 ? ((count / stat.totalAnswers) * 100).toFixed(1) : '0.0';
      const truncated = label.length > 55 ? `${label.slice(0, 52)}...` : label;
      ctx.fillText(truncated, padding, y);
      ctx.fillText(String(count), canvas.width - padding - 100, y);
      ctx.fillText(`${pct}%`, canvas.width - padding - 36, y);
      y += rowHeight;
    });

    const link = document.createElement('a');
    link.download = `${sanitizeFilename(stat.questionText)}_${String(questionId).slice(-8)}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };
  img.src = chartImage;
};

const QuestionStatCard = ({
  questionId,
  stat,
  chartType,
  onChartTypeChange,
  textExpanded,
  onToggleText,
  showAllRows,
  onToggleAllRows,
  getChartData,
  getChartOptions,
  getDefaultChartType,
  variant = 'featured',
}) => {
  const chartRef = useRef(null);
  const isFeatured = variant === 'featured';
  const optionCount = Object.keys(stat.data || {}).length;
  const resolvedChartType = chartType || getDefaultChartType(questionId, optionCount);
  const chartHeight = isFeatured
    ? Math.min(380, Math.max(260, 100 + optionCount * 44))
    : Math.min(280, Math.max(160, 60 + optionCount * 32));
  const showChart = stat.statKind === 'categorical' && optionCount >= 1;
  const longText = (stat.questionText || '').length > (isFeatured ? 120 : 80);
  const chartData = getChartData(stat, resolvedChartType);
  const chartOptions = getChartOptions(stat, resolvedChartType);
  const tableMaxRows = isFeatured ? 8 : 5;

  const handleDownloadChart = () => {
    downloadChartWithData(chartRef.current, stat, questionId);
  };

  const chartBlock = showChart && (
    <div
      className={`relative ${isFeatured ? 'mb-4' : 'mt-3'} rounded-2xl overflow-hidden border border-indigo-200/60 shadow-[inset_0_1px_0_rgba(255,255,255,0.8),0_8px_24px_-8px_rgba(79,70,229,0.25)]`}
      style={{
        height: `${chartHeight}px`,
        background: 'linear-gradient(145deg, #ffffff 0%, #f5f3ff 45%, #eef2ff 100%)',
      }}
    >
      <div
        className="absolute inset-0 opacity-[0.35] pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(circle at 20% 20%, rgba(99,102,241,0.12) 0%, transparent 50%), radial-gradient(circle at 80% 80%, rgba(168,85,247,0.1) 0%, transparent 45%)',
        }}
      />
      <div
        className="absolute inset-0 opacity-[0.04] pointer-events-none"
        style={{
          backgroundImage: 'linear-gradient(rgba(99,102,241,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(99,102,241,0.5) 1px, transparent 1px)',
          backgroundSize: '20px 20px',
        }}
      />
      <div className="relative h-full p-3 sm:p-4">
        {resolvedChartType === 'bar' && <Bar ref={chartRef} data={chartData} options={chartOptions} />}
        {resolvedChartType === 'doughnut' && <Doughnut ref={chartRef} data={chartData} options={chartOptions} />}
        {resolvedChartType === 'line' && <Line ref={chartRef} data={chartData} options={chartOptions} />}
      </div>
    </div>
  );

  return (
    <div
      className={
        isFeatured
          ? 'bg-white rounded-2xl border-2 border-indigo-100/80 p-5 shadow-lg shadow-indigo-100/40 hover:shadow-xl hover:shadow-indigo-200/50 transition-all duration-300'
          : 'bg-gray-50/80 rounded-lg border border-gray-200 p-3 shadow-sm'
      }
    >
      <div className={`flex items-start justify-between gap-2 ${isFeatured ? 'mb-3' : 'mb-1.5'}`}>
        <div className="min-w-0 flex-1">
          <h3
            className={`font-bold text-gray-900 ${textExpanded ? '' : isFeatured ? 'line-clamp-2' : 'line-clamp-1'} ${isFeatured ? 'text-base' : 'text-xs'}`}
            title={stat.questionText}
          >
            {stat.questionText}
          </h3>
          {longText && (
            <button
              type="button"
              onClick={onToggleText}
              className="text-xs text-indigo-600 hover:text-indigo-800 mt-0.5"
            >
              {textExpanded ? 'Ver menos' : 'Ver texto completo'}
            </button>
          )}
          <p className={`text-gray-500 mt-0.5 ${isFeatured ? 'text-sm' : 'text-[11px]'}`}>
            {stat.totalAnswers} {stat.totalAnswers === 1 ? 'respuesta' : 'respuestas'}
            {stat.statKind === 'frequency' && stat.uniqueCount != null && (
              <span> · {stat.uniqueCount} únicas</span>
            )}
            {stat.statKind === 'files' && stat.totalFiles != null && (
              <span> · {stat.totalFiles} archivos</span>
            )}
          </p>
        </div>
        <div className="flex flex-col items-end gap-2 shrink-0">
          <span
            className={`inline-flex px-2 py-0.5 rounded-full font-bold uppercase tracking-wide border ${
              isFeatured
                ? 'text-[10px] bg-indigo-100 text-indigo-700 border-indigo-200'
                : 'text-[9px] bg-gray-100 text-gray-600 border-gray-200'
            }`}
          >
            {getQuestionTypeLabel(stat.questionType)}
          </span>
          {showChart && isFeatured && (
            <div className="flex items-center gap-1 bg-gradient-to-br from-white to-indigo-50 rounded-xl p-1.5 border border-indigo-200/80 shadow-md shadow-indigo-100/50">
              <button
                type="button"
                onClick={() => onChartTypeChange(questionId, 'bar')}
                className={`p-2 rounded-lg transition-all duration-200 ${resolvedChartType === 'bar' ? 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-300/50 scale-105' : 'text-gray-500 hover:bg-white hover:text-indigo-600'}`}
                title="Gráfico de Barras"
              >
                <FontAwesomeIcon icon={faChartBar} size="sm" className="fa-icon-force-current" />
              </button>
              <button
                type="button"
                onClick={() => onChartTypeChange(questionId, 'doughnut')}
                className={`p-2 rounded-lg transition-all duration-200 ${resolvedChartType === 'doughnut' ? 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-300/50 scale-105' : 'text-gray-500 hover:bg-white hover:text-indigo-600'}`}
                title="Gráfico de Torta"
              >
                <FontAwesomeIcon icon={faChartPie} size="sm" className="fa-icon-force-current" />
              </button>
              <button
                type="button"
                onClick={() => onChartTypeChange(questionId, 'line')}
                className={`p-2 rounded-lg transition-all duration-200 ${resolvedChartType === 'line' ? 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-300/50 scale-105' : 'text-gray-500 hover:bg-white hover:text-indigo-600'}`}
                title="Gráfico de Líneas"
              >
                <FontAwesomeIcon icon={faChartLine} size="sm" className="fa-icon-force-current" />
              </button>
              <span className="w-px h-6 bg-indigo-200/80 mx-0.5" />
              <button
                type="button"
                onClick={handleDownloadChart}
                className="p-2 rounded-lg transition-all duration-200 text-emerald-600 hover:bg-emerald-50 hover:shadow-md"
                title="Descargar gráfico con datos (PNG)"
              >
                <FontAwesomeIcon icon={faDownload} size="sm" className="fa-icon-force-current" />
              </button>
            </div>
          )}
        </div>
      </div>

      {isFeatured && chartBlock}

      {(stat.statKind === 'categorical' || stat.statKind === 'frequency') && (
        <DistributionTable
          stat={stat}
          showAll={showAllRows}
          onToggleShowAll={onToggleAllRows}
          maxRows={tableMaxRows}
        />
      )}

      {stat.statKind === 'numeric' && (
        <div className={`grid grid-cols-3 gap-2 ${isFeatured ? 'mt-2' : 'mt-1'}`}>
          {stat.average !== undefined && (
            <div className={`text-center rounded-lg border border-indigo-100 bg-indigo-50 ${isFeatured ? 'p-3' : 'p-2'}`}>
              <div className={`font-bold text-indigo-600 ${isFeatured ? 'text-lg' : 'text-sm'}`}>{formatStatNumber(stat.average)}</div>
              <div className="text-[10px] font-semibold text-gray-600 uppercase">Promedio</div>
            </div>
          )}
          {stat.min !== undefined && (
            <div className={`text-center rounded-lg border border-green-100 bg-green-50 ${isFeatured ? 'p-3' : 'p-2'}`}>
              <div className={`font-bold text-green-600 ${isFeatured ? 'text-lg' : 'text-sm'}`}>{formatStatNumber(stat.min)}</div>
              <div className="text-[10px] font-semibold text-gray-600 uppercase">Mínimo</div>
            </div>
          )}
          {stat.max !== undefined && (
            <div className={`text-center rounded-lg border border-blue-100 bg-blue-50 ${isFeatured ? 'p-3' : 'p-2'}`}>
              <div className={`font-bold text-blue-600 ${isFeatured ? 'text-lg' : 'text-sm'}`}>{formatStatNumber(stat.max)}</div>
              <div className="text-[10px] font-semibold text-gray-600 uppercase">Máximo</div>
            </div>
          )}
        </div>
      )}

      {!isFeatured && chartBlock}
    </div>
  );
};

const truncateTableLabel = (text, max = 40) => {
  const t = (text || '').trim();
  return t.length > max ? `${t.slice(0, max - 1)}…` : t;
};

const TABLE_PAGE_SIZE = 50;

const extractDateFromObjectId = (objectIdString) => {
  try {
    if (objectIdString && objectIdString.length >= 8) {
      const timestampHex = objectIdString.substring(0, 8);
      const timestamp = parseInt(timestampHex, 16);
      return new Date(timestamp * 1000);
    }
  } catch (e) {
    /* ignore */
  }
  return null;
};

const getResponseTimestamp = (response) => {
  const dateValue = response.created_at || response.timestamp || response.created
    || response.date || response.submitted_at;
  if (dateValue) {
    const d = new Date(dateValue);
    if (!isNaN(d.getTime())) return d;
  }
  const responseId = response.id || response._id;
  if (responseId) {
    const fromId = extractDateFromObjectId(String(responseId));
    if (fromId && !isNaN(fromId.getTime())) return fromId;
  }
  return null;
};

const flattenAnswerForSearch = (answer) => {
  if (answer == null || answer === '') return '';
  if (typeof answer === 'string') {
    if (answer.startsWith('data:image/')) return '';
    return answer;
  }
  if (Array.isArray(answer)) return answer.map(flattenAnswerForSearch).join(' ');
  if (typeof answer === 'object') {
    return Object.values(answer).map(flattenAnswerForSearch).join(' ');
  }
  return String(answer);
};

const responseMatchesFilters = (response, filters) => {
  const { searchQuery, statusFilter, dateFrom, dateTo, surveyorFilter } = filters;

  if (statusFilter === 'synced' && !response.synced) return false;
  if (statusFilter === 'pending' && response.synced) return false;

  if (surveyorFilter && surveyorFilter !== 'all') {
    const surveyor = response.surveyor_name || response.surveyor_id || '';
    if (String(surveyor) !== surveyorFilter) return false;
  }

  if (dateFrom || dateTo) {
    const ts = getResponseTimestamp(response);
    if (!ts) return false;
    if (dateFrom) {
      const from = new Date(`${dateFrom}T00:00:00`);
      if (ts < from) return false;
    }
    if (dateTo) {
      const to = new Date(`${dateTo}T23:59:59.999`);
      if (ts > to) return false;
    }
  }

  const q = (searchQuery || '').trim().toLowerCase();
  if (q) {
    const haystack = [
      response.id,
      response._id,
      response.device_id,
      response.surveyor_name,
      response.surveyor_id,
      ...(response.answers ? Object.values(response.answers).map(flattenAnswerForSearch) : []),
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    if (!haystack.includes(q)) return false;
  }

  return true;
};

const ResponsesTable = ({
  survey,
  responses,
  onExportExcel,
  formatAnswer,
  formatDate,
  getResponsePublicLinks,
}) => {
  const scrollRef = useRef(null);
  const [page, setPage] = useState(1);
  const [showColumnPanel, setShowColumnPanel] = useState(false);
  const [visibleMeta, setVisibleMeta] = useState({
    num: true,
    id: false,
    dispositivo: false,
    encuestador: false,
    estado: true,
    fecha: true,
    links: false,
  });

  const tableQuestions = useMemo(
    () => (survey.questions || []).filter((q) => {
      const t = q.type || q.question_type;
      return t !== 'Título' && t !== 'titulo';
    }),
    [survey.questions]
  );

  const [visibleQuestionIds, setVisibleQuestionIds] = useState(() => new Set());

  useEffect(() => {
    const ids = tableQuestions.map((q) => String(q.id || q._id));
    setVisibleQuestionIds(new Set(ids));
    setPage(1);
  }, [survey.id, survey._id, tableQuestions.length]);

  useEffect(() => {
    setPage(1);
  }, [responses]);

  const totalPages = Math.max(1, Math.ceil(responses.length / TABLE_PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const startIdx = (safePage - 1) * TABLE_PAGE_SIZE;
  const pageResponses = responses.slice(startIdx, startIdx + TABLE_PAGE_SIZE);
  const endIdx = Math.min(startIdx + TABLE_PAGE_SIZE, responses.length);

  const scrollToTop = () => {
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
  };

  const goToPage = (p) => {
    setPage(Math.max(1, Math.min(p, totalPages)));
    scrollToTop();
  };

  const toggleMeta = (key) => {
    setVisibleMeta((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const toggleQuestion = (qid) => {
    setVisibleQuestionIds((prev) => {
      const next = new Set(prev);
      if (next.has(qid)) next.delete(qid);
      else next.add(qid);
      return next;
    });
  };

  const selectAllQuestions = (select) => {
    setVisibleQuestionIds(
      select ? new Set(tableQuestions.map((q) => String(q.id || q._id))) : new Set()
    );
  };

  const visibleQuestions = tableQuestions.filter((q) =>
    visibleQuestionIds.has(String(q.id || q._id))
  );

  const thClass = 'px-1.5 py-1 text-left text-[9px] font-bold text-white uppercase tracking-wide leading-tight';
  const tdClass = 'px-1.5 py-1 text-[10px] leading-tight text-gray-700 align-middle';
  const stickyTh = `${thClass} sticky left-0 z-30 bg-indigo-600 min-w-[28px] w-[28px]`;
  const stickyTd = `${tdClass} sticky left-0 z-10 bg-white border-r border-gray-100 font-semibold text-gray-900 min-w-[28px] w-[28px] text-center`;

  const renderCellAnswer = (answer, q) => {
    const qType = q.type || q.question_type;
    const isAnswerSignature = answer && typeof answer === 'string' && isStatAnswerSignature(answer);
    const isFileUpload = (qType === 'file_upload' || qType === 'Adjuntar archivos') && Array.isArray(answer) && answer.length > 0;

    if (isAnswerSignature) {
      return (
        <img
          src={answer}
          alt="Firma"
          className="max-h-8 w-auto border border-gray-200 rounded cursor-pointer"
          title="Firma — clic derecho para ver tamaño completo"
        />
      );
    }
    if (isFileUpload) {
      return (
        <span className="text-indigo-600 font-medium text-[9px]" title={`${answer.length} archivo(s)`}>
          {answer.length} adj.
        </span>
      );
    }
    const formatted = formatAnswer(answer, qType, q);
    return (
      <div className="truncate max-w-[100px]" title={formatted}>
        {formatted}
      </div>
    );
  };

  return (
    <div className="space-y-2 w-full text-[10px]">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <button
          type="button"
          onClick={onExportExcel}
          className="inline-flex items-center gap-1 px-2.5 py-1 bg-gradient-to-r from-green-500 to-emerald-600 text-white text-[11px] font-semibold rounded-md shadow-sm hover:shadow-md transition-all"
        >
          <FontAwesomeIcon icon={faFileExcel} size="xs" className="fa-icon-force-white" />
          Exportar Excel
        </button>
        <div className="flex items-center gap-1.5 text-[10px] text-gray-600">
          <span>
            {responses.length === 0
              ? 'Sin respuestas'
              : `Mostrando ${startIdx + 1}–${endIdx} de ${responses.length}`}
          </span>
          <button
            type="button"
            disabled={safePage <= 1}
            onClick={() => goToPage(safePage - 1)}
            className="px-1.5 py-0.5 rounded border border-gray-200 disabled:opacity-40 hover:bg-gray-50 text-[10px]"
          >
            ‹
          </button>
          <span className="font-semibold text-indigo-600 text-[10px]">
            {safePage} / {totalPages}
          </span>
          <button
            type="button"
            disabled={safePage >= totalPages}
            onClick={() => goToPage(safePage + 1)}
            className="px-1.5 py-0.5 rounded border border-gray-200 disabled:opacity-40 hover:bg-gray-50 text-[10px]"
          >
            ›
          </button>
        </div>
      </div>

      <div className="border border-gray-200 rounded-lg bg-gray-50/50">
        <button
          type="button"
          onClick={() => setShowColumnPanel((v) => !v)}
          className="w-full flex items-center justify-between px-2 py-1.5 text-[10px] font-semibold text-gray-600 hover:bg-gray-100/80 rounded-lg"
        >
          <span>Columnas visibles</span>
          <FontAwesomeIcon icon={showColumnPanel ? faChevronUp : faChevronDown} size="xs" className="fa-icon-force-current" />
        </button>
        {showColumnPanel && (
          <div className="px-2 pb-2 space-y-1.5 border-t border-gray-200 pt-1.5">
            <div className="flex flex-wrap gap-x-2 gap-y-0.5">
              {[
                ['num', '#'],
                ['estado', 'Estado'],
                ['fecha', 'Fecha'],
                ['id', 'ID'],
                ['dispositivo', 'Dispositivo'],
                ['encuestador', 'Encuestador'],
                ['links', 'Links'],
              ].map(([key, label]) => (
                <label key={key} className="inline-flex items-center gap-0.5 text-[9px] text-gray-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={visibleMeta[key]}
                    onChange={() => toggleMeta(key)}
                    className="rounded border-gray-300 text-indigo-600"
                  />
                  {label}
                </label>
              ))}
            </div>
            <div className="flex gap-2 text-[9px]">
              <button type="button" onClick={() => selectAllQuestions(true)} className="text-indigo-600 hover:underline">
                Todas las preguntas
              </button>
              <button type="button" onClick={() => selectAllQuestions(false)} className="text-gray-500 hover:underline">
                Ninguna
              </button>
            </div>
            <div className="flex flex-wrap gap-x-2 gap-y-0.5 max-h-20 overflow-y-auto">
              {tableQuestions.map((q, qi) => {
                const qid = String(q.id || q._id);
                const label = truncateTableLabel(q.text || q.question_text, 24);
                return (
                  <label key={qid} className="inline-flex items-center gap-0.5 text-[9px] text-gray-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={visibleQuestionIds.has(qid)}
                      onChange={() => toggleQuestion(qid)}
                      className="rounded border-gray-300 text-indigo-600"
                    />
                    Q{qi + 1}: {label}
                  </label>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <div
        ref={scrollRef}
        className="max-h-[calc(100vh-220px)] overflow-auto rounded-lg border border-gray-200 bg-white"
      >
        <table className="w-full text-[10px] border-collapse table-auto">
          <thead className="sticky top-0 z-20 bg-gradient-to-r from-indigo-600 to-purple-600">
            <tr>
              {visibleMeta.num && (
                <th className={stickyTh}>#</th>
              )}
              {visibleMeta.estado && <th className={thClass}>Estado</th>}
              {visibleMeta.fecha && <th className={thClass}>Fecha</th>}
              {visibleMeta.id && <th className={thClass}>ID</th>}
              {visibleMeta.dispositivo && <th className={thClass}>Disp.</th>}
              {visibleMeta.encuestador && <th className={thClass}>Enc.</th>}
              {visibleQuestions.map((q, qi) => {
                const qid = q.id || q._id;
                const fullText = q.text || q.question_text || `Pregunta ${qid}`;
                return (
                  <th
                    key={qid}
                    className={`${thClass} max-w-[100px] w-[100px]`}
                    title={fullText}
                  >
                    <span className="line-clamp-2 block max-w-[96px]">
                      Q{qi + 1}: {truncateTableLabel(fullText, 28)}
                    </span>
                  </th>
                );
              })}
              {visibleMeta.links && <th className={thClass}>Links</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {pageResponses.map((response, index) => {
              const globalIndex = startIdx + index;
              const responseId = response.id || response._id;
              const dateValue = response.created_at || response.timestamp || response.created || response.date || response.submitted_at;
              const formattedDate = formatDate(dateValue, responseId);
              const shortDate = formattedDate !== '-' ? formattedDate.split(' ')[0] : '-';

              return (
                <tr key={responseId || index} className="hover:bg-indigo-50/40 even:bg-gray-50/30">
                  {visibleMeta.num && (
                    <td
                      className={`${stickyTd} ${index % 2 === 1 ? '!bg-gray-50' : ''}`}
                      title={responseId ? String(responseId) : undefined}
                    >
                      {globalIndex + 1}
                    </td>
                  )}
                  {visibleMeta.estado && (
                    <td className={tdClass}>
                      {response.synced ? (
                        <span className="inline-flex items-center gap-0.5 px-1 py-0.5 bg-green-100 text-green-700 rounded text-[9px] font-bold">
                          <FontAwesomeIcon icon={faCheck} size="xs" className="fa-icon-force-current" />
                          OK
                        </span>
                      ) : (
                        <span className="inline-flex px-1 py-0.5 bg-yellow-100 text-yellow-700 rounded text-[9px] font-bold">
                          ⏳
                        </span>
                      )}
                    </td>
                  )}
                  {visibleMeta.fecha && (
                    <td className={`${tdClass} whitespace-nowrap text-[9px]`} title={formattedDate}>
                      {shortDate}
                    </td>
                  )}
                  {visibleMeta.id && (
                    <td className={`${tdClass} font-mono text-[9px] max-w-[70px] truncate`} title={responseId}>
                      {responseId ? String(responseId).slice(0, 10) + '…' : '-'}
                    </td>
                  )}
                  {visibleMeta.dispositivo && (
                    <td className={`${tdClass} max-w-[70px] truncate text-[9px]`} title={response.device_id}>
                      {response.device_id || '-'}
                    </td>
                  )}
                  {visibleMeta.encuestador && (
                    <td className={`${tdClass} max-w-[70px] truncate text-[9px]`}>
                      {(response.surveyor_name || response.surveyor_id) || '-'}
                    </td>
                  )}
                  {visibleQuestions.map((q) => {
                    const questionId = q.id || q._id;
                    const answer = response.answers && response.answers[questionId];
                    return (
                      <td key={questionId} className={tdClass}>
                        {renderCellAnswer(answer, q)}
                      </td>
                    );
                  })}
                  {visibleMeta.links && (
                    <td className={tdClass}>
                      {(() => {
                        const linkList = getResponsePublicLinks(response, survey.questions);
                        if (linkList.length === 0) return <span className="text-gray-400">—</span>;
                        return (
                          <a
                            href={linkList[0]}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-indigo-600 hover:underline text-[9px]"
                            title={linkList.join('\n')}
                          >
                            {linkList.length > 1 ? `${linkList.length} links` : 'Link'}
                          </a>
                        );
                      })()}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
        {pageResponses.length === 0 && (
          <p className="text-center text-[10px] text-gray-400 py-6">No hay respuestas en esta página</p>
        )}
      </div>
    </div>
  );
};

// --- VISTA: RESPUESTAS DE ENCUESTAS ---

const ConsentPreviewModal = ({ survey, response, onClose }) => {
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState('');
  const ic = survey?.informed_consent || {};
  const mergedBody = useMemo(
    () => mergeConsentTemplate(ic.body || '', ic.mappings || [], response?.answers || {}),
    [ic.body, ic.mappings, response]
  );
  const meta = useMemo(() => buildConsentMeta(response), [response]);
  const signatureUrl = useMemo(
    () => resolveConsentSignature({
      answers: response?.answers || {},
      mappings: ic.mappings || [],
      survey,
      signatureQuestionId: ic.signature_question_id || '',
    }),
    [response, ic.mappings, ic.signature_question_id, survey]
  );

  const handleDownload = async () => {
    setDownloading(true);
    setError('');
    try {
      await downloadConsentPdf({
        title: ic.title || 'Consentimiento informado',
        mergedBody,
        response,
        survey,
        letterheadUrl: '/membrete2.pdf',
        letterheadPdf: ic.letterhead_pdf || '',
        signatureDataUrl: signatureUrl,
      });
    } catch (e) {
      console.error(e);
      setError(e.message || 'No se pudo generar el PDF');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-gray-200">
          <div className="flex-1 text-center pr-8">
            <h2 className="text-lg font-black text-gray-800">{ic.title || 'Consentimiento informado'}</h2>
          </div>
          <button type="button" onClick={onClose} className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg shrink-0">
            <FontAwesomeIcon icon={faXmark} size="sm" />
          </button>
        </div>
        <div className="px-5 py-4 overflow-y-auto flex-1 bg-gradient-to-b from-emerald-50/40 to-white">
          <div className="prose prose-sm max-w-none whitespace-pre-wrap text-gray-800 leading-relaxed border border-gray-200 rounded-xl bg-white p-5 shadow-sm">
            {mergedBody.replace(/\[Firma capturada\]/gi, '').trim()}
          </div>
          <div className="mt-4 border border-gray-200 rounded-xl bg-white p-4 shadow-sm">
            <p className="text-sm font-bold text-gray-700 mb-2">Firma del declarante</p>
            {signatureUrl ? (
              <img src={signatureUrl} alt="Firma" className="max-h-28 border border-gray-200 rounded-lg bg-white p-2" />
            ) : (
              <p className="text-sm text-amber-700">Esta respuesta no tiene firma capturada. Asegúrate de incluir una pregunta tipo Firma en la encuesta.</p>
            )}
          </div>
          <div className="mt-4 border border-emerald-100 rounded-xl bg-emerald-50/60 p-4 shadow-sm">
            <p className="text-sm font-bold text-emerald-800 mb-1">{meta.stampLine}</p>
            <p className="text-sm font-bold text-emerald-900 mb-2">Trazabilidad OTP / captura en línea</p>
            <ul className="text-xs text-emerald-900 space-y-1">
              {(meta.traceLines || []).map((line) => (
                <li key={line}>{line}</li>
              ))}
              {!(meta.traceLines || []).length && (
                <>
                  <li>Correo OTP: {meta.consentEmail || '—'}</li>
                  <li>OTP aceptado: {meta.consentOtpCode || '—'}</li>
                  <li>OTP verificado: {meta.otpVerifiedLabel || (meta.otpVerified ? 'Sí' : '—')}</li>
                  <li>Fecha captura respuesta: {meta.dateLabel || '—'}</li>
                  <li>ID respuesta: {meta.responseId || '—'}</li>
                </>
              )}
            </ul>
          </div>
          {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
        </div>
        <div className="px-5 py-4 border-t border-gray-200 flex flex-wrap gap-2 justify-end bg-white">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl font-bold text-sm text-gray-600 hover:bg-gray-100">
            Cerrar
          </button>
          <button
            type="button"
            onClick={handleDownload}
            disabled={downloading}
            className="px-4 py-2 rounded-xl font-bold text-sm text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 inline-flex items-center gap-2"
          >
            <FontAwesomeIcon icon={faDownload} size="sm" />
            {downloading ? 'Generando…' : 'Descargar PDF'}
          </button>
        </div>
      </div>
    </div>
  );
};

const SurveyResponsesView = ({ survey, responses, onBack, loading, userRole, onResetResponses }) => {
  const [selectedResponse, setSelectedResponse] = useState(null);
  const [consentResponse, setConsentResponse] = useState(null);
  const [activeTab, setActiveTab] = useState('individual'); // 'individual', 'statistics', or 'table'
  const [chartTypes, setChartTypes] = useState({}); // { questionId: 'bar' | 'doughnut' | 'line' }
  const [expandedQuestionText, setExpandedQuestionText] = useState({});
  const [expandedAllRows, setExpandedAllRows] = useState({});
  const [otherStatsExpanded, setOtherStatsExpanded] = useState(false);
  const [filtersExpanded, setFiltersExpanded] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [surveyorFilter, setSurveyorFilter] = useState('all');
  const [zippingConsents, setZippingConsents] = useState(false);
  const [zipProgress, setZipProgress] = useState({ done: 0, total: 0 });

  const filterState = useMemo(
    () => ({ searchQuery, statusFilter, dateFrom, dateTo, surveyorFilter }),
    [searchQuery, statusFilter, dateFrom, dateTo, surveyorFilter]
  );

  const hasActiveFilters = Boolean(
    searchQuery.trim() || statusFilter !== 'all' || dateFrom || dateTo || surveyorFilter !== 'all'
  );

  const surveyorOptions = useMemo(() => {
    const names = new Set();
    responses.forEach((r) => {
      const s = r.surveyor_name || r.surveyor_id;
      if (s) names.add(String(s));
    });
    return Array.from(names).sort((a, b) => a.localeCompare(b, 'es'));
  }, [responses]);

  const filteredResponses = useMemo(
    () => responses.filter((r) => responseMatchesFilters(r, filterState)),
    [responses, filterState]
  );

  const stats = useMemo(
    () => calculateResponseStats(survey, filteredResponses),
    [filteredResponses, survey]
  );

  const clearFilters = () => {
    setSearchQuery('');
    setStatusFilter('all');
    setDateFrom('');
    setDateTo('');
    setSurveyorFilter('all');
  };

  const downloadAllConsentPdfsZip = async () => {
    if (!survey?.informed_consent_enabled) {
      alert('Esta encuesta no tiene consentimiento informado activo.');
      return;
    }
    const list = filteredResponses;
    if (!list.length) {
      alert('No hay respuestas (con los filtros actuales) para generar consentimientos.');
      return;
    }
    if (zippingConsents) return;

    const ic = survey.informed_consent || {};
    const confirmed = window.confirm(
      `Se generarán ${list.length} PDF(s) de consentimiento${hasActiveFilters ? ' (según filtros activos)' : ''} y se descargarán en un ZIP. ¿Continuar?`
    );
    if (!confirmed) return;

    setZippingConsents(true);
    setZipProgress({ done: 0, total: list.length });
    try {
      const zip = new JSZip();
      const usedNames = new Set();
      let okCount = 0;
      let failCount = 0;

      for (let i = 0; i < list.length; i += 1) {
        const response = list[i];
        const responseId = String(response.id || response._id || `idx-${i + 1}`);
        try {
          const mergedBody = mergeConsentTemplate(
            ic.body || '',
            ic.mappings || [],
            response.answers || {}
          );
          const signatureDataUrl = resolveConsentSignature({
            answers: response.answers || {},
            mappings: ic.mappings || [],
            survey,
            signatureQuestionId: ic.signature_question_id || '',
          });
          const pdfBytes = await buildConsentPdfBytes({
            title: ic.title || 'Consentimiento informado',
            mergedBody,
            response,
            survey,
            letterheadUrl: '/membrete2.pdf',
            letterheadPdf: ic.letterhead_pdf || '',
            signatureDataUrl,
          });
          let baseName = buildConsentPdfFileBaseName({ survey, response });
          let fileName = `${baseName}.pdf`;
          let n = 2;
          while (usedNames.has(fileName)) {
            fileName = `${baseName}-${n}.pdf`;
            n += 1;
          }
          usedNames.add(fileName);
          zip.file(fileName, pdfBytes);
          okCount += 1;
        } catch (err) {
          console.error('ZIP consentimiento falló para', responseId, err);
          failCount += 1;
        }
        setZipProgress({ done: i + 1, total: list.length });
      }

      if (okCount === 0) {
        throw new Error('No se pudo generar ningún PDF de consentimiento.');
      }

      const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
      const surveyTitle = (survey.title || 'consentimientos').replace(/[^a-z0-9]+/gi, '_').toLowerCase();
      const fileName = `${surveyTitle}_consentimientos${hasActiveFilters ? '_filtrado' : ''}_${new Date().toISOString().split('T')[0]}.zip`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);

      if (failCount > 0) {
        alert(`ZIP listo con ${okCount} PDF(s). ${failCount} respuesta(s) no se pudieron incluir.`);
      }
    } catch (e) {
      console.error(e);
      alert(e.message || 'No se pudo generar el ZIP de consentimientos.');
    } finally {
      setZippingConsents(false);
      setZipProgress({ done: 0, total: 0 });
    }
  };

  if (loading) {
    return (
      <main className="flex-1 relative z-10 w-full min-w-0 overflow-x-hidden">
        <header className="sticky top-0 z-40 w-full px-4 sm:px-6 lg:px-10 xl:px-14 py-4 md:py-6 flex justify-between items-center bg-white/50 backdrop-blur-md border-b border-white/40">
          <div className="flex items-center gap-3">
            <button className="p-2 -ml-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors" onClick={onBack} title="Volver">
              <FontAwesomeIcon icon={faChevronLeft} size="sm" className="fa-icon-force-current" />
            </button>
            <div>
              <h1 className="text-xl md:text-2xl font-black text-gray-800 tracking-tight leading-none">Respuestas</h1>
              <span className="text-xs font-bold text-indigo-500 uppercase tracking-widest hidden md:inline-block mt-1">Cargando...</span>
            </div>
          </div>
        </header>
        <div className="w-full max-w-none px-4 sm:px-6 lg:px-10 xl:px-14 py-6 md:py-10">
          <div className="text-center py-20">
            <p className="text-gray-500">Cargando respuestas...</p>
          </div>
        </div>
      </main>
    );
  }

  // Función helper para detectar si una respuesta es una firma (imagen base64)
  const isSignature = (answer) => {
    if (typeof answer !== 'string') return false;
    return answer.startsWith('data:image/png;base64,') || 
           answer.startsWith('data:image/jpeg;base64,') ||
           (answer.length > 100 && /^[A-Za-z0-9+/=]+$/.test(answer.split(',')[1] || answer));
  };

  const formatAnswer = (answer, questionType, question) => {
    if (questionType === 'titulo' || questionType === 'Título') return '—';
    // Handle email type
    if (questionType === 'Correo Electrónico' || questionType === 'email') {
      return answer || '-';
    }
    // Adjuntos: lista de IDs
    if ((questionType === 'file_upload' || questionType === 'Adjuntar archivos') && Array.isArray(answer)) {
      const n = answer.length;
      return n === 0 ? '—' : n === 1 ? '1 archivo adjunto' : `${n} archivos adjuntos`;
    }
    // Si es una firma, retornar un marcador especial para renderizar como imagen
    if (isSignature(answer)) {
      return '__SIGNATURE_IMAGE__';
    }
    // Tabla de evaluación: objeto { itemId: { colId: value } } — usar nombres de ítems y columnas, no códigos
    if ((questionType === 'evaluation_table' || questionType === 'Evaluación') && typeof answer === 'object' && answer !== null && !Array.isArray(answer)) {
      const items = (question && question.evaluation_items) || [];
      const columns = (question && question.evaluation_columns) || [];
      const getItemLabel = (id) => items.find(i => i.id === id)?.label || id;
      const getColLabel = (id) => columns.find(c => c.id === id)?.label || id;
      const parts = [];
      Object.entries(answer).forEach(([itemId, cols]) => {
        if (cols && typeof cols === 'object') {
          const itemLabel = getItemLabel(itemId);
          const cellParts = [];
          Object.entries(cols).forEach(([colId, val]) => {
            if (val !== undefined && val !== null && val !== '' && val !== false) {
              const colLabel = getColLabel(colId);
              const displayVal = typeof val === 'string' ? val : 'Sí';
              cellParts.push(`${colLabel}: ${displayVal}`);
            }
          });
          if (cellParts.length) parts.push(`${itemLabel} — ${cellParts.join('; ')}`);
        }
      });
      return parts.length ? parts.join(' | ') : 'Sin respuesta';
    }
    if (Array.isArray(answer)) {
      return answer.join(', ');
    }
    if (typeof answer === 'object' && answer !== null) {
      return JSON.stringify(answer);
    }
    return answer || 'Sin respuesta';
  };

  // Componente para renderizar respuesta (texto o imagen de firma). question opcional para evaluación (nombres legibles).
  const renderAnswer = (answer, questionOrType, compact = false) => {
    const q = questionOrType && typeof questionOrType === 'object' ? questionOrType : null;
    const qType = q ? (q.type || q.question_type) : questionOrType;
    if ((qType === 'file_upload' || qType === 'Adjuntar archivos') && Array.isArray(answer) && answer.length > 0) {
      return (
        <div className="mt-2 flex flex-wrap gap-3">
          {answer.map((id) => (
            <div key={id}>
              <AttachmentPreview attachmentId={id} compact={compact} />
            </div>
          ))}
        </div>
      );
    }
    if (isSignature(answer)) {
      return (
        <div className="mt-2">
          <img 
            src={answer} 
            alt="Firma" 
            className="w-full h-auto border-2 border-gray-300 rounded-lg shadow-sm"
            style={{ maxHeight: '200px', objectFit: 'contain' }}
          />
        </div>
      );
    }
    return <p className="text-gray-700 text-base">{formatAnswer(answer, qType, q)}</p>;
  };

  const getQuestionText = (questionId) => {
    if (!survey.questions) return `Pregunta ${questionId}`;
    const question = survey.questions.find(q => q.id === questionId || q._id === questionId);
    return question ? (question.text || question.question_text || 'Pregunta sin texto') : `Pregunta ${questionId}`;
  };

  const getQuestionType = (questionId) => {
    if (!survey.questions) return null;
    const question = survey.questions.find(q => q.id === questionId || q._id === questionId);
    return question ? (question.type || question.question_type) : null;
  };

  const getResponsePreviewField = (response) => {
    if (!response.answers || typeof response.answers !== 'object' || !survey.questions) return null;

    for (const q of survey.questions) {
      const questionId = q.id || q._id;
      const qType = q.type || q.question_type;
      if (!questionId) continue;
      if (qType === 'titulo' || qType === 'Título') continue;

      const answer = response.answers[questionId];
      if (answer === undefined || answer === null || answer === '') continue;
      if (Array.isArray(answer) && answer.length === 0) continue;

      const label = (q.text || q.question_text || 'Campo').trim();
      if (isSignature(answer)) {
        return { label, value: 'Firma' };
      }

      const formatted = formatAnswer(answer, qType, q);
      if (!formatted || formatted === '—' || formatted === 'Sin respuesta' || formatted === '__SIGNATURE_IMAGE__') continue;

      return { label, value: String(formatted) };
    }
    return null;
  };

  // Función para obtener el tipo de gráfico por defecto
  const getDefaultChartType = (questionId) => {
    return chartTypes[questionId] || 'bar';
  };

  // Función para cambiar el tipo de gráfico
  const handleChartTypeChange = (questionId, chartType) => {
    setChartTypes(prev => ({
      ...prev,
      [questionId]: chartType
    }));
  };

  // Datos y opciones deluxe para gráficos
  const getChartData = (stat, chartType = 'bar') => buildDeluxeChartData(stat, chartType);
  const getChartOptions = (stat, chartType = 'bar') => buildDeluxeChartOptions(stat, chartType);

  const orderedStatEntries = (survey.questions || [])
    .map((q) => {
      const id = q.id || q._id;
      return id && stats[id] ? [id, stats[id]] : null;
    })
    .filter(Boolean);
  const chartableStatEntries = orderedStatEntries.filter(([, s]) => s.statKind === 'categorical');
  const otherStatEntries = orderedStatEntries.filter(([, s]) => s.statKind !== 'categorical');

  const renderStatCard = (questionId, stat, variant) => (
    <QuestionStatCard
      key={questionId}
      questionId={questionId}
      stat={stat}
      variant={variant}
      chartType={chartTypes[questionId]}
      onChartTypeChange={handleChartTypeChange}
      textExpanded={!!expandedQuestionText[questionId]}
      onToggleText={() => setExpandedQuestionText((prev) => ({ ...prev, [questionId]: !prev[questionId] }))}
      showAllRows={!!expandedAllRows[questionId]}
      onToggleAllRows={() => setExpandedAllRows((prev) => ({ ...prev, [questionId]: !prev[questionId] }))}
      getChartData={getChartData}
      getChartOptions={getChartOptions}
      getDefaultChartType={getDefaultChartType}
    />
  );

  // Función para extraer fecha del ObjectId de MongoDB (usa helper compartido arriba)

  // Función para formatear fecha
  const formatDate = (dateValue, responseId = null) => {
    let date = null;
    
    // Intentar parsear dateValue primero
    if (dateValue) {
      try {
        date = new Date(dateValue);
        if (!isNaN(date.getTime())) {
          // Fecha válida, formatear
          const day = String(date.getDate()).padStart(2, '0');
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const year = date.getFullYear();
          const hours = String(date.getHours()).padStart(2, '0');
          const minutes = String(date.getMinutes()).padStart(2, '0');
          const seconds = String(date.getSeconds()).padStart(2, '0');
          return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
        }
      } catch (e) {
        // Continuar con el fallback
      }
    }
    
    // Si no hay fecha válida, intentar extraer del ObjectId
    if (responseId) {
      const dateFromId = extractDateFromObjectId(responseId);
      if (dateFromId && !isNaN(dateFromId.getTime())) {
        const day = String(dateFromId.getDate()).padStart(2, '0');
        const month = String(dateFromId.getMonth() + 1).padStart(2, '0');
        const year = dateFromId.getFullYear();
        const hours = String(dateFromId.getHours()).padStart(2, '0');
        const minutes = String(dateFromId.getMinutes()).padStart(2, '0');
        const seconds = String(dateFromId.getSeconds()).padStart(2, '0');
        return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
      }
    }
    
    return '-';
  };

  // Links públicos de adjuntos de una respuesta (API attachment_links o fallback desde answers)
  const getResponsePublicLinks = (response, questionsList) => {
    let links = response.attachment_links && typeof response.attachment_links === 'object'
      ? Object.values(response.attachment_links).filter(Boolean)
      : [];
    if (links.length === 0 && response.answers && typeof response.answers === 'object') {
      const base = typeof window !== 'undefined' ? window.location.origin : '';
      const qType = (q) => (q.type || q.question_type || '').trim();
      const isFileUpload = (q) => qType(q) === 'file_upload' || qType(q) === 'Adjuntar archivos';
      (questionsList || []).filter(isFileUpload).forEach(q => {
        const qid = q.id ?? q._id;
        if (qid == null) return;
        const key = typeof qid === 'string' ? qid : String(qid);
        const val = response.answers[key] ?? response.answers[qid];
        if (val == null) return;
        const ids = Array.isArray(val)
          ? val.map(x => (typeof x === 'string' ? x.trim() : String(x))).filter(Boolean)
          : (typeof val === 'string' ? val.split(/[\s,]+/).map(s => s.trim()).filter(Boolean) : []);
        ids.forEach(id => { if (id && base) links.push(`${base}/api/public/attachments/${id}/`); });
      });
    }
    return links;
  };

  // Función para exportar a Excel (embebe firmas como imágenes con ExcelJS)
  const exportToExcel = async () => {
    const dataToExport = filteredResponses;
    if (!dataToExport.length || !survey.questions) return;

    const questions = survey.questions || [];
    const headers = [
      'ID Respuesta',
      'Dispositivo',
      'Encuestador',
      'Estado',
      'Fecha de Toma',
      'Consentimiento en línea',
      'Correo OTP',
      'OTP aceptado',
      'OTP verificado el',
      'Consentimiento datos personales',
    ];
    questions.forEach((q) => {
      const questionId = q.id || q._id;
      const questionText = q.text || q.question_text || `Pregunta ${questionId}`;
      headers.push(questionText);
    });
    headers.push('Link público');

    const metaCols = 10;
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Survey App';
    const sheet = workbook.addWorksheet('Respuestas', {
      views: [{ state: 'frozen', ySplit: 1 }],
    });
    sheet.addRow(headers);
    sheet.getRow(1).font = { bold: true };

    headers.forEach((_, i) => {
      const col = sheet.getColumn(i + 1);
      if (i === 0) col.width = 22;
      else if (i === 1 || i === 2) col.width = 14;
      else if (i === 3) col.width = 12;
      else if (i === 4 || i === 8 || i === 9) col.width = 20;
      else if (i === 5) col.width = 16;
      else if (i === 6) col.width = 28;
      else if (i === 7) col.width = 12;
      else if (i === headers.length - 1) col.width = 40;
      else col.width = 24;
    });

    const imagesToEmbed = [];

    dataToExport.forEach((response, index) => {
      const dateValue = response.created_at
        || response.timestamp
        || response.created
        || response.date
        || response.submitted_at;
      const responseId = response.id || response._id || null;
      const otpAt = response.consent_otp_verified_at
        ? formatDate(response.consent_otp_verified_at, responseId)
        : '-';
      const hasConsentTrace = Boolean(response.consent_email || response.consent_otp_verified_at);
      const dataConsentAt = response.signature_consent_at
        ? formatDate(response.signature_consent_at, responseId)
        : '-';

      const rowValues = [
        responseId || `Respuesta ${index + 1}`,
        response.device_id || '-',
        (response.surveyor_name || response.surveyor_id) || '-',
        response.synced ? 'En línea' : 'Pendiente',
        formatDate(dateValue, responseId),
        hasConsentTrace ? 'Sí' : (survey?.informed_consent_enabled ? 'No' : '-'),
        response.consent_email || '-',
        response.consent_otp_code || '-',
        otpAt,
        dataConsentAt,
      ];

      let rowHasSignatureImage = false;
      questions.forEach((q, qi) => {
        const questionId = q.id || q._id;
        const qType = q.type || q.question_type;
        const answer = response.answers && response.answers[questionId];

        if (isSignature(answer)) {
          const parsed = parseSignatureDataUrl(answer);
          rowValues.push('');
          if (parsed) {
            imagesToEmbed.push({
              rowIndex0: index + 1,
              colIndex0: metaCols + qi,
              extension: parsed.extension,
              base64: parsed.base64,
            });
            rowHasSignatureImage = true;
            sheet.getColumn(metaCols + qi + 1).width = 22;
          } else {
            rowValues[rowValues.length - 1] = 'Firma';
          }
        } else {
          const formatted = formatAnswer(answer, qType, q);
          rowValues.push(formatted === '__SIGNATURE_IMAGE__' ? 'Firma' : formatted);
        }
      });

      const links = getResponsePublicLinks(response, questions);
      rowValues.push(links.length > 0 ? links.join('\n') : '-');

      const excelRow = sheet.addRow(rowValues);
      if (rowHasSignatureImage) excelRow.height = 42;
    });

    imagesToEmbed.forEach((img) => {
      try {
        const imageId = workbook.addImage({
          base64: img.base64,
          extension: img.extension,
        });
        sheet.addImage(imageId, {
          tl: { col: img.colIndex0, row: img.rowIndex0 },
          ext: { width: 140, height: 48 },
          editAs: 'oneCell',
        });
      } catch (_) {
        // Si falla una imagen, la fila ya tiene celda vacía / texto "Firma"
      }
    });

    const surveyTitle = (survey.title || 'Encuesta').replace(/[^a-z0-9]/gi, '_').toLowerCase();
    const fileName = `${surveyTitle}_respuestas${hasActiveFilters ? '_filtrado' : ''}_${new Date().toISOString().split('T')[0]}.xlsx`;

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  // Vista de respuesta individual detallada
  if (selectedResponse) {
    return (
      <main className="flex-1 relative z-10 w-full min-w-0 overflow-x-hidden">
        <header className="sticky top-0 z-40 w-full px-4 sm:px-6 lg:px-10 xl:px-14 py-4 md:py-6 flex justify-between items-center bg-white/50 backdrop-blur-md border-b border-white/40">
          <div className="flex items-center gap-3">
            <button className="p-2 -ml-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors" onClick={() => { setSelectedResponse(null); }} title="Volver">
              <FontAwesomeIcon icon={faChevronLeft} size="sm" className="fa-icon-force-current" />
            </button>
            <div>
              <h1 className="text-xl md:text-2xl font-black text-gray-800 tracking-tight leading-none">Respuesta Individual</h1>
            </div>
          </div>
          {survey?.informed_consent_enabled && (
            <button
              type="button"
              onClick={() => setConsentResponse(selectedResponse)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-100 text-emerald-800 hover:bg-emerald-200 rounded-xl font-bold text-sm transition-colors"
            >
              <FontAwesomeIcon icon={faFileLines} size="sm" />
              Ver consentimiento
            </button>
          )}
        </header>
        <div className="w-full max-w-none px-4 sm:px-6 lg:px-10 xl:px-14 py-6 md:py-10">
          <div className="bg-white rounded-2xl border border-gray-200 p-6 md:p-8 shadow-sm w-full">
            <div className="flex justify-between items-start mb-6 pb-4 border-b border-gray-200">
              <div>
                <h3 className="font-bold text-xl text-gray-800">Respuesta Detallada</h3>
                <p className="text-sm text-gray-500 mt-1">
                  {selectedResponse.device_id && `Dispositivo: ${selectedResponse.device_id}`}
                  {(selectedResponse.surveyor_name || selectedResponse.surveyor_id) && ` • Encuestador: ${selectedResponse.surveyor_name || selectedResponse.surveyor_id}`}
                </p>
                {(selectedResponse.consent_email || selectedResponse.consent_otp_verified_at) && (
                  <div className="mt-3 text-xs text-emerald-800 bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-2 space-y-0.5">
                    <p className="font-bold">Trazabilidad consentimiento</p>
                    {selectedResponse.consent_email && <p>Correo OTP: {selectedResponse.consent_email}</p>}
                    {selectedResponse.consent_otp_verified_at && (
                      <p>OTP verificado: {formatDate(selectedResponse.consent_otp_verified_at, selectedResponse.id || selectedResponse._id)}</p>
                    )}
                  </div>
                )}
              </div>
              <div className="text-right">
                <span className="text-xs text-gray-400">
                  {selectedResponse.synced ? (
                    <span className="text-green-600">✓ En línea</span>
                  ) : (
                    <span className="text-yellow-600">⏳ Pendiente</span>
                  )}
                </span>
              </div>
            </div>
            <div className="space-y-6">
              {selectedResponse.answers && typeof selectedResponse.answers === 'object' ? (
                Object.entries(selectedResponse.answers).map(([questionId, answer]) => {
                  const q = survey.questions && survey.questions.find(qu => qu.id === questionId || qu._id === questionId);
                  return (
                  <div key={questionId} className="border-l-4 border-indigo-500 pl-6 py-4 bg-gray-50 rounded-r-lg">
                    <h4 className="font-semibold text-lg text-gray-800 mb-2">{getQuestionText(questionId)}</h4>
                    {renderAnswer(answer, q || getQuestionType(questionId))}
                  </div>
                  );
                })
              ) : (
                <div className="text-gray-500 italic">Respuesta sin formato estructurado</div>
              )}
            </div>
          </div>
        </div>
        {consentResponse && (
          <ConsentPreviewModal
            survey={survey}
            response={consentResponse}
            onClose={() => setConsentResponse(null)}
          />
        )}
      </main>
    );
  }

  return (
    <main className="flex-1 relative z-10 w-full min-w-0 overflow-x-hidden">
      <header className="sticky top-0 z-40 w-full px-4 sm:px-6 lg:px-10 xl:px-14 py-4 md:py-6 flex flex-wrap justify-between items-center gap-3 bg-white/50 backdrop-blur-md border-b border-white/40">
        <div className="flex items-center gap-3 min-w-0">
          <button className="p-2 -ml-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors shrink-0" onClick={onBack} title="Volver">
            <FontAwesomeIcon icon={faChevronLeft} size="sm" className="fa-icon-force-current" />
          </button>
          <div className="min-w-0">
            <h1 className="text-xl md:text-2xl font-black text-gray-800 tracking-tight leading-none truncate">{survey.title || 'Respuestas'}</h1>
            <span className="text-xs font-bold text-indigo-500 uppercase tracking-widest hidden md:inline-block mt-1">
              {hasActiveFilters
                ? `${filteredResponses.length} de ${responses.length} Respuestas`
                : `${responses.length} ${responses.length === 1 ? 'Respuesta' : 'Respuestas'}`}
            </span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {survey?.informed_consent_enabled && filteredResponses.length > 0 && (
            <button
              type="button"
              onClick={downloadAllConsentPdfsZip}
              disabled={zippingConsents}
              className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-100 text-emerald-800 hover:bg-emerald-200 disabled:opacity-60 rounded-xl font-bold text-sm transition-colors"
              title="Descargar todos los PDFs de consentimiento (según filtros) en un ZIP"
            >
              <FontAwesomeIcon icon={faDownload} size="sm" className="fa-icon-force-current" />
              {zippingConsents
                ? `Generando ZIP… ${zipProgress.done}/${zipProgress.total}`
                : 'Descargar consentimientos ZIP'}
            </button>
          )}
          {userRole === 'group_admin' && responses.length > 0 && onResetResponses && (
            <button
              type="button"
              onClick={() => onResetResponses(survey)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-red-100 text-red-700 hover:bg-red-200 rounded-xl font-bold text-sm transition-colors"
              title="Borrar todas las respuestas de esta encuesta"
            >
              <FontAwesomeIcon icon={faTrash} size="sm" className="fa-icon-force-current" />
              Reiniciar respuestas
            </button>
          )}
        </div>
      </header>

      <div className={`w-full max-w-none px-4 sm:px-6 lg:px-10 xl:px-14 ${activeTab === 'table' ? 'py-3 md:py-4' : 'py-6 md:py-10'} overflow-x-hidden`}>
        {responses.length === 0 ? (
          <div className="text-center py-20 border-2 border-dashed border-gray-300 rounded-3xl bg-white/30">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-400">
              <FontAwesomeIcon icon={faChartBar} size="lg" className="fa-icon-force-current" />
            </div>
            <p className="text-xl font-bold text-gray-500">No hay respuestas todavía</p>
            <p className="text-gray-400 mt-2">Esta encuesta aún no ha recibido respuestas.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Estadísticas rápidas */}
            {activeTab !== 'table' && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl p-6 text-white shadow-lg">
                  <div className="text-3xl font-black mb-2">{filteredResponses.length}</div>
                  <div className="text-sm opacity-90 font-medium">
                    {hasActiveFilters ? 'Respuestas filtradas' : 'Total Respuestas'}
                  </div>
                </div>
                <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl p-6 text-white shadow-lg">
                  <div className="text-3xl font-black mb-2">{Object.keys(stats).length}</div>
                  <div className="text-sm opacity-90 font-medium">Preguntas Respondidas</div>
                </div>
                <div className="bg-gradient-to-br from-blue-500 to-cyan-600 rounded-2xl p-6 text-white shadow-lg">
                  <div className="text-3xl font-black mb-2">{filteredResponses.filter(r => r.synced).length}</div>
                  <div className="text-sm opacity-90 font-medium">En línea</div>
                </div>
              </div>
            )}

            {/* Filtros */}
            <div className="bg-white/80 backdrop-blur-xl rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <button
                type="button"
                onClick={() => setFiltersExpanded((v) => !v)}
                className="w-full flex items-center justify-between gap-2 px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50/80"
              >
                <span className="inline-flex items-center gap-2">
                  <FontAwesomeIcon icon={faFilter} size="sm" className="text-indigo-500 fa-icon-force-current" />
                  Filtros
                  {hasActiveFilters && (
                    <span className="px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 text-[10px] font-bold">
                      Activos
                    </span>
                  )}
                </span>
                <span className="text-xs text-gray-500 font-normal">
                  {filteredResponses.length} de {responses.length}
                  <FontAwesomeIcon icon={filtersExpanded ? faChevronUp : faChevronDown} size="xs" className="ml-2 fa-icon-force-current" />
                </span>
              </button>
              {filtersExpanded && (
                <div className="px-4 pb-4 pt-1 border-t border-gray-100 space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                    <div className="sm:col-span-2 lg:col-span-2 relative">
                      <FontAwesomeIcon
                        icon={faSearch}
                        size="sm"
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 fa-icon-force-current pointer-events-none"
                      />
                      <input
                        type="search"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Buscar en respuestas, ID, encuestador..."
                        className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      />
                    </div>
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="all">Todos los estados</option>
                      <option value="synced">En línea</option>
                      <option value="pending">Pendiente</option>
                    </select>
                    <input
                      type="date"
                      value={dateFrom}
                      onChange={(e) => setDateFrom(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                      title="Desde"
                    />
                    <input
                      type="date"
                      value={dateTo}
                      onChange={(e) => setDateTo(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                      title="Hasta"
                    />
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    {surveyorOptions.length > 0 && (
                      <select
                        value={surveyorFilter}
                        onChange={(e) => setSurveyorFilter(e.target.value)}
                        className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:ring-2 focus:ring-indigo-500 min-w-[160px]"
                      >
                        <option value="all">Todos los encuestadores</option>
                        {surveyorOptions.map((name) => (
                          <option key={name} value={name}>{name}</option>
                        ))}
                      </select>
                    )}
                    {hasActiveFilters && (
                      <button
                        type="button"
                        onClick={clearFilters}
                        className="px-3 py-2 text-sm font-semibold text-gray-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                      >
                        Limpiar filtros
                      </button>
                    )}
                    <span className="text-xs text-gray-500 ml-auto">
                      {filteredResponses.length === responses.length
                        ? `Mostrando las ${responses.length} respuestas`
                        : `${filteredResponses.length} coincidencias de ${responses.length}`}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Sistema de Pestañas */}
            <div className={`bg-white/80 backdrop-blur-xl rounded-3xl border border-white/60 overflow-hidden w-full ${activeTab === 'table' ? 'shadow-sm' : 'shadow-lg'}`}>
              {/* Tabs Navigation */}
              <div className={`flex border-b border-gray-200 bg-gray-50/50 ${activeTab === 'table' ? 'text-xs' : ''}`}>
                <button
                  onClick={() => setActiveTab('individual')}
                  className={`flex-1 px-3 py-3 font-bold text-sm transition-all duration-200 relative ${
                    activeTab === 'individual'
                      ? 'text-indigo-600 bg-white'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100/50'
                  }`}
                >
                  <div className="flex items-center justify-center gap-2">
                    <FontAwesomeIcon icon={faListUl} size="sm" className="fa-icon-force-current" />
                    <span className="hidden md:inline">Respuestas Individuales</span>
                    <span className="md:hidden">Individuales</span>
                  </div>
                  {activeTab === 'individual' && (
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 to-purple-600"></div>
                  )}
                </button>
                <button
                  onClick={() => setActiveTab('statistics')}
                  className={`flex-1 px-3 py-3 font-bold text-sm transition-all duration-200 relative ${
                    activeTab === 'statistics'
                      ? 'text-indigo-600 bg-white'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100/50'
                  }`}
                >
                  <div className="flex items-center justify-center gap-2">
                    <FontAwesomeIcon icon={faChartBar} size="sm" className="fa-icon-force-current" />
                    <span className="hidden md:inline">Estadísticas por Pregunta</span>
                    <span className="md:hidden">Estadísticas</span>
                  </div>
                  {activeTab === 'statistics' && (
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 to-purple-600"></div>
                  )}
                </button>
                <button
                  onClick={() => setActiveTab('table')}
                  className={`flex-1 px-3 py-3 font-bold text-sm transition-all duration-200 relative ${
                    activeTab === 'table'
                      ? 'text-indigo-600 bg-white'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100/50'
                  }`}
                >
                  <div className="flex items-center justify-center gap-2">
                    <FontAwesomeIcon icon={faTable} size="sm" className="fa-icon-force-current" />
                    <span className="hidden md:inline">Tabla</span>
                    <span className="md:hidden">Tabla</span>
                  </div>
                  {activeTab === 'table' && (
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 to-purple-600"></div>
                  )}
                </button>
              </div>

              {/* Tab Content */}
              <div className={`${activeTab === 'table' ? 'p-2' : 'p-6 md:p-8'}`}>
                {activeTab === 'table' ? (
                  <ResponsesTable
                    survey={survey}
                    responses={filteredResponses}
                    onExportExcel={exportToExcel}
                    formatAnswer={formatAnswer}
                    formatDate={formatDate}
                    getResponsePublicLinks={getResponsePublicLinks}
                  />
                ) : activeTab === 'individual' ? (
                  /* Pestaña: Respuestas Individuales */
                  filteredResponses.length === 0 ? (
                    <div className="text-center py-16">
                      <p className="text-gray-500 font-medium">Ninguna respuesta coincide con los filtros</p>
                      <button
                        type="button"
                        onClick={clearFilters}
                        className="mt-3 text-sm text-indigo-600 font-semibold hover:underline"
                      >
                        Limpiar filtros
                      </button>
                    </div>
                  ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3">
                    {filteredResponses.map((response, index) => {
                      const dateValue = response.created_at || response.timestamp || response.created || response.date || response.submitted_at;
                      const responseId = response.id || response._id;
                      const formattedDate = formatDate(dateValue, responseId);
                      const surveyor = response.surveyor_name || response.surveyor_id;
                      const answerCount = response.answers && typeof response.answers === 'object'
                        ? Object.keys(response.answers).length
                        : 0;
                      const metaParts = [
                        formattedDate !== '-' ? formattedDate : null,
                        surveyor || null,
                        answerCount > 0 ? `${answerCount} preg.` : 'Sin respuestas',
                      ].filter(Boolean);
                      const preview = getResponsePreviewField(response);

                      return (
                      <div 
                        key={response.id || response._id || index} 
                        className="bg-white rounded-xl border border-gray-200 p-3 sm:p-4 shadow-sm hover:shadow-md hover:border-indigo-300 transition-all cursor-pointer group"
                        onClick={() => setSelectedResponse(response)}
                      >
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <span className="font-bold text-gray-900 group-hover:text-indigo-700">#{index + 1}</span>
                          {response.synced ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs font-bold shrink-0">
                              <FontAwesomeIcon icon={faCheck} size="xs" className="fa-icon-force-current" />
                              En línea
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded-full text-xs font-bold shrink-0">
                              ⏳ Pendiente
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-600 truncate" title={metaParts.join(' · ')}>
                          {metaParts.join(' · ')}
                        </p>
                        {preview && (
                          <p className="text-xs text-gray-500 truncate mt-0.5" title={`${preview.label}: ${preview.value}`}>
                            <span className="font-medium text-gray-600">{preview.label}:</span> {preview.value}
                          </p>
                        )}
                        {survey?.informed_consent_enabled && (
                          <button
                            type="button"
                            className="mt-2 w-full text-left text-xs font-bold text-emerald-700 hover:text-emerald-900 hover:bg-emerald-50 rounded-lg px-2 py-1.5 border border-emerald-100"
                            onClick={(e) => {
                              e.stopPropagation();
                              setConsentResponse(response);
                            }}
                          >
                            Ver consentimiento
                          </button>
                        )}
                      </div>
                      );
                    })}
                  </div>
                  )
                ) : (
                  /* Pestaña: Estadísticas por Pregunta */
                  filteredResponses.length === 0 ? (
                    <div className="text-center py-16">
                      <p className="text-gray-500 font-medium">Ninguna respuesta coincide con los filtros</p>
                      <button
                        type="button"
                        onClick={clearFilters}
                        className="mt-3 text-sm text-indigo-600 font-semibold hover:underline"
                      >
                        Limpiar filtros
                      </button>
                    </div>
                  ) : (
                  <div className="space-y-8">
                    {orderedStatEntries.length > 0 ? (
                      <>
                        {chartableStatEntries.length > 0 && (
                          <section>
                            <div className="flex items-center gap-3 mb-4">
                              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-md">
                                <FontAwesomeIcon icon={faChartBar} size="sm" className="fa-icon-force-white" />
                              </div>
                              <div>
                                <h3 className="text-lg font-black text-gray-900">Distribución gráfica</h3>
                                <p className="text-sm text-gray-500">{chartableStatEntries.length} pregunta{chartableStatEntries.length === 1 ? '' : 's'} con gráficos</p>
                              </div>
                            </div>
                            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                              {chartableStatEntries.map(([questionId, stat]) => renderStatCard(questionId, stat, 'featured'))}
                            </div>
                          </section>
                        )}

                        {otherStatEntries.length > 0 && (
                          <section className={chartableStatEntries.length > 0 ? 'border-t border-gray-200 pt-6' : ''}>
                            {chartableStatEntries.length > 0 ? (
                              <button
                                type="button"
                                onClick={() => setOtherStatsExpanded((v) => !v)}
                                className="flex items-center justify-between w-full gap-3 mb-3 text-left group"
                              >
                                <div>
                                  <h3 className="text-sm font-bold text-gray-600 group-hover:text-gray-800">
                                    Otros campos (texto, documentos, números)
                                  </h3>
                                  <p className="text-xs text-gray-400">
                                    {otherStatEntries.length} pregunta{otherStatEntries.length === 1 ? '' : 's'} sin gráfico de distribución
                                  </p>
                                </div>
                                <FontAwesomeIcon
                                  icon={otherStatsExpanded ? faChevronUp : faChevronDown}
                                  size="sm"
                                  className="text-gray-400 shrink-0 fa-icon-force-current"
                                />
                              </button>
                            ) : (
                              <div className="mb-3">
                                <h3 className="text-sm font-bold text-gray-600">Resumen de campos</h3>
                                <p className="text-xs text-gray-400">{otherStatEntries.length} pregunta{otherStatEntries.length === 1 ? '' : 's'}</p>
                              </div>
                            )}
                            {(otherStatsExpanded || chartableStatEntries.length === 0) && (
                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
                                {otherStatEntries.map(([questionId, stat]) => renderStatCard(questionId, stat, 'compact'))}
                              </div>
                            )}
                          </section>
                        )}
                      </>
                    ) : (
                      <div className="text-center py-12">
                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-400">
                          <FontAwesomeIcon icon={faChartBar} size="lg" className="fa-icon-force-current" />
                        </div>
                        <p className="text-lg font-bold text-gray-500">No hay estadísticas disponibles</p>
                        <p className="text-gray-400 mt-2">Las respuestas aún no contienen datos suficientes para generar estadísticas.</p>
                      </div>
                    )}
                  </div>
                  )
                )}
              </div>
            </div>
          </div>
        )}
      </div>
      {consentResponse && (
        <ConsentPreviewModal
          survey={survey}
          response={consentResponse}
          onClose={() => setConsentResponse(null)}
        />
      )}
    </main>
  );
};

// --- VISTA: GESTIÓN DE USUARIOS ---

const UserManagementView = ({ onBack, onLogout, userRole }) => {
  const [activeTab, setActiveTab] = useState('usuarios'); // 'usuarios' o 'grupos'
  const [users, setUsers] = useState([]);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showUserForm, setShowUserForm] = useState(false);
  const [showGroupForm, setShowGroupForm] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [editingGroup, setEditingGroup] = useState(null);
  const [formData, setFormData] = useState({
    username: '',
    first_name: '',
    last_name: '',
    email: '',
    password: '',
    password_confirm: '',
    role: 'encuestador',
    user_group_id: '',
    is_active: true
  });
  const [groupFormData, setGroupFormData] = useState({
    name: '',
    smtp_host: '',
    smtp_port: 465,
    smtp_user: '',
    smtp_password: '',
    smtp_use_tls: true,
    smtp_from_email: '',
    smtp_from_name: '',
    smtp_reply_to: '',
    smtp_test_email: '',
  });
  const emptyGroupForm = () => ({
    name: '',
    smtp_host: '',
    smtp_port: 465,
    smtp_user: '',
    smtp_password: '',
    smtp_use_tls: true,
    smtp_from_email: '',
    smtp_from_name: '',
    smtp_reply_to: '',
    smtp_test_email: '',
  });
  const [formError, setFormError] = useState('');
  const [smtpTesting, setSmtpTesting] = useState(false);
  const { useTableLayout } = useBreakpoint();
  const showGroupColumn = users.some(u => u.group_name || u.user_group_id);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await authenticatedFetch('/api/users/');
      if (!response.ok) {
        if (response.status === 403) {
          alert('No tienes permisos para gestionar usuarios.');
          onBack();
          return;
        }
        throw new Error('Error al cargar los usuarios.');
      }
      const data = await response.json();
      setUsers(data);
    } catch (error) {
      console.error("Error fetching users:", error);
      alert('No se pudieron cargar los usuarios. ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchGroups = async () => {
    try {
      const response = await authenticatedFetch('/api/groups/');
      if (!response.ok) {
        throw new Error('Error al cargar los grupos. Status: ' + response.status);
      }
      const data = await response.json();
      
      // Enriquecer grupos con información de usuarios
      const enrichedGroups = await Promise.all(data.map(async (group) => {
        // Contar usuarios en este grupo
        const usersInGroup = users.filter(u => u.user_group_id === group.id || String(u.user_group_id) === String(group.id));
        
        // Obtener el admin del grupo (usuario con role group_admin y user_group_id = group.id)
        const admin = users.find(u => 
          u.role === 'group_admin' && 
          (u.user_group_id === group.id || String(u.user_group_id) === String(group.id))
        );
        
        return {
          ...group,
          user_count: usersInGroup.length,
          admin_username: admin ? admin.username : null,
          admin_name: admin ? `${admin.first_name || ''} ${admin.last_name || ''}`.trim() || admin.username : null
        };
      }));
      
      setGroups(enrichedGroups);
    } catch (error) {
      console.error("Error fetching groups:", error);
      alert('No se pudieron cargar los grupos. ' + error.message);
    }
  };

  const canManageUsers = userRole === 'root' || userRole === 'group_admin';
  const canViewUsers = canManageUsers || userRole === 'analista';

  useEffect(() => {
    if (canViewUsers) {
      fetchUsers().then(() => {
        fetchGroups();
      });
    } else {
      alert('No tienes permisos para acceder a esta sección.');
      onBack();
    }
  }, [userRole]);

  useEffect(() => {
    if (activeTab === 'grupos' && users.length > 0) {
      fetchGroups();
    }
  }, [activeTab, users]);

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setFormError('');

    if (formData.password !== formData.password_confirm) {
      setFormError('Las contraseñas no coinciden.');
      return;
    }

    if (formData.password.length < 8) {
      setFormError('La contraseña debe tener al menos 8 caracteres.');
      return;
    }

    // Validar que si el rol es group_admin, se haya seleccionado un grupo (solo para root)
    if (formData.role === 'group_admin' && userRole === 'root' && !formData.user_group_id) {
      setFormError('Debes seleccionar un grupo para el Administrador de Grupo.');
      return;
    }

    try {
      const userData = { ...formData };
      // Si es group_admin creando usuario, NO enviar user_group_id (el backend lo asigna automáticamente)
      if (userRole === 'group_admin') {
        // group_admin siempre asigna su grupo automáticamente, no enviar user_group_id
        delete userData.user_group_id;
      } else if (userRole === 'root') {
        // root puede asignar user_group_id a cualquier usuario
        // Solo eliminar si no hay valor
        if (!userData.user_group_id) {
          delete userData.user_group_id;
        }
      }
      
      const response = await authenticatedFetch('/api/users/', {
        method: 'POST',
        body: JSON.stringify(userData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || JSON.stringify(errorData));
      }

      await fetchUsers();
      setShowUserForm(false);
      setFormData({
        username: '',
        first_name: '',
        last_name: '',
        email: '',
        password: '',
        password_confirm: '',
        role: 'encuestador',
        user_group_id: '',
        is_active: true
      });
      alert('Usuario creado exitosamente.');
    } catch (error) {
      console.error("Error creating user:", error);
      setFormError(error.message);
    }
  };

  const handleUpdateUser = async (e) => {
    e.preventDefault();
    setFormError('');

    if (formData.password && formData.password !== formData.password_confirm) {
      setFormError('Las contraseñas no coinciden.');
      return;
    }

    if (formData.password && formData.password.length < 8) {
      setFormError('La contraseña debe tener al menos 8 caracteres.');
      return;
    }

    // Validar que si el rol es group_admin, se haya seleccionado un grupo
    if (formData.role === 'group_admin' && !formData.user_group_id) {
      setFormError('Debes seleccionar un grupo para el Administrador de Grupo.');
      return;
    }

    try {
      const updateData = { ...formData };
      if (!updateData.password) {
        delete updateData.password;
        delete updateData.password_confirm;
      }
      // Siempre enviar user_group_id si está seleccionado (para cualquier rol)
      // Solo eliminar si no hay valor
      if (!updateData.user_group_id) {
        delete updateData.user_group_id;
      }

      const response = await authenticatedFetch(`/api/users/${editingUser.id}/`, {
        method: 'PUT',
        body: JSON.stringify(updateData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || JSON.stringify(errorData));
      }

      await fetchUsers();
      setShowUserForm(false);
      setEditingUser(null);
      setFormData({
        username: '',
        first_name: '',
        last_name: '',
        email: '',
        password: '',
        password_confirm: '',
        role: 'encuestador',
        user_group_id: '',
        is_active: true
      });
      alert('Usuario actualizado exitosamente.');
    } catch (error) {
      console.error("Error updating user:", error);
      setFormError(error.message);
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!confirm('¿Estás seguro de que deseas eliminar este usuario?')) {
      return;
    }

    try {
      const response = await authenticatedFetch(`/api/users/${userId}/`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Error al eliminar el usuario.');
      }

      await fetchUsers();
      alert('Usuario eliminado exitosamente.');
    } catch (error) {
      console.error("Error deleting user:", error);
      alert('Error al eliminar el usuario: ' + error.message);
    }
  };

  const handleEditUser = (user) => {
    setEditingUser(user);
    // Asegurar que user_group_id sea un string para que coincida con los valores del select
    let userGroupId = '';
    if (user.user_group_id) {
      // Convertir a string si es necesario
      userGroupId = String(user.user_group_id);
    }
    
    setFormData({
      username: user.username,
      first_name: user.first_name || '',
      last_name: user.last_name || '',
      email: user.email || '',
      password: '',
      password_confirm: '',
      role: user.role || 'encuestador',
      user_group_id: userGroupId,
      is_active: user.is_active !== undefined ? user.is_active : true
    });
    setShowUserForm(true);
    setFormError('');
  };

  const handleNewUser = () => {
    setEditingUser(null);
    setFormData({
      username: '',
      first_name: '',
      last_name: '',
      email: '',
      password: '',
      password_confirm: '',
      role: 'encuestador',
      user_group_id: '',
      is_active: true
    });
    setShowUserForm(true);
    setFormError('');
  };

  const getRoleBadgeColor = (role) => {
    switch (role) {
      case 'root':
        return 'bg-red-100 text-red-700 border-red-300';
      case 'group_admin':
        return 'bg-gray-100 text-gray-700 border-gray-300';
      case 'analista':
        return 'bg-blue-100 text-blue-700 border-blue-300';
      case 'encuestador':
        return 'bg-green-100 text-green-700 border-green-300';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-300';
    }
  };

  const getRoleLabel = (role) => {
    switch (role) {
      case 'root':
        return 'Root';
      case 'group_admin':
        return 'group_admin';
      case 'analista':
        return 'Analista';
      case 'encuestador':
        return 'Encuestador';
      default:
        return role;
    }
  };

  // Funciones para gestión de grupos
  const handleCreateGroup = async (e) => {
    e.preventDefault();
    setFormError('');

    try {
      const response = await authenticatedFetch('/api/groups/', {
        method: 'POST',
        body: JSON.stringify(groupFormData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || JSON.stringify(errorData));
      }

      await fetchGroups();
      setShowGroupForm(false);
      setGroupFormData(emptyGroupForm());
      alert('Grupo creado exitosamente.');
    } catch (error) {
      console.error("Error creating group:", error);
      setFormError(error.message);
    }
  };

  const handleUpdateGroup = async (e) => {
    e.preventDefault();
    setFormError('');

    try {
      const payload = { ...groupFormData };
      if (!(payload.smtp_password || '').trim()) {
        delete payload.smtp_password;
      }
      const response = await authenticatedFetch(`/api/groups/${editingGroup.id}/`, {
        method: 'PUT',
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || JSON.stringify(errorData));
      }

      await fetchGroups();
      setShowGroupForm(false);
      setEditingGroup(null);
      setGroupFormData(emptyGroupForm());
      alert('Grupo actualizado exitosamente.');
    } catch (error) {
      console.error("Error updating group:", error);
      setFormError(error.message);
    }
  };

  const handleDeleteGroup = async (groupId) => {
    if (!confirm('¿Estás seguro de que deseas eliminar este grupo?')) {
      return;
    }

    try {
      const response = await authenticatedFetch(`/api/groups/${groupId}/`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Error al eliminar el grupo.');
      }

      await fetchGroups();
      alert('Grupo eliminado exitosamente.');
    } catch (error) {
      console.error("Error deleting group:", error);
      alert('Error al eliminar el grupo: ' + error.message);
    }
  };

  const handleEditGroup = (group) => {
    setEditingGroup(group);
    setGroupFormData({
      name: group.name || '',
      smtp_host: group.smtp_host || '',
      smtp_port: group.smtp_port ?? 465,
      smtp_user: group.smtp_user || '',
      smtp_password: '',
      smtp_use_tls: group.smtp_use_tls !== false,
      smtp_from_email: group.smtp_from_email || '',
      smtp_from_name: group.smtp_from_name || '',
      smtp_reply_to: group.smtp_reply_to || '',
      smtp_test_email: '',
    });
    setShowGroupForm(true);
    setFormError('');
  };

  const handleNewGroup = () => {
    setEditingGroup(null);
    setGroupFormData(emptyGroupForm());
    setShowGroupForm(true);
    setFormError('');
  };

  const handleSmtpTest = async () => {
    if (!editingGroup?.id) {
      setFormError('Guarda el grupo primero para poder probar el envío SMTP.');
      return;
    }
    setSmtpTesting(true);
    setFormError('');
    try {
      const payload = {
        test_email: groupFormData.smtp_test_email,
        smtp_host: groupFormData.smtp_host,
        smtp_port: groupFormData.smtp_port,
        smtp_user: groupFormData.smtp_user,
        smtp_use_tls: groupFormData.smtp_use_tls,
        smtp_from_email: groupFormData.smtp_from_email,
        smtp_from_name: groupFormData.smtp_from_name,
        smtp_reply_to: groupFormData.smtp_reply_to,
      };
      if ((groupFormData.smtp_password || '').trim()) {
        payload.smtp_password = groupFormData.smtp_password;
      }
      const response = await authenticatedFetch(`/api/groups/${editingGroup.id}/smtp-test/`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.detail || 'No se pudo enviar la prueba');
      alert(data.message || 'Correo de prueba enviado.');
    } catch (error) {
      setFormError(error.message);
    } finally {
      setSmtpTesting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-[#f8fafc]">
        <p className="text-gray-600">Cargando usuarios...</p>
      </div>
    );
  }

  return (
    <main className="flex-1 relative z-10 overflow-x-hidden w-full min-w-0">
      <header className="sticky top-0 z-40 w-full px-4 sm:px-6 lg:px-10 xl:px-14 py-4 md:py-6 bg-white/70 backdrop-blur-xl border-b border-white/60 shadow-sm">
        <div className="w-full max-w-none flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-black bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent tracking-tight mb-1">
              Gestión de Usuarios
            </h1>
            <p className="text-sm text-gray-600 font-medium">Administra usuarios y grupos del sistema.</p>
          </div>
          <div className="flex flex-wrap gap-2 sm:gap-3 w-full lg:w-auto justify-start lg:justify-end">
            {activeTab === 'usuarios' && canManageUsers && (
              <button 
                onClick={handleNewUser} 
                className="px-3 py-2 sm:px-6 sm:py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-xl font-bold text-xs sm:text-sm shadow-xl hover:shadow-2xl flex items-center gap-2 transition-all duration-200 min-h-[44px]"
              >
                <FontAwesomeIcon icon={faUserPlus} size="sm" className="fa-icon-force-white" />
                <span className="hidden xs:inline sm:inline">Nuevo Usuario</span>
                <span className="xs:hidden sm:hidden">Nuevo</span>
              </button>
            )}
            {activeTab === 'grupos' && canManageUsers && (
              <button 
                onClick={handleNewGroup} 
                className="px-3 py-2 sm:px-6 sm:py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-xl font-bold text-xs sm:text-sm shadow-xl hover:shadow-2xl flex items-center gap-2 transition-all duration-200 min-h-[44px]"
              >
                <FontAwesomeIcon icon={faPlus} size="sm" className="fa-icon-force-white" />
                <span className="hidden sm:inline">Nuevo Grupo</span>
                <span className="sm:hidden">Nuevo</span>
              </button>
            )}
            <button 
              onClick={onBack} 
              className="px-3 py-2 sm:px-6 sm:py-3 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl font-bold text-xs sm:text-sm shadow-lg flex items-center gap-2 transition-all duration-200 min-h-[44px]"
            >
              <FontAwesomeIcon icon={faChevronLeft} size="sm" className="fa-icon-force-current" />
              Volver
            </button>
            {onLogout && (
              <button 
                onClick={onLogout} 
                className="px-3 py-2 sm:px-6 sm:py-3 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white rounded-xl font-bold text-xs sm:text-sm shadow-xl transition-all duration-200 min-h-[44px]"
              >
                Salir
              </button>
            )}
          </div>
        </div>
        
        {/* Tabs */}
        <div className="w-full max-w-none mt-4 flex gap-4 border-b border-gray-200">
          <button
            onClick={() => setActiveTab('usuarios')}
            className={`px-6 py-3 font-bold text-sm transition-colors ${
              activeTab === 'usuarios'
                ? 'text-purple-600 border-b-2 border-purple-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Usuarios
          </button>
          <button
            onClick={() => setActiveTab('grupos')}
            className={`px-6 py-3 font-bold text-sm transition-colors ${
              activeTab === 'grupos'
                ? 'text-purple-600 border-b-2 border-purple-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Grupos
          </button>
        </div>
      </header>

      <div className="w-full max-w-none px-4 sm:px-6 lg:px-10 xl:px-14 py-6 md:py-10 overflow-x-hidden">
        {activeTab === 'usuarios' && showUserForm && canManageUsers ? (
          <div className="bg-white/90 backdrop-blur-xl rounded-3xl border border-white/80 p-6 md:p-8 shadow-lg">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-black text-gray-800">
                {editingUser ? 'Editar Usuario' : 'Nuevo Usuario'}
              </h2>
              <button 
                onClick={() => {
                  setShowUserForm(false);
                  setEditingUser(null);
                  setFormError('');
                }}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <FontAwesomeIcon icon={faXmark} size="lg" className="text-gray-500" />
              </button>
            </div>

            <form onSubmit={editingUser ? handleUpdateUser : handleCreateUser} className="space-y-4">
              {formError && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
                  {formError}
                </div>
              )}

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Usuario <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) => setFormData({...formData, username: e.target.value})}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  required
                  disabled={!!editingUser}
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
                    value={formData.first_name}
                    onChange={(e) => setFormData({...formData, first_name: e.target.value})}
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
                    value={formData.last_name}
                    onChange={(e) => setFormData({...formData, last_name: e.target.value})}
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
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  autoComplete="email"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  {editingUser ? 'Nueva Contraseña (dejar vacío para no cambiar)' : 'Contraseña'} <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({...formData, password: e.target.value})}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  autoComplete="new-password"
                  required={!editingUser}
                  minLength={8}
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Confirmar Contraseña <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  value={formData.password_confirm}
                  onChange={(e) => setFormData({...formData, password_confirm: e.target.value})}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  autoComplete="new-password"
                  required={!editingUser}
                  minLength={8}
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Rol <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.role}
                  onChange={(e) => {
                    const newRole = e.target.value;
                    setFormData({
                      ...formData, 
                      role: newRole
                      // Mantener user_group_id al cambiar rol
                    });
                  }}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  required
                >
                  <option value="encuestador">Encuestador</option>
                  <option value="analista">Analista</option>
                  {userRole === 'root' && <option value="group_admin">Administrador de Grupo</option>}
                  {userRole === 'root' && <option value="root">Root</option>}
                </select>
              </div>

              {/* Mostrar selector de grupo para todos los roles excepto root, solo cuando el usuario actual es root */}
              {userRole === 'root' && formData.role !== 'root' && (
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    Grupo {formData.role === 'group_admin' && <span className="text-red-500">*</span>}
                    {formData.role !== 'group_admin' && <span className="text-gray-400 text-xs ml-1">(opcional)</span>}
                  </label>
                  <select
                    value={formData.user_group_id}
                    onChange={(e) => setFormData({...formData, user_group_id: e.target.value})}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    required={formData.role === 'group_admin'}
                  >
                    <option value="">Selecciona un grupo</option>
                    {(() => {
                      // Ordenar grupos: primero el grupo seleccionado (si existe), luego los demás
                      const sortedGroups = [...groups].sort((a, b) => {
                        const aId = String(a.id);
                        const bId = String(b.id);
                        const selectedId = String(formData.user_group_id);
                        
                        if (aId === selectedId) return -1;
                        if (bId === selectedId) return 1;
                        return a.name.localeCompare(b.name);
                      });
                      
                      return sortedGroups.map((group) => (
                        <option key={group.id} value={String(group.id)}>
                          {group.name}
                        </option>
                      ));
                    })()}
                  </select>
                  {groups.length === 0 && (
                    <p className="mt-2 text-sm text-amber-600">
                      No hay grupos disponibles. Crea un grupo primero en la pestaña "Grupos".
                    </p>
                  )}
                  {formData.role !== 'group_admin' && (
                    <p className="mt-2 text-sm text-gray-500">
                      Asignar un grupo permite que las encuestas del usuario se asocien automáticamente al grupo.
                    </p>
                  )}
                </div>
              )}

              {userRole === 'group_admin' && (
                <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded-r-lg">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm text-blue-700">
                        <strong>Nota:</strong> Los usuarios que crees heredarán automáticamente tu grupo. Solo puedes crear usuarios con rol <strong>Encuestador</strong> o <strong>Analista</strong>.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({...formData, is_active: e.target.checked})}
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
                  {editingUser ? 'Actualizar Usuario' : 'Crear Usuario'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowUserForm(false);
                    setEditingUser(null);
                    setFormError('');
                  }}
                  className="px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl font-bold transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        ) : activeTab === 'usuarios' ? (
          <>
            {users.length === 0 ? (
              <div className="text-center py-24 border-2 border-dashed border-gray-300/60 rounded-3xl bg-white/40 backdrop-blur-sm">
                <div className="w-20 h-20 bg-gradient-to-br from-indigo-100 to-purple-200 rounded-full flex items-center justify-center mx-auto mb-6 text-indigo-400 shadow-inner">
                  <FontAwesomeIcon icon={faUsers} size="2x" className="fa-icon-force-current" />
                </div>
                <p className="text-2xl font-black text-gray-700 mb-2">No hay usuarios</p>
                <p className="text-gray-500 mb-6">{canManageUsers ? 'Crea el primer usuario para comenzar.' : 'No hay usuarios para mostrar.'}</p>
                {canManageUsers && (
                <button
                  onClick={handleNewUser}
                  className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-xl font-bold shadow-xl hover:shadow-2xl transition-all duration-200 hover:scale-105 active:scale-95 flex items-center gap-2 mx-auto"
                >
                  <FontAwesomeIcon icon={faUserPlus} size="sm" className="fa-icon-force-white" /> Crear Usuario
                </button>
                )}
              </div>
            ) : useTableLayout ? (
              <div className="bg-white/90 backdrop-blur-xl rounded-3xl border border-white/80 shadow-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full table-fixed">
                    <thead className="bg-gradient-to-r from-indigo-50 to-purple-50 border-b-2 border-indigo-200">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-black text-gray-700 uppercase w-[120px]">Usuario</th>
                        <th className="px-4 py-3 text-left text-xs font-black text-gray-700 uppercase w-[140px]">Nombre</th>
                        <th className="px-4 py-3 text-left text-xs font-black text-gray-700 uppercase">Email</th>
                        <th className="px-4 py-3 text-left text-xs font-black text-gray-700 uppercase w-[100px]">Rol</th>
                        {showGroupColumn && (
                          <th className="px-4 py-3 text-left text-xs font-black text-gray-700 uppercase w-[130px]">Grupo</th>
                        )}
                        <th className="px-4 py-3 text-left text-xs font-black text-gray-700 uppercase w-[80px]">Estado</th>
                        <th className="px-4 py-3 text-left text-xs font-black text-gray-700 uppercase w-[100px]">Registro</th>
                        {canManageUsers && <th className="px-4 py-3 text-center text-xs font-black text-gray-700 uppercase w-[90px]">Acciones</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {users.map((user) => {
                        const fullName = user.first_name || user.last_name
                          ? `${user.first_name || ''} ${user.last_name || ''}`.trim()
                          : '-';
                        return (
                        <tr key={user.id} className="hover:bg-indigo-50/50 transition-colors">
                          <td className="px-4 py-3 text-sm font-bold text-gray-900 truncate" title={user.username}>{user.username}</td>
                          <td className="px-4 py-3 text-sm text-gray-700 truncate" title={fullName}>{fullName}</td>
                          <td className="px-4 py-3 text-sm text-gray-600 truncate" title={user.email || ''}>{user.email || '-'}</td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold border ${getRoleBadgeColor(user.role)}`}>
                              {getRoleLabel(user.role)}
                            </span>
                          </td>
                          {showGroupColumn && (
                            <td className="px-4 py-3">
                              {user.group_name ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-purple-700 border border-purple-300 truncate max-w-full" title={user.group_name}>
                                  <FontAwesomeIcon icon={faUsers} size="xs" className="fa-icon-force-current shrink-0" />
                                  <span className="truncate">{user.group_name}</span>
                                </span>
                              ) : (
                                <span className="text-sm text-gray-400">-</span>
                              )}
                            </td>
                          )}
                          <td className="px-4 py-3">
                            {user.is_active ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-green-100 text-green-700 border border-green-300">Activo</span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-700 border border-red-300">Inactivo</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600">
                            {user.date_joined ? new Date(user.date_joined).toLocaleDateString('es-ES') : '-'}
                          </td>
                          {canManageUsers && (
                          <td className="px-4 py-3 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button onClick={() => handleEditUser(user)} className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg min-w-[44px] min-h-[44px]" title="Editar usuario">
                                <FontAwesomeIcon icon={faPenToSquare} size="sm" className="fa-icon-force-current" />
                              </button>
                              <button onClick={() => handleDeleteUser(user.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg min-w-[44px] min-h-[44px]" title="Eliminar usuario">
                                <FontAwesomeIcon icon={faTrash} size="sm" className="fa-icon-force-current" />
                              </button>
                            </div>
                          </td>
                          )}
                        </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
                {users.map((user) => {
                  const fullName = user.first_name || user.last_name
                    ? `${user.first_name || ''} ${user.last_name || ''}`.trim()
                    : null;
                  return (
                    <div key={user.id} className="bg-white/90 backdrop-blur-xl rounded-2xl border border-white/80 shadow-md p-4 flex flex-col gap-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="font-black text-gray-900 truncate">{user.username}</p>
                          {fullName && <p className="text-sm text-gray-600 truncate">{fullName}</p>}
                        </div>
                        {canManageUsers && (
                          <div className="flex shrink-0 gap-1">
                            <button onClick={() => handleEditUser(user)} className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg min-w-[44px] min-h-[44px]" title="Editar">
                              <FontAwesomeIcon icon={faPenToSquare} size="sm" className="fa-icon-force-current" />
                            </button>
                            <button onClick={() => handleDeleteUser(user.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg min-w-[44px] min-h-[44px]" title="Eliminar">
                              <FontAwesomeIcon icon={faTrash} size="sm" className="fa-icon-force-current" />
                            </button>
                          </div>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold border ${getRoleBadgeColor(user.role)}`}>
                          {getRoleLabel(user.role)}
                        </span>
                        {user.group_name && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-purple-700 border border-purple-300">
                            <FontAwesomeIcon icon={faUsers} size="xs" className="fa-icon-force-current" />
                            {user.group_name}
                          </span>
                        )}
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold border ${user.is_active ? 'bg-green-100 text-green-700 border-green-300' : 'bg-red-100 text-red-700 border-red-300'}`}>
                          {user.is_active ? 'Activo' : 'Inactivo'}
                        </span>
                      </div>
                      {user.email && (
                        <p className="text-sm text-gray-500 truncate" title={user.email}>{user.email}</p>
                      )}
                      {user.date_joined && (
                        <p className="text-xs text-gray-400">
                          Registro: {new Date(user.date_joined).toLocaleDateString('es-ES')}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        ) : activeTab === 'grupos' ? (
          <>
            {showGroupForm && canManageUsers ? (
              <div className="bg-white/90 backdrop-blur-xl rounded-3xl border border-white/80 p-6 md:p-8 shadow-lg">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-black text-gray-800">
                    {editingGroup ? 'Editar Grupo' : 'Nuevo Grupo'}
                  </h2>
                  <button 
                    onClick={() => {
                      setShowGroupForm(false);
                      setEditingGroup(null);
                      setFormError('');
                    }}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <FontAwesomeIcon icon={faXmark} size="lg" className="text-gray-500" />
                  </button>
                </div>

                <form onSubmit={editingGroup ? handleUpdateGroup : handleCreateGroup} className="space-y-4">
                  {formError && (
                    <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
                      {formError}
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      Nombre del Grupo <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={groupFormData.name}
                      onChange={(e) => setGroupFormData({...groupFormData, name: e.target.value})}
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      required
                      autoComplete="off"
                    />
                  </div>

                    <div className="border-t border-gray-200 pt-4 space-y-3">
                    <h4 className="text-sm font-black text-gray-800">Correo / SMTP (OTP de consentimiento)</h4>
                    <p className="text-xs text-gray-500">
                      Credenciales del servidor de correo del departamento/grupo (ej. Hostinger: smtp.hostinger.com, puerto 465).
                    </p>
                    <div className="rounded-xl border border-amber-200 bg-amber-50/80 px-3 py-2.5 text-xs text-amber-950 leading-relaxed space-y-1.5">
                      <p className="font-bold text-amber-900">Para que el correo llegue a bandeja (no spam)</p>
                      <p>
                        Usa un remitente dedicado (p. ej. <span className="font-semibold">noreply@</span> o{' '}
                        <span className="font-semibold">autorizaciones@</span> del dominio), no una casilla genérica tipo{' '}
                        <span className="font-semibold">info@</span> si se puede evitar. El dominio de{' '}
                        <span className="font-semibold">SMTP_FROM</span> debe coincidir con el autenticado en el servidor.
                      </p>
                      <p>
                        En el panel DNS del dominio (Hostinger u otro) activa{' '}
                        <span className="font-semibold">SPF</span>, <span className="font-semibold">DKIM</span> y{' '}
                        <span className="font-semibold">DMARC</span>. Sin eso, Gmail/Outlook suelen filtrar o demorar el mensaje
                        aunque el SMTP responda bien. Checklist: <span className="font-mono">docs/EMAIL_DELIVERABILITY_CHECKLIST.md</span>.
                      </p>
                    </div>
                    {(() => {
                      const fromAddr = (groupFormData.smtp_from_email || '').trim().toLowerCase();
                      const userAddr = (groupFormData.smtp_user || '').trim().toLowerCase();
                      const fromDom = fromAddr.includes('@') ? fromAddr.split('@').pop() : '';
                      const userDom = userAddr.includes('@') ? userAddr.split('@').pop() : '';
                      if (fromDom && userDom && fromDom !== userDom) {
                        return (
                          <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                            Aviso: el dominio de <span className="font-semibold">SMTP_FROM</span> ({fromDom}) no coincide con el de{' '}
                            <span className="font-semibold">SMTP_USER</span> ({userDom}). Eso suele empeorar el filtrado antispam.
                            Usa el mismo dominio en ambos cuando sea posible.
                          </p>
                        );
                      }
                      return null;
                    })()}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="md:col-span-2">
                        <label className="block text-xs font-bold text-gray-600 mb-1">Servidor SMTP (SMTP_HOST)</label>
                        <input
                          type="text"
                          value={groupFormData.smtp_host}
                          onChange={(e) => setGroupFormData({ ...groupFormData, smtp_host: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm"
                          placeholder="smtp.hostinger.com"
                          autoComplete="off"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-600 mb-1">Puerto (SMTP_PORT)</label>
                        <input
                          type="number"
                          value={groupFormData.smtp_port}
                          onChange={(e) => setGroupFormData({ ...groupFormData, smtp_port: Number(e.target.value) || 465 })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm"
                          placeholder="465"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-600 mb-1">Usuario (SMTP_USER)</label>
                        <input
                          type="text"
                          value={groupFormData.smtp_user}
                          onChange={(e) => setGroupFormData({ ...groupFormData, smtp_user: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm"
                          placeholder="info@tudominio.com"
                          autoComplete="off"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-xs font-bold text-gray-600 mb-1">Contraseña (SMTP_PASS)</label>
                        <input
                          type="password"
                          value={groupFormData.smtp_password}
                          onChange={(e) => setGroupFormData({ ...groupFormData, smtp_password: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm"
                          placeholder="Dejar en blanco para mantener la contraseña guardada"
                          autoComplete="new-password"
                        />
                        {editingGroup?.smtp_password_set && (
                          <p className="text-xs text-gray-500 mt-1">Ya hay una contraseña guardada. Déjala vacía para no cambiarla.</p>
                        )}
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-600 mb-1">Correo remitente (SMTP_FROM)</label>
                        <input
                          type="email"
                          value={groupFormData.smtp_from_email}
                          onChange={(e) => setGroupFormData({ ...groupFormData, smtp_from_email: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm"
                          placeholder="info@tudominio.com"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-600 mb-1">Nombre remitente (SMTP_FROM_NAME)</label>
                        <input
                          type="text"
                          value={groupFormData.smtp_from_name}
                          onChange={(e) => setGroupFormData({ ...groupFormData, smtp_from_name: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm"
                          placeholder="Clínica Maicao"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-xs font-bold text-gray-600 mb-1">Responder a (SMTP_REPLY_TO)</label>
                        <input
                          type="email"
                          value={groupFormData.smtp_reply_to}
                          onChange={(e) => setGroupFormData({ ...groupFormData, smtp_reply_to: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm"
                          placeholder="info@tudominio.com"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-xs font-bold text-gray-600 mb-1">Correo de prueba (solo botón Probar envío)</label>
                        <input
                          type="email"
                          value={groupFormData.smtp_test_email}
                          onChange={(e) => setGroupFormData({ ...groupFormData, smtp_test_email: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm"
                          placeholder="prueba@gmail.com"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          El OTP de consentimiento usa el correo que el encuestado escribe en el modal. Este campo solo aplica a Probar envío.
                        </p>
                      </div>
                    </div>
                    {editingGroup?.smtp_configured && (
                      <p className="text-xs text-emerald-700">SMTP configurado en este grupo.</p>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-3 pt-4">
                    <button
                      type="submit"
                      className="flex-1 min-w-[140px] px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-xl font-bold shadow-xl hover:shadow-2xl transition-all duration-200 hover:scale-105 active:scale-95 inline-flex items-center justify-center gap-2"
                    >
                      <FontAwesomeIcon icon={faCheck} size="sm" className="fa-icon-force-white" />
                      {editingGroup ? 'Guardar' : 'Crear Grupo'}
                    </button>
                    {editingGroup && (
                      <button
                        type="button"
                        onClick={handleSmtpTest}
                        disabled={smtpTesting}
                        className="px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl font-bold transition-colors disabled:opacity-50 inline-flex items-center justify-center gap-2"
                      >
                        <FontAwesomeIcon icon={faPaperPlane} size="sm" />
                        {smtpTesting ? 'Enviando…' : 'Probar envío'}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setShowGroupForm(false);
                        setEditingGroup(null);
                        setFormError('');
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
                {groups.length === 0 ? (
                  <div className="text-center py-24 border-2 border-dashed border-gray-300/60 rounded-3xl bg-white/40 backdrop-blur-sm">
                    <div className="w-20 h-20 bg-gradient-to-br from-indigo-100 to-purple-200 rounded-full flex items-center justify-center mx-auto mb-6 text-indigo-400 shadow-inner">
                      <FontAwesomeIcon icon={faUsers} size="2x" className="fa-icon-force-current" />
                    </div>
                    <p className="text-2xl font-black text-gray-700 mb-2">No hay grupos</p>
                    <p className="text-gray-500 mb-6">{canManageUsers ? 'Crea el primer grupo para comenzar.' : 'No hay grupos para mostrar.'}</p>
                    {canManageUsers && (
                    <button
                      onClick={handleNewGroup}
                      className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-xl font-bold shadow-xl hover:shadow-2xl transition-all duration-200 hover:scale-105 active:scale-95 flex items-center gap-2 mx-auto"
                    >
                      <FontAwesomeIcon icon={faPlus} size="sm" className="fa-icon-force-white" /> Crear Grupo
                    </button>
                    )}
                  </div>
                ) : (
                  <div className="bg-white/90 backdrop-blur-xl rounded-3xl border border-white/80 p-6 md:p-8 shadow-lg">
                    <h2 className="text-xl font-black text-gray-800 mb-6">Gestión de Grupos de Usuarios</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {groups.map((group) => (
                        <div key={group.id} className="border-2 border-gray-200 rounded-xl p-4 hover:border-purple-300 transition-colors">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-3 flex-1">
                              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                                <FontAwesomeIcon icon={faUsers} size="sm" className="text-purple-600" />
                              </div>
                              <div className="flex-1">
                                <h3 className="font-black text-gray-800 text-lg">{group.name}</h3>
                                <div className="mt-2 space-y-1">
                                  {group.admin_username && (
                                    <div className="flex items-center gap-2 text-sm text-gray-600">
                                      <FontAwesomeIcon icon={faUser} size="xs" className="text-gray-400" />
                                      <span>Admin: {group.admin_username}</span>
                                    </div>
                                  )}
                                  <div className="flex items-center gap-2 text-sm text-gray-600">
                                    <FontAwesomeIcon icon={faUsers} size="xs" className="text-gray-400" />
                                    <span>Usuarios: {group.user_count || 0}</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {(userRole === 'root' || userRole === 'group_admin') && (
                                <>
                                  <button
                                    onClick={() => handleEditGroup(group)}
                                    className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                    title="Editar grupo / SMTP"
                                  >
                                    <FontAwesomeIcon icon={faPenToSquare} size="sm" className="fa-icon-force-current" />
                                  </button>
                                  {userRole === 'root' && (
                                  <button
                                    onClick={() => handleDeleteGroup(group.id)}
                                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                    title="Eliminar grupo"
                                  >
                                    <FontAwesomeIcon icon={faTrash} size="sm" className="fa-icon-force-current" />
                                  </button>
                                  )}
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </>
        ) : null}
      </div>
    </main>
  );
};

// --- VISTA: DASHBOARD DE ENCUESTAS ---

// Componente de diálogo para compartir
const ShareDialog = ({ survey, onClose, onUpdatePublicStatus }) => {
  const [linkType, setLinkType] = useState(survey.is_public ? 'public' : 'private');
  const [updating, setUpdating] = useState(false);

  const handleCopyLink = () => {
    const surveyId = survey.id || survey._id;
    let url;
    
    if (linkType === 'public') {
      url = `${window.location.origin}/public/survey/${surveyId}`;
    } else {
      // Enlace privado requiere autenticación - usar la URL del dashboard con ID
      url = `${window.location.origin}/?survey=${surveyId}`;
    }
    
    copyToClipboard(url);
  };

  const handleTogglePublic = async () => {
    if (updating) return;
    
    setUpdating(true);
    try {
      const newIsPublic = linkType === 'public';
      const surveyId = survey.id || survey._id;
      
      // Solo enviar is_public para no sobrescribir preguntas ni tipos (evita corrupción al publicar)
      const response = await authenticatedFetch(`/api/surveys/${surveyId}/`, {
        method: 'PUT',
        body: JSON.stringify({ is_public: newIsPublic })
      });
      
      if (!response.ok) {
        throw new Error('Error al actualizar el estado de la encuesta');
      }
      
      // Llamar al callback para actualizar el estado local
      if (onUpdatePublicStatus) {
        onUpdatePublicStatus(surveyId, newIsPublic);
      }
      
      // Copiar el enlace correspondiente
      handleCopyLink();
      onClose();
    } catch (error) {
      alert('Error al actualizar: ' + error.message);
    } finally {
      setUpdating(false);
    }
  };

  const copyToClipboard = (text) => {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => {
        alert('Enlace copiado al portapapeles:\n' + text);
      }).catch(() => {
        copyToClipboardFallback(text);
      });
    } else {
      copyToClipboardFallback(text);
    }
  };

  const copyToClipboardFallback = (text) => {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.left = '-999999px';
    textarea.style.top = '-999999px';
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    
    try {
      const successful = document.execCommand('copy');
      if (successful) {
        alert('Enlace copiado al portapapeles:\n' + text);
      } else {
        prompt('Copia este enlace:', text);
      }
    } catch (err) {
      prompt('Copia este enlace:', text);
    } finally {
      document.body.removeChild(textarea);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-black text-gray-800">Compartir Encuesta</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <FontAwesomeIcon icon={faXmark} size="lg" className="text-gray-500" />
          </button>
            </div>
        
        <div className="mb-6">
          <p className="text-gray-600 mb-4">Elige el tipo de enlace:</p>
          
          <div className="space-y-3">
            <label className={`flex items-start gap-4 p-4 border-2 rounded-xl cursor-pointer transition-all ${
              linkType === 'public' 
                ? 'border-indigo-500 bg-indigo-50' 
                : 'border-gray-200 hover:border-gray-300'
            }`}>
              <input
                type="radio"
                name="linkType"
                value="public"
                checked={linkType === 'public'}
                onChange={(e) => setLinkType(e.target.value)}
                className="mt-1"
              />
              <div className="flex-1">
                <div className="font-bold text-gray-800 mb-1">Enlace Público</div>
                <div className="text-sm text-gray-600">
                  Cualquiera con el enlace puede responder sin autenticación
                </div>
              </div>
            </label>
            
            <label className={`flex items-start gap-4 p-4 border-2 rounded-xl cursor-pointer transition-all ${
              linkType === 'private' 
                ? 'border-indigo-500 bg-indigo-50' 
                : 'border-gray-200 hover:border-gray-300'
            }`}>
              <input
                type="radio"
                name="linkType"
                value="private"
                checked={linkType === 'private'}
                onChange={(e) => setLinkType(e.target.value)}
                className="mt-1"
              />
              <div className="flex-1">
                <div className="font-bold text-gray-800 mb-1">Enlace Privado</div>
                <div className="text-sm text-gray-600">
                  Solo usuarios autenticados pueden acceder
                </div>
              </div>
            </label>
          </div>
        </div>
        
        <div className="flex gap-3">
          <button
            onClick={handleCopyLink}
            className="flex-1 px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl font-bold transition-colors"
          >
            Copiar Enlace
          </button>
          <button
            onClick={handleTogglePublic}
            disabled={updating || (linkType === 'public') === survey.is_public}
            className="flex-1 px-4 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-xl font-bold transition-colors"
          >
            {updating ? 'Actualizando...' : 'Aplicar y Copiar'}
          </button>
            </div>
        </div>
    </div>
);
};

const SurveyCard = ({ survey, onEdit, onDelete, onViewResponses, onShare, onUpdatePublicStatus, onDuplicate, canEdit = true }) => {
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const titleRef = React.useRef(null);
  const cardRef = React.useRef(null);


  const handleShare = (e) => {
    e.stopPropagation();
    if (onShare) {
      onShare(survey);
    } else {
      setShowShareDialog(true);
    }
  };

  // Truncar descripción de manera inteligente
  const truncateDescription = (text, maxLength = 120) => {
    if (!text) return 'Sin descripción.';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength).trim() + '...';
  };

  return (
    <>
      {showShareDialog && (
        <ShareDialog
          survey={survey}
          onClose={() => setShowShareDialog(false)}
          onUpdatePublicStatus={onUpdatePublicStatus}
        />
      )}
      <div 
        ref={cardRef}
        className="group bg-white/90 backdrop-blur-xl border border-white/80 rounded-3xl p-6 shadow-lg hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 relative"
        style={{ overflow: 'visible', boxSizing: 'border-box' }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Gradiente de fondo sutil al hacer hover */}
        <div className={`absolute inset-0 bg-gradient-to-br from-indigo-50/50 via-purple-50/30 to-pink-50/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 -z-0 rounded-3xl`} style={{ overflow: 'hidden' }}></div>
        
        <div className="relative z-10">
          {/* Header con título y badge - SIN FLEX, igual que eliminadas */}
          <div className="mb-4">
            <h3 className="text-xl font-black text-gray-800">{survey.title || 'Sin título'}</h3>
            {survey.is_public && (
              <span className="inline-block mt-2 px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold">
                Pública
              </span>
            )}
          </div>

          {/* Descripción mejorada */}
          <p className="text-sm text-gray-600 leading-relaxed mb-5 line-clamp-3 min-h-[3.75rem]">
            {truncateDescription(survey.description)}
          </p>

          {/* Footer con información y acciones */}
          <div className="flex flex-col gap-4 pt-4 border-t border-gray-200/60">
            {/* Información de la encuesta */}
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-3 text-xs text-gray-500 flex-wrap">
                <span className="flex items-center gap-1.5 px-2.5 py-1 bg-gray-100 rounded-lg font-semibold">
                  <FontAwesomeIcon icon={faListUl} size="sm" className="text-indigo-500 fa-icon-force-current" />
                  {survey.questions.length} {survey.questions.length === 1 ? 'Pregunta' : 'Preguntas'}
                </span>
                {survey.group_name && (
                  <span className="flex items-center gap-1 px-2.5 py-1 bg-purple-100 text-purple-700 rounded-lg font-semibold">
                    <FontAwesomeIcon icon={faUsers} size="sm" className="fa-icon-force-current" />
                    {survey.group_name}
                  </span>
                )}
                {survey.created_by_username && (
                  <span className="flex items-center gap-1 px-2.5 py-1 bg-blue-100 text-blue-700 rounded-lg font-semibold">
                    <FontAwesomeIcon icon={faUser} size="sm" className="fa-icon-force-current" />
                    {survey.created_by_username}
                  </span>
                )}
                {survey.created_at && (
                  <span className="flex items-center gap-1 text-gray-400">
                    <FontAwesomeIcon icon={faCalendarDays} size="sm" className="fa-icon-force-current" />
                    {new Date(survey.created_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                  </span>
                )}
              </div>
            </div>

            {/* Botones de acción mejorados */}
            <div className="flex items-center justify-end gap-1">
              {canEdit && (
              <button 
                onClick={handleShare} 
                className="p-2.5 rounded-xl hover:bg-gradient-to-br hover:from-green-50 hover:to-emerald-50 text-gray-500 hover:text-green-600 transition-all duration-200 hover:scale-110 active:scale-95" 
                title="Compartir encuesta"
              >
                <FontAwesomeIcon icon={faShareNodes} size="sm" className="fa-icon-force-current" />
              </button>
              )}
              <button 
                onClick={onViewResponses} 
                className="p-2.5 rounded-xl hover:bg-gradient-to-br hover:from-indigo-50 hover:to-purple-50 text-gray-500 hover:text-indigo-600 transition-all duration-200 hover:scale-110 active:scale-95" 
                title="Ver respuestas"
              >
                <FontAwesomeIcon icon={faChartBar} size="sm" className="fa-icon-force-current" />
              </button>
              {canEdit && (
              <>
              <button 
                onClick={onEdit} 
                className="p-2.5 rounded-xl hover:bg-gradient-to-br hover:from-blue-50 hover:to-cyan-50 text-gray-500 hover:text-blue-600 transition-all duration-200 hover:scale-110 active:scale-95" 
                title="Editar"
              >
                <FontAwesomeIcon icon={faPenToSquare} size="sm" className="fa-icon-force-current" />
              </button>
              {onDuplicate && (
              <button 
                onClick={onDuplicate} 
                className="p-2.5 rounded-xl hover:bg-gradient-to-br hover:from-amber-50 hover:to-orange-50 text-gray-500 hover:text-amber-600 transition-all duration-200 hover:scale-110 active:scale-95" 
                title="Duplicar encuesta"
              >
                <FontAwesomeIcon icon={faCopy} size="sm" className="fa-icon-force-current" />
              </button>
              )}
              <button 
                onClick={onDelete} 
                className="p-2.5 rounded-xl hover:bg-gradient-to-br hover:from-red-50 hover:to-rose-50 text-gray-500 hover:text-red-600 transition-all duration-200 hover:scale-110 active:scale-95" 
                title="Eliminar"
              >
                <FontAwesomeIcon icon={faTrash} size="sm" className="fa-icon-force-current" />
              </button>
              </>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

const SurveyDashboard = ({ surveys, deletedSurveys = [], onNewSurvey, onEditSurvey, onDeleteSurvey, onRestoreSurvey, onPermanentDeleteSurvey, onViewResponses, onLogout, onUpdatePublicStatus, userRole, currentUser, onViewUsers, onDuplicateSurvey }) => {
  const [activeTab, setActiveTab] = React.useState('active'); // 'active' or 'deleted'
  const [searchQuery, setSearchQuery] = React.useState('');
  const [groupFilter, setGroupFilter] = React.useState('all');
  const [publicFilter, setPublicFilter] = React.useState('all');
  const [sortBy, setSortBy] = React.useState('newest');
  const [filtersExpanded, setFiltersExpanded] = React.useState(true);

  // Filtrar encuestas activas y eliminadas
  const activeSurveys = React.useMemo(
    () => surveys.filter((s) => !s.is_deleted),
    [surveys]
  );
  const deletedSurveysList = React.useMemo(
    () => (deletedSurveys.length > 0 ? deletedSurveys : surveys.filter((s) => s.is_deleted)),
    [deletedSurveys, surveys]
  );

  const currentTabSurveys = activeTab === 'deleted' ? deletedSurveysList : activeSurveys;

  const groupOptions = React.useMemo(() => {
    const names = new Set();
    currentTabSurveys.forEach((s) => {
      if (s.group_name) names.add(String(s.group_name));
    });
    return Array.from(names).sort((a, b) => a.localeCompare(b, 'es'));
  }, [currentTabSurveys]);

  const hasActiveFilters = Boolean(
    searchQuery.trim() || groupFilter !== 'all' || publicFilter !== 'all' || sortBy !== 'newest'
  );

  const applySurveyFilters = React.useCallback((list) => {
    let result = list.filter((survey) => {
      const q = searchQuery.trim().toLowerCase();
      if (q) {
        const haystack = [
          survey.title,
          survey.description,
          survey.group_name,
          survey.created_by_username,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }

      if (groupFilter !== 'all' && String(survey.group_name || '') !== groupFilter) return false;

      if (publicFilter === 'public' && !survey.is_public) return false;
      if (publicFilter === 'private' && survey.is_public) return false;

      return true;
    });

    result = [...result];
    switch (sortBy) {
      case 'title_asc':
        result.sort((a, b) => (a.title || '').localeCompare(b.title || '', 'es'));
        break;
      case 'title_desc':
        result.sort((a, b) => (b.title || '').localeCompare(a.title || '', 'es'));
        break;
      case 'oldest':
        result.sort((a, b) => new Date(a.created_at || 0) - new Date(b.created_at || 0));
        break;
      case 'questions_desc':
        result.sort((a, b) => (b.questions?.length || 0) - (a.questions?.length || 0));
        break;
      case 'newest':
      default:
        result.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
        break;
    }
    return result;
  }, [searchQuery, groupFilter, publicFilter, sortBy]);

  const filteredActiveSurveys = React.useMemo(
    () => applySurveyFilters(activeSurveys),
    [activeSurveys, applySurveyFilters]
  );

  const filteredDeletedSurveys = React.useMemo(
    () => applySurveyFilters(deletedSurveysList),
    [deletedSurveysList, applySurveyFilters]
  );

  const displayedSurveys = activeTab === 'deleted' ? filteredDeletedSurveys : filteredActiveSurveys;

  const clearFilters = () => {
    setSearchQuery('');
    setGroupFilter('all');
    setPublicFilter('all');
    setSortBy('newest');
  };

  // Calcular estadísticas sobre encuestas activas filtradas
  const totalSurveys = filteredActiveSurveys.length;
  const publicSurveys = filteredActiveSurveys.filter((s) => s.is_public).length;
  const totalQuestions = filteredActiveSurveys.reduce((sum, s) => sum + (s.questions?.length || 0), 0);
  
  const isRoot = userRole === 'root';
  const isGroupAdmin = userRole === 'group_admin';
  const isAnalista = userRole === 'analista';
  const canManageUsers = isRoot || isGroupAdmin;
  const canViewUsers = canManageUsers || isAnalista;  // analista solo lectura
  const canEditSurveys = !isAnalista;  // analista es solo lectura, no puede crear/editar/eliminar

  const displayName = currentUser ? [currentUser.first_name, currentUser.last_name].filter(Boolean).join(' ').trim() || currentUser.username : '';
  const roleLabel = (currentUser?.role && { root: 'Administrador', group_admin: 'Administrador de grupo', encuestador: 'Encuestador', analista: 'Analista' }[currentUser.role]) || currentUser?.role || '';

  return (
    <main className="flex-1 relative z-10">
        <header className="sticky top-0 z-40 px-4 py-5 md:px-12 md:py-6 bg-white/70 backdrop-blur-xl border-b border-white/60 shadow-sm">
           <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
               <div className="min-w-0 flex-1">
                 <h1 className="text-3xl md:text-4xl font-black bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent tracking-tight mb-1">
                   Mis Encuestas
                 </h1>
                 <p className="text-sm text-gray-600 font-medium">Gestiona y crea tus formularios de manera eficiente.</p>
                 {currentUser && (
                   <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs sm:text-sm text-gray-500">
                     <span className="font-semibold text-gray-700">{displayName || currentUser.username}</span>
                     {currentUser.email && <span>{currentUser.email}</span>}
                     {roleLabel && <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 font-medium">{roleLabel}</span>}
                     <span
                       className="inline-flex items-center px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 font-mono text-[11px] sm:text-xs border border-gray-200/80"
                       title={`Versión ${APP_VERSION}\nCommit ${GIT_SHA}\nBuild ${BUILD_TIME || '—'}`}
                     >
                       {APP_VERSION_LABEL}
                     </span>
                   </div>
                 )}
               </div>
               <div className="flex gap-3 flex-shrink-0">
                 {canViewUsers && onViewUsers && (
                   <button 
                     onClick={onViewUsers} 
                     className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-xl font-bold text-sm shadow-xl hover:shadow-2xl flex items-center gap-2 transition-all duration-200 hover:scale-105 active:scale-95"
                   >
                     <FontAwesomeIcon icon={faUsers} size="sm" className="fa-icon-force-white" /> Usuarios
                   </button>
                 )}
                 {canEditSurveys && (
                 <button 
                   onClick={onNewSurvey} 
                   className="px-6 py-3 bg-gradient-to-r from-gray-900 to-gray-800 hover:from-black hover:to-gray-900 text-white rounded-xl font-bold text-sm shadow-xl hover:shadow-2xl flex items-center gap-2 transition-all duration-200 hover:scale-105 active:scale-95"
                 >
                   <FontAwesomeIcon icon={faPlus} size="sm" className="fa-icon-force-white" /> Nueva Encuesta
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
            {/* Pestañas para root */}
            {isRoot && (
              <div className="mb-6 bg-white/80 backdrop-blur-xl rounded-3xl border border-white/60 shadow-lg overflow-hidden">
                <div className="flex border-b border-gray-200 bg-gray-50/50">
                  <button
                    onClick={() => setActiveTab('active')}
                    className={`flex-1 px-6 py-4 font-bold text-sm transition-all duration-200 relative ${
                      activeTab === 'active'
                        ? 'text-indigo-600 bg-white'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100/50'
                    }`}
                  >
                    <div className="flex items-center justify-center gap-2">
                      <FontAwesomeIcon icon={faFileLines} size="sm" className="fa-icon-force-current" />
                      <span>Activas ({activeSurveys.length})</span>
                    </div>
                    {activeTab === 'active' && (
                      <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 to-purple-600"></div>
                    )}
                  </button>
                  <button
                    onClick={() => setActiveTab('deleted')}
                    className={`flex-1 px-6 py-4 font-bold text-sm transition-all duration-200 relative ${
                      activeTab === 'deleted'
                        ? 'text-red-600 bg-white'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100/50'
                    }`}
                  >
                    <div className="flex items-center justify-center gap-2">
                      <FontAwesomeIcon icon={faTrash} size="sm" className="fa-icon-force-current" />
                      <span>Eliminadas ({deletedSurveysList.length})</span>
                    </div>
                    {activeTab === 'deleted' && (
                      <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-red-500 to-rose-600"></div>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Filtros */}
            {(activeTab === 'active' || (activeTab === 'deleted' && isRoot)) && currentTabSurveys.length > 0 && (
              <div className="mb-6 bg-white/80 backdrop-blur-xl rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                <button
                  type="button"
                  onClick={() => setFiltersExpanded((v) => !v)}
                  className="w-full flex items-center justify-between gap-2 px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50/80"
                >
                  <span className="inline-flex items-center gap-2">
                    <FontAwesomeIcon icon={faFilter} size="sm" className="text-indigo-500 fa-icon-force-current" />
                    Filtros
                    {hasActiveFilters && (
                      <span className="px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 text-[10px] font-bold">
                        Activos
                      </span>
                    )}
                  </span>
                  <span className="text-xs text-gray-500 font-normal">
                    {displayedSurveys.length} de {currentTabSurveys.length}
                    <FontAwesomeIcon icon={filtersExpanded ? faChevronUp : faChevronDown} size="xs" className="ml-2 fa-icon-force-current" />
                  </span>
                </button>
                {filtersExpanded && (
                  <div className="px-4 pb-4 pt-1 border-t border-gray-100 space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                      <div className="sm:col-span-2 relative">
                        <FontAwesomeIcon
                          icon={faSearch}
                          size="sm"
                          className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 fa-icon-force-current pointer-events-none"
                        />
                        <input
                          type="search"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          placeholder="Buscar por título, descripción o grupo..."
                          className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        />
                      </div>
                      {groupOptions.length > 0 && (
                        <select
                          value={groupFilter}
                          onChange={(e) => setGroupFilter(e.target.value)}
                          className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:ring-2 focus:ring-indigo-500"
                        >
                          <option value="all">Todos los grupos</option>
                          {groupOptions.map((name) => (
                            <option key={name} value={name}>{name}</option>
                          ))}
                        </select>
                      )}
                      <select
                        value={publicFilter}
                        onChange={(e) => setPublicFilter(e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="all">Todas (pública/privada)</option>
                        <option value="public">Solo públicas</option>
                        <option value="private">Solo privadas</option>
                      </select>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                      <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                        className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:ring-2 focus:ring-indigo-500 min-w-[180px]"
                      >
                        <option value="newest">Más recientes</option>
                        <option value="oldest">Más antiguas</option>
                        <option value="title_asc">Título A → Z</option>
                        <option value="title_desc">Título Z → A</option>
                        <option value="questions_desc">Más preguntas</option>
                      </select>
                      {hasActiveFilters && (
                        <button
                          type="button"
                          onClick={clearFilters}
                          className="px-3 py-2 text-sm font-semibold text-gray-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                        >
                          Limpiar filtros
                        </button>
                      )}
                      <span className="text-xs text-gray-500 ml-auto">
                        {displayedSurveys.length === currentTabSurveys.length
                          ? `Mostrando las ${currentTabSurveys.length} encuestas`
                          : `${displayedSurveys.length} coincidencias de ${currentTabSurveys.length}`}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}
            
            {activeTab === 'deleted' && isRoot ? (
              /* Vista de eliminadas (solo root) */
              deletedSurveysList.length === 0 ? (
                <div className="text-center py-24 border-2 border-dashed border-gray-300/60 rounded-3xl bg-white/40 backdrop-blur-sm">
                  <div className="w-20 h-20 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center mx-auto mb-6 text-gray-400 shadow-inner">
                    <FontAwesomeIcon icon={faTrash} size="2x" className="fa-icon-force-current" />
                  </div>
                  <p className="text-2xl font-black text-gray-700 mb-2">No hay encuestas eliminadas</p>
                  <p className="text-gray-500">Las encuestas eliminadas aparecerán aquí.</p>
                </div>
            ) : displayedSurveys.length === 0 ? (
                <div className="text-center py-16 border-2 border-dashed border-gray-300/60 rounded-3xl bg-white/40 backdrop-blur-sm">
                  <p className="text-lg font-bold text-gray-600 mb-2">Ninguna encuesta coincide con los filtros</p>
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="text-sm text-indigo-600 font-semibold hover:underline"
                  >
                    Limpiar filtros
                  </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {displayedSurveys.map(s => (
                    <div key={s.id || s._id} className="bg-white/90 backdrop-blur-xl rounded-3xl border-2 border-red-200 p-6 md:p-8 shadow-lg opacity-75">
                      <div className="flex items-start justify-between mb-4">
                        <h3 className="text-xl font-black text-gray-800 line-through">{s.title || 'Sin título'}</h3>
                        <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-xs font-bold">Eliminada</span>
                </div>
                      <p className="text-sm text-gray-600 mb-4 line-clamp-2">{s.description || 'Sin descripción'}</p>
                      <div className="flex gap-2 mt-4">
                        <button
                          onClick={() => onRestoreSurvey && onRestoreSurvey(s.id || s._id)}
                          className="flex-1 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-xl font-bold text-sm transition-all duration-200"
                        >
                          <FontAwesomeIcon icon={faCheck} size="sm" className="fa-icon-force-white mr-2" />
                          Restaurar
                        </button>
                        <button
                          onClick={() => onPermanentDeleteSurvey && onPermanentDeleteSurvey(s.id || s._id)}
                          className="flex-1 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-xl font-bold text-sm transition-all duration-200"
                        >
                          <FontAwesomeIcon icon={faTrash} size="sm" className="fa-icon-force-white mr-2" />
                          Eliminar
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )
            ) : (
              /* Vista de activas */
              activeSurveys.length === 0 ? (
                <div className="text-center py-24 border-2 border-dashed border-gray-300/60 rounded-3xl bg-white/40 backdrop-blur-sm col-span-full">
                    <div className="w-20 h-20 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-full flex items-center justify-center mx-auto mb-6 text-indigo-400 shadow-inner">
                      <FontAwesomeIcon icon={faFileLines} size="2x" className="fa-icon-force-current" />
                    </div>
                    <p className="text-2xl font-black text-gray-700 mb-2">No hay encuestas todavía</p>
                    <p className="text-gray-500 mb-6">{canEditSurveys ? 'Comienza creando tu primera encuesta para recopilar respuestas.' : 'No tienes encuestas para ver.'}</p>
                    {canEditSurveys && (
                    <button 
                      onClick={onNewSurvey}
                      className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-xl font-bold shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105 active:scale-95"
                    >
                      <FontAwesomeIcon icon={faPlus} size="sm" className="fa-icon-force-white mr-2" />
                      Crear Primera Encuesta
                    </button>
                    )}
                </div>
              ) : displayedSurveys.length === 0 ? (
                <div className="text-center py-16 border-2 border-dashed border-gray-300/60 rounded-3xl bg-white/40 backdrop-blur-sm col-span-full">
                  <p className="text-lg font-bold text-gray-600 mb-2">Ninguna encuesta coincide con los filtros</p>
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="text-sm text-indigo-600 font-semibold hover:underline"
                  >
                    Limpiar filtros
                  </button>
                </div>
              ) : (
                <>
                  {/* Estadísticas rápidas */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                    <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl p-5 text-white shadow-lg hover:shadow-xl transition-shadow">
                      <div className="text-3xl font-black mb-1">{totalSurveys}</div>
                      <div className="text-sm opacity-90 font-medium">
                        {hasActiveFilters ? 'Encuestas filtradas' : 'Total Encuestas'}
                      </div>
                    </div>
                    <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl p-5 text-white shadow-lg hover:shadow-xl transition-shadow">
                      <div className="text-3xl font-black mb-1">{publicSurveys}</div>
                      <div className="text-sm opacity-90 font-medium">Encuestas Públicas</div>
                    </div>
                    <div className="bg-gradient-to-br from-blue-500 to-cyan-600 rounded-2xl p-5 text-white shadow-lg hover:shadow-xl transition-shadow">
                      <div className="text-3xl font-black mb-1">{totalQuestions}</div>
                      <div className="text-sm opacity-90 font-medium">Total Preguntas</div>
                    </div>
                  </div>

                  {/* Grid de encuestas */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {displayedSurveys.map(s => <SurveyCard 
                        key={s.id || s._id} 
                        survey={s} 
                        onEdit={() => onEditSurvey(s)} 
                        onDelete={() => onDeleteSurvey(s.id || s._id)} 
                        onViewResponses={() => onViewResponses(s)} 
                        onUpdatePublicStatus={onUpdatePublicStatus}
                        onDuplicate={onDuplicateSurvey ? () => onDuplicateSurvey(s) : undefined}
                        canEdit={canEditSurveys}
                      />)}
                  </div>
                </>
              )
            )}
        </div>
    </main>
);
};

// --- COMPONENTE PRINCIPAL (GESTOR DE VISTAS) ---

export default function App() {
  // Check if we're on a public survey route
  const pathname = window.location.pathname;
  const publicSurveyMatch = pathname.match(/^\/public\/survey\/(.+)$/);
  const publicSurveyId = publicSurveyMatch ? publicSurveyMatch[1] : null;
  const initialView = publicSurveyId ? 'public' : 'dashboard';
  const [view, setView] = useState(initialView); // 'dashboard' | 'editor' | 'login' | 'responses' | 'public' | 'users'
  const [surveys, setSurveys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingSurveyId, setEditingSurveyId] = useState(null); // State to hold the ID of the survey being edited
  const [surveyToEdit, setSurveyToEdit] = useState(null); // State to hold the fetched survey data
  const [editSurveyLoading, setEditSurveyLoading] = useState(false);
  const [surveyForResponses, setSurveyForResponses] = useState(null); // Survey to view responses for
  const [responses, setResponses] = useState([]); // Responses for the selected survey
  const [responsesLoading, setResponsesLoading] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [loginCredentials, setLoginCredentials] = useState({ username: '', password: '' });
  const [currentUser, setCurrentUser] = useState(null); // Usuario actual con su rol
  const [deletedSurveys, setDeletedSurveys] = useState([]); // Encuestas eliminadas

  const requireAuthOrLogin = (error) => {
    const msg = error?.message || '';
    if (msg.includes('No authentication token') || msg.includes('Session expired') || msg.includes('Token refresh failed')) {
      logout();
      setView('login');
      setSurveys([]);
      setCurrentUser(null);
      return true;
    }
    return false;
  };

  const fetchSurveys = async () => {
    setLoading(true);
    try {
        const response = await authenticatedFetch('/api/surveys/');
        if (!response.ok) throw new Error('Error al cargar los datos.');
        const data = await response.json();
        setSurveys(data);
    } catch (error) {
        console.error("Error fetching surveys:", error);
        if (requireAuthOrLogin(error)) return;
        alert('No se pudieron cargar las encuestas. ' + error.message);
    } finally {
        setLoading(false);
    }
  };

  const fetchSurveyToEdit = async (id) => {
      setEditSurveyLoading(true);
      setSurveyToEdit(null);
      try {
          if (!id || id === 'undefined') {
            throw new Error('ID de encuesta inválido');
          }
          const response = await authenticatedFetch(`/api/surveys/${id}/`);
          if (!response.ok) throw new Error('Error al cargar la encuesta.');
          const data = await response.json();
          // Normalizar: preguntas con section_id que no existe → null (evita error al guardar)
          const sectionIds = (data.sections || []).map(s => s.id);
          const questions = (data.questions || []).map(q => ({
            ...q,
            section_id: q.section_id && sectionIds.includes(q.section_id) ? q.section_id : null
          }));
          setSurveyToEdit({ ...data, questions });
      } catch (error) {
          console.error("Error fetching survey for edit:", error);
          alert('No se pudo cargar la encuesta para editar. ' + error.message);
          setEditingSurveyId(null);
          setView('dashboard');
      } finally {
          setEditSurveyLoading(false);
      }
  };

  // Effect to check authentication and fetch surveys on component mount
  useEffect(() => {
    // Skip auth check if this is a public survey route
    if (publicSurveyId) {
      setLoading(false);
      return;
    }
    if (!isAuthenticated()) {
      setView('login');
      setLoading(false);
    } else {
      (async () => {
        await ensureFreshToken(); // refresh token first; on 401 tokens are cleared
        if (!isAuthenticated()) {
          setView('login');
          setLoading(false);
          return;
        }
        fetchSurveys();
        fetchCurrentUser();
      })();
    }
  }, []);

  // Cargar encuestas eliminadas cuando el usuario es root
  useEffect(() => {
    if (isAuthenticated() && currentUser?.role === 'root') {
      fetchDeletedSurveys();
    }
  }, [currentUser]);

  const fetchCurrentUser = async () => {
    try {
      const response = await authenticatedFetch('/api/me/');
      if (response.ok) {
        const userData = await response.json();
        setCurrentUser(userData);
      }
    } catch (error) {
      console.error("Error fetching current user:", error);
      requireAuthOrLogin(error);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError('');
    try {
      await login(loginCredentials.username, loginCredentials.password);
      await fetchCurrentUser(); // Obtener datos del usuario después del login
      setView('dashboard');
      fetchSurveys();
    } catch (error) {
      setLoginError(error.message || 'Error al iniciar sesión');
    }
  };

  const handleLogout = () => {
    logout();
    setView('login');
    setSurveys([]);
  };

  // Effect to fetch a specific survey when editingSurveyId changes
  useEffect(() => {
    if (editingSurveyId) {
        fetchSurveyToEdit(editingSurveyId);
        setView('editor'); // Switch to editor view once ID is set
    } else {
        setSurveyToEdit(null); // Clear surveyToEdit if no ID is set
    }
  }, [editingSurveyId]); // Depend on editingSurveyId

  const handleSaveSurvey = async (surveyData) => {
    const typeMapping = { 
      'Texto Corto': 'short_text', 
      'Párrafo': 'long_text', 
      'Opción Única': 'single_choice', 
      'Casillas': 'checkbox', 
      'Desplegable': 'dropdown', 
      'Número': 'number', 
      'Fecha': 'date', 
      'Puntuación': 'rating',
      'Firma': 'signature',
      'Adjuntar archivos': 'file_upload',
      'Correo Electrónico': 'email',
      'Título': 'titulo',
      'Evaluación': 'evaluation_table'
    };
    const DEFAULT_GROUP_ID = '693ad3cccced5113d39dc29d';
    
    // Check if it's an existing survey or a new one
    const method = surveyData.id ? 'PUT' : 'POST'; // Use PUT for update, POST for create
    const url = surveyData.id ? `/api/surveys/${surveyData.id}/` : '/api/surveys/';

    // Validate sections: ensure all referenced sections exist
    const sectionIds = (surveyData.sections || []).map(s => s.id);
    const invalidSectionRefs = surveyData.questions.filter(q => q.section_id && !sectionIds.includes(q.section_id));
    if (invalidSectionRefs.length > 0) {
      alert('Error: Algunas preguntas hacen referencia a secciones que no existen. Por favor, corrige las asignaciones de sección.');
      return;
    }

    // Validate conditional logic: referenced questions exist and value is set
    const questionIds = surveyData.questions.map(q => q.id);
    const invalidConditionRefs = surveyData.questions.filter(q => {
      if (!q.conditional_logic || !q.conditional_logic.question_id) return false;
      return !questionIds.includes(q.conditional_logic.question_id);
    });
    if (invalidConditionRefs.length > 0) {
      alert('Error: Algunas preguntas tienen lógica condicional que referencia preguntas que no existen.');
      return;
    }
    const incompleteConditions = surveyData.questions.filter(q => {
      const cl = q.conditional_logic;
      if (!cl || !cl.question_id) return false;
      const val = cl.value;
      return val === undefined || val === null || String(val).trim() === '';
    });
    if (incompleteConditions.length > 0) {
      alert('Error: Completa el valor de "Mostrar solo si…" en todas las preguntas con lógica condicional.');
      return;
    }

    const surveyPayload = { 
      title: surveyData.title, 
      description: surveyData.description || '', 
      group: DEFAULT_GROUP_ID, 
      questions: surveyData.questions.map((q, index) => {
        const questionText = q.text ?? q.question_text ?? '';
        const displayType = q.type || q.question_type;
        const backendType = typeMapping[displayType] ?? displayType ?? 'short_text';
        const payload = {
          id: q.id || `q_${index}`,
          text: questionText,
          question_text: questionText,
          type: backendType,
          question_type: backendType,
          options: q.options ?? [],
          description: q.description ?? '',
          required: (displayType === 'Título') ? false : Boolean(q.required),
          section_id: q.section_id ?? null,
          conditional_logic: q.conditional_logic ?? null,
          evaluation_items: q.evaluation_items ?? [],
          evaluation_columns: q.evaluation_columns ?? [],
          date_include_time: Boolean(q.date_include_time),
          question_image: q.question_image || ''
        };
        if (backendType === 'file_upload') payload.accept = q.accept || 'image/*,application/pdf';
        return payload;
      }),
      sections: (surveyData.sections || []).map((s, index) => ({
        id: s.id || `section_${index}`,
        title: s.title ?? '',
        description: s.description ?? '',
        order: s.order ?? index
      })),
      is_public: surveyData.is_public || false,
      reference_key_column: surveyData.reference_key_column || '',
      reference_mapping: surveyData.reference_mapping || {},
      documento_empleado_question_id: surveyData.documento_empleado_question_id || '',
      documento_votante_question_id: surveyData.documento_votante_question_id || '',
      header_image: surveyData.header_image || '',
      consent_responsible: surveyData.consent_responsible || '',
      consent_purpose: surveyData.consent_purpose || '',
      informed_consent_enabled: Boolean(surveyData.informed_consent_enabled),
      informed_consent: surveyData.informed_consent_enabled
        ? {
            title: surveyData.informed_consent?.title || '',
            body: surveyData.informed_consent?.body || '',
            mappings: Array.isArray(surveyData.informed_consent?.mappings)
              ? surveyData.informed_consent.mappings.map((m) => ({
                  key: m.key,
                  question_id: m.question_id || '',
                }))
              : [],
            letterhead: surveyData.informed_consent?.letterhead_pdf
              ? 'custom'
              : (surveyData.informed_consent?.letterhead || 'membrete2'),
            letterhead_pdf: surveyData.informed_consent?.letterhead_pdf || '',
            letterhead_filename: surveyData.informed_consent?.letterhead_filename || '',
            signature_question_id: surveyData.informed_consent?.signature_question_id || '',
            acceptance_question_id: surveyData.informed_consent?.acceptance_question_id || '',
            acceptance_value: surveyData.informed_consent?.acceptance_value || 'SI, AUTORIZO',
            denial_value: surveyData.informed_consent?.denial_value || 'NO AUTORIZO',
          }
        : (surveyData.informed_consent || {}),
    };

    try {
        const response = await authenticatedFetch(url, { 
          method: method, 
          body: JSON.stringify(surveyPayload) 
        });
        if (!response.ok) {
          // Intentar obtener el mensaje de error del servidor (DRF devuelve serializer.errors con claves por campo)
          let errorMessage = 'El servidor respondió con un error.';
          try {
            const errorData = await response.json();
            console.error('[DEBUG] Survey save error response:', errorData);
            if (errorData.detail) {
              errorMessage = typeof errorData.detail === 'string' ? errorData.detail : JSON.stringify(errorData.detail);
            } else if (errorData && typeof errorData === 'object' && !Array.isArray(errorData)) {
              // DRF validation: body es { field: ["msg"] } o { field: [{ ... }] }
              const parts = Object.entries(errorData).map(([field, val]) => {
                if (Array.isArray(val)) return `${field}: ${val.map(v => typeof v === 'object' ? JSON.stringify(v) : v).join('; ')}`;
                return `${field}: ${String(val)}`;
              });
              errorMessage = parts.length ? `Error de validación: ${parts.join(' | ')}` : errorMessage;
            }
          } catch (e) {
            console.error("Error parsing error response:", e);
          }
          throw new Error(errorMessage);
        }
        alert("¡Encuesta guardada con éxito!");
        fetchSurveys(); // Recargar la lista de encuestas
        setView('dashboard'); // Volver al dashboard
        setEditingSurveyId(null); // Clear editing state
    } catch (error) {
        console.error("Error al guardar la encuesta:", error);
        alert(`Hubo un error al guardar la encuesta: ${error.message}`);
    }
  };
  
  const handleDeleteSurvey = async (id) => {
      if (!window.confirm("¿Estás seguro de que quieres eliminar esta encuesta? La encuesta se moverá a la sección de eliminadas y podrás restaurarla más tarde.")) return;
      
      try {
          if (!id || id === 'undefined') {
            throw new Error('ID de encuesta inválido');
          }
          const response = await authenticatedFetch(`/api/surveys/${id}/`, { method: 'DELETE' });
          if(response.status === 200 || response.status === 204) {
              alert("Encuesta eliminada correctamente. Puedes restaurarla desde la pestaña de eliminadas.");
              await fetchSurveys();
              if (currentUser?.role === 'root') {
                await fetchDeletedSurveys(); // Recargar eliminadas
              }
          } else {
              throw new Error('No se pudo eliminar la encuesta.');
          }
      } catch (error) {
          console.error("Error deleting survey:", error);
          alert(error.message);
      }
  }

  const handleDuplicateSurvey = async (survey) => {
    const surveyId = survey?.id || survey?._id;
    if (!surveyId) {
      alert('Error: La encuesta no tiene un ID válido');
      return;
    }
    try {
      const res = await authenticatedFetch(`/api/surveys/${surveyId}/`);
      if (!res.ok) throw new Error('Error al cargar la encuesta');
      const data = await res.json();
      const payload = {
        title: (data.title || 'Encuesta') + ' (copia)',
        description: data.description || '',
        header_image: data.header_image || '',
        group: data.group || null,
        questions: data.questions || [],
        sections: data.sections || [],
        is_public: false,
      };
      const createRes = await authenticatedFetch('/api/surveys/', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      if (!createRes.ok) {
        const errData = await createRes.json().catch(() => ({}));
        throw new Error(errData.detail || errData.title?.[0] || 'Error al crear la copia');
      }
      alert('Encuesta duplicada correctamente.');
      await fetchSurveys();
    } catch (error) {
      console.error('Error duplicating survey:', error);
      alert(error.message || 'No se pudo duplicar la encuesta.');
    }
  };

  const handleRestoreSurvey = async (id) => {
      if (!window.confirm("¿Estás seguro de que quieres restaurar esta encuesta?")) return;
      
      try {
          if (!id || id === 'undefined') {
            throw new Error('ID de encuesta inválido');
          }
          const response = await authenticatedFetch(`/api/surveys/${id}/restore/`, { method: 'POST' });
          if(response.ok) {
              alert("Encuesta restaurada correctamente.");
              await fetchSurveys();
              if (currentUser?.role === 'root') {
                await fetchDeletedSurveys(); // Recargar eliminadas
              }
          } else {
              const errorData = await response.json();
              throw new Error(errorData.detail || 'No se pudo restaurar la encuesta.');
          }
      } catch (error) {
          console.error("Error restoring survey:", error);
          alert(error.message);
      }
  }

  const handlePermanentDeleteSurvey = async (id) => {
      if (!window.confirm("⚠️ ADVERTENCIA: Esta acción es PERMANENTE e IRREVERSIBLE. La encuesta será eliminada completamente del sistema. ¿Estás completamente seguro?")) return;
      if (!window.confirm("Esta es tu última oportunidad. ¿Realmente quieres eliminar permanentemente esta encuesta?")) return;
      
      try {
          if (!id || id === 'undefined') {
            throw new Error('ID de encuesta inválido');
          }
          const response = await authenticatedFetch(`/api/surveys/${id}/permanent-delete/`, { method: 'DELETE' });
          if(response.ok) {
              alert("Encuesta eliminada permanentemente.");
              await fetchSurveys();
              if (currentUser?.role === 'root') {
                await fetchDeletedSurveys(); // Recargar eliminadas
              }
          } else {
              const errorData = await response.json();
              throw new Error(errorData.detail || 'No se pudo eliminar permanentemente la encuesta.');
          }
      } catch (error) {
          console.error("Error permanently deleting survey:", error);
          alert(error.message);
      }
  }

  const fetchDeletedSurveys = async () => {
    try {
        const response = await authenticatedFetch('/api/surveys/?show_deleted=true');
        if (!response.ok) throw new Error('Error al cargar las encuestas eliminadas.');
        const data = await response.json();
        const deleted = data.filter(s => s.is_deleted === true);
        setDeletedSurveys(deleted);
        return deleted;
    } catch (error) {
        console.error("Error fetching deleted surveys:", error);
        setDeletedSurveys([]);
        return [];
    }
  };

  const handleNewSurvey = () => {
      setEditingSurveyId(null); // Clear any editing state
      setSurveyToEdit(null); // Clear pre-filled data
      setView('editor');
  }

  const handleBackToDashboard = () => {
      setEditingSurveyId(null); // Clear any editing state
      setSurveyToEdit(null); // Clear pre-filled data
      setSurveyForResponses(null); // Clear responses survey
      setResponses([]); // Clear responses
      setView('dashboard');
  }

  const fetchResponses = async (surveyId) => {
    setResponsesLoading(true);
    try {
      const response = await authenticatedFetch(`/api/responses/?survey_id=${surveyId}`);
      if (!response.ok) throw new Error('Error al cargar las respuestas.');
      const data = await response.json();
      setResponses(data);
    } catch (error) {
      console.error("Error fetching responses:", error);
      alert('No se pudieron cargar las respuestas. ' + error.message);
      setResponses([]);
    } finally {
      setResponsesLoading(false);
    }
  };

  const handleViewResponses = async (survey) => {
    const surveyId = survey.id || survey._id;
    if (!surveyId) {
      alert('Error: La encuesta no tiene un ID válido');
      return;
    }
    setSurveyForResponses(survey);
    setView('responses');
    await fetchResponses(surveyId);
  };

  const handleResetResponses = async (survey) => {
    const surveyId = survey?.id || survey?._id;
    if (!surveyId) return;
    if (!window.confirm('¿Eliminar todas las respuestas de esta encuesta? Esta acción no se puede deshacer.')) return;
    try {
      const response = await authenticatedFetch('/api/responses/reset/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ survey_id: surveyId }),
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.detail || 'Error al reiniciar respuestas.');
      }
      await fetchResponses(surveyId);
    } catch (error) {
      console.error('Reset responses error:', error);
      alert(error.message || 'No se pudieron borrar las respuestas.');
    }
  };

  const handleUpdatePublicStatus = async (surveyId, isPublic) => {
    // Update the survey in the local state
    setSurveys(prevSurveys => 
      prevSurveys.map(s => 
        (s.id === surveyId || s._id === surveyId) 
          ? { ...s, is_public: isPublic }
          : s
      )
    );
    // Optionally refetch to ensure consistency
    await fetchSurveys();
  };


  // Public survey view (no authentication required)
  if (view === 'public' && publicSurveyId) {
    return <PublicSurveyView surveyId={publicSurveyId} />;
  }

  if (loading) {
      return <div className="h-screen w-full flex items-center justify-center bg-gray-100"><p>Cargando...</p></div>;
  }

  // Login view
  if (view === 'login') {
    return (
      <div className="min-h-screen w-full bg-[#f8fafc] flex items-center justify-center font-sans">
        <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-purple-200/40 rounded-full mix-blend-multiply filter blur-[120px] animate-blob" />
          <div className="absolute top-[20%] right-[-10%] w-[40%] h-[40%] bg-blue-200/40 rounded-full mix-blend-multiply filter blur-[120px] animate-blob animation-delay-2000" />
          <div className="absolute bottom-[-10%] left-[20%] w-[60%] h-[40%] bg-pink-200/30 rounded-full mix-blend-multiply filter blur-[120px] animate-blob animation-delay-4000" />
        </div>
        <div className="relative z-10 bg-white/80 backdrop-blur-lg rounded-2xl shadow-xl p-8 w-full max-w-md">
          <h1 className="text-3xl font-black text-gray-800 mb-2">Survey App</h1>
          <p className="text-gray-500 mb-6">Inicia sesión para continuar</p>
          <form onSubmit={handleLogin}>
            <div className="mb-4">
              <label className="block text-sm font-bold text-gray-700 mb-2">Usuario</label>
              <input
                type="text"
                value={loginCredentials.username}
                onChange={(e) => setLoginCredentials({...loginCredentials, username: e.target.value})}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                autoComplete="username"
                required
              />
            </div>
            <div className="mb-6">
              <label className="block text-sm font-bold text-gray-700 mb-2">Contraseña</label>
              <input
                type="password"
                value={loginCredentials.password}
                onChange={(e) => setLoginCredentials({...loginCredentials, password: e.target.value})}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                autoComplete="current-password"
                required
              />
            </div>
            {loginError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                {loginError}
              </div>
            )}
            <button
              type="submit"
              className="w-full px-5 py-2.5 bg-gray-900 hover:bg-black text-white rounded-xl font-bold text-sm shadow-xl transition-transform active:scale-95"
            >
              Iniciar Sesión
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-[#f8fafc] flex flex-col md:flex-row font-sans text-gray-800 selection:bg-indigo-100 selection:text-indigo-700">
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
         <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-purple-200/40 rounded-full mix-blend-multiply filter blur-[120px] animate-blob" />
         <div className="absolute top-[20%] right-[-10%] w-[40%] h-[40%] bg-blue-200/40 rounded-full mix-blend-multiply filter blur-[120px] animate-blob animation-delay-2000" />
         <div className="absolute bottom-[-10%] left-[20%] w-[60%] h-[40%] bg-pink-200/30 rounded-full mix-blend-multiply filter blur-[120px] animate-blob animation-delay-4000" />
         <div className="absolute inset-0 bg-[url('/noise.svg')] opacity-20"></div>
      </div>
      
      {view === 'dashboard' ? (
          <SurveyDashboard 
              surveys={surveys} 
              deletedSurveys={deletedSurveys}
              onNewSurvey={handleNewSurvey} 
              onDeleteSurvey={handleDeleteSurvey}
              onRestoreSurvey={handleRestoreSurvey}
              onPermanentDeleteSurvey={handlePermanentDeleteSurvey}
              onDuplicateSurvey={handleDuplicateSurvey}
              onEditSurvey={(survey) => {
                const surveyId = survey.id || survey._id;
                if (!surveyId) {
                  alert('Error: La encuesta no tiene un ID válido');
                  return;
                }
                setEditingSurveyId(surveyId); // Set the ID of the survey to edit
                // setView('editor') will be called by useEffect
              }}
              onViewResponses={handleViewResponses}
              onLogout={handleLogout}
              onUpdatePublicStatus={handleUpdatePublicStatus}
              userRole={currentUser?.role}
              currentUser={currentUser}
              onViewUsers={() => setView('users')}
          />
      ) : view === 'users' ? (
          <UserManagementView
              onBack={handleBackToDashboard}
              onLogout={handleLogout}
              userRole={currentUser?.role}
          />
      ) : view === 'responses' ? (
          <SurveyResponsesView
              survey={surveyForResponses || {}}
              responses={responses}
              onBack={handleBackToDashboard}
              loading={responsesLoading}
              userRole={currentUser?.role}
              onResetResponses={handleResetResponses}
          />
      ) : editSurveyLoading || (editingSurveyId && !surveyToEdit) ? (
          <div className="min-h-screen flex items-center justify-center">
            <p className="text-lg font-semibold text-gray-600">Cargando encuesta…</p>
          </div>
      ) : (
          <SurveyEditor 
              key={editingSurveyId || 'new'}
              onSave={handleSaveSurvey}
              onBack={handleBackToDashboard}
              initialSurveyData={surveyToEdit}
          />
      )}

      <style>{`
        @keyframes blob { 0% { transform: translate(0px, 0px) scale(1); } 33% { transform: translate(30px, -50px) scale(1.1); } 66% { transform: translate(-20px, 20px) scale(0.9); } 100% { transform: translate(0px, 0px) scale(1); } }
        .animate-blob { animation: blob 10s infinite; } .animation-delay-2000 { animation: blob 10s infinite; } .animation-delay-4000 { animation: blob 10s infinite; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fadeIn { animation: fadeIn 0.5s ease-in-out forwards; }
      `}</style>
    </div>
  );
}