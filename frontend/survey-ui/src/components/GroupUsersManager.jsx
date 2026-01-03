import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faTrash, faEdit, faUser, faUserShield, faXmark } from '@fortawesome/free-solid-svg-icons';
import { authenticatedFetch } from '../auth';

const GroupUsersManager = ({ groupId, onClose }) => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [availableUsers, setAvailableUsers] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [editFormData, setEditFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    password: '',
    password_confirm: '',
    role: 'encuestador',
    is_active: true
  });

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

  const handleEditUser = (user) => {
    setEditingUser(user);
    setEditFormData({
      first_name: user.first_name || '',
      last_name: user.last_name || '',
      email: user.email || '',
      password: '',
      password_confirm: '',
      role: user.role || 'encuestador',
      is_active: user.is_active !== false
    });
    setShowAddForm(false);
  };

  const handleUpdateUser = async (e) => {
    e.preventDefault();
    setError('');

    if (editFormData.password && editFormData.password !== editFormData.password_confirm) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    if (editFormData.password && editFormData.password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres.');
      return;
    }

    try {
      const updateData = {
        first_name: editFormData.first_name,
        last_name: editFormData.last_name,
        email: editFormData.email,
        role: editFormData.role,
        is_active: editFormData.is_active
      };

      // Solo incluir password si se proporcionó una nueva
      if (editFormData.password) {
        updateData.password = editFormData.password;
        updateData.password_confirm = editFormData.password_confirm;
      }

      const response = await authenticatedFetch(`/api/user-groups/${groupId}/users/${editingUser.id}/`, {
        method: 'PUT',
        body: JSON.stringify(updateData)
      });

      if (response.ok) {
        await loadUsers();
        setEditingUser(null);
        setEditFormData({
          first_name: '',
          last_name: '',
          email: '',
          password: '',
          password_confirm: '',
          role: 'encuestador',
          is_active: true
        });
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

      {editingUser && (
        <form onSubmit={handleUpdateUser} className="mb-6 p-4 bg-blue-50 rounded-lg border-2 border-blue-200">
          <h3 className="text-lg font-bold mb-4">Editar Usuario: {editingUser.username}</h3>
          
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre
                </label>
                <input
                  type="text"
                  value={editFormData.first_name}
                  onChange={(e) => setEditFormData({...editFormData, first_name: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Apellido
                </label>
                <input
                  type="text"
                  value={editFormData.last_name}
                  onChange={(e) => setEditFormData({...editFormData, last_name: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                type="email"
                value={editFormData.email}
                onChange={(e) => setEditFormData({...editFormData, email: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nueva Contraseña (dejar vacío para no cambiar)
              </label>
              <input
                type="password"
                value={editFormData.password}
                onChange={(e) => setEditFormData({...editFormData, password: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                minLength={8}
              />
            </div>

            {editFormData.password && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Confirmar Nueva Contraseña
                </label>
                <input
                  type="password"
                  value={editFormData.password_confirm}
                  onChange={(e) => setEditFormData({...editFormData, password_confirm: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  minLength={8}
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Rol
              </label>
              <select
                value={editFormData.role}
                onChange={(e) => setEditFormData({...editFormData, role: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              >
                <option value="encuestador">Encuestador</option>
                <option value="analista">Analista</option>
              </select>
            </div>

            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="edit_is_active"
                checked={editFormData.is_active}
                onChange={(e) => setEditFormData({...editFormData, is_active: e.target.checked})}
                className="w-5 h-5 text-indigo-600 focus:ring-indigo-500 rounded"
              />
              <label htmlFor="edit_is_active" className="text-sm font-medium text-gray-700 cursor-pointer">
                Usuario activo
              </label>
            </div>

            <div className="flex gap-2">
              <button
                type="submit"
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
              >
                Guardar Cambios
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditingUser(null);
                  setEditFormData({
                    first_name: '',
                    last_name: '',
                    email: '',
                    password: '',
                    password_confirm: '',
                    role: 'encuestador',
                    is_active: true
                  });
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
                    {user.created_by_username && (
                      <span className="text-xs text-gray-400 ml-2">
                        • Creado por: {user.created_by_username}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {user.role !== 'group_admin' && (
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEditUser(user)}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                    title="Editar usuario"
                  >
                    <FontAwesomeIcon icon={faEdit} />
                  </button>
                  <button
                    onClick={() => handleRemoveUser(user.id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                    title="Remover del grupo"
                  >
                    <FontAwesomeIcon icon={faTrash} />
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default GroupUsersManager;

