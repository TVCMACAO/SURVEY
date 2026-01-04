import React, { useState, useEffect } from 'react';
import { login, logout, isAuthenticated } from './auth';
import ChecklistOperativoTab from './components/ChecklistOperativoTab';
import ResumenMensualTab from './components/ResumenMensualTab';

const App = () => {
  const [authenticated, setAuthenticated] = useState(false);
  const [activeTab, setActiveTab] = useState('checklist');
  const [loginCredentials, setLoginCredentials] = useState({ username: '', password: '' });
  const [loginError, setLoginError] = useState('');

  useEffect(() => {
    // Verificar si el usuario ya está autenticado
    if (isAuthenticated()) {
      setAuthenticated(true);
    }
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError('');
    try {
      await login(loginCredentials.username, loginCredentials.password);
      setAuthenticated(true);
    } catch (error) {
      setLoginError(error.message || 'Error al iniciar sesión');
    }
  };

  const handleLogout = () => {
    logout();
    setAuthenticated(false);
    setActiveTab('checklist');
  };

  if (!authenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 md:p-12 max-w-md w-full">
          <div className="text-center mb-8">
            <h1 className="text-4xl md:text-5xl font-bold text-green-600 mb-4">
              Checklist Operativo
            </h1>
            <p className="text-lg text-gray-600">
              Gestión Ambiental
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-2">
                Usuario
              </label>
              <input
                id="username"
                type="text"
                value={loginCredentials.username}
                onChange={(e) => setLoginCredentials({ ...loginCredentials, username: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="Ingrese su usuario"
                required
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Contraseña
              </label>
              <input
                id="password"
                type="password"
                value={loginCredentials.password}
                onChange={(e) => setLoginCredentials({ ...loginCredentials, password: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="Ingrese su contraseña"
                required
              />
            </div>

            {loginError && (
              <div className="bg-red-100 text-red-800 p-3 rounded-lg text-sm">
                {loginError}
              </div>
            )}

            <button
              type="submit"
              className="w-full px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-semibold"
            >
              Iniciar Sesión
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header con pestañas */}
      <header className="bg-white shadow-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <h1 className="text-2xl font-bold text-green-600">
              Checklist Operativo
            </h1>
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition"
            >
              Cerrar Sesión
            </button>
          </div>

          {/* Tabs */}
          <div className="flex space-x-1 border-b border-gray-200">
            <button
              onClick={() => setActiveTab('checklist')}
              className={`py-3 px-6 font-medium border-b-2 transition ${
                activeTab === 'checklist'
                  ? 'text-green-600 border-green-600'
                  : 'text-gray-600 border-transparent hover:text-gray-800'
              }`}
            >
              Checklist Operativo
            </button>
            <button
              onClick={() => setActiveTab('resumen')}
              className={`py-3 px-6 font-medium border-b-2 transition ${
                activeTab === 'resumen'
                  ? 'text-green-600 border-green-600'
                  : 'text-gray-600 border-transparent hover:text-gray-800'
              }`}
            >
              Resumen Mensual
            </button>
          </div>
        </div>
      </header>

      {/* Contenido de las pestañas */}
      <main>
        {activeTab === 'checklist' && <ChecklistOperativoTab />}
        {activeTab === 'resumen' && <ResumenMensualTab />}
      </main>
    </div>
  );
};

export default App;

