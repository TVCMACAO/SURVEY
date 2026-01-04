import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSync, faCheckCircle, faExclamationTriangle, faWifi, faWifiSlash } from '@fortawesome/free-solid-svg-icons';

const SyncStatus = ({ 
  isOnline, 
  unsyncedCount, 
  onSync, 
  isSyncing = false 
}) => {
  return (
    <div className="bg-white rounded-lg p-4 border border-gray-200">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          {isOnline ? (
            <>
              <FontAwesomeIcon icon={faWifi} className="h-5 w-5 text-green-600" />
              <span className="text-sm font-medium text-green-600">En línea</span>
            </>
          ) : (
            <>
              <FontAwesomeIcon icon={faWifiSlash} className="h-5 w-5 text-red-600" />
              <span className="text-sm font-medium text-red-600">Sin conexión</span>
            </>
          )}
        </div>
        {unsyncedCount > 0 && (
          <div className="flex items-center space-x-2">
            <FontAwesomeIcon icon={faExclamationTriangle} className="h-5 w-5 text-yellow-500" />
            <span className="text-sm font-medium text-gray-700">
              {unsyncedCount} chequeo{unsyncedCount !== 1 ? 's' : ''} pendiente{unsyncedCount !== 1 ? 's' : ''}
            </span>
          </div>
        )}
      </div>
      
      <button
        onClick={onSync}
        disabled={!isOnline || unsyncedCount === 0 || isSyncing}
        className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition flex items-center justify-center space-x-2"
      >
        {isSyncing ? (
          <>
            <FontAwesomeIcon icon={faSync} className="animate-spin h-5 w-5" />
            <span>Sincronizando...</span>
          </>
        ) : (
          <>
            <FontAwesomeIcon icon={faSync} className="h-5 w-5" />
            <span>Sincronizar Datos ({unsyncedCount})</span>
          </>
        )}
      </button>
      
      {unsyncedCount === 0 && isOnline && (
        <div className="mt-2 flex items-center space-x-2 text-green-600">
          <FontAwesomeIcon icon={faCheckCircle} className="h-4 w-4" />
          <span className="text-xs">Todo sincronizado</span>
        </div>
      )}
    </div>
  );
};

export default SyncStatus;

