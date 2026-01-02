import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faTrash, faEdit, faUser, faUserShield, faXmark } from '@fortawesome/free-solid-svg-icons';
import { authenticatedFetch } from '../auth';

const GroupUsersManager = ({ groupId, onClose }) => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [availableUsers, setAvailableUsers] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState('');

  useEffect(() => {
    if (groupId) {
      loadUsers();
      loadAvailableUsers();
    }
  }, [groupId]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const response = await authenticatedFetch(`/api/user-groups/${groupId}/users/`);
      if (response.ok) {
        const data = await response.json();
        setUsers(data);
      } else {
        setError('Error al cargar usuarios del grupo');
      }
    } catch (err) {
      setError('Error al cargar usuarios: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadAvailableUsers = async () => {
    try {
      const response = await authenticatedFetch('/api/users/');
      if (response.ok) {
        const data = await response.json();
        // Filtrar usuarios que no pertenecen a ningún grupo o que ya están en este grupo
        const available = data.filter(user => 
          !user.user_group_id || user.user_group_id === groupId
        );
        setAvailableUsers(available);
      }
    } catch (err) {
      console.error('Error al cargar usuarios disponibles:', err);
    }
  };

  const handleAddUser = async (e) => {
    e.preventDefault();
    if (!selectedUserId) return;

    try {
      const response = await authenticatedFetch(`/api/user-groups/${groupId}/users/`, {
        method: 'POST',
        body: JSON.stringify({ user_id: parseInt(selectedUserId) })
      });

      if (response.ok) {
        await loadUsers();
        await loadAvailableUsers();
        setShowAddForm(false);
        setSelectedUserId('');
      } else {
        const errorData = await response.json();
        setError('Error: ' + JSON.stringify(errorData));
      }
    } catch (err) {
      setError('Error: ' + err.message);
    }
  };

  const handleRemoveUser = async (userId) => {
    if (!window.confirm('¿Estás seguro de remover este usuario del grupo?')) {
      return;
    }

    try {
      const response = await authenticatedFetch(`/api/user-groups/${groupId}/users/${userId}/`, {
        method: 'DELETE'
      });

      if (response.ok) {
        await loadUsers();
        await loadAvailableUsers();
      } else {
        setError('Error al remover usuario');
      }
    } catch (err) {
      setError('Error: ' + err.message);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <p>Cargando usuarios...</p>
      </div>
    );
  }

  return (
    <div className="p-6 bg-white rounded-xl shadow-lg max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Usuarios del Grupo</h2>
        <div className="flex gap-2">
          {!showAddForm && (
            <button
              onClick={() => setShowAddForm(true)}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-2"
            >
              <FontAwesomeIcon icon={faPlus} /> Agregar Usuario
            </button>
          )}
          {onClose && (
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
            >
              <FontAwesomeIcon icon={faXmark} />
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg">
          {error}
        </div>
      )}

      {showAddForm && (
        <form onSubmit={handleAddUser} className="mb-6 p-4 bg-gray-50 rounded-lg">
          <h3 className="text-lg font-bold mb-4">Agregar Usuario al Grupo</h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Usuario
              </label>
              <select
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                required
              >
                <option value="">Seleccionar usuario</option>
                {availableUsers
                  .filter(user => !users.find(u => u.id === user.id))
                  .map(user => (
                    <option key={user.id} value={user.id}>
                      {user.username} {user.email ? `(${user.email})` : ''} - {user.role}
                    </option>
                  ))}
              </select>
            </div>

            <div className="flex gap-2">
              <button
                type="submit"
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
              >
                Agregar
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowAddForm(false);
                  setSelectedUserId('');
                }}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                Cancelar
              </button>
            </div>
          </div>
        </form>
      )}

      <div className="space-y-3">
        {users.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No hay usuarios en este grupo</p>
        ) : (
          users.map(user => (
            <div
              key={user.id}
              className="p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                {user.role === 'group_admin' ? (
                  <FontAwesomeIcon icon={faUserShield} className="text-indigo-600" />
                ) : (
                  <FontAwesomeIcon icon={faUser} className="text-gray-400" />
                )}
                <div>
                  <h3 className="font-bold text-gray-800">{user.username}</h3>
                  <div className="text-sm text-gray-500">
                    {user.email && <span>{user.email} • </span>}
                    <span className="capitalize">{user.role}</span>
                  </div>
                </div>
              </div>

              {user.role !== 'group_admin' && (
                <button
                  onClick={() => handleRemoveUser(user.id)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                  title="Remover del grupo"
                >
                  <FontAwesomeIcon icon={faTrash} />
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default GroupUsersManager;

