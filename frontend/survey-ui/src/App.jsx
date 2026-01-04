import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faPlus, faGear, faFont, faListUl, faSquareCheck, faStar, faCalendarDays, 
  faShareNodes, faTrash, faXmark, faBars, faEllipsisVertical, faChevronLeft, 
  faPenToSquare, faFileLines, faHashtag, faAlignLeft, faImage, faEye, faChartBar, faCheck,
  faPaperPlane, faTable, faFileExcel, faDownload, faChartPie, faChartLine, faUsers, faUserPlus,
  faSignature, faEraser, faEnvelope, faUser, faSearch, faFilter
} from '@fortawesome/free-solid-svg-icons';
import { authenticatedFetch, isAuthenticated, login, logout } from './auth';
import UserGroupsManager from './components/UserGroupsManager';
import GroupUsersManager from './components/GroupUsersManager';
import GroupAdminDashboard from './components/GroupAdminDashboard';
import ChecklistOperativoView from './components/ChecklistOperativoView';
import ChecklistMonthlySummaryView from './components/ChecklistMonthlySummaryView';
import * as XLSX from 'xlsx';
import logoImage from './assets/logo-survey-app.png';
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

  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    ctx.strokeStyle = '#1e40af';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Si hay un valor guardado, restaurar la firma
    if (value) {
      const img = new Image();
      img.onload = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
        setHasSignature(true);
      };
      img.src = value;
    }
  }, [value]);

  const startDrawing = (e) => {
    setIsDrawing(true);
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
    const y = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top;
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
    const y = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top;
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
    <div className={`tool-button-icon-container w-8 h-8 sm:w-9 sm:h-9 md:w-9 md:h-9 rounded-lg sm:rounded-xl md:rounded-xl flex items-center justify-center shadow-md md:shadow-lg text-white flex-shrink-0 ${color ? `bg-${color}-500 group-hover:shadow-${color}-500/40` : 'bg-gray-500'}`}>
      <FontAwesomeIcon icon={icon} size="xs" className="fa-icon-force-white text-xs sm:text-sm" />
    </div>
    <span className="text-[9px] sm:text-[10px] md:text-[10px] font-bold text-gray-500 uppercase tracking-wider group-hover:text-gray-800 hidden md:block text-center leading-tight" style={{ wordBreak: 'break-word', overflowWrap: 'break-word', whiteSpace: 'normal', maxWidth: '100%' }}>{label}</span>
  </button>
);

// --- VISTA: EDITOR DE ENCUESTAS ---

