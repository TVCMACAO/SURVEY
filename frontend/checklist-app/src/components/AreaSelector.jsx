import React from 'react';

// Lista de áreas predefinidas
const AREAS = [
  "ADMINISTRATIVO",
  "CONSULTA NUEVO",
  "FISIOTERAPIA",
  "HOSPITALIZACION SEGUNDO PISO",
  "HOSPITALIZACION 4 PISO LADO B",
  "HOSPITALIZACION 5 PISO LADO C",
  "HOSP 6TO PISO LADO C",
  "HOSPITALIZACION PEDIATRICA",
  "IMÁGENES",
  "LABORATORIO",
  "URGENCIA PEDIATRICA",
  "BANCO DE SANGRE",
  "CIRUGIA Y QUIROFANOS",
  "HEMODINAMIA Y CARDIOLOGIA",
  "UNIDAD RENAL",
  "SALA DE PARTOS",
  "UCI ADULTO 4 PSIO LADO C",
  "UCI B SEGUBNDO PISO",
  "URGENCIAS ADULTO",
  "UCI NEONATAL Y PEDIATRICA"
];

const AreaSelector = ({ selectedArea, onAreaChange }) => {
  return (
    <div className="mb-6">
      <label htmlFor="area-select" className="block text-sm font-medium text-gray-700 mb-2">
        Seleccionar Área
      </label>
      <select
        id="area-select"
        value={selectedArea || ''}
        onChange={(e) => onAreaChange(e.target.value)}
        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white"
      >
        <option value="">-- Seleccione un área --</option>
        {AREAS.map((area) => (
          <option key={area} value={area}>
            {area}
          </option>
        ))}
      </select>
    </div>
  );
};

export default AreaSelector;

