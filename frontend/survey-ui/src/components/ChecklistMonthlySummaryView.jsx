import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faDownload, faFileExcel, faFilePdf, faRefresh } from '@fortawesome/free-solid-svg-icons';
import { authenticatedFetch } from '../auth';
import { useChecklistData } from '../hooks/useChecklistData';
import * as XLSX from 'xlsx';

const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

const ChecklistMonthlySummaryView = ({ checklist, onBack }) => {
  const [summaryData, setSummaryData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [showExportModal, setShowExportModal] = useState(false);

  const { localData } = useChecklistData();

  useEffect(() => {
    if (checklist) {
      fetchSummary();
    }
  }, [checklist, selectedYear, selectedMonth]);

  const fetchSummary = async () => {
    if (!checklist) return;
    
    setLoading(true);
    setError(null);
    try {
      const response = await authenticatedFetch(
        `/api/checklists/${checklist.id || checklist._id}/monthly-summary/?year=${selectedYear}&month=${selectedMonth}`
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

  const getDaysInMonth = (year, month) => {
    return new Date(year, month, 0).getDate();
  };

  const exportToPDF = () => {
    // Esta funcionalidad requiere jsPDF y jsPDF-autotable
    // Por ahora, mostrar mensaje de que se implementará
    alert('Exportación a PDF próximamente. Por favor, use la exportación a Excel.');
    setShowExportModal(false);
  };

  const exportToExcel = () => {
    if (!summaryData || !summaryData.areas || summaryData.areas.length === 0) {
      alert('No hay datos para exportar');
      return;
    }

    const wsData = [];
    
    // Header row
    const headerRow = ['SERVICIO', 'PREGUNTA'];
    const daysInMonth = getDaysInMonth(selectedYear, selectedMonth);
    for (let day = 1; day <= daysInMonth; day++) {
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
          row.push(dayData.status || '-');
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
    XLSX.writeFile(wb, `Resumen_Mensual_${MONTHS[selectedMonth - 1]}_${selectedYear}.xlsx`);
    setShowExportModal(false);
  };

  const getStatusClass = (status) => {
    if (status === 'C' || status === 'C/C') return 'cumple';
    if (status === 'C/NC' || status === 'NC') return 'no-cumple';
    return 'incomplete';
  };

  if (loading && !summaryData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando resumen mensual...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full text-center">
          <h2 className="text-2xl font-bold text-red-600 mb-4">Error</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={onBack}
            className="px-6 py-3 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition"
          >
            Volver
          </button>
        </div>
      </div>
    );
  }

  const daysInMonth = getDaysInMonth(selectedYear, selectedMonth);
  const monthName = MONTHS[selectedMonth - 1];

  // Generar opciones de mes (12 meses hacia atrás)
  const monthOptions = [];
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    let month = now.getMonth() - i;
    let year = now.getFullYear();
    if (month < 0) {
      month += 12;
      year -= 1;
    }
    monthOptions.push({ year, month: month + 1, label: `${MONTHS[month]} ${year}` });
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      {/* Header */}
      <header className="bg-white p-4 rounded-xl shadow-md mb-6">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h1 className="text-3xl font-bold text-green-600">Checklist Operativo Gestion Ambiental</h1>
            <p className="text-sm text-gray-600 mt-1">Resumen Mensual de Cumplimiento</p>
          </div>
          <button
            onClick={onBack}
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition"
          >
            Volver
          </button>
        </div>

        {/* Controles */}
        <div className="flex flex-col md:flex-row justify-between items-center space-y-3 md:space-y-0 md:space-x-4">
          <div className="flex items-center space-x-4">
            <label htmlFor="month-selector" className="font-medium text-gray-700">
              Seleccionar Mes:
            </label>
            <select
              id="month-selector"
              value={`${selectedYear}-${selectedMonth}`}
              onChange={(e) => {
                const [year, month] = e.target.value.split('-').map(Number);
                setSelectedYear(year);
                setSelectedMonth(month);
              }}
              className="p-2 border border-gray-300 rounded-lg"
            >
              {monthOptions.map((option, idx) => (
                <option key={idx} value={`${option.year}-${option.month}`}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={fetchSummary}
              className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-2 px-4 rounded-lg transition flex items-center"
            >
              <FontAwesomeIcon icon={faRefresh} className="mr-2" />
              Refrescar
            </button>
            <button
              onClick={() => setShowExportModal(true)}
              className="bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-lg transition flex items-center"
            >
              <FontAwesomeIcon icon={faDownload} className="mr-2" />
              Exportar
            </button>
          </div>
        </div>
      </header>

      {/* Tabla de resumen */}
      {summaryData && summaryData.areas && summaryData.areas.length > 0 ? (
        <div className="bg-white p-4 rounded-xl shadow-md overflow-x-auto" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
          <table className="min-w-full border-collapse" style={{ minWidth: '1000px' }}>
            <thead>
              <tr>
                <th rowSpan="2" className="sticky left-0 bg-gray-100 border border-gray-300 p-2 text-left font-semibold min-w-[150px] z-30">
                  SERVICIO
                </th>
                <th rowSpan="2" className="sticky left-[150px] bg-gray-100 border border-gray-300 p-2 text-left font-semibold min-w-[220px] z-20">
                  PREGUNTA
                </th>
                <th colSpan={daysInMonth} className="bg-gray-100 border border-gray-300 p-2 text-center font-semibold">
                  DÍAS DEL MES DE {monthName.toUpperCase()} {selectedYear}
                </th>
                <th rowSpan="2" className="sticky right-0 bg-green-100 border border-gray-300 p-2 text-center font-semibold min-w-[100px] z-30">
                  PROMEDIO POR ÁREAS
                </th>
              </tr>
              <tr>
                {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => (
                  <th key={day} className="bg-gray-100 border border-gray-300 p-1 text-center text-xs min-w-[38px]">
                    {day}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {summaryData.areas.map((area, areaIndex) => (
                <React.Fragment key={areaIndex}>
                  {area.questions.map((question, qIndex) => {
                    const isOddArea = areaIndex % 2 !== 0;
                    const isLastQuestion = qIndex === area.questions.length - 1;
                    
                    return (
                      <tr
                        key={qIndex}
                        className={`${isOddArea ? 'bg-gray-50' : ''} ${isLastQuestion ? 'border-b-2 border-gray-400' : ''}`}
                      >
                        {qIndex === 0 && (
                          <td
                            rowSpan={area.questions.length}
                            className="sticky left-0 bg-gray-50 border border-gray-300 p-2 font-bold text-left z-20"
                          >
                            {area.name}
                          </td>
                        )}
                        <td className="sticky left-[150px] bg-gray-50 border border-gray-300 p-2 text-left z-10">
                          {question.text}
                        </td>
                        {question.days.map((dayData, dayIndex) => {
                          const statusClass = getStatusClass(dayData.status);
                          return (
                            <td
                              key={dayIndex}
                              className={`border border-gray-300 p-1 text-center text-xs ${statusClass === 'cumple' ? 'text-green-600 font-bold' : statusClass === 'no-cumple' ? 'text-red-600 font-bold' : 'text-gray-400'}`}
                            >
                              {dayData.status || '-'}
                            </td>
                          );
                        })}
                        {qIndex === 0 && (
                          <td
                            rowSpan={area.questions.length}
                            className="sticky right-0 bg-green-100 border border-gray-300 p-2 text-center font-bold text-green-800 z-20"
                          >
                            {area.average}%
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="bg-white p-8 rounded-xl shadow-md text-center">
          <p className="text-gray-600">No hay datos disponibles para el mes seleccionado.</p>
        </div>
      )}

      {/* Modal de exportación */}
      {showExportModal && (
        <div className="fixed inset-0 bg-gray-800 bg-opacity-50 flex items-center justify-center z-30">
          <div className="bg-white p-6 rounded-lg shadow-xl w-11/12 md:w-1/3">
            <h3 className="text-xl font-bold mb-4">Exportar Resumen Mensual</h3>
            <p className="mb-6">Seleccione el formato en el que desea exportar los datos del mes actual.</p>
            <div className="flex justify-end space-x-4">
              <button
                onClick={exportToPDF}
                className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded-lg flex items-center"
              >
                <FontAwesomeIcon icon={faFilePdf} className="mr-2" />
                Exportar a PDF
              </button>
              <button
                onClick={exportToExcel}
                className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded-lg flex items-center"
              >
                <FontAwesomeIcon icon={faFileExcel} className="mr-2" />
                Exportar a Excel
              </button>
              <button
                onClick={() => setShowExportModal(false)}
                className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded-lg"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChecklistMonthlySummaryView;

