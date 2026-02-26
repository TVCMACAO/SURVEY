import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faPlus, faGear, faFont, faListUl, faSquareCheck, faStar, faCalendarDays, 
  faShareNodes, faTrash, faXmark, faBars, faEllipsisVertical, faChevronLeft, 
  faPenToSquare, faFileLines, faHashtag, faAlignLeft, faImage, faEye, faChartBar, faCheck,
  faPaperPlane, faTable, faFileExcel, faDownload, faChartPie, faChartLine, faUsers, faUserPlus, faUser,
  faSignature, faEraser, faEnvelope, faHeading, faCopy,
  faChevronUp, faChevronDown, faGripVertical
} from '@fortawesome/free-solid-svg-icons';
import { authenticatedFetch, isAuthenticated, login, logout, ensureFreshToken } from './auth';
import * as XLSX from 'xlsx';
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
  Legend
);

// --- UTILIDADES ---
const generateId = () => `q_${Math.random().toString(36).substr(2, 9)}`;

// --- COMPONENTE DE FIRMA ---
const SignaturePad = ({ value, onChange }) => {
  const canvasRef = React.useRef(null);
  const [isDrawing, setIsDrawing] = React.useState(false);
  const [hasSignature, setHasSignature] = React.useState(!!value);

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
    if (!isDrawing) return;
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

  return (
    <div className="w-full">
      <div className="border-2 border-gray-300 rounded-xl bg-white overflow-hidden shadow-inner">
        <canvas
          ref={canvasRef}
          width={600}
          height={200}
          className="w-full h-48 cursor-crosshair touch-none"
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
        />
      </div>
      <div className="flex justify-between items-center mt-3">
        <p className="text-xs text-gray-500 italic">Firma en el área de arriba</p>
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
        onUpdate({ ...data, options });
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
                  onChange={(e) => onUpdate({...data, text: e.target.value})}
                  placeholder="Escribe tu pregunta de párrafo aquí..."
                  className="w-full text-lg sm:text-xl md:text-2xl font-bold bg-transparent border-none focus:ring-0 p-0 text-gray-800 placeholder-gray-300 leading-tight h-20 resize-none"
                />
              ) : data.type === 'Título' ? (
                <div className="space-y-3">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Contenido informativo (no se pide respuesta)</p>
                  <input
                    type="text"
                    value={data.text}
                    onChange={(e) => onUpdate({...data, text: e.target.value})}
                    placeholder="Ej: 1. OBJETIVO DE LA RONDA"
                    className="w-full text-lg sm:text-xl md:text-2xl font-bold bg-transparent border-none focus:ring-0 p-0 text-gray-800 placeholder-gray-300 leading-tight"
                  />
                  <textarea
                    value={data.description || ''}
                    onChange={(e) => onUpdate({...data, description: e.target.value})}
                    placeholder="Párrafo informativo (ej: Realizar seguimiento continuo al comportamiento laboral...)"
                    className="w-full text-sm sm:text-base bg-transparent border-none focus:ring-0 p-0 text-gray-600 placeholder-gray-400 leading-relaxed min-h-[80px] resize-none"
                  />
                </div>
              ) : (
                <input 
                  autoFocus 
                  type="text"
                  value={data.text} 
                  onChange={(e) => onUpdate({...data, text: e.target.value})} 
                  placeholder="Escribe tu pregunta aquí..." 
                  className="w-full text-lg sm:text-xl md:text-2xl font-bold bg-transparent border-none focus:ring-0 p-0 text-gray-800 placeholder-gray-300 leading-tight" 
                />
              )}
              
              {data.type !== 'Título' && (
              <input type="text" value={data.description || ''} onChange={(e) => onUpdate({...data, description: e.target.value})} placeholder="Añade una descripción (opcional)" className="w-full text-xs sm:text-sm md:text-base mt-2 md:mt-3 bg-transparent border-none focus:ring-0 p-0 text-gray-500 placeholder-gray-400" />
              )}
              
              <div className="mt-4 sm:mt-6 pt-4 sm:pt-6 border-t border-gray-100/50">
                {isOptionType && (
                  <div className="space-y-2 sm:space-y-3">
                     {data.options?.map((opt, idx) => (
                       <div key={idx} className="flex items-center gap-2 sm:gap-3 animate-fadeIn">
                         {data.type === 'Opción Única' && <div className="w-4 h-4 sm:w-5 sm:h-5 rounded-full border-2 border-indigo-200 flex-shrink-0" />}
                         {data.type === 'Casillas' && <div className="w-4 h-4 sm:w-5 sm:h-5 rounded border-2 border-indigo-200 flex-shrink-0" />}
                         {data.type === 'Desplegable' && <span className="text-gray-400 text-xs sm:text-sm flex-shrink-0">{idx + 1}.</span>}

                         <input value={opt} onChange={(e) => { const newOpts = [...data.options]; newOpts[idx] = e.target.value; onUpdate({...data, options: newOpts}); }} className="flex-1 bg-gray-50/80 hover:bg-white rounded-lg px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm focus:bg-white focus:ring-2 focus:ring-indigo-100 transition-all border-transparent focus:border-indigo-200 shadow-sm" />
                         <button type="button" onClick={(ev) => { ev.stopPropagation(); const newOpts = data.options.filter((_, i) => i !== idx); onUpdate({...data, options: newOpts}); }} className="flex-shrink-0 p-1"><FontAwesomeIcon icon={faXmark} size="sm" className="text-gray-300 hover:text-red-400 fa-icon-force-current" /></button>
                       </div>
                     ))}
                     <div className="flex flex-wrap items-center gap-2 mt-2 sm:mt-3">
                       <button type="button" onClick={(ev) => { ev.stopPropagation(); onUpdate({...data, options: [...(data.options || []), `Opción ${data.options?.length + 1}`]}); }} className="text-xs font-bold text-indigo-500 hover:text-indigo-700 flex items-center gap-1 pl-1 py-1.5 sm:py-2 px-2 sm:px-3 hover:bg-indigo-50 rounded-lg w-fit transition-colors"><FontAwesomeIcon icon={faPlus} size="sm" className="fa-icon-force-current" /> Añadir opción</button>
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
                            onUpdate({ ...data, evaluation_items: items });
                          }}
                          className="flex-1 bg-gray-50 rounded-lg px-2 py-1.5 text-sm border border-gray-200"
                          placeholder="Nombre del ítem"
                        />
                        <button type="button" onClick={() => { const items = (data.evaluation_items || []).filter((_, i) => i !== idx); onUpdate({ ...data, evaluation_items: items }); }} className="p-1 text-gray-400 hover:text-red-500"><FontAwesomeIcon icon={faXmark} size="sm" className="fa-icon-force-current" /></button>
                      </div>
                    ))}
                    <button type="button" onClick={() => onUpdate({ ...data, evaluation_items: [...(data.evaluation_items || []), { id: generateId(), label: `Item${(data.evaluation_items?.length || 0) + 1}` }] })} className="text-xs font-bold text-indigo-500 hover:bg-indigo-50 rounded-lg px-2 py-1.5 flex items-center gap-1"><FontAwesomeIcon icon={faPlus} size="sm" className="fa-icon-force-current" /> Añadir ítem</button>
                    <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide mt-4">Columnas de calificación</p>
                    {(data.evaluation_columns || []).map((col, idx) => (
                      <div key={col.id} className="flex items-center gap-2 flex-wrap">
                        <input
                          value={col.label}
                          onChange={(e) => {
                            const cols = [...(data.evaluation_columns || [])];
                            cols[idx] = { ...col, label: e.target.value };
                            onUpdate({ ...data, evaluation_columns: cols });
                          }}
                          className="flex-1 min-w-[100px] bg-gray-50 rounded-lg px-2 py-1.5 text-sm border border-gray-200"
                          placeholder="Ej: CUMPLE"
                        />
                        <select
                          value={col.inputType || 'checkbox'}
                          onChange={(e) => {
                            const cols = [...(data.evaluation_columns || [])];
                            cols[idx] = { ...col, inputType: e.target.value };
                            onUpdate({ ...data, evaluation_columns: cols });
                          }}
                          className="rounded-lg px-2 py-1.5 text-sm border border-gray-200 bg-white"
                        >
                          <option value="checkbox">Casilla</option>
                          <option value="text">Texto (observaciones)</option>
                        </select>
                        <button type="button" onClick={() => { const cols = (data.evaluation_columns || []).filter((_, i) => i !== idx); onUpdate({ ...data, evaluation_columns: cols }); }} className="p-1 text-gray-400 hover:text-red-500"><FontAwesomeIcon icon={faXmark} size="sm" className="fa-icon-force-current" /></button>
                      </div>
                    ))}
                    <button type="button" onClick={() => onUpdate({ ...data, evaluation_columns: [...(data.evaluation_columns || []), { id: generateId(), label: 'Nueva columna', inputType: 'checkbox' }] })} className="text-xs font-bold text-indigo-500 hover:bg-indigo-50 rounded-lg px-2 py-1.5 flex items-center gap-1"><FontAwesomeIcon icon={faPlus} size="sm" className="fa-icon-force-current" /> Añadir columna</button>
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
              </div>

              {/* Configuración: al final del bloque, compacta y secundaria */}
              <div className="mt-4 pt-3 border-t border-gray-200/80 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] text-gray-500">
                {data.type !== 'Título' && (
                  <label className="flex items-center gap-1.5 cursor-pointer shrink-0">
                    <input type="checkbox" checked={!!data.required} onChange={() => onUpdate({ ...data, required: !data.required })} className="rounded border-gray-300 text-indigo-500 focus:ring-indigo-500 w-3 h-3" onClick={e => e.stopPropagation()} />
                    <span>Obligatorio</span>
                  </label>
                )}
                {data.type === 'Fecha' && (
                  <label className="flex items-center gap-1.5 cursor-pointer shrink-0">
                    <input type="checkbox" checked={!!data.date_include_time} onChange={() => onUpdate({ ...data, date_include_time: !data.date_include_time })} className="rounded border-gray-300 text-indigo-500 focus:ring-indigo-500 w-3 h-3" onClick={e => e.stopPropagation()} />
                    <span>Incluir hora</span>
                  </label>
                )}
                {sections.length > 0 && (
                  <div className="flex items-center gap-1.5 shrink-0" onClick={e => e.stopPropagation()}>
                    <span className="text-gray-400">Sección</span>
                    <select value={data.section_id || ''} onChange={(e) => { onUpdate({ ...data, section_id: e.target.value || null }); if (onAssignSection) onAssignSection(e.target.value || null); }} className="px-1.5 py-0.5 border border-gray-200 rounded text-[11px] bg-white focus:ring-1 focus:ring-indigo-400 min-w-0 max-w-[140px]">
                      <option value="">Sin sección</option>
                      {sections.map(section => <option key={section.id} value={section.id}>{section.title}</option>)}
                    </select>
                  </div>
                )}
                {data.type !== 'Título' && otherQuestions.length > 0 && (
                  <div className="w-full flex flex-wrap items-center gap-x-3 gap-y-1">
                    <label className="flex items-center gap-1.5 cursor-pointer shrink-0">
                      <input type="checkbox" checked={hasCondition} onChange={(e) => onUpdate({ ...data, conditional_logic: e.target.checked ? { type: 'show_if', question_id: otherQuestions[0]?.id || '', operator: 'equals', value: '' } : null })} className="rounded border-gray-300 text-indigo-500 w-3 h-3" onClick={e => e.stopPropagation()} />
                      <span>Mostrar solo si…</span>
                    </label>
                    {hasCondition && (
                      <span className="flex flex-wrap items-center gap-1.5">
                        <select value={data.conditional_logic?.question_id || ''} onChange={(e) => onUpdate({ ...data, conditional_logic: { ...data.conditional_logic, type: 'show_if', question_id: e.target.value, operator: data.conditional_logic?.operator || 'equals', value: data.conditional_logic?.value ?? '' } })} className="px-1.5 py-0.5 border border-gray-200 rounded text-[11px] bg-white min-w-0 max-w-[120px]" onClick={e => e.stopPropagation()}>
                          {otherQuestions.map(q => { const t = (q.text || q.question_text || ''); return <option key={q.id} value={q.id}>{t.length > 25 ? t.slice(0, 25) + '…' : t || 'Pregunta'}</option>; })}
                        </select>
                        <select value={data.conditional_logic?.operator || 'equals'} onChange={(e) => onUpdate({ ...data, conditional_logic: { ...data.conditional_logic, type: 'show_if', question_id: data.conditional_logic?.question_id || '', operator: e.target.value, value: data.conditional_logic?.value ?? '' } })} className="px-1.5 py-0.5 border border-gray-200 rounded text-[11px] bg-white" onClick={e => e.stopPropagation()}>
                          {CONDITION_OPERATORS.map(op => <option key={op.value} value={op.value}>{op.label}</option>)}
                        </select>
                        <input type="text" value={data.conditional_logic?.value ?? ''} onChange={(e) => onUpdate({ ...data, conditional_logic: { ...data.conditional_logic, type: 'show_if', question_id: data.conditional_logic?.question_id || '', operator: data.conditional_logic?.operator || 'equals', value: e.target.value } })} placeholder="Valor" className="px-1.5 py-0.5 border border-gray-200 rounded text-[11px] w-20" onClick={e => e.stopPropagation()} />
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="md:pr-10">
              <h3 className="text-base sm:text-lg md:text-xl font-semibold text-gray-700 mb-2 break-words">{data.text || (data.type === 'Título' ? 'Título sin texto' : 'Sin pregunta definida')}</h3>
              {data.description && <p className="text-xs sm:text-sm text-gray-400 mb-3 sm:mb-4 break-words">{data.description}</p>}
              
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

// --- VISTA: PREVIEW DE ENCUESTAS ---

const SurveyPreview = ({ surveyData, onBack }) => {
  const [answers, setAnswers] = useState({});

  const handleAnswerChange = (questionId, value) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }));
  };

  const renderQuestion = (question) => {
    const questionId = question.id;
    if (question.type === 'Título') {
      return (
        <div key={questionId} className="mb-8 bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
          <h3 className="text-lg font-bold text-gray-800 mb-2">{question.text || question.question_text || 'Título'}</h3>
          {question.description && (
            <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{question.description}</p>
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
        <div className="mb-10 rounded-t-xl overflow-hidden border border-gray-200 bg-white shadow-sm">
          <div className="h-2 bg-purple-600 rounded-t-xl" aria-hidden="true" />
          <div className="border-l-4 border-l-blue-500 px-4 py-4 md:px-5 md:py-5">
            <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black text-gray-900">
              {surveyData.title || 'Formulario sin título'}
            </h1>
            <p className="mt-2 md:mt-3 text-base md:text-lg text-gray-500">
              {surveyData.description || 'Descripción del formulario'}
            </p>
          </div>
        </div>

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

const PublicSurveyView = ({ surveyId }) => {
  const [surveyData, setSurveyData] = useState(null);
  const [answers, setAnswers] = useState({});
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

  // Function to evaluate conditional logic
  const evaluateCondition = (condition, answers) => {
    if (!condition || !condition.question_id) return true;
    
    const questionId = condition.question_id;
    const answer = answers[questionId];
    const operator = condition.operator || 'equals';
    const value = condition.value;
    
    if (answer === undefined || answer === null || answer === '') {
      return false;
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

  // Todas las secciones son navegables; la lógica condicional solo oculta preguntas concretas, no secciones enteras.
  const getVisibleSections = (sections) => {
    if (!sections || sections.length === 0) return [];
    return [...sections];
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
        
        // Map backend types to frontend types
        const reverseTypeMapping = {
          'short_text': 'Texto Corto',
          'long_text': 'Párrafo',
          'single_choice': 'Opción Única',
          'checkbox': 'Casillas',
          'dropdown': 'Desplegable',
          'number': 'Número',
          'date': 'Fecha',
          'rating': 'Puntuación',
          'signature': 'Firma',
          'email': 'Correo Electrónico',
          'titulo': 'Título',
          'evaluation_table': 'Evaluación'
        };
        
        const questionsWithIds = (data.questions || []).map((q, index) => ({
          ...q,
          id: q.id || `q_${index}`,
          type: reverseTypeMapping[q.question_type] || q.question_type || q.type,
          text: q.question_text || q.text,
          options: q.options || [],
          section_id: q.section_id || null,
          conditional_logic: q.conditional_logic || null,
          evaluation_items: q.evaluation_items || [],
          evaluation_columns: q.evaluation_columns || []
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
    setAnswers(prev => ({ ...prev, [questionId]: value }));
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

  const getVisibleRequiredQuestions = () => {
    const questions = surveyData?.questions || [];
    const isVisible = (q) => {
      if (q.conditional_logic && !evaluateCondition(q.conditional_logic, answers)) return false;
      if (surveyData.sections && surveyData.sections.length > 0) {
        return q.section_id === currentSection;
      }
      return true;
    };
    return questions.filter(q => q.required && q.type !== 'Título' && q.type !== 'titulo' && isVisible(q));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const requiredQuestions = getVisibleRequiredQuestions();
    const missing = requiredQuestions.filter(q => {
      const qid = q.id || q._id;
      const val = answers[qid];
      if (val === undefined || val === null) return true;
      if (typeof val === 'string' && val.trim() === '') return true;
      return false;
    });
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

      // Map frontend question IDs to backend format
      const formattedAnswers = {};
      Object.entries(answers).forEach(([questionId, answer]) => {
        // Find the question to get its backend ID
        const question = surveyData.questions.find(q => q.id === questionId);
        if (question) {
          const backendId = question._id || question.id;
          formattedAnswers[backendId] = answer;
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
          answers: formattedAnswers
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Error al enviar las respuestas');
      }

      setSubmitted(true);
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
  const SectionNavigator = ({ sections, currentSection, onSectionChange, visibleSections }) => {
    if (!sections || sections.length === 0) return null;
    
    const currentIndex = sections.findIndex(s => s.id === currentSection);
    const canGoNext = currentIndex < sections.length - 1;
    const canGoPrev = currentIndex > 0;
    
    const handleNext = () => {
      if (canGoNext) {
        const nextSection = sections[currentIndex + 1];
        if (visibleSections.includes(nextSection.id)) {
          setSectionHistory(prev => [...prev, currentSection]);
          setCurrentSection(nextSection.id);
        }
      }
    };
    
    const handlePrev = () => {
      if (canGoPrev) {
        const prevSection = sections[currentIndex - 1];
        setCurrentSection(prevSection.id);
        setSectionHistory(prev => prev.slice(0, -1));
      }
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
                onClick={() => {
                  if (isVisible) {
                    setCurrentSection(section.id);
                    if (idx > currentIndex) {
                      setSectionHistory(prev => [...prev, currentSection]);
                    }
                  }
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
          <div className="rounded-t-xl overflow-hidden border border-gray-200 bg-white shadow-sm">
            <div className="h-2 bg-indigo-600 rounded-t-xl" aria-hidden="true" />
            <div className="border-l-4 border-l-indigo-600 px-6 py-6 md:px-8 md:py-8 text-center">
              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black text-gray-800 leading-tight">
                {surveyData.title || 'Formulario sin título'}
              </h1>
              <p className="mt-3 md:mt-4 text-lg md:text-xl text-gray-600 leading-relaxed max-w-3xl mx-auto">
                {surveyData.description || 'Descripción del formulario'}
              </p>
              <div className="mt-6 flex items-center justify-center gap-4 text-sm text-gray-500">
                <span className="flex items-center gap-2">
                  <FontAwesomeIcon icon={faListUl} size="sm" className="fa-icon-force-current" />
                  {surveyData.questions?.length || 0} {surveyData.questions?.length === 1 ? 'Pregunta' : 'Preguntas'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Section Navigator */}
        {surveyData.sections && surveyData.sections.length > 0 && (
          <SectionNavigator
            sections={surveyData.sections}
            currentSection={currentSection}
            onSectionChange={setCurrentSection}
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
              onSectionChange={setCurrentSection}
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
    </div>
  );
};

const SurveyEditor = ({ onSave, onBack, initialSurveyData }) => { // Added initialSurveyData
  const [activeQuestionId, setActiveQuestionId] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const [surveyData, setSurveyData] = useState(initialSurveyData || { title: "Mi Nueva Encuesta", description: "Descripción breve de la encuesta", questions: [], sections: [] }); // Initialize with initialSurveyData or default
  const [showSectionManager, setShowSectionManager] = useState(false);
  const [showReferenceSection, setShowReferenceSection] = useState(false);
  const [referenceColumns, setReferenceColumns] = useState([]); // column names from last upload
  const [referenceUploading, setReferenceUploading] = useState(false);

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
      // Reverse mapping: backend types to frontend types
      const reverseTypeMapping = {
        'short_text': 'Texto Corto',
        'long_text': 'Párrafo',
        'single_choice': 'Opción Única',
        'checkbox': 'Casillas',
        'dropdown': 'Desplegable',
        'number': 'Número',
        'date': 'Fecha',
        'rating': 'Puntuación',
        'signature': 'Firma',
        'email': 'Correo Electrónico',
        'titulo': 'Título',
        'evaluation_table': 'Evaluación'
      };
      
      // Ensure all questions have unique IDs and proper format
      const questionsWithIds = initialSurveyData.questions?.map((q, index) => {
        // Get the type from backend format and convert to frontend format
        // Backend returns question_type, but we also check type for compatibility
        const backendType = q.question_type || q.type || 'short_text';
        const frontendType = reverseTypeMapping[backendType] || 'Texto Corto';
        
        // Get text from either question_text or text field
        const questionText = q.question_text || q.text || '';
        
        return {
          ...q,
          id: q.id || generateId(), // Generate ID if missing
          // Map backend format to frontend format
          text: questionText,
          type: frontendType, // Use mapped frontend type
          description: q.description || '',
          required: q.required || false,
          options: Array.isArray(q.options) ? q.options : [] // Ensure options array exists and is an array
        };
      }) || [];
      
      // Process sections if they exist
      const sections = (initialSurveyData.sections || []).map((s, index) => ({
        ...s,
        id: s.id || `section_${index}`,
        order: s.order || index
      })).sort((a, b) => (a.order || 0) - (b.order || 0));
      
      // Ensure questions have section_id
      const questionsWithSections = questionsWithIds.map(q => ({
        ...q,
        section_id: q.section_id || null,
        conditional_logic: q.conditional_logic || null
      }));
      
      const refKey = initialSurveyData.reference_key_column || '';
      const refMap = initialSurveyData.reference_mapping || {};
      const derivedColumns = [...new Set([refKey, ...Object.values(refMap)].filter(Boolean))];
      if (derivedColumns.length > 0) setReferenceColumns(derivedColumns);
      setSurveyData({
        ...initialSurveyData,
        questions: questionsWithSections,
        sections: sections,
        reference_key_column: refKey,
        reference_mapping: refMap,
        reference_row_count: initialSurveyData.reference_row_count ?? 0
      });
    } else {
      setSurveyData({ title: "Mi Nueva Encuesta", description: "Descripción breve de la encuesta", questions: [], sections: [] }); // Reset if no initial data
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
    { label: 'Correo Electrónico', icon: faEnvelope, color: 'blue', type: 'Correo Electrónico' },
    { label: 'Evaluación', icon: faTable, color: 'teal', type: 'Evaluación' },
  ];

  // #region agent log
  useEffect(() => {
    if (showPreview) return;
    const labels = questionTools.map(t => t.label);
    const payload1 = { location: 'App.jsx:SurveyEditor', message: 'questionTools at render', data: { labels, count: labels.length, hasTitulo: labels.includes('Título') }, timestamp: Date.now(), hypothesisId: 'H1' };
    console.log('[DEBUG SurveyEditor]', JSON.stringify(payload1));
    fetch('http://localhost:7244/ingest/c3728f0a-6833-4462-afd8-e9cc790ceca9', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload1) }).catch(() => {});
    const t = setTimeout(() => {
      const nav = document.querySelector('nav.fixed.z-50');
      if (nav) {
        const buttons = nav.querySelectorAll('button');
        const payload2 = { location: 'App.jsx:SurveyEditor', message: 'toolbar DOM', data: { navScrollWidth: nav.scrollWidth, navClientWidth: nav.clientWidth, buttonCount: buttons.length }, timestamp: Date.now(), hypothesisId: 'H3' };
        console.log('[DEBUG SurveyEditor]', JSON.stringify(payload2));
        fetch('http://localhost:7244/ingest/c3728f0a-6833-4462-afd8-e9cc790ceca9', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload2) }).catch(() => {});
      }
    }, 300);
    return () => clearTimeout(t);
  }, [showPreview]);
  // #endregion

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
          // Fusionar con la pregunta actual para no perder type, options, etc. si newData solo trae text
          return { ...q, ...newData, id };
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

  return (
    <>
      {!showPreview && (
      <nav className={`fixed z-50 transition-all duration-300 border-gray-200/50 backdrop-blur-xl bg-white/70 md:w-[135px] md:h-screen md:left-0 md:top-0 md:border-r md:flex-col bottom-0 w-full h-auto border-t flex flex-row items-center md:justify-start px-2 sm:px-3 py-2 sm:py-2.5 md:py-4 gap-1.5 sm:gap-2 md:gap-2 shadow-2xl md:shadow-none overflow-x-auto md:overflow-y-auto md:overflow-x-hidden scrollbar-hide`}>
        <div className="hidden md:flex md:flex-col md:h-full md:w-full">
          
          {/* Contenedor scrollable para las herramientas */}
          <div className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-hide md:flex md:flex-col md:gap-2 md:px-2">
            {questionTools.map(tool => <ToolButton key={tool.label} icon={tool.icon} label={tool.label} color={tool.color} onClick={() => addQuestion(tool.type)} />)}
          </div>
          
          {/* Footer del sidebar en desktop */}
          <div className="mt-auto p-2 flex-shrink-0 border-t border-gray-200/50">
            <button className="w-full p-3 text-gray-400 hover:text-gray-800 transition-colors rounded-xl hover:bg-gray-100 flex items-center justify-center" title="Configuración">
              <FontAwesomeIcon icon={faGear} size="sm" className="fa-icon-force-current" />
            </button>
          </div>
        </div>
        
        {/* Vista móvil - sidebar horizontal */}
        <div className="flex md:hidden flex-row items-center gap-1.5 sm:gap-2 flex-shrink-0 min-w-0">
          {questionTools.map(tool => <ToolButton key={tool.label} icon={tool.icon} label={tool.label} color={tool.color} onClick={() => addQuestion(tool.type)} />)}
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
           <div 
             className="mb-6 md:mb-10 rounded-t-xl overflow-hidden border border-gray-200 bg-white shadow-sm"
             style={{
               minWidth: 0,
               width: '100%',
               maxWidth: '100%',
               boxSizing: 'border-box',
               overflow: 'visible'
             }}
           >
             <div className="h-2 bg-purple-600 rounded-t-xl" aria-hidden="true" />
             <div className="border-l-4 border-l-blue-500 px-4 py-4 md:px-5 md:py-5">
               <textarea
                 value={surveyData.title} 
                 onChange={(e) => {
                   const newTitle = e.target.value;
                   const titleInput = e.target;
                   titleInput.style.height = 'auto';
                   titleInput.style.height = `${titleInput.scrollHeight}px`;
                   setSurveyData({...surveyData, title: newTitle});
                 }}
                 onInput={(e) => {
                   e.target.style.height = 'auto';
                   e.target.style.height = `${e.target.scrollHeight}px`;
                 }}
                 className="w-full text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black text-gray-900 bg-transparent border-none focus:ring-0 p-0 placeholder-gray-300 resize-none overflow-hidden border-b border-gray-200 pb-1 focus:outline-none" 
                 placeholder="Formulario sin título"
                 rows={1}
                 style={{
                   wordBreak: 'break-word',
                   overflowWrap: 'break-word',
                   whiteSpace: 'pre-wrap',
                   overflow: 'hidden',
                   textOverflow: 'clip',
                   minWidth: 0,
                   maxWidth: '100%',
                   boxSizing: 'border-box',
                   lineHeight: '1.2'
                 }}
               />
               <input 
                 value={surveyData.description} 
                 onChange={(e) => setSurveyData({...surveyData, description: e.target.value})} 
                 className="w-full mt-3 md:mt-4 text-base md:text-lg text-gray-500 bg-transparent border-none focus:ring-0 p-0 placeholder-gray-400 border-b border-gray-100 pb-1 focus:outline-none" 
                 placeholder="Descripción del formulario" 
               />
             </div>
           </div>

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


// --- VISTA: RESPUESTAS DE ENCUESTAS ---

const SurveyResponsesView = ({ survey, responses, onBack, loading, userRole, onResetResponses }) => {
  const [selectedResponse, setSelectedResponse] = useState(null);
  const [activeTab, setActiveTab] = useState('individual'); // 'individual', 'statistics', or 'table'
  const [chartTypes, setChartTypes] = useState({}); // { questionId: 'bar' | 'doughnut' | 'line' }

  if (loading) {
    return (
      <main className="flex-1 relative z-10">
        <header className="sticky top-0 z-40 px-4 py-4 md:px-12 md:py-6 flex justify-between items-center bg-white/50 backdrop-blur-md border-b border-white/40">
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
        <div className="w-full max-w-7xl mx-auto px-4 py-8 md:py-12">
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
  const renderAnswer = (answer, questionOrType) => {
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
    const q = questionOrType && typeof questionOrType === 'object' ? questionOrType : null;
    const qType = q ? (q.type || q.question_type) : questionOrType;
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

  // Calculate statistics for dashboard
  const calculateStats = () => {
    if (!responses.length || !survey.questions) return {};
    
    const stats = {};
    survey.questions.forEach((q) => {
      const questionId = q.id || q._id;
      const questionType = q.type || q.question_type;
      const questionText = q.text || q.question_text;
      
      if (!questionId) return;
      if (questionType === 'titulo' || questionType === 'Título') return;
      if (questionType === 'evaluation_table' || questionType === 'Evaluación') return; // No chart stats for evaluation table
      
      const answers = responses
        .map(r => r.answers && r.answers[questionId])
        .filter(a => a !== undefined && a !== null);
      
      if (answers.length === 0) return;
      
      stats[questionId] = {
        questionText,
        questionType,
        totalAnswers: answers.length,
        data: {}
      };
      
      // Calculate statistics based on question type
      if (['single_choice', 'Opción Única', 'dropdown', 'Desplegable'].includes(questionType)) {
        answers.forEach(answer => {
          const key = String(answer);
          stats[questionId].data[key] = (stats[questionId].data[key] || 0) + 1;
        });
      } else if (['checkbox', 'Casillas'].includes(questionType)) {
        answers.forEach(answer => {
          const options = Array.isArray(answer) ? answer : [answer];
          options.forEach(opt => {
            const key = String(opt);
            stats[questionId].data[key] = (stats[questionId].data[key] || 0) + 1;
          });
        });
      } else if (['rating', 'Puntuación'].includes(questionType)) {
        const ratings = answers.map(a => Number(a)).filter(n => !isNaN(n));
        if (ratings.length > 0) {
          stats[questionId].average = ratings.reduce((a, b) => a + b, 0) / ratings.length;
          stats[questionId].min = Math.min(...ratings);
          stats[questionId].max = Math.max(...ratings);
        }
      } else if (['number', 'Número'].includes(questionType)) {
        const numbers = answers.map(a => Number(a)).filter(n => !isNaN(n));
        if (numbers.length > 0) {
          stats[questionId].average = numbers.reduce((a, b) => a + b, 0) / numbers.length;
          stats[questionId].min = Math.min(...numbers);
          stats[questionId].max = Math.max(...numbers);
        }
      }
    });
    
    return stats;
  };

  const stats = calculateStats();

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

  // Función para generar datos del gráfico
  const getChartData = (stat) => {
    const labels = Object.keys(stat.data);
    const data = Object.values(stat.data);
    const colors = [
      'rgba(99, 102, 241, 0.8)', // indigo
      'rgba(139, 92, 246, 0.8)', // purple
      'rgba(236, 72, 153, 0.8)', // pink
      'rgba(34, 197, 94, 0.8)',  // green
      'rgba(59, 130, 246, 0.8)', // blue
      'rgba(245, 158, 11, 0.8)', // amber
      'rgba(239, 68, 68, 0.8)',  // red
      'rgba(168, 85, 247, 0.8)', // violet
    ];
    
    return {
      labels,
      datasets: [{
        label: 'Respuestas',
        data,
        backgroundColor: labels.map((_, i) => colors[i % colors.length]),
        borderColor: labels.map((_, i) => colors[i % colors.length].replace('0.8', '1')),
        borderWidth: 2,
      }]
    };
  };

  // Opciones comunes para los gráficos
  const getChartOptions = (stat) => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        labels: {
          font: {
            size: 12,
            weight: 'bold'
          },
          padding: 15,
          usePointStyle: true,
        }
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            const label = context.label || '';
            const value = context.parsed.y || context.parsed;
            const percentage = ((value / stat.totalAnswers) * 100).toFixed(1);
            return `${label}: ${value} (${percentage}%)`;
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          stepSize: 1,
          font: {
            size: 11,
            weight: 'bold'
          }
        },
        grid: {
          color: 'rgba(0, 0, 0, 0.05)'
        }
      },
      x: {
        ticks: {
          font: {
            size: 11,
            weight: 'bold'
          }
        },
        grid: {
          display: false
        }
      }
    }
  });

  // Función para extraer fecha del ObjectId de MongoDB
  const extractDateFromObjectId = (objectIdString) => {
    try {
      // MongoDB ObjectId contiene un timestamp en los primeros 8 caracteres (hexadecimal)
      // Convertir a timestamp Unix (segundos desde epoch)
      if (objectIdString && objectIdString.length >= 8) {
        const timestampHex = objectIdString.substring(0, 8);
        const timestamp = parseInt(timestampHex, 16);
        // Convertir de segundos a milisegundos
        return new Date(timestamp * 1000);
      }
    } catch (e) {
      // Si falla, retornar null
    }
    return null;
  };

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

  // Función para exportar a Excel
  const exportToExcel = () => {
    if (!responses.length || !survey.questions) return;

    // Preparar datos para la tabla
    const tableData = [];
    
    // Obtener todas las preguntas
    const questions = survey.questions || [];
    
    // Crear encabezados
    const headers = ['ID Respuesta', 'Dispositivo', 'Encuestador', 'Estado', 'Fecha de Toma'];
    questions.forEach(q => {
      const questionId = q.id || q._id;
      const questionText = q.text || q.question_text || `Pregunta ${questionId}`;
      headers.push(questionText);
    });
    
    // Agregar filas de datos
    responses.forEach((response, index) => {
      // Obtener fecha de diferentes campos posibles
      const dateValue = response.created_at || 
                       response.timestamp || 
                       response.created || 
                       response.date ||
                       response.submitted_at;
      
      // Obtener el ID de la respuesta para usar como fallback
      const responseId = response.id || response._id || null;
      
      const row = [
        responseId || `Respuesta ${index + 1}`,
        response.device_id || '-',
        response.surveyor_id || '-',
        response.synced ? 'En línea' : 'Pendiente',
        formatDate(dateValue, responseId)
      ];
      
      // Agregar respuestas por pregunta (pasamos q para evaluación: nombres de ítems/columnas)
      questions.forEach(q => {
        const questionId = q.id || q._id;
        const answer = response.answers && response.answers[questionId];
        row.push(formatAnswer(answer, q.type || q.question_type, q));
      });
      
      tableData.push(row);
    });
    
    // Crear workbook
    const ws = XLSX.utils.aoa_to_sheet([headers, ...tableData]);
    
    // Ajustar ancho de columnas
    const colWidths = headers.map((_, i) => {
      if (i === 0) return { wch: 20 }; // ID Respuesta
      if (i === 1) return { wch: 15 }; // Dispositivo
      if (i === 2) return { wch: 15 }; // Encuestador
      if (i === 3) return { wch: 12 }; // Estado
      if (i === 4) return { wch: 20 }; // Fecha de Toma
      return { wch: 30 }; // Columnas de preguntas
    });
    ws['!cols'] = colWidths;
    
    // Crear workbook y descargar
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Respuestas');
    
    // Generar nombre de archivo
    const surveyTitle = (survey.title || 'Encuesta').replace(/[^a-z0-9]/gi, '_').toLowerCase();
    const fileName = `${surveyTitle}_respuestas_${new Date().toISOString().split('T')[0]}.xlsx`;
    
    XLSX.writeFile(wb, fileName);
  };

  // Vista de respuesta individual detallada
  if (selectedResponse) {
    return (
      <main className="flex-1 relative z-10">
        <header className="sticky top-0 z-40 px-4 py-4 md:px-12 md:py-6 flex justify-between items-center bg-white/50 backdrop-blur-md border-b border-white/40">
          <div className="flex items-center gap-3">
            <button className="p-2 -ml-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors" onClick={() => { setSelectedResponse(null); }} title="Volver">
              <FontAwesomeIcon icon={faChevronLeft} size="sm" className="fa-icon-force-current" />
            </button>
            <div>
              <h1 className="text-xl md:text-2xl font-black text-gray-800 tracking-tight leading-none">Respuesta Individual</h1>
            </div>
          </div>
        </header>
        <div className="w-full max-w-4xl mx-auto px-4 py-8 md:py-12">
          <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
            <div className="flex justify-between items-start mb-6 pb-4 border-b border-gray-200">
              <div>
                <h3 className="font-bold text-xl text-gray-800">Respuesta Detallada</h3>
                <p className="text-sm text-gray-500 mt-1">
                  {selectedResponse.device_id && `Dispositivo: ${selectedResponse.device_id}`}
                  {selectedResponse.surveyor_id && ` • Encuestador ID: ${selectedResponse.surveyor_id}`}
                </p>
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
      </main>
    );
  }

  return (
    <main className="flex-1 relative z-10">
      <header className="sticky top-0 z-40 px-4 py-4 md:px-12 md:py-6 flex justify-between items-center bg-white/50 backdrop-blur-md border-b border-white/40">
        <div className="flex items-center gap-3">
          <button className="p-2 -ml-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors" onClick={onBack} title="Volver">
            <FontAwesomeIcon icon={faChevronLeft} size="sm" className="fa-icon-force-current" />
          </button>
          <div>
            <h1 className="text-xl md:text-2xl font-black text-gray-800 tracking-tight leading-none">{survey.title || 'Respuestas'}</h1>
            <span className="text-xs font-bold text-indigo-500 uppercase tracking-widest hidden md:inline-block mt-1">
              {responses.length} {responses.length === 1 ? 'Respuesta' : 'Respuestas'}
            </span>
          </div>
        </div>
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
      </header>

      <div className={`w-full ${activeTab === 'table' ? 'max-w-full' : 'max-w-7xl'} mx-auto ${activeTab === 'table' ? 'px-0' : 'px-4'} py-8 md:py-12`}>
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
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 px-4">
                <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl p-6 text-white shadow-lg">
                  <div className="text-3xl font-black mb-2">{responses.length}</div>
                  <div className="text-sm opacity-90 font-medium">Total Respuestas</div>
                </div>
                <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl p-6 text-white shadow-lg">
                  <div className="text-3xl font-black mb-2">{Object.keys(stats).length}</div>
                  <div className="text-sm opacity-90 font-medium">Preguntas Respondidas</div>
                </div>
                <div className="bg-gradient-to-br from-blue-500 to-cyan-600 rounded-2xl p-6 text-white shadow-lg">
                  <div className="text-3xl font-black mb-2">{responses.filter(r => r.synced).length}</div>
                  <div className="text-sm opacity-90 font-medium">En línea</div>
                </div>
              </div>
            )}

            {/* Sistema de Pestañas */}
            <div className={`bg-white/80 backdrop-blur-xl rounded-3xl border border-white/60 shadow-lg overflow-hidden ${activeTab === 'table' ? 'mx-0 rounded-none md:rounded-3xl' : 'mx-4'}`}>
              {/* Tabs Navigation */}
              <div className="flex border-b border-gray-200 bg-gray-50/50">
                <button
                  onClick={() => setActiveTab('individual')}
                  className={`flex-1 px-4 py-4 font-bold text-sm transition-all duration-200 relative ${
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
                  className={`flex-1 px-4 py-4 font-bold text-sm transition-all duration-200 relative ${
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
                  className={`flex-1 px-4 py-4 font-bold text-sm transition-all duration-200 relative ${
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
              <div className={`${activeTab === 'table' ? 'p-4 md:p-6' : 'p-6 md:p-8'}`}>
                {activeTab === 'table' ? (
                  /* Pestaña: Tabla de Respuestas */
                  <div className="space-y-4 w-full">
                    {/* Botón de exportar */}
                    <div className="flex justify-end mb-4 px-2">
                      <button
                        onClick={exportToExcel}
                        className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold rounded-xl shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200"
                      >
                        <FontAwesomeIcon icon={faFileExcel} size="sm" className="fa-icon-force-white" />
                        <span>Exportar a Excel</span>
                        <FontAwesomeIcon icon={faDownload} size="xs" className="fa-icon-force-white" />
                      </button>
                    </div>
                    
                    {/* Tabla de respuestas */}
                    <div className="overflow-x-auto w-full rounded-2xl border-2 border-gray-200 bg-white shadow-lg">
                      <table className="w-full divide-y divide-gray-200">
                        <thead className="bg-gradient-to-r from-indigo-500 to-purple-600">
                          <tr>
                            <th className="px-4 py-4 text-left text-xs font-black text-white uppercase tracking-wider sticky left-0 bg-gradient-to-r from-indigo-500 to-purple-600 z-10">
                              #
                            </th>
                            <th className="px-4 py-4 text-left text-xs font-black text-white uppercase tracking-wider">
                              ID Respuesta
                            </th>
                            <th className="px-4 py-4 text-left text-xs font-black text-white uppercase tracking-wider">
                              Dispositivo
                            </th>
                            <th className="px-4 py-4 text-left text-xs font-black text-white uppercase tracking-wider">
                              Encuestador
                            </th>
                            <th className="px-4 py-4 text-left text-xs font-black text-white uppercase tracking-wider">
                              Estado
                            </th>
                            {survey.questions && survey.questions.map((q) => {
                              const questionId = q.id || q._id;
                              const questionText = q.text || q.question_text || `Pregunta ${questionId}`;
                              return (
                                <th key={questionId} className="px-4 py-4 text-left text-xs font-black text-white uppercase tracking-wider min-w-[200px]">
                                  {questionText}
                                </th>
                              );
                            })}
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {responses.map((response, index) => (
                            <tr key={response.id || response._id || index} className="hover:bg-indigo-50/50 transition-colors">
                              <td className="px-4 py-4 whitespace-nowrap text-sm font-bold text-gray-900 sticky left-0 bg-white z-10 border-r border-gray-200">
                                {index + 1}
                              </td>
                              <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-700 font-mono text-xs">
                                {(response.id || response._id || `Respuesta ${index + 1}`).substring(0, 12)}...
                              </td>
                              <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-700">
                                {response.device_id || '-'}
                              </td>
                              <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-700">
                                {response.surveyor_id || '-'}
                              </td>
                              <td className="px-4 py-4 whitespace-nowrap">
                                {response.synced ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold">
                                    <FontAwesomeIcon icon={faCheck} size="xs" className="fa-icon-force-current" />
                                    En línea
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-bold">
                                    ⏳ Pendiente
                                  </span>
                                )}
                              </td>
                              {survey.questions && survey.questions.map((q) => {
                                const questionId = q.id || q._id;
                                const answer = response.answers && response.answers[questionId];
                                const isAnswerSignature = answer && typeof answer === 'string' && 
                                  (answer.startsWith('data:image/png;base64,') || 
                                   answer.startsWith('data:image/jpeg;base64,') ||
                                   (answer.length > 100 && /^[A-Za-z0-9+/=]+$/.test(answer.split(',')[1] || answer)));
                                return (
                                  <td key={questionId} className="px-4 py-4 text-sm text-gray-700 max-w-xs">
                                    {isAnswerSignature ? (
                                      <img 
                                        src={answer} 
                                        alt="Firma" 
                                        className="max-w-[200px] h-auto border border-gray-300 rounded shadow-sm"
                                        style={{ maxHeight: '80px', objectFit: 'contain' }}
                                      />
                                    ) : (
                                      <div className="truncate" title={formatAnswer(answer, q.type || q.question_type, q)}>
                                        {formatAnswer(answer, q.type || q.question_type, q)}
                                      </div>
                                    )}
                                  </td>
                                );
                              })}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    
                    {/* Información adicional */}
                    <div className="text-center text-sm text-gray-500 mt-4">
                      <p>Total de respuestas: <span className="font-bold text-indigo-600">{responses.length}</span></p>
                    </div>
                  </div>
                ) : activeTab === 'individual' ? (
                  /* Pestaña: Respuestas Individuales */
                  <div className="space-y-4">
                    {responses.map((response, index) => (
                      <div 
                        key={response.id || response._id || index} 
                        className="bg-white rounded-2xl border-2 border-gray-200 p-6 shadow-sm hover:shadow-lg hover:border-indigo-300 transition-all duration-200 cursor-pointer group"
                        onClick={() => setSelectedResponse(response)}
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center text-white font-black text-lg shadow-lg">
                                {index + 1}
                              </div>
                              <h3 className="font-black text-xl text-gray-900 group-hover:text-indigo-700 transition-colors">Respuesta #{index + 1}</h3>
                            </div>
                            <p className="text-sm text-gray-600 mt-2">
                              {response.device_id && <span className="inline-flex items-center gap-1"><FontAwesomeIcon icon={faHashtag} size="xs" className="fa-icon-force-current" /> {response.device_id}</span>}
                              {response.surveyor_id && <span className="ml-4">Encuestador ID: {response.surveyor_id}</span>}
                            </p>
                          </div>
                          <div className="text-right flex flex-col items-end gap-2">
                            {response.synced ? (
                              <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold">
                                <FontAwesomeIcon icon={faCheck} size="xs" className="fa-icon-force-current" />
                                En línea
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-bold">
                                ⏳ Pendiente
                              </span>
                            )}
                            <div className="text-xs text-indigo-600 font-semibold group-hover:text-indigo-700">Click para ver detalles →</div>
                          </div>
                        </div>
                        <div className="mt-4 pt-4 border-t border-gray-100">
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <FontAwesomeIcon icon={faListUl} size="sm" className="fa-icon-force-current" />
                            <span>
                              {response.answers && typeof response.answers === 'object' 
                                ? `${Object.keys(response.answers).length} preguntas respondidas`
                                : 'Sin respuestas estructuradas'}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  /* Pestaña: Estadísticas por Pregunta */
                  <div className="space-y-6">
                    {Object.keys(stats).length > 0 ? (
                      Object.entries(stats).map(([questionId, stat]) => {
                        const chartType = getDefaultChartType(questionId);
                        const chartData = getChartData(stat);
                        const chartOptions = getChartOptions(stat);
                        
                        return (
                          <div key={questionId} className="bg-gradient-to-br from-white to-gray-50/50 rounded-2xl border-2 border-gray-200 p-6 md:p-8 shadow-lg hover:shadow-xl transition-all duration-200">
                            <div className="flex items-start justify-between gap-4 mb-6">
                              <div className="flex items-start gap-4 flex-1">
                                <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center text-white font-black text-lg shadow-lg">
                                  <FontAwesomeIcon icon={faChartBar} size="sm" className="fa-icon-force-white" />
                                </div>
                                <div className="flex-1">
                                  <h3 className="font-black text-xl text-gray-900 mb-2">{stat.questionText}</h3>
                                  <p className="text-sm text-gray-600">
                                    {stat.totalAnswers} {stat.totalAnswers === 1 ? 'respuesta' : 'respuestas'}
                                  </p>
                                </div>
                              </div>
                              
                              {/* Selector de tipo de gráfico */}
                              {['single_choice', 'Opción Única', 'dropdown', 'Desplegable', 'checkbox', 'Casillas'].includes(stat.questionType) && (
                                <div className="flex items-center gap-2 bg-white rounded-xl p-2 border border-gray-200 shadow-sm">
                                  <button
                                    onClick={() => handleChartTypeChange(questionId, 'bar')}
                                    className={`p-2 rounded-lg transition-all duration-200 ${
                                      chartType === 'bar'
                                        ? 'bg-indigo-500 text-white shadow-md'
                                        : 'text-gray-600 hover:bg-gray-100'
                                    }`}
                                    title="Gráfico de Barras"
                                  >
                                    <FontAwesomeIcon icon={faChartBar} size="sm" className="fa-icon-force-current" />
                                  </button>
                                  <button
                                    onClick={() => handleChartTypeChange(questionId, 'doughnut')}
                                    className={`p-2 rounded-lg transition-all duration-200 ${
                                      chartType === 'doughnut'
                                        ? 'bg-indigo-500 text-white shadow-md'
                                        : 'text-gray-600 hover:bg-gray-100'
                                    }`}
                                    title="Gráfico de Torta"
                                  >
                                    <FontAwesomeIcon icon={faChartPie} size="sm" className="fa-icon-force-current" />
                                  </button>
                                  <button
                                    onClick={() => handleChartTypeChange(questionId, 'line')}
                                    className={`p-2 rounded-lg transition-all duration-200 ${
                                      chartType === 'line'
                                        ? 'bg-indigo-500 text-white shadow-md'
                                        : 'text-gray-600 hover:bg-gray-100'
                                    }`}
                                    title="Gráfico de Líneas"
                                  >
                                    <FontAwesomeIcon icon={faChartLine} size="sm" className="fa-icon-force-current" />
                                  </button>
                                </div>
                              )}
                            </div>
                            
                            {['single_choice', 'Opción Única', 'dropdown', 'Desplegable', 'checkbox', 'Casillas'].includes(stat.questionType) && (
                              <div className="mt-6">
                                <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm" style={{ height: '400px' }}>
                                  {chartType === 'bar' && (
                                    <Bar data={chartData} options={chartOptions} />
                                  )}
                                  {chartType === 'doughnut' && (
                                    <Doughnut 
                                      data={chartData} 
                                      options={{
                                        ...chartOptions,
                                        plugins: {
                                          ...chartOptions.plugins,
                                          legend: {
                                            ...chartOptions.plugins.legend,
                                            position: 'right'
                                          }
                                        }
                                      }} 
                                    />
                                  )}
                                  {chartType === 'line' && (
                                    <Line data={chartData} options={chartOptions} />
                                  )}
                                </div>
                                
                                {/* Tabla de datos debajo del gráfico */}
                                <div className="mt-4 bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
                                  <div className="space-y-2">
                                    {Object.entries(stat.data).map(([option, count]) => {
                                      const percentage = (count / stat.totalAnswers) * 100;
                                      return (
                                        <div key={option} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                                          <span className="text-sm font-semibold text-gray-800">{option}</span>
                                          <div className="flex items-center gap-4">
                                            <span className="text-sm font-bold text-indigo-600">{count}</span>
                                            <span className="text-xs text-gray-500 w-16 text-right">{percentage.toFixed(1)}%</span>
                                            <div className="w-24 bg-gray-200 rounded-full h-2 overflow-hidden">
                                              <div 
                                                className="bg-gradient-to-r from-indigo-500 to-purple-600 h-2 rounded-full transition-all duration-500" 
                                                style={{ width: `${percentage}%` }}
                                              ></div>
                                            </div>
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              </div>
                            )}
                            
                            {['rating', 'Puntuación', 'number', 'Número'].includes(stat.questionType) && (
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {stat.average !== undefined && (
                                  <div className="text-center p-6 bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-xl border-2 border-indigo-200">
                                    <div className="text-3xl font-black text-indigo-600 mb-1">{stat.average.toFixed(2)}</div>
                                    <div className="text-sm font-semibold text-gray-700">Promedio</div>
                                  </div>
                                )}
                                {stat.min !== undefined && (
                                  <div className="text-center p-6 bg-gradient-to-br from-green-50 to-green-100 rounded-xl border-2 border-green-200">
                                    <div className="text-3xl font-black text-green-600 mb-1">{stat.min}</div>
                                    <div className="text-sm font-semibold text-gray-700">Mínimo</div>
                                  </div>
                                )}
                                {stat.max !== undefined && (
                                  <div className="text-center p-6 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl border-2 border-blue-200">
                                    <div className="text-3xl font-black text-blue-600 mb-1">{stat.max}</div>
                                    <div className="text-sm font-semibold text-gray-700">Máximo</div>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })
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
                )}
              </div>
            </div>
          </div>
        )}
      </div>
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
    name: ''
  });
  const [formError, setFormError] = useState('');

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

  useEffect(() => {
    if (userRole === 'root' || userRole === 'group_admin') {
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
      setGroupFormData({ name: '' });
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
      const response = await authenticatedFetch(`/api/groups/${editingGroup.id}/`, {
        method: 'PUT',
        body: JSON.stringify(groupFormData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || JSON.stringify(errorData));
      }

      await fetchGroups();
      setShowGroupForm(false);
      setEditingGroup(null);
      setGroupFormData({ name: '' });
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
      name: group.name || ''
    });
    setShowGroupForm(true);
    setFormError('');
  };

  const handleNewGroup = () => {
    setEditingGroup(null);
    setGroupFormData({ name: '' });
    setShowGroupForm(true);
    setFormError('');
  };

  if (loading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-[#f8fafc]">
        <p className="text-gray-600">Cargando usuarios...</p>
      </div>
    );
  }

  return (
    <main className="flex-1 relative z-10">
      <header className="sticky top-0 z-40 px-4 py-5 md:px-12 md:py-6 bg-white/70 backdrop-blur-xl border-b border-white/60 shadow-sm">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-black bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent tracking-tight mb-1">
              Gestión de Usuarios
            </h1>
            <p className="text-sm text-gray-600 font-medium">Administra usuarios y grupos del sistema.</p>
          </div>
          <div className="flex gap-3">
            {activeTab === 'usuarios' && (
              <button 
                onClick={handleNewUser} 
                className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-xl font-bold text-sm shadow-xl hover:shadow-2xl flex items-center gap-2 transition-all duration-200 hover:scale-105 active:scale-95"
              >
                <FontAwesomeIcon icon={faUserPlus} size="sm" className="fa-icon-force-white" /> Nuevo Usuario
              </button>
            )}
            {activeTab === 'grupos' && (
              <button 
                onClick={handleNewGroup} 
                className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-xl font-bold text-sm shadow-xl hover:shadow-2xl flex items-center gap-2 transition-all duration-200 hover:scale-105 active:scale-95"
              >
                <FontAwesomeIcon icon={faPlus} size="sm" className="fa-icon-force-white" /> Nuevo Grupo
              </button>
            )}
            <button 
              onClick={onBack} 
              className="px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl font-bold text-sm shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105 active:scale-95 flex items-center gap-2"
            >
              <FontAwesomeIcon icon={faChevronLeft} size="sm" className="fa-icon-force-current" /> Volver
            </button>
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
        
        {/* Tabs */}
        <div className="max-w-7xl mx-auto mt-4 flex gap-4 border-b border-gray-200">
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

      <div className="w-full max-w-7xl mx-auto px-4 py-8 md:py-12">
        {activeTab === 'usuarios' && showUserForm ? (
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
                <p className="text-gray-500 mb-6">Crea el primer usuario para comenzar.</p>
                <button
                  onClick={handleNewUser}
                  className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-xl font-bold shadow-xl hover:shadow-2xl transition-all duration-200 hover:scale-105 active:scale-95 flex items-center gap-2 mx-auto"
                >
                  <FontAwesomeIcon icon={faUserPlus} size="sm" className="fa-icon-force-white" /> Crear Usuario
                </button>
              </div>
            ) : (
              <div className="bg-white/90 backdrop-blur-xl rounded-3xl border border-white/80 shadow-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gradient-to-r from-indigo-50 to-purple-50 border-b-2 border-indigo-200">
                      <tr>
                        <th className="px-6 py-4 text-left text-xs font-black text-gray-700 uppercase tracking-wider">ID</th>
                        <th className="px-6 py-4 text-left text-xs font-black text-gray-700 uppercase tracking-wider">Usuario</th>
                        <th className="px-6 py-4 text-left text-xs font-black text-gray-700 uppercase tracking-wider">Nombre</th>
                        <th className="px-6 py-4 text-left text-xs font-black text-gray-700 uppercase tracking-wider">Email</th>
                        <th className="px-6 py-4 text-left text-xs font-black text-gray-700 uppercase tracking-wider">Rol</th>
                        {users.some(u => u.group_name || u.user_group_id) && (
                          <th className="px-6 py-4 text-left text-xs font-black text-gray-700 uppercase tracking-wider">Grupo</th>
                        )}
                        <th className="px-6 py-4 text-left text-xs font-black text-gray-700 uppercase tracking-wider">Estado</th>
                        <th className="px-6 py-4 text-left text-xs font-black text-gray-700 uppercase tracking-wider">Fecha de Registro</th>
                        <th className="px-6 py-4 text-center text-xs font-black text-gray-700 uppercase tracking-wider">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {users.map((user) => (
                        <tr key={user.id} className="hover:bg-indigo-50/50 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">{user.id}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">{user.username}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                            {user.first_name || user.last_name 
                              ? `${user.first_name || ''} ${user.last_name || ''}`.trim() || '-'
                              : '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{user.email || '-'}</td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border ${getRoleBadgeColor(user.role)}`}>
                              {getRoleLabel(user.role)}
                            </span>
                          </td>
                          {users.some(u => u.group_name || u.user_group_id) && (
                            <td className="px-6 py-4 whitespace-nowrap">
                              {user.group_name ? (
                                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-700 border border-purple-300">
                                  <FontAwesomeIcon icon={faUsers} size="xs" className="fa-icon-force-current" />
                                  {user.group_name}
                                </span>
                              ) : (
                                <span className="text-sm text-gray-400">-</span>
                              )}
                            </td>
                          )}
                          <td className="px-6 py-4 whitespace-nowrap">
                            {user.is_active ? (
                              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700 border border-green-300">
                                Activo
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700 border border-red-300">
                                Inactivo
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                            {user.date_joined ? new Date(user.date_joined).toLocaleDateString('es-ES') : '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={() => handleEditUser(user)}
                                className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                title="Editar usuario"
                              >
                                <FontAwesomeIcon icon={faPenToSquare} size="sm" className="fa-icon-force-current" />
                              </button>
                              <button
                                onClick={() => handleDeleteUser(user.id)}
                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                title="Eliminar usuario"
                              >
                                <FontAwesomeIcon icon={faTrash} size="sm" className="fa-icon-force-current" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        ) : activeTab === 'grupos' ? (
          <>
            {showGroupForm ? (
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

                  <div className="flex gap-3 pt-4">
                    <button
                      type="submit"
                      className="flex-1 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-xl font-bold shadow-xl hover:shadow-2xl transition-all duration-200 hover:scale-105 active:scale-95"
                    >
                      {editingGroup ? 'Actualizar Grupo' : 'Crear Grupo'}
                    </button>
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
                    <p className="text-gray-500 mb-6">Crea el primer grupo para comenzar.</p>
                    <button
                      onClick={handleNewGroup}
                      className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-xl font-bold shadow-xl hover:shadow-2xl transition-all duration-200 hover:scale-105 active:scale-95 flex items-center gap-2 mx-auto"
                    >
                      <FontAwesomeIcon icon={faPlus} size="sm" className="fa-icon-force-white" /> Crear Grupo
                    </button>
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
                              {userRole === 'root' && (
                                <>
                                  <button
                                    onClick={() => handleEditGroup(group)}
                                    className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                    title="Editar grupo"
                                  >
                                    <FontAwesomeIcon icon={faPenToSquare} size="sm" className="fa-icon-force-current" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteGroup(group.id)}
                                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                    title="Eliminar grupo"
                                  >
                                    <FontAwesomeIcon icon={faTrash} size="sm" className="fa-icon-force-current" />
                                  </button>
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

const SurveyCard = ({ survey, onEdit, onDelete, onViewResponses, onShare, onUpdatePublicStatus, onDuplicate }) => {
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
              <button 
                onClick={handleShare} 
                className="p-2.5 rounded-xl hover:bg-gradient-to-br hover:from-green-50 hover:to-emerald-50 text-gray-500 hover:text-green-600 transition-all duration-200 hover:scale-110 active:scale-95" 
                title="Compartir encuesta"
              >
                <FontAwesomeIcon icon={faShareNodes} size="sm" className="fa-icon-force-current" />
              </button>
              <button 
                onClick={onViewResponses} 
                className="p-2.5 rounded-xl hover:bg-gradient-to-br hover:from-indigo-50 hover:to-purple-50 text-gray-500 hover:text-indigo-600 transition-all duration-200 hover:scale-110 active:scale-95" 
                title="Ver respuestas"
              >
                <FontAwesomeIcon icon={faChartBar} size="sm" className="fa-icon-force-current" />
              </button>
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
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

const SurveyDashboard = ({ surveys, deletedSurveys = [], onNewSurvey, onEditSurvey, onDeleteSurvey, onRestoreSurvey, onPermanentDeleteSurvey, onViewResponses, onLogout, onUpdatePublicStatus, userRole, currentUser, onViewUsers, onDuplicateSurvey }) => {
  const [activeTab, setActiveTab] = React.useState('active'); // 'active' or 'deleted'
  
  // Filtrar encuestas activas y eliminadas
  const activeSurveys = surveys.filter(s => !s.is_deleted);
  const deletedSurveysList = deletedSurveys.length > 0 ? deletedSurveys : surveys.filter(s => s.is_deleted);
  
  // Calcular estadísticas solo para encuestas activas
  const totalSurveys = activeSurveys.length;
  const publicSurveys = activeSurveys.filter(s => s.is_public).length;
  const totalQuestions = activeSurveys.reduce((sum, s) => sum + (s.questions?.length || 0), 0);
  
  const isRoot = userRole === 'root';
  const isGroupAdmin = userRole === 'group_admin';
  const canManageUsers = isRoot || isGroupAdmin;

  const displayName = currentUser ? [currentUser.first_name, currentUser.last_name].filter(Boolean).join(' ').trim() || currentUser.username : '';
  const roleLabel = (currentUser?.role && { root: 'Administrador', group_admin: 'Administrador de grupo', encuestador: 'Encuestador' }[currentUser.role]) || currentUser?.role || '';

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
                   </div>
                 )}
               </div>
               <div className="flex gap-3 flex-shrink-0">
                 {canManageUsers && onViewUsers && (
                   <button 
                     onClick={onViewUsers} 
                     className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-xl font-bold text-sm shadow-xl hover:shadow-2xl flex items-center gap-2 transition-all duration-200 hover:scale-105 active:scale-95"
                   >
                     <FontAwesomeIcon icon={faUsers} size="sm" className="fa-icon-force-white" /> Usuarios
                   </button>
                 )}
                 <button 
                   onClick={onNewSurvey} 
                   className="px-6 py-3 bg-gradient-to-r from-gray-900 to-gray-800 hover:from-black hover:to-gray-900 text-white rounded-xl font-bold text-sm shadow-xl hover:shadow-2xl flex items-center gap-2 transition-all duration-200 hover:scale-105 active:scale-95"
                 >
                   <FontAwesomeIcon icon={faPlus} size="sm" className="fa-icon-force-white" /> Nueva Encuesta
               </button>
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
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {deletedSurveysList.map(s => (
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
                    <p className="text-gray-500 mb-6">Comienza creando tu primera encuesta para recopilar respuestas.</p>
                    <button 
                      onClick={onNewSurvey}
                      className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-xl font-bold shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105 active:scale-95"
                    >
                      <FontAwesomeIcon icon={faPlus} size="sm" className="fa-icon-force-white mr-2" />
                      Crear Primera Encuesta
                    </button>
                </div>
              ) : (
                <>
                  {/* Estadísticas rápidas */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                    <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl p-5 text-white shadow-lg hover:shadow-xl transition-shadow">
                      <div className="text-3xl font-black mb-1">{totalSurveys}</div>
                      <div className="text-sm opacity-90 font-medium">Total Encuestas</div>
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
                      {activeSurveys.map(s => <SurveyCard 
                        key={s.id || s._id} 
                        survey={s} 
                        onEdit={() => onEditSurvey(s)} 
                        onDelete={() => onDeleteSurvey(s.id || s._id)} 
                        onViewResponses={() => onViewResponses(s)} 
                        onUpdatePublicStatus={onUpdatePublicStatus}
                        onDuplicate={onDuplicateSurvey ? () => onDuplicateSurvey(s) : undefined}
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
      setLoading(true);
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
      } finally {
          setLoading(false);
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

    // Validate conditional logic: ensure referenced questions exist
    const questionIds = surveyData.questions.map(q => q.id);
    const invalidConditionRefs = surveyData.questions.filter(q => {
      if (!q.conditional_logic || !q.conditional_logic.question_id) return false;
      return !questionIds.includes(q.conditional_logic.question_id);
    });
    if (invalidConditionRefs.length > 0) {
      alert('Error: Algunas preguntas tienen lógica condicional que referencia preguntas que no existen.');
      return;
    }

    const surveyPayload = { 
      title: surveyData.title, 
      description: surveyData.description || '', 
      group: DEFAULT_GROUP_ID, 
      questions: surveyData.questions.map((q, index) => {
        const questionText = q.question_text ?? q.text ?? '';
        const displayType = q.type || q.question_type;
        const backendType = typeMapping[displayType] ?? displayType ?? 'short_text';
        return {
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
          date_include_time: Boolean(q.date_include_time)
        };
      }),
      sections: (surveyData.sections || []).map((s, index) => ({
        id: s.id || `section_${index}`,
        title: s.title ?? '',
        description: s.description ?? '',
        order: s.order ?? index
      })),
      is_public: surveyData.is_public || false,
      reference_key_column: surveyData.reference_key_column || '',
      reference_mapping: surveyData.reference_mapping || {}
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
      ) : (
          <SurveyEditor 
              onSave={handleSaveSurvey}
              onBack={handleBackToDashboard}
              initialSurveyData={surveyToEdit} // Pass the fetched survey data to the editor
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