const QuestionBlock = ({ data, isActive, onClick, onDelete, onUpdate, sections = [], onAssignSection, surveyType = 'survey' }) => {
  const isOptionType = ['Opción Única', 'Casillas', 'Desplegable'].includes(data.type);
  const isChecklist = surveyType === 'checklist';

  return (
    <div 
      onClick={onClick}
      className={`relative group transition-all duration-300 mb-6 cursor-pointer ${isActive ? 'scale-[1.01] shadow-2xl shadow-indigo-500/10 z-10 translate-y-[-4px]' : 'hover:scale-[1.005] hover:shadow-lg opacity-95 hover:opacity-100 bg-white/60'}`}
    >
      <div className={`backdrop-blur-xl rounded-2xl border overflow-hidden transition-colors duration-300 ${isActive ? 'bg-white border-indigo-500 ring-1 ring-indigo-500/20' : 'bg-white/40 border-white/60 hover:bg-white/80'}`}>
        <div className={`absolute left-0 top-0 bottom-0 w-1.5 transition-colors ${isActive ? 'bg-indigo-500' : 'bg-transparent'}`} />
        <div className="p-4 sm:p-5 md:p-6 lg:p-8">
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
              
              <input type="text" value={data.description || ''} onChange={(e) => onUpdate({...data, description: e.target.value})} placeholder="Añade una descripción (opcional)" className="w-full text-xs sm:text-sm md:text-base mt-2 md:mt-3 bg-transparent border-none focus:ring-0 p-0 text-gray-500 placeholder-gray-400" />
              
              <div className="mt-4 sm:mt-6 pt-4 sm:pt-6 border-t border-gray-100/50">
                {isOptionType && (
                  <div className="space-y-2 sm:space-y-3">
                     {data.options?.map((opt, idx) => (
                       <div key={idx} className="flex items-center gap-2 sm:gap-3 animate-fadeIn">
                         {data.type === 'Opción Única' && <div className="w-4 h-4 sm:w-5 sm:h-5 rounded-full border-2 border-indigo-200 flex-shrink-0" />}
                         {data.type === 'Casillas' && <div className="w-4 h-4 sm:w-5 sm:h-5 rounded border-2 border-indigo-200 flex-shrink-0" />}
                         {data.type === 'Desplegable' && <span className="text-gray-400 text-xs sm:text-sm flex-shrink-0">{idx + 1}.</span>}

                         <input 
                           value={opt} 
                           onChange={(e) => { 
                             if (isChecklist && data.type === 'Opción Única') {
                               // Validar que solo sean "Cumple" o "No cumple"
                               const newValue = e.target.value;
                               if (newValue !== 'Cumple' && newValue !== 'No cumple' && newValue !== '') {
                                 alert('Las listas de chequeo solo permiten opciones "Cumple" y "No cumple".');
                                 return;
                               }
                             }
                             const newOpts = [...data.options]; 
                             newOpts[idx] = e.target.value; 
                             onUpdate({...data, options: newOpts}); 
                           }} 
                           className="flex-1 bg-gray-50/80 hover:bg-white rounded-lg px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm focus:bg-white focus:ring-2 focus:ring-indigo-100 transition-all border-transparent focus:border-indigo-200 shadow-sm" 
                         />
                         {!(isChecklist && data.type === 'Opción Única' && data.options?.length === 2) && (
                           <button onClick={() => { 
                             if (isChecklist && data.type === 'Opción Única' && data.options?.length <= 2) {
                               alert('Las listas de chequeo deben tener exactamente 2 opciones: "Cumple" y "No cumple".');
                               return;
                             }
                             const newOpts = data.options.filter((_, i) => i !== idx); 
                             onUpdate({...data, options: newOpts}); 
                           }} className="flex-shrink-0 p-1">
                             <FontAwesomeIcon icon={faXmark} size="sm" className="text-gray-300 hover:text-red-400 fa-icon-force-current" />
                           </button>
                         )}
                       </div>
                     ))}
                     {!(isChecklist && data.type === 'Opción Única' && data.options?.length >= 2) && (
                       <button 
                         onClick={() => {
                           if (isChecklist && data.type === 'Opción Única') {
                             if (data.options?.length >= 2) {
                               alert('Las listas de chequeo solo permiten 2 opciones: "Cumple" y "No cumple".');
                               return;
                             }
                             // Agregar la opción faltante
                             const hasCumple = data.options?.includes('Cumple');
                             const hasNoCumple = data.options?.includes('No cumple');
                             if (!hasCumple) {
                               onUpdate({...data, options: [...(data.options || []), 'Cumple']});
                             } else if (!hasNoCumple) {
                               onUpdate({...data, options: [...(data.options || []), 'No cumple']});
                             }
                           } else {
                             onUpdate({...data, options: [...(data.options || []), `Opción ${data.options?.length + 1}`]});
                           }
                         }} 
                         className="text-xs font-bold text-indigo-500 hover:text-indigo-700 flex items-center gap-1 mt-2 sm:mt-3 pl-1 py-1.5 sm:py-2 px-2 sm:px-3 hover:bg-indigo-50 rounded-lg w-fit transition-colors"
                       >
                         <FontAwesomeIcon icon={faPlus} size="sm" className="fa-icon-force-current" />
                         {isChecklist && data.type === 'Opción Única' ? 'Agregar opción faltante' : `Agregar opción`}
                       </button>
                     )}
                     {isChecklist && data.type === 'Opción Única' && (
                       <p className="text-xs text-gray-500 italic mt-2">
                         Las listas de chequeo requieren exactamente 2 opciones: "Cumple" y "No cumple"
                       </p>
                     )}
                  </div>
                )}
                {data.type === 'Puntuación' && <div className="flex gap-4 justify-center py-6 bg-gray-50/50 rounded-xl border border-dashed border-gray-200">{[1,2,3,4,5].map(i => <FontAwesomeIcon key={i} icon={faStar} size="lg" className="text-gray-300 fa-icon-force-current" />)}</div>}
                {data.type === 'Texto Corto' && <div className="h-14 bg-gray-50 rounded-xl border border-gray-200/60 flex items-center px-4 text-gray-400 text-sm italic shadow-inner">El usuario escribirá su respuesta aquí...</div>}
                {data.type === 'Párrafo' && <div className="h-20 bg-gray-50 rounded-xl border border-gray-200/60 flex items-center px-4 text-gray-400 text-sm italic shadow-inner">El usuario escribirá un párrafo aquí...</div>}
                {data.type === 'Número' && <div className="h-14 bg-gray-50 rounded-xl border border-gray-200/60 flex items-center px-4 text-gray-400 text-sm italic shadow-inner">El usuario introducirá un número aquí...</div>}
                {data.type === 'Fecha' && <div className="h-14 bg-gray-50 rounded-xl border border-gray-200/60 flex items-center px-4 text-gray-400 text-sm italic shadow-inner">El usuario seleccionará una fecha aquí...</div>}
                {data.type === 'Correo Electrónico' && <div className="h-14 bg-gray-50 rounded-xl border border-gray-200/60 flex items-center px-4 text-gray-400 text-sm italic shadow-inner">El usuario ingresará su correo electrónico aquí...</div>}
                {data.type === 'Firma' && <div className="h-32 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300 flex flex-col items-center justify-center gap-2 shadow-inner">
                  <FontAwesomeIcon icon={faSignature} size="2x" className="text-gray-400 fa-icon-force-current" />
                  <span className="text-gray-400 text-sm italic">El usuario firmará aquí...</span>
                </div>}
              </div>
            </div>
          ) : (
            <div className="md:pr-10">
              <h3 className="text-base sm:text-lg md:text-xl font-semibold text-gray-700 mb-2 break-words">{data.text || 'Sin pregunta definida'}</h3>
              {data.description && <p className="text-xs sm:text-sm text-gray-400 mb-3 sm:mb-4 break-words">{data.description}</p>}
              
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
              </div>
            </div>
          )}
        </div>

        {isActive && (
          <div className="bg-gray-50/90 backdrop-blur px-4 sm:px-6 py-2 sm:py-3 border-t border-gray-200 flex flex-col gap-3 text-xs font-medium text-gray-500">
             <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3">
               <span className="uppercase tracking-wider font-bold text-gray-400 text-[10px]">Configuración</span>
               <div onClick={() => onUpdate({...data, required: !data.required})} className={`flex items-center gap-2 cursor-pointer px-2 py-1 rounded hover:bg-gray-200 transition-colors ${data.required ? 'text-indigo-600' : 'text-gray-400'}`}>
                 <div className={`w-3 h-3 rounded border ${data.required ? 'bg-indigo-500 border-indigo-500' : 'border-gray-400'}`} />
                 <span>Obligatorio</span>
               </div>
               {sections.length > 0 && (
                 <div className="flex items-center gap-2">
                   <span className="text-gray-400">Sección:</span>
                   <select
                     value={data.section_id || ''}
                     onChange={(e) => {
                       onUpdate({...data, section_id: e.target.value || null});
                       if (onAssignSection) onAssignSection(e.target.value || null);
                     }}
                     className="px-2 py-1 border border-gray-300 rounded text-xs bg-white focus:ring-2 focus:ring-indigo-500"
                     onClick={(e) => e.stopPropagation()}
                   >
                     <option value="">Sin sección</option>
                     {sections.map(section => (
                       <option key={section.id} value={section.id}>{section.title}</option>
                     ))}
                   </select>
                 </div>
               )}
             </div>
             <span className="text-indigo-400 flex items-center gap-1 text-xs">
               <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse"/> 
               <span className="hidden sm:inline">Editando</span>
             </span>
          </div>
        )}
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
              type="date"
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
          <img 
            src={logoImage} 
            alt="Survey App Logo" 
            className="h-24 w-auto object-contain hidden md:block"
          />
          <div>
            <h1 className="text-xl md:text-2xl font-black text-gray-800 tracking-tight leading-none">Vista Previa</h1>
            <span className="text-xs font-bold text-indigo-500 uppercase tracking-widest hidden md:inline-block mt-1">Modo Previsualización</span>
          </div>
        </div>
      </header>

      <div className="w-full max-w-3xl mx-auto px-4 py-8 md:py-12">
        <div className="mb-10">
          <h1 className="text-4xl md:text-5xl font-black text-gray-900 mb-3">{surveyData.title || 'Sin título'}</h1>
          {surveyData.description && (
            <p className="text-lg text-gray-500">{surveyData.description}</p>
          )}
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

  // Function to determine visible sections based on conditions
  const getVisibleSections = (sections, questions, answers) => {
    if (!sections || sections.length === 0) return [];
    
    return sections.filter(section => {
      // Find questions in this section
      const sectionQuestions = questions.filter(q => q.section_id === section.id);
      
      // Check if any question in this section has conditional logic
      const hasCondition = sectionQuestions.some(q => q.conditional_logic);
      
      if (!hasCondition) return true; // Show section if no conditions
      
      // Check all conditions in section questions
      return sectionQuestions.every(q => {
        if (!q.conditional_logic) return true;
        return evaluateCondition(q.conditional_logic, answers);
      });
    });
  };

  useEffect(() => {
    const fetchSurvey = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/public/surveys/${surveyId}/`);
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error('Encuesta no encontrada');
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
          'email': 'Correo Electrónico'
        };
        
        const questionsWithIds = (data.questions || []).map((q, index) => ({
          ...q,
          id: q.id || `q_${index}`,
          type: reverseTypeMapping[q.question_type] || q.question_type || q.type,
          text: q.question_text || q.text,
          options: q.options || [],
          section_id: q.section_id || null,
          conditional_logic: q.conditional_logic || null
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
      const visible = getVisibleSections(surveyData.sections, surveyData.questions, answers);
      setVisibleSections(visible.map(s => s.id));
      
      // If current section is no longer visible, move to first visible section
      if (currentSection && !visible.find(s => s.id === currentSection)) {
        if (visible.length > 0) {
          setCurrentSection(visible[0].id);
        }
      }
    }
  }, [answers, surveyData]);

  const handleAnswerChange = (questionId, value) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
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

    return (
      <div key={questionId} className="bg-white/90 backdrop-blur-xl rounded-3xl border border-white/80 p-6 md:p-8 shadow-lg hover:shadow-xl transition-all duration-300 group">
        {/* Header de la pregunta */}
        <div className="mb-6 pb-4 border-b border-gray-200/60">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center text-white font-black text-lg shadow-lg">
              {index + 1}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-xl md:text-2xl font-black text-gray-900 mb-2 leading-tight">
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
            <input
              type="text"
              value={answers[questionId] || ''}
              onChange={(e) => handleAnswerChange(questionId, e.target.value)}
              className="w-full px-5 py-4 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 text-base bg-gray-50/50 hover:bg-white focus:bg-white"
              placeholder="Escribe tu respuesta aquí..."
            />
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
            <input
              type="number"
              value={answers[questionId] || ''}
              onChange={(e) => handleAnswerChange(questionId, e.target.value)}
              className="w-full px-5 py-4 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 text-base bg-gray-50/50 hover:bg-white focus:bg-white"
              placeholder="Ingresa un número..."
            />
          )}

          {question.type === 'Fecha' && (
            <input
              type="date"
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
        {/* Header mejorado */}
        <div className="mb-12 text-center">
          <div className="bg-white/80 backdrop-blur-xl rounded-3xl p-8 md:p-12 shadow-xl border border-white/60 mb-8">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-black bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent mb-4 leading-tight">
              {surveyData.title || 'Encuesta'}
            </h1>
            {surveyData.description && (
              <p className="text-lg md:text-xl text-gray-700 leading-relaxed max-w-3xl mx-auto">
                {surveyData.description}
              </p>
            )}
            <div className="mt-6 flex items-center justify-center gap-4 text-sm text-gray-500">
              <span className="flex items-center gap-2">
                <FontAwesomeIcon icon={faListUl} size="sm" className="fa-icon-force-current" />
                {surveyData.questions?.length || 0} {surveyData.questions?.length === 1 ? 'Pregunta' : 'Preguntas'}
              </span>
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

        {/* Formulario mejorado */}
        <form onSubmit={handleSubmit} className="space-y-6">
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

          {/* Botón de envío mejorado */}
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
        </form>
      </div>
    </div>
  );
};

const SurveyEditor = ({ onSave, onBack, initialSurveyData, currentUser, userGroups = [] }) => { // Added initialSurveyData, currentUser, userGroups
  const [activeQuestionId, setActiveQuestionId] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const [surveyData, setSurveyData] = useState(initialSurveyData || { title: "Mi Nueva Encuesta", description: "Descripción breve de la encuesta", questions: [], sections: [], survey_type: 'survey' }); // Initialize with initialSurveyData or default
  const [showSectionManager, setShowSectionManager] = useState(false);
  const [surveyType, setSurveyType] = useState(initialSurveyData?.survey_type || 'survey'); // 'survey' or 'checklist'
  // Para group_admin, siempre usar su grupo asignado (no puede elegir)
  const initialGroupId = currentUser?.role === 'group_admin' 
    ? (currentUser?.user_group_id || '')
    : (initialSurveyData?.user_group_id || currentUser?.user_group_id || '');
  const [selectedUserGroupId, setSelectedUserGroupId] = useState(initialGroupId);

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
        'email': 'Correo Electrónico'
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
      
      // Para group_admin, siempre usar su grupo asignado
      const finalUserGroupId = currentUser?.role === 'group_admin' 
        ? (currentUser?.user_group_id || '')
        : (initialSurveyData.user_group_id || currentUser?.user_group_id || '');
      
      setSurveyData({
        ...initialSurveyData,
        questions: questionsWithSections,
        sections: sections,
        user_group_id: finalUserGroupId,
        survey_type: initialSurveyData.survey_type || 'survey'
      });
      setSelectedUserGroupId(finalUserGroupId);
      setSurveyType(initialSurveyData.survey_type || 'survey');
    } else {
      // Para group_admin, siempre inicializar con su grupo
      const defaultGroupId = currentUser?.role === 'group_admin' 
        ? (currentUser?.user_group_id || '')
        : '';
      setSurveyData({ 
        title: "Mi Nueva Encuesta", 
        description: "Descripción breve de la encuesta", 
        questions: [],
        user_group_id: defaultGroupId,
        survey_type: 'survey'
      });
      setSelectedUserGroupId(defaultGroupId);
      setSurveyType('survey');
    }
  }, [initialSurveyData, currentUser]);

  const questionTools = [
    { label: 'Texto Corto', icon: faFont, color: 'blue', type: 'Texto Corto' },
    { label: 'Párrafo', icon: faAlignLeft, color: 'gray', type: 'Párrafo' },
    { label: 'Opción Única', icon: faListUl, color: 'purple', type: 'Opción Única' },
    { label: 'Casillas', icon: faSquareCheck, color: 'green', type: 'Casillas' },
    { label: 'Desplegable', icon: faListUl, color: 'orange', type: 'Desplegable' },
    { label: 'Número', icon: faHashtag, color: 'yellow', type: 'Número' },
    { label: 'Fecha', icon: faCalendarDays, color: 'pink', type: 'Fecha' },
    { label: 'Puntuación', icon: faStar, color: 'red', type: 'Puntuación' },
    { label: 'Firma', icon: faSignature, color: 'indigo', type: 'Firma' },
    { label: 'Correo Electrónico', icon: faEnvelope, color: 'blue', type: 'Correo Electrónico' },
  ];

  const addQuestion = (type) => {
    // Para checklists, solo permitir "Opción Única"
    if (surveyType === 'checklist' && type !== 'Opción Única') {
      alert('Las listas de chequeo solo permiten preguntas tipo "Opción Única" con opciones "Cumple" y "No cumple".');
      return;
    }
    
    const newQ = { 
      id: generateId(), 
      type, 
      text: '', 
      description: '', 
      required: false, 
      options: ['Opción Única', 'Casillas', 'Desplegable'].includes(type) 
        ? (surveyType === 'checklist' ? ['Cumple', 'No cumple'] : ['Opción 1'])
        : [],
      section_id: null, // Will be assigned to a section if sections exist
      conditional_logic: null
    };
    setSurveyData(prev => ({ ...prev, questions: [...prev.questions, newQ] }));
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
        s.id === id ? { ...newData, id: id } : s
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
          // Preserve the ID when updating
          return { ...newData, id: id };
        }
        return q;
      });
      return { ...prev, questions: updatedQuestions };
    });
  };

  const deleteQuestion = (id) => {
    setSurveyData(prev => ({ ...prev, questions: prev.questions.filter(q => q.id !== id) }));
  };
  
  const handlePublish = () => {
    // Validar checklist: todas las preguntas deben ser "Opción Única" con exactamente 2 opciones: "Cumple" y "No cumple"
    if (surveyType === 'checklist') {
      const invalidQuestions = surveyData.questions.filter(q => {
        if (q.type !== 'Opción Única') return true;
        if (!q.options || q.options.length !== 2) return true;
        const options = q.options.map(opt => opt.trim());
        return !(options.includes('Cumple') && options.includes('No cumple'));
      });
      
      if (invalidQuestions.length > 0) {
        alert('Las listas de chequeo solo pueden tener preguntas tipo "Opción Única" con exactamente 2 opciones: "Cumple" y "No cumple".');
        return;
      }
    }
    
    // Para group_admin, siempre usar su grupo asignado
    let finalUserGroupId = selectedUserGroupId || null;
    if (currentUser?.role === 'group_admin' && currentUser?.user_group_id) {
      finalUserGroupId = currentUser.user_group_id;
    }
    
    const dataToSave = {
      ...surveyData,
      user_group_id: finalUserGroupId,
      survey_type: surveyType
    };
    onSave(dataToSave);
  };

  return (
    <>
      {!showPreview && (
      <nav className={`fixed z-50 transition-all duration-300 border-gray-200/50 backdrop-blur-xl bg-white/70 md:w-[135px] md:h-screen md:left-0 md:top-0 md:border-r md:flex-col bottom-0 w-full h-auto border-t flex flex-row items-center md:justify-start px-2 sm:px-3 py-2 sm:py-2.5 md:py-4 gap-1.5 sm:gap-2 md:gap-2 shadow-2xl md:shadow-none overflow-x-auto md:overflow-y-auto md:overflow-x-hidden scrollbar-hide`}>
        <div className="hidden md:flex md:flex-col md:h-full md:w-full">
          
          {/* Contenedor scrollable para las herramientas */}
          <div className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-hide md:flex md:flex-col md:gap-2 md:px-2">
            {(surveyType === 'checklist' 
              ? questionTools.filter(tool => tool.type === 'Opción Única')
              : questionTools
            ).map(tool => <ToolButton key={tool.label} icon={tool.icon} label={tool.label} color={tool.color} onClick={() => addQuestion(tool.type)} />)}
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
          {(surveyType === 'checklist' 
            ? questionTools.filter(tool => tool.type === 'Opción Única')
            : questionTools
          ).map(tool => <ToolButton key={tool.label} icon={tool.icon} label={tool.label} color={tool.color} onClick={() => addQuestion(tool.type)} />)}
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
               <div className="flex items-center gap-2 mt-1">
                 <span className="text-xs font-bold text-indigo-500 uppercase tracking-widest hidden md:inline-block">Modo Edición</span>
                 {surveyType === 'checklist' && (
                   <span className="text-xs font-bold text-green-600 bg-green-100 px-2 py-1 rounded-full">Lista de Chequeo</span>
                 )}
               </div>
             </div>
           </div>
           <div className="flex gap-2 flex-shrink-0 w-full md:w-auto">
             {/* Selector de tipo de encuesta - solo mostrar si no hay preguntas o es nueva encuesta */}
             {(!initialSurveyData || surveyData.questions.length === 0) && (
               <select
                 value={surveyType}
                 onChange={(e) => {
                   const newType = e.target.value;
                   if (newType === 'checklist' && surveyData.questions.length > 0) {
                     if (!window.confirm('Cambiar a Lista de Chequeo eliminará todas las preguntas actuales. ¿Continuar?')) {
                       return;
                     }
                     setSurveyData({ ...surveyData, questions: [] });
                   }
                   setSurveyType(newType);
                 }}
                 className="flex-1 md:flex-none px-3 md:px-4 py-2 md:py-2.5 bg-white border-2 border-gray-300 rounded-xl font-bold text-xs md:text-sm shadow-lg hover:border-indigo-500 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
               >
                 <option value="survey">Encuesta</option>
                 <option value="checklist">Lista de Chequeo</option>
               </select>
             )}
             <button 
               onClick={() => setShowSectionManager(!showSectionManager)} 
               className="flex-1 md:flex-none px-4 md:px-5 py-2 md:py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold text-xs md:text-sm shadow-xl flex items-center justify-center gap-2 transition-transform active:scale-95"
               title="Gestionar Secciones"
             >
               <FontAwesomeIcon icon={faListUl} size="sm" className="fa-icon-force-white" /> 
               <span className="hidden sm:inline">Secciones</span>
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
          className="w-full max-w-3xl mx-auto px-4 py-6 md:py-8 lg:py-12"
        >
           <div 
             className="mb-6 md:mb-10 group"
             style={{
               minWidth: 0,
               width: '100%',
               maxWidth: '100%',
               boxSizing: 'border-box',
               overflow: 'visible'
             }}
           >
             <textarea
               value={surveyData.title} 
               onChange={(e) => {
                 const newTitle = e.target.value;
                 const titleInput = e.target;
                 // Auto-resize textarea
                 titleInput.style.height = 'auto';
                 titleInput.style.height = `${titleInput.scrollHeight}px`;
                 setSurveyData({...surveyData, title: newTitle});
               }}
               onInput={(e) => {
                 // Auto-resize on input
                 e.target.style.height = 'auto';
                 e.target.style.height = `${e.target.scrollHeight}px`;
               }}
               className="w-full text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black text-gray-900 bg-transparent border-none focus:ring-0 p-0 placeholder-gray-300 resize-none overflow-hidden" 
               placeholder="Título de la Encuesta"
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
               className="w-full mt-2 md:mt-3 text-base md:text-lg text-gray-500 bg-transparent border-none focus:ring-0 p-0 placeholder-gray-400" 
               placeholder="Describe brevemente el propósito de este formulario..." 
             />
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
               surveyData.questions.map((q) => (
                 <QuestionBlock 
                   key={q.id} 
                   data={q} 
                   isActive={activeQuestionId === q.id} 
                   onClick={() => setActiveQuestionId(q.id)} 
                   onDelete={() => deleteQuestion(q.id)} 
                   onUpdate={(newData) => updateQuestion(q.id, newData)}
                   sections={surveyData.sections || []}
                   onAssignSection={(sectionId) => assignQuestionToSection(q.id, sectionId)}
                   surveyType={surveyType}
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


// --- VISTA: RESUMEN MENSUAL DE CHECKLIST ---

const ChecklistMonthlySummary = ({ survey, onBack }) => {
  const [summaryData, setSummaryData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);

  const months = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  const fetchSummary = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await authenticatedFetch(
        `/api/checklists/${survey.id || survey._id}/monthly-summary/?year=${selectedYear}&month=${selectedMonth}`
      );
      if (response.ok) {
        const data = await response.json();
        setSummaryData(data);
      } else {
        const errorData = await response.json();
        setError(errorData.detail || 'Error al cargar el resumen');
      }
    } catch (err) {
      setError('Error al cargar el resumen: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (survey) {
      fetchSummary();
    }
  }, [survey, selectedYear, selectedMonth]);

  const exportToExcel = () => {
    if (!summaryData || !summaryData.areas || summaryData.areas.length === 0) return;

    const wsData = [];
    
    // Header row
    const headerRow = ['SERVICIO', 'PREGUNTA'];
    for (let day = 1; day <= 31; day++) {
      headerRow.push(`Día ${day}`);
    }
    headerRow.push('PROMEDIO POR ÁREAS');
    wsData.push(headerRow);

    // Data rows
    summaryData.areas.forEach(area => {
      area.questions.forEach((question, qIdx) => {
        const row = [];
        if (qIdx === 0) {
          row.push(area.name);
        } else {
          row.push('');
        }
        row.push(question.text);
        
        question.days.forEach(dayData => {
          row.push(dayData.status);
        });
        
        if (qIdx === 0) {
          row.push(`${area.average}%`);
        } else {
          row.push('');
        }
        
        wsData.push(row);
      });
    });

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    XLSX.utils.book_append_sheet(wb, ws, 'Resumen Mensual');
    XLSX.writeFile(wb, `Resumen_Mensual_${selectedYear}_${selectedMonth}.xlsx`);
  };

  const getStatusColor = (status) => {
    if (status === 'C' || status === 'C/C') return 'bg-green-100 text-green-700';
    if (status === 'C/NC') return 'bg-yellow-100 text-yellow-700';
    if (status === 'NC' || status === 'NC/NC') return 'bg-red-100 text-red-700';
    return 'bg-gray-100 text-gray-500';
  };

  if (loading && !summaryData) {
    return (
      <main className="flex-1 relative z-10">
        <header className="sticky top-0 z-40 px-4 py-4 md:px-12 md:py-6 flex justify-between items-center bg-white/50 backdrop-blur-md border-b border-white/40">
          <div className="flex items-center gap-3">
            <button className="p-2 -ml-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors" onClick={onBack} title="Volver">
              <FontAwesomeIcon icon={faChevronLeft} size="sm" className="fa-icon-force-current" />
            </button>
            <img 
              src={logoImage} 
              alt="Survey App Logo" 
              className="h-24 w-auto object-contain hidden md:block"
            />
            <div>
              <h1 className="text-xl md:text-2xl font-black text-gray-800 tracking-tight leading-none">Resumen Mensual</h1>
              <span className="text-xs font-bold text-indigo-500 uppercase tracking-widest hidden md:inline-block mt-1">Cargando...</span>
            </div>
          </div>
        </header>
        <div className="w-full max-w-7xl mx-auto px-4 py-8 md:py-12">
          <div className="text-center py-20">
            <p className="text-gray-500">Cargando resumen mensual...</p>
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
          <img 
            src={logoImage} 
            alt="Survey App Logo" 
            className="h-24 w-auto object-contain hidden md:block"
          />
          <div>
            <h1 className="text-xl md:text-2xl font-black text-gray-800 tracking-tight leading-none">Resumen Mensual de Cumplimiento</h1>
            <span className="text-xs font-bold text-indigo-500 uppercase tracking-widest hidden md:inline-block mt-1">{survey.title}</span>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={fetchSummary}
            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg font-bold text-sm flex items-center gap-2"
          >
            <FontAwesomeIcon icon={faSearch} size="sm" /> Refrescar
          </button>
          <button
            onClick={exportToExcel}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold text-sm flex items-center gap-2"
            disabled={!summaryData}
          >
            <FontAwesomeIcon icon={faFileExcel} size="sm" /> Exportar
          </button>
        </div>
      </header>

      <div className="w-full max-w-7xl mx-auto px-4 py-8 md:py-12">
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700">
            {error}
          </div>
        )}

        <div className="mb-6 flex flex-col sm:flex-row gap-4 items-start sm:items-center">
          <label className="text-sm font-bold text-gray-700">Seleccionar Mes:</label>
          <div className="flex gap-2">
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            >
              {months.map((month, idx) => (
                <option key={idx} value={idx + 1}>{month}</option>
              ))}
            </select>
            <input
              type="number"
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 w-32"
              min="2020"
              max="2100"
            />
          </div>
        </div>

        {summaryData && summaryData.areas && summaryData.areas.length > 0 ? (
          <div className="bg-white/90 backdrop-blur-xl rounded-3xl border border-white/80 shadow-lg overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-indigo-50">
                  <th className="border border-gray-300 px-4 py-3 text-left font-bold text-gray-700 sticky left-0 bg-indigo-50 z-10">SERVICIO</th>
                  <th className="border border-gray-300 px-4 py-3 text-left font-bold text-gray-700">PREGUNTA</th>
                  {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                    <th key={day} className="border border-gray-300 px-2 py-3 text-center font-bold text-gray-700 text-xs min-w-[60px]">
                      {day}
                    </th>
                  ))}
                  <th className="border border-gray-300 px-4 py-3 text-center font-bold text-gray-700 bg-green-50">PROMEDIO POR ÁREAS</th>
                </tr>
              </thead>
              <tbody>
                {summaryData.areas.map((area, areaIdx) => (
                  area.questions.map((question, qIdx) => (
                    <tr key={`${areaIdx}-${qIdx}`} className="hover:bg-gray-50">
                      {qIdx === 0 && (
                        <td 
                          rowSpan={area.questions.length} 
                          className="border border-gray-300 px-4 py-3 font-bold text-gray-800 sticky left-0 bg-white z-10"
                        >
                          {area.name}
                        </td>
                      )}
                      <td className="border border-gray-300 px-4 py-3 text-gray-700">
                        {question.text}
                      </td>
                      {question.days.map((dayData, dayIdx) => (
                        <td 
                          key={dayIdx} 
                          className={`border border-gray-300 px-2 py-2 text-center text-xs font-bold ${getStatusColor(dayData.status)}`}
                        >
                          {dayData.status}
                        </td>
                      ))}
                      {qIdx === 0 && (
                        <td 
                          rowSpan={area.questions.length}
                          className="border border-gray-300 px-4 py-3 text-center font-bold text-gray-800 bg-green-50"
                        >
                          {area.average}%
                        </td>
                      )}
                    </tr>
                  ))
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-24 border-2 border-dashed border-gray-300/60 rounded-3xl bg-white/40 backdrop-blur-sm">
            <p className="text-2xl font-black text-gray-700 mb-2">No hay datos disponibles</p>
            <p className="text-gray-500">No se encontraron chequeos para el mes seleccionado.</p>
          </div>
        )}
      </div>
    </main>
  );
};

// --- VISTA: RESPUESTAS DE ENCUESTAS ---

const SurveyResponsesView = ({ survey, responses, onBack, loading }) => {
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
            <img 
              src={logoImage} 
              alt="Survey App Logo" 
              className="h-24 w-auto object-contain hidden md:block"
            />
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

  const formatAnswer = (answer, questionType) => {
    // Handle email type
    if (questionType === 'Correo Electrónico' || questionType === 'email') {
      return answer || '-';
    }
    // Si es una firma, retornar un marcador especial para renderizar como imagen
    if (isSignature(answer)) {
      return '__SIGNATURE_IMAGE__';
    }
    if (Array.isArray(answer)) {
      return answer.join(', ');
    }
    if (typeof answer === 'object' && answer !== null) {
      return JSON.stringify(answer);
    }
    return answer || 'Sin respuesta';
  };

  // Componente para renderizar respuesta (texto o imagen de firma)
  const renderAnswer = (answer, questionType) => {
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
    return <p className="text-gray-700 text-base">{formatAnswer(answer, questionType)}</p>;
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
        response.synced ? 'Sincronizado' : 'Pendiente',
        formatDate(dateValue, responseId)
      ];
      
      // Agregar respuestas por pregunta
      questions.forEach(q => {
        const questionId = q.id || q._id;
        const answer = response.answers && response.answers[questionId];
        row.push(formatAnswer(answer, q.type || q.question_type));
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
            <img 
              src={logoImage} 
              alt="Survey App Logo" 
              className="h-24 w-auto object-contain hidden md:block"
            />
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
                    <span className="text-green-600">✓ Sincronizado</span>
                  ) : (
                    <span className="text-yellow-600">⏳ Pendiente</span>
                  )}
                </span>
              </div>
            </div>
            <div className="space-y-6">
              {selectedResponse.answers && typeof selectedResponse.answers === 'object' ? (
                Object.entries(selectedResponse.answers).map(([questionId, answer]) => (
                  <div key={questionId} className="border-l-4 border-indigo-500 pl-6 py-4 bg-gray-50 rounded-r-lg">
                    <h4 className="font-semibold text-lg text-gray-800 mb-2">{getQuestionText(questionId)}</h4>
                    {renderAnswer(answer, getQuestionType(questionId))}
                  </div>
                ))
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
          <img 
            src={logoImage} 
            alt="Survey App Logo" 
            className="h-24 w-auto object-contain hidden md:block"
          />
          <div>
            <h1 className="text-xl md:text-2xl font-black text-gray-800 tracking-tight leading-none">{survey.title || 'Respuestas'}</h1>
            <span className="text-xs font-bold text-indigo-500 uppercase tracking-widest hidden md:inline-block mt-1">
              {responses.length} {responses.length === 1 ? 'Respuesta' : 'Respuestas'}
            </span>
          </div>
        </div>
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
                  <div className="text-sm opacity-90 font-medium">Sincronizadas</div>
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
                                    Sincronizado
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
                                      <div className="truncate" title={formatAnswer(answer, q.type || q.question_type)}>
                                        {formatAnswer(answer, q.type || q.question_type)}
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
                                Sincronizado
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
  const [activeTab, setActiveTab] = useState('users'); // 'users' or 'groups'
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showUserForm, setShowUserForm] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [userGroups, setUserGroups] = useState([]);
  const [loadingGroups, setLoadingGroups] = useState(false);
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

  const fetchUserGroups = async () => {
    setLoadingGroups(true);
    try {
      const response = await authenticatedFetch('/api/user-groups/');
      if (response.ok) {
        const data = await response.json();
        setUserGroups(data);
      }
    } catch (err) {
      console.error('Error al cargar grupos:', err);
    } finally {
      setLoadingGroups(false);
    }
  };

  useEffect(() => {
    if (userRole === 'root') {
      fetchUsers();
      fetchUserGroups();
    } else {
      alert('No tienes permisos para acceder a esta sección.');
      onBack();
    }
  }, [userRole]);

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

    // Removida validación obligatoria de grupo para group_admin
    // El grupo se puede asignar después de crear el usuario y el grupo

    try {
      const response = await authenticatedFetch('/api/users/', {
        method: 'POST',
        body: JSON.stringify(formData)
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

    // Removida validación obligatoria de grupo para group_admin
    // El grupo se puede asignar después de crear el usuario y el grupo

    try {
      const updateData = { ...formData };
      if (!updateData.password) {
        delete updateData.password;
        delete updateData.password_confirm;
      }
      
      // Convertir user_group_id vacío a null
      if (updateData.user_group_id === '') {
        updateData.user_group_id = null;
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
    setFormData({
      username: user.username,
      first_name: user.first_name || '',
      last_name: user.last_name || '',
      email: user.email || '',
      password: '',
      password_confirm: '',
      role: user.role || 'encuestador',
      user_group_id: user.user_group_id || '',
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
        return 'bg-purple-100 text-purple-700 border-purple-300';
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
        return 'Admin de Grupo';
      case 'analista':
        return 'Analista';
      case 'encuestador':
        return 'Encuestador';
      default:
        return role;
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
    <main className="flex-1 relative z-10">
      <header className="sticky top-0 z-40 px-4 py-5 md:px-12 md:py-6 bg-white/70 backdrop-blur-xl border-b border-white/60 shadow-sm">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-4">
            <img 
              src={logoImage} 
              alt="Survey App Logo" 
              className="h-24 w-auto object-contain hidden md:block"
            />
            <div>
              <h1 className="text-3xl md:text-4xl font-black bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent tracking-tight mb-1">
                Gestión de Usuarios
              </h1>
              <p className="text-sm text-gray-600 font-medium">Administra usuarios y grupos del sistema.</p>
            </div>
          </div>
          <div className="flex gap-3">
            {activeTab === 'users' && (
              <button 
                onClick={handleNewUser} 
                className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-xl font-bold text-sm shadow-xl hover:shadow-2xl flex items-center gap-2 transition-all duration-200 hover:scale-105 active:scale-95"
              >
                <FontAwesomeIcon icon={faUserPlus} size="sm" className="fa-icon-force-white" /> Nuevo Usuario
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
        
        {/* Pestañas */}
        <div className="max-w-7xl mx-auto mt-4 flex gap-2 border-b border-gray-200">
          <button
            onClick={() => setActiveTab('users')}
            className={`px-6 py-3 font-bold text-sm transition-all ${
              activeTab === 'users'
                ? 'text-indigo-600 border-b-2 border-indigo-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <FontAwesomeIcon icon={faUsers} size="sm" className="mr-2" /> Usuarios
          </button>
          <button
            onClick={() => setActiveTab('groups')}
            className={`px-6 py-3 font-bold text-sm transition-all ${
              activeTab === 'groups'
                ? 'text-indigo-600 border-b-2 border-indigo-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <FontAwesomeIcon icon={faUsers} size="sm" className="mr-2" /> Grupos
          </button>
        </div>
      </header>

      <div className="w-full max-w-7xl mx-auto px-4 py-8 md:py-12">
        {activeTab === 'groups' ? (
          <UserGroupsManager 
            onGroupSelect={(group) => {
              setActiveTab('users');
              // Opcional: filtrar usuarios por grupo o mostrar información del grupo
            }}
          />
        ) : showUserForm ? (
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
                  onChange={(e) => setFormData({...formData, role: e.target.value})}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  required
                >
                  <option value="encuestador">Encuestador</option>
                  <option value="analista">Analista</option>
                  <option value="group_admin">Administrador de Grupo</option>
                  <option value="root">Root</option>
                </select>
                {formData.role === 'group_admin' && (
                  <p className="text-xs text-gray-500 mt-1">
                    Los administradores de grupo pueden gestionar usuarios y encuestas de su grupo asignado. Puedes crear el usuario primero y asignar el grupo después.
                  </p>
                )}
              </div>

              {formData.role === 'group_admin' && (
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    Grupo <span className="text-gray-400 text-xs">(Opcional - puedes asignarlo después)</span>
                  </label>
                  {loadingGroups ? (
                    <p className="text-sm text-gray-500">Cargando grupos...</p>
                  ) : (
                    <>
                      <select
                        value={formData.user_group_id}
                        onChange={(e) => setFormData({...formData, user_group_id: e.target.value})}
                        className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      >
                        <option value="">Seleccionar grupo (opcional)</option>
                        {userGroups.filter(g => g.is_active !== false).map(group => (
                          <option key={group.id} value={group.id}>
                            {group.name} {group.description ? `- ${group.description}` : ''}
                          </option>
                        ))}
                      </select>
                      {userGroups.filter(g => g.is_active !== false).length === 0 && (
                        <p className="text-xs text-gray-500 mt-1">
                          No hay grupos activos disponibles. Puedes crear el grupo después y asignarlo a este administrador.
                        </p>
                      )}
                    </>
                  )}
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
        ) : (
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
                    <thead className="bg-gradient-to-r from-indigo-50/80 to-purple-50/80 backdrop-blur-sm border-b-2 border-indigo-200/60">
                      <tr>
                        <th className="px-4 md:px-6 py-4 text-left text-xs font-black text-gray-700 uppercase tracking-wider">ID</th>
                        <th className="px-4 md:px-6 py-4 text-left text-xs font-black text-gray-700 uppercase tracking-wider">Usuario</th>
                        <th className="px-4 md:px-6 py-4 text-left text-xs font-black text-gray-700 uppercase tracking-wider">Nombre</th>
                        <th className="px-4 md:px-6 py-4 text-left text-xs font-black text-gray-700 uppercase tracking-wider hidden md:table-cell">Email</th>
                        <th className="px-4 md:px-6 py-4 text-left text-xs font-black text-gray-700 uppercase tracking-wider">Rol</th>
                        <th className="px-4 md:px-6 py-4 text-left text-xs font-black text-gray-700 uppercase tracking-wider">Estado</th>
                        <th className="px-4 md:px-6 py-4 text-left text-xs font-black text-gray-700 uppercase tracking-wider hidden lg:table-cell">Fecha de Registro</th>
                        <th className="px-4 md:px-6 py-4 text-left text-xs font-black text-gray-700 uppercase tracking-wider hidden md:table-cell">Creado por</th>
                        <th className="px-4 md:px-6 py-4 text-center text-xs font-black text-gray-700 uppercase tracking-wider">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200/60 bg-white/50">
                      {users.map((user) => (
                        <tr key={user.id} className="hover:bg-indigo-50/30 transition-all duration-200">
                          <td className="px-4 md:px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">{user.id.substring(0, 8)}...</td>
                          <td className="px-4 md:px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">{user.username}</td>
                          <td className="px-4 md:px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                            {user.first_name || user.last_name 
                              ? `${user.first_name || ''} ${user.last_name || ''}`.trim() || '-'
                              : '-'}
                          </td>
                          <td className="px-4 md:px-6 py-4 whitespace-nowrap text-sm text-gray-600 hidden md:table-cell">{user.email || '-'}</td>
                          <td className="px-4 md:px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border ${getRoleBadgeColor(user.role)}`}>
                              {getRoleLabel(user.role)}
                            </span>
                          </td>
                          <td className="px-4 md:px-6 py-4 whitespace-nowrap">
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
                          <td className="px-4 md:px-6 py-4 whitespace-nowrap text-sm text-gray-600 hidden lg:table-cell">
                            {user.date_joined ? new Date(user.date_joined).toLocaleDateString('es-ES') : '-'}
                          </td>
                          <td className="px-4 md:px-6 py-4 whitespace-nowrap text-sm text-gray-600 hidden md:table-cell">
                            {user.created_by_username ? (
                              <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
                                {user.created_by_username}
                              </span>
                            ) : (
                              <span className="text-gray-400 italic">-</span>
                            )}
                          </td>
                          <td className="px-4 md:px-6 py-4 whitespace-nowrap text-center">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={() => handleEditUser(user)}
                                className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all duration-200 hover:scale-110 active:scale-95"
                                title="Editar usuario"
                              >
                                <FontAwesomeIcon icon={faPenToSquare} size="sm" className="fa-icon-force-current" />
                              </button>
                              <button
                                onClick={() => handleDeleteUser(user.id)}
                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200 hover:scale-110 active:scale-95"
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
        )}
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
      
      // Obtener los datos completos de la encuesta primero
      const surveyResponse = await authenticatedFetch(`/api/surveys/${surveyId}/`);
      if (!surveyResponse.ok) {
        throw new Error('Error al obtener los datos de la encuesta');
      }
      const surveyData = await surveyResponse.json();
      
      // Actualizar el estado en el backend
      const response = await authenticatedFetch(`/api/surveys/${surveyId}/`, {
        method: 'PUT',
        body: JSON.stringify({
          ...surveyData,
          is_public: newIsPublic
        })
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

const SurveyCard = ({ survey, onEdit, onDelete, onViewResponses, onShare, onUpdatePublicStatus, onViewMonthlySummary }) => {
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
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              {survey.is_public && (
                <span className="inline-block px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold">
                  Pública
                </span>
              )}
              {survey.survey_type === 'checklist' && (
                <span className="inline-block px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-bold">
                  Lista de Chequeo
                </span>
              )}
            </div>
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
                {survey.created_by_username && (
                  <span className="flex items-center gap-1 px-2.5 py-1 bg-blue-100 text-blue-700 rounded-lg font-semibold">
                    <FontAwesomeIcon icon={faUser} size="sm" className="fa-icon-force-current" />
                    {survey.created_by_username}
                  </span>
                )}
                {survey.user_group_name && (
                  <span className="flex items-center gap-1 px-2.5 py-1 bg-purple-100 text-purple-700 rounded-lg font-semibold">
                    <FontAwesomeIcon icon={faUsers} size="sm" className="fa-icon-force-current" />
                    {survey.user_group_name}
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
              {survey.survey_type === 'checklist' && onViewMonthlySummary && (
                <button 
                  onClick={(e) => { e.stopPropagation(); onViewMonthlySummary(survey); }} 
                  className="p-2.5 rounded-xl hover:bg-gradient-to-br hover:from-blue-50 hover:to-cyan-50 text-gray-500 hover:text-blue-600 transition-all duration-200 hover:scale-110 active:scale-95" 
                  title="Ver Resumen Mensual"
                >
                  <FontAwesomeIcon icon={faTable} size="sm" className="fa-icon-force-current" />
                </button>
              )}
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

const SurveyDashboard = ({ surveys, deletedSurveys = [], onNewSurvey, onEditSurvey, onDeleteSurvey, onRestoreSurvey, onPermanentDeleteSurvey, onViewResponses, onLogout, onUpdatePublicStatus, userRole, onViewUsers, onViewGroupAdmin, userGroups = [], onViewMonthlySummary }) => {
  const [activeTab, setActiveTab] = React.useState('active'); // 'active' or 'deleted'
  
  // Estados para búsqueda y filtros
  const [searchTerm, setSearchTerm] = React.useState('');
  const [filterPublicStatus, setFilterPublicStatus] = React.useState('all'); // 'all' | 'public' | 'private'
  const [filterUserGroup, setFilterUserGroup] = React.useState('all');
  const [filterCreator, setFilterCreator] = React.useState('all');
  
  // Filtrar encuestas activas y eliminadas (sin filtros aplicados aún)
  const allActiveSurveys = surveys.filter(s => !s.is_deleted);
  const allDeletedSurveys = deletedSurveys.length > 0 ? deletedSurveys : surveys.filter(s => s.is_deleted);
  
  // Obtener datos únicos para filtros (de todas las encuestas, activas y eliminadas)
  const allSurveysForFilters = React.useMemo(() => {
    return [...allActiveSurveys, ...allDeletedSurveys];
  }, [allActiveSurveys, allDeletedSurveys]);
  
  const uniqueCreators = React.useMemo(() => {
    const creators = new Set();
    allSurveysForFilters.forEach(s => {
      if (s.created_by_username) creators.add(s.created_by_username);
    });
    return Array.from(creators).sort();
  }, [allSurveysForFilters]);
  
  const uniqueUserGroups = React.useMemo(() => {
    const groups = new Map();
    allSurveysForFilters.forEach(s => {
      if (s.user_group_id && s.user_group_name) {
        groups.set(s.user_group_id, s.user_group_name);
      }
    });
    return Array.from(groups.entries()).map(([id, name]) => ({ id, name }));
  }, [allSurveysForFilters]);
  
  // Función de filtrado
  const filterSurveys = React.useCallback((surveyList) => {
    return surveyList.filter(survey => {
      // Filtro por término de búsqueda (case-insensitive)
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        const matchesSearch = 
          (survey.title || '').toLowerCase().includes(searchLower) ||
          (survey.description || '').toLowerCase().includes(searchLower) ||
          (survey.created_by_username || '').toLowerCase().includes(searchLower) ||
          (survey.user_group_name || '').toLowerCase().includes(searchLower);
        if (!matchesSearch) return false;
      }
      
      // Filtro por estado público/privado
      if (filterPublicStatus !== 'all') {
        if (filterPublicStatus === 'public' && !survey.is_public) return false;
        if (filterPublicStatus === 'private' && survey.is_public) return false;
      }
      
      // Filtro por grupo de usuarios
      if (filterUserGroup !== 'all') {
        if (survey.user_group_id !== filterUserGroup) return false;
      }
      
      // Filtro por creador
      if (filterCreator !== 'all') {
        if (survey.created_by_username !== filterCreator) return false;
      }
      
      return true;
    });
  }, [searchTerm, filterPublicStatus, filterUserGroup, filterCreator]);
  
  // Aplicar filtros
  const activeSurveys = React.useMemo(() => filterSurveys(allActiveSurveys), [filterSurveys, allActiveSurveys]);
  const deletedSurveysList = React.useMemo(() => filterSurveys(allDeletedSurveys), [filterSurveys, allDeletedSurveys]);
  
  // Calcular estadísticas solo para encuestas activas filtradas
  const totalSurveys = activeSurveys.length;
  const publicSurveys = activeSurveys.filter(s => s.is_public).length;
  const totalQuestions = activeSurveys.reduce((sum, s) => sum + (s.questions?.length || 0), 0);
  
  const isRoot = userRole === 'root';
  
  // Función para limpiar filtros
  const clearFilters = () => {
    setSearchTerm('');
    setFilterPublicStatus('all');
    setFilterUserGroup('all');
    setFilterCreator('all');
    setFilterQuestionCount({ min: '', max: '' });
  };
  
  // Verificar si hay filtros activos
  const hasActiveFilters = searchTerm || filterPublicStatus !== 'all' || filterUserGroup !== 'all' || filterCreator !== 'all';

  return (
    <main className="flex-1 relative z-10">
        <header className="sticky top-0 z-40 px-4 py-5 md:px-12 md:py-6 bg-white/70 backdrop-blur-xl border-b border-white/60 shadow-sm">
           <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
               <div className="flex items-center gap-4">
                 <img 
                   src={logoImage} 
                   alt="Survey App Logo" 
                   className="h-24 w-auto object-contain hidden md:block"
                 />
                 <div>
                   <h1 className="text-3xl md:text-4xl font-black bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent tracking-tight mb-1">
                     Mis Encuestas
                   </h1>
                   <p className="text-sm text-gray-600 font-medium">Gestiona y crea tus formularios de manera eficiente.</p>
                 </div>
               </div>
               <div className="flex gap-3">
                 {userRole === 'group_admin' && onViewGroupAdmin && (
                   <button 
                     onClick={onViewGroupAdmin} 
                     className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl font-bold text-sm shadow-xl hover:shadow-2xl flex items-center gap-2 transition-all duration-200 hover:scale-105 active:scale-95"
                   >
                     <FontAwesomeIcon icon={faUsers} size="sm" className="fa-icon-force-white" /> Mi Grupo
                   </button>
                 )}
                 {isRoot && onViewUsers && (
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
            
            {/* Buscador y Filtros - Mostrar solo si hay encuestas */}
            {((activeTab === 'active' && allActiveSurveys.length > 0) || (activeTab === 'deleted' && isRoot && allDeletedSurveys.length > 0)) && (
              <div className="bg-white/90 backdrop-blur-xl rounded-3xl border border-white/80 shadow-lg p-6 mb-8">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                    <FontAwesomeIcon icon={faFilter} className="text-indigo-600" />
                    Buscar y Filtrar
                  </h2>
                  {hasActiveFilters && (
                    <button
                      onClick={clearFilters}
                      className="text-sm text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1"
                    >
                      <FontAwesomeIcon icon={faXmark} size="sm" />
                      Limpiar filtros
                    </button>
                  )}
                </div>
                
                {/* Buscador */}
                <div className="mb-4">
                  <div className="relative">
                    <FontAwesomeIcon 
                      icon={faSearch} 
                      className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                      size="sm"
                    />
                    <input
                      type="text"
                      placeholder="Buscar por título, descripción, creador o grupo..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 sm:py-3 text-sm sm:text-base border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                  </div>
                </div>
                
                {/* Filtros */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
                  {/* Filtro por estado público/privado */}
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">
                      Estado
                    </label>
                    <select
                      value={filterPublicStatus}
                      onChange={(e) => setFilterPublicStatus(e.target.value)}
                      className="w-full px-3 py-2 sm:px-4 sm:py-2.5 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    >
                      <option value="all">Todos</option>
                      <option value="public">Públicas</option>
                      <option value="private">Privadas</option>
                    </select>
                  </div>
                  
                  {/* Filtro por grupo de usuarios (solo si hay grupos disponibles o es root) */}
                  {(isRoot || uniqueUserGroups.length > 0) && (
                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">
                        Grupo
                      </label>
                      <select
                        value={filterUserGroup}
                        onChange={(e) => setFilterUserGroup(e.target.value)}
                        className="w-full px-3 py-2 sm:px-4 sm:py-2.5 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      >
                        <option value="all">Todos los grupos</option>
                        {uniqueUserGroups.map(group => (
                          <option key={group.id} value={group.id}>{group.name}</option>
                        ))}
                      </select>
                    </div>
                  )}
                  
                  {/* Filtro por creador */}
                  {uniqueCreators.length > 0 && (
                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">
                        Creador
                      </label>
                      <select
                        value={filterCreator}
                        onChange={(e) => setFilterCreator(e.target.value)}
                        className="w-full px-3 py-2 sm:px-4 sm:py-2.5 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      >
                        <option value="all">Todos los creadores</option>
                        {uniqueCreators.map(creator => (
                          <option key={creator} value={creator}>{creator}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
                
                {/* Indicador de resultados filtrados */}
                {hasActiveFilters && (
                  <div className="mt-4 text-sm text-gray-600">
                    {activeTab === 'active' 
                      ? `Mostrando ${activeSurveys.length} de ${allActiveSurveys.length} encuestas activas`
                      : `Mostrando ${deletedSurveysList.length} de ${allDeletedSurveys.length} encuestas eliminadas`
                    }
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
                      {activeSurveys.map(s => (
                        <SurveyCard
                          key={s.id || s._id}
                          survey={s}
                          onEdit={() => onEditSurvey(s)}
                          onDelete={() => onDeleteSurvey(s.id || s._id)}
                          onViewResponses={() => onViewResponses(s)}
                          onShare={(survey) => {
                            // Share logic
                          }}
                          onUpdatePublicStatus={(surveyId, isPublic) => onUpdatePublicStatus(surveyId, isPublic)}
                          onViewMonthlySummary={onViewMonthlySummary}
                        />
                      ))}
                  </div>
                </>
              )
            )}
        </div>
    </main>
);
};

// --- COMPONENTE: MENÚ PRINCIPAL PWA ---

const MainMenuView = ({ onSelectEncuestas, onSelectChequeos, onLogout, currentUser }) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-6 md:p-12 max-w-2xl w-full">
        {/* Header con logo y bienvenida */}
        <div className="text-center mb-8">
          <div className="mb-4">
            <img 
              src={logoImage} 
              alt="Survey App Logo" 
              className="h-20 md:h-24 w-auto object-contain mx-auto"
            />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-800 mb-2">
            Bienvenido{currentUser?.first_name ? `, ${currentUser.first_name}` : ''}
          </h1>
          <p className="text-lg text-gray-600">
            Selecciona el tipo de trabajo que deseas realizar
          </p>
        </div>

        {/* Botones principales */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 mb-6">
          <button
            onClick={onSelectEncuestas}
            className="group relative bg-gradient-to-br from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white p-6 md:p-8 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 active:scale-95"
          >
            <div className="flex flex-col items-center">
              <FontAwesomeIcon icon={faFileLines} size="2x" className="mb-3 md:mb-4" />
              <h2 className="text-xl md:text-2xl font-bold mb-2">Encuestas</h2>
              <p className="text-xs md:text-sm opacity-90 text-center">Crear y gestionar encuestas</p>
            </div>
          </button>

          <button
            onClick={onSelectChequeos}
            className="group relative bg-gradient-to-br from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white p-6 md:p-8 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 active:scale-95"
          >
            <div className="flex flex-col items-center">
              <FontAwesomeIcon icon={faSquareCheck} size="2x" className="mb-3 md:mb-4" />
              <h2 className="text-xl md:text-2xl font-bold mb-2">Chequeos Operativos</h2>
              <p className="text-xs md:text-sm opacity-90 text-center">Checklist de gestión ambiental</p>
            </div>
          </button>
        </div>

        {/* Footer con botón de cerrar sesión */}
        <div className="text-center pt-4 border-t border-gray-200">
          <button
            onClick={onLogout}
            className="text-gray-500 hover:text-gray-700 text-sm font-medium transition-colors"
          >
            Cerrar sesión
          </button>
        </div>
      </div>
    </div>
  );
};

// --- COMPONENTE PRINCIPAL (GESTOR DE VISTAS) ---

export default function App() {
  // Check if we're on a public survey route
  const pathname = window.location.pathname;
  const publicSurveyMatch = pathname.match(/^\/public\/survey\/(.+)$/);
  const publicSurveyId = publicSurveyMatch ? publicSurveyMatch[1] : null;
  const initialView = publicSurveyId ? 'public' : 'dashboard';
  const [view, setView] = useState(initialView); // 'dashboard' | 'editor' | 'login' | 'responses' | 'public' | 'users' | 'group-admin' | 'group-users' | 'checklist-summary' | 'menu-selection' | 'checklist-operativo' | 'checklist-summary-view'
  const [selectedGroupId, setSelectedGroupId] = useState(null); // ID del grupo seleccionado para gestionar usuarios
  const [surveys, setSurveys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingSurveyId, setEditingSurveyId] = useState(null); // State to hold the ID of the survey being edited
  const [surveyToEdit, setSurveyToEdit] = useState(null); // State to hold the fetched survey data
  const [surveyForResponses, setSurveyForResponses] = useState(null); // Survey to view responses for
  const [surveyForSummary, setSurveyForSummary] = useState(null); // Survey to view monthly summary for
  const [responses, setResponses] = useState([]); // Responses for the selected survey
  const [responsesLoading, setResponsesLoading] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [loginCredentials, setLoginCredentials] = useState({ username: '', password: '' });
  const [currentUser, setCurrentUser] = useState(null); // Usuario actual con su rol
  const [deletedSurveys, setDeletedSurveys] = useState([]); // Encuestas eliminadas
  const [userGroups, setUserGroups] = useState([]); // Grupos de usuarios (para root)
  const [hasChecklists, setHasChecklists] = useState(false); // Si el usuario tiene checklists asignadas

  const fetchSurveys = async () => {
    setLoading(true);
    try {
        // El backend ya filtra por grupo de usuario según el rol
        const response = await authenticatedFetch('/api/surveys/');
        if (!response.ok) throw new Error('Error al cargar los datos.');
        const data = await response.json();
        // Filtrar checklists - las checklists son un sistema independiente
        // Solo mostrar encuestas normales en el dashboard
        const surveysOnly = data.filter(s => s.survey_type !== 'checklist');
        setSurveys(surveysOnly);
    } catch (error) {
        console.error("Error fetching surveys:", error);
        alert('No se pudieron cargar las encuestas. ' + error.message);
    } finally {
        setLoading(false);
    }
  };
  
  const fetchUserGroups = async () => {
    if (currentUser?.role === 'root') {
      try {
        const response = await authenticatedFetch('/api/user-groups/');
        if (response.ok) {
          const data = await response.json();
          setUserGroups(data);
        }
      } catch (error) {
        console.error("Error fetching user groups:", error);
      }
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
          setSurveyToEdit(data);
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
    fetchSurveys();
      fetchCurrentUser();
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
        // Si es root, cargar grupos de usuarios
        if (userData.role === 'root') {
          await fetchUserGroups();
        }
        // Verificar si tiene checklists asignadas
        await checkUserChecklists();
      }
    } catch (error) {
      console.error("Error fetching current user:", error);
    }
  };

  const checkUserChecklists = async () => {
    try {
      const response = await authenticatedFetch('/api/me/checklists/');
      if (response.ok) {
        const data = await response.json();
        setHasChecklists(data.has_checklists || false);
      }
    } catch (error) {
      console.error("Error checking checklists:", error);
      setHasChecklists(false);
    }
  };

  const hasChecklistsAssigned = async () => {
    try {
      const response = await authenticatedFetch('/api/me/checklists/');
      if (response.ok) {
        const data = await response.json();
        return data.has_checklists || false;
      }
      return false;
    } catch (error) {
      console.error("Error checking checklists:", error);
      return false;
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError('');
    try {
      await login(loginCredentials.username, loginCredentials.password);
      await fetchCurrentUser(); // Obtener datos del usuario después del login
      
      // Siempre mostrar el menú principal después del login
      setView('menu-selection');
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
      'Correo Electrónico': 'email'
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
      questions: surveyData.questions.map(({ id, ...q }) => ({
        ...q, 
        type: typeMapping[q.type] || 'short_text',
        section_id: q.section_id || null,
        conditional_logic: q.conditional_logic || null
      })),
      sections: (surveyData.sections || []).map(({ id, ...s }) => ({
        ...s,
        order: s.order || 0
      })),
      is_public: surveyData.is_public || false
    };
    
    // Agregar user_group_id según el rol del usuario
    if (currentUser) {
      const userRole = currentUser.role;
      // Root puede especificar user_group_id, group_admin y usuarios regulares se asigna automáticamente
      if (userRole === 'root' && surveyData.user_group_id) {
        surveyPayload.user_group_id = surveyData.user_group_id;
      } else if (userRole === 'group_admin' && currentUser.user_group_id) {
        // Para group_admin, SIEMPRE asignar automáticamente su grupo (no puede elegir)
        surveyPayload.user_group_id = currentUser.user_group_id;
      } else if (userRole !== 'root' && currentUser.user_group_id) {
        // Para usuarios regulares, asignar automáticamente su grupo
        surveyPayload.user_group_id = currentUser.user_group_id;
      }
    }

    try {
        const response = await authenticatedFetch(url, { 
          method: method, 
          body: JSON.stringify(surveyPayload) 
        });
        if (!response.ok) throw new Error('El servidor respondió con un error.');
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
      // Volver al menú principal
      setView('menu-selection');
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

  const handleViewMonthlySummary = (survey) => {
    setSurveyForSummary(survey);
    setView('checklist-summary');
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
          <div className="flex flex-col items-center mb-6">
            <img 
              src={logoImage} 
              alt="Survey App Logo" 
              className="h-24 w-auto mb-4 object-contain"
            />
            <h1 className="text-3xl font-black text-gray-800 mb-2">Survey App</h1>
            <p className="text-gray-500">Inicia sesión para continuar</p>
          </div>
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
         <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20"></div>
      </div>
      
      {view === 'dashboard' ? (
          <SurveyDashboard 
              surveys={surveys} 
              deletedSurveys={deletedSurveys}
              onNewSurvey={handleNewSurvey} 
              onDeleteSurvey={handleDeleteSurvey}
              onRestoreSurvey={handleRestoreSurvey}
              onPermanentDeleteSurvey={handlePermanentDeleteSurvey}
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
              onViewUsers={() => setView('users')}
              onViewGroupAdmin={() => setView('group-admin')}
              userGroups={userGroups}
          />
      ) : view === 'group-admin' ? (
          <GroupAdminDashboard
              currentUser={currentUser}
              onBack={handleBackToDashboard}
              onNewSurvey={handleNewSurvey}
              onEditSurvey={(survey) => {
                const surveyId = survey.id || survey._id;
                if (!surveyId) {
                  alert('Error: La encuesta no tiene un ID válido');
                  return;
                }
                setEditingSurveyId(surveyId);
              }}
              onDeleteSurvey={handleDeleteSurvey}
              onViewResponses={handleViewResponses}
              onLogout={handleLogout}
          />
      ) : view === 'users' ? (
          <UserManagementView
              onBack={handleBackToDashboard}
              onLogout={handleLogout}
              userRole={currentUser?.role}
          />
      ) : view === 'menu-selection' ? (
          <MainMenuView
              onSelectEncuestas={() => {
                setView('dashboard');
                fetchSurveys();
              }}
              onSelectChequeos={() => setView('checklist-operativo')}
              onLogout={handleLogout}
              currentUser={currentUser}
          />
      ) : view === 'checklist-operativo' ? (
          <ChecklistOperativoView
              onBack={() => {
                // Volver al menú principal
                setView('menu-selection');
              }}
              onViewSummary={(checklist) => {
                setSurveyForSummary(checklist);
                setView('checklist-summary-view');
              }}
              hasChecklists={hasChecklists}
              onLogout={handleLogout}
              userRole={currentUser?.role}
              onCreateChecklist={() => {
                // Crear nueva checklist - abrir editor con tipo checklist pre-seleccionado
                setEditingSurveyId(null);
                setSurveyToEdit({
                  title: "Nueva Checklist Operativa",
                  description: "Checklist de gestión ambiental",
                  questions: [],
                  sections: [],
                  survey_type: 'checklist',
                  checklist_config: { max_checks_per_day: 2 }
                });
                setView('editor');
              }}
              onEditChecklist={(checklist) => {
                // Editar checklist existente
                const checklistId = checklist.id || checklist._id;
                if (checklistId) {
                  setEditingSurveyId(checklistId);
                } else {
                  // Si no tiene ID, usar los datos directamente
                  setSurveyToEdit({
                    ...checklist,
                    survey_type: 'checklist'
                  });
                  setEditingSurveyId(null);
                }
                setView('editor');
              }}
          />
      ) : view === 'checklist-summary-view' ? (
          <ChecklistMonthlySummaryView
              checklist={surveyForSummary}
              onBack={() => setView('checklist-operativo')}
          />
      ) : view === 'checklist-summary' ? (
          <ChecklistMonthlySummary
              survey={surveyForSummary}
              onBack={handleBackToDashboard}
          />
      ) : view === 'responses' ? (
          <SurveyResponsesView
              survey={surveyForResponses || {}}
              responses={responses}
              onBack={handleBackToDashboard}
              loading={responsesLoading}
          />
      ) : (
          <SurveyEditor 
              onSave={handleSaveSurvey}
              onBack={handleBackToDashboard}
              initialSurveyData={surveyToEdit} // Pass the fetched survey data to the editor
              currentUser={currentUser}
              userGroups={userGroups}
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