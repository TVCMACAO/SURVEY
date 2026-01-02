import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faTrash, faEdit, faUsers, faUserShield, faXmark } from '@fortawesome/free-solid-svg-icons';
import { authenticatedFetch } from '../auth';

const UserGroupsManager = ({ onClose, onGroupSelect }) => {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingGroup, setEditingGroup] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    admin_user_id: '',
    is_active: true
  });
  const [adminUsers, setAdminUsers] = useState([]);

  useEffect(() => {
    loadGroups();
    loadAdminUsers();
  }, []);

  const loadGroups = async () => {
    try {
      setLoading(true);
      const response = await authenticatedFetch('/api/user-groups/');
      if (response.ok) {
        const data = await response.json();
        setGroups(data);
      } else {
        setError('Error al cargar grupos');
      }
    } catch (err) {
      setError('Error al cargar grupos: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadAdminUsers = async () => {
    try {
      const response = await authenticatedFetch('/api/users/');
      if (response.ok) {
        const data = await response.json();
        // Filtrar solo usuarios con rol group_admin (pueden tener o no grupo asignado para permitir cambio)
        const admins = data.filter(user => user.role === 'group_admin');
        setAdminUsers(admins);
      }
    } catch (err) {
      console.error('Error al cargar usuarios administradores:', err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const url = editingGroup 
        ? `/api/user-groups/${editingGroup.id}/`
        : '/api/user-groups/';
      const method = editingGroup ? 'PUT' : 'POST';
      
      const response = await authenticatedFetch(url, {
        method,
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        await loadGroups();
        setShowCreateForm(false);
        setEditingGroup(null);
        setFormData({ name: '', description: '', admin_user_id: '', is_active: true });
      } else {
        const errorData = await response.json();
        setError('Error: ' + JSON.stringify(errorData));
      }
    } catch (err) {
      setError('Error: ' + err.message);
    }
  };

  const handleDelete = async (groupId) => {
    if (!window.confirm('¿Estás seguro de eliminar este grupo? Esto removerá a todos los usuarios del grupo.')) {
      return;
    }

    try {
      const response = await authenticatedFetch(`/api/user-groups/${groupId}/`, {
        method: 'DELETE'
      });

      if (response.ok) {
        await loadGroups();
      } else {
        setError('Error al eliminar grupo');
      }
    } catch (err) {
      setError('Error: ' + err.message);
    }
  };

  const handleEdit = (group) => {
    setEditingGroup(group);
    setFormData({
      name: group.name,
      description: group.description || '',
      admin_user_id: group.admin_user_id,
      is_active: group.is_active !== false
    });
    setShowCreateForm(true);
  };

  if (loading) {
    return (
      <div className="p-6">
        <p>Cargando grupos...</p>
      </div>
    );
  }

  return (
    <div className="p-6 bg-white rounded-xl shadow-lg max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Gestión de Grupos de Usuarios</h2>
        <div className="flex gap-2">
          {!showCreateForm && (
            <button
              onClick={() => {
                setShowCreateForm(true);
                setEditingGroup(null);
                setFormData({ name: '', description: '', admin_user_id: '', is_active: true });
              }}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-2"
            >
              <FontAwesomeIcon icon={faPlus} /> Nuevo Grupo
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

      {showCreateForm ? (
        <form onSubmit={handleSubmit} className="mb-6 p-4 bg-gray-50 rounded-lg">
          <h3 className="text-lg font-bold mb-4">
            {editingGroup ? 'Editar Grupo' : 'Nuevo Grupo'}
          </h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nombre del Grupo
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Descripción
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                rows="3"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Administrador del Grupo
              </label>
              <select
                value={formData.admin_user_id}
                onChange={(e) => setFormData({ ...formData, admin_user_id: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                required
              >
                <option value="">Seleccionar administrador</option>
                {adminUsers.map(user => {
                  const fullName = [user.first_name, user.last_name].filter(Boolean).join(' ').trim();
                  const displayName = fullName ? `${user.username} - ${fullName}` : user.username;
                  return (
                    <option key={user.id} value={user.id}>
                      {displayName} {user.user_group_id ? '(Ya tiene grupo)' : ''}
                    </option>
                  );
                })}
              </select>
              {adminUsers.length === 0 && (
                <div className="text-sm text-gray-500 mt-1 space-y-1">
                  <p>No hay usuarios con rol 'Administrador de Grupo' disponibles.</p>
                  <p className="text-xs">Ve a "Usuarios" y crea un usuario con rol "Administrador de Grupo" primero.</p>
                </div>
              )}
              {adminUsers.length > 0 && (
                <p className="text-xs text-gray-500 mt-1">
                  {adminUsers.filter(u => !u.user_group_id).length} administrador(es) sin grupo asignado
                </p>
              )}
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="is_active"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                className="mr-2"
              />
              <label htmlFor="is_active" className="text-sm font-medium text-gray-700">
                Grupo Activo
              </label>
            </div>

            <div className="flex gap-2">
              <button
                type="submit"
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
              >
                {editingGroup ? 'Actualizar' : 'Crear'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowCreateForm(false);
                  setEditingGroup(null);
                  setFormData({ name: '', description: '', admin_user_id: '', is_active: true });
                }}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                Cancelar
              </button>
            </div>
          </div>
        </form>
      ) : null}

      <div className="space-y-4">
        {groups.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No hay grupos de usuarios creados</p>
        ) : (
          groups.map(group => (
            <div
              key={group.id}
              className="p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <FontAwesomeIcon icon={faUsers} className="text-indigo-600" />
                    <h3 className="text-lg font-bold text-gray-800">{group.name}</h3>
                    {!group.is_active && (
                      <span className="px-2 py-1 bg-gray-200 text-gray-600 text-xs rounded">
                        Inactivo
                      </span>
                    )}
                  </div>
                  
                  {group.description && (
                    <p className="text-gray-600 mb-2">{group.description}</p>
                  )}
                  
                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    <div className="flex items-center gap-1">
                      <FontAwesomeIcon icon={faUserShield} />
                      <span>Admin: {group.admin_username || 'N/A'}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <FontAwesomeIcon icon={faUsers} />
                      <span>Usuarios: {group.user_count || 0}</span>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => handleEdit(group)}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                    title="Editar"
                  >
                    <FontAwesomeIcon icon={faEdit} />
                  </button>
                  <button
                    onClick={() => handleDelete(group.id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                    title="Eliminar"
                  >
                    <FontAwesomeIcon icon={faTrash} />
                  </button>
                  {onGroupSelect && (
                    <button
                      onClick={() => onGroupSelect(group)}
                      className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg"
                      title="Seleccionar"
                    >
                      Seleccionar
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default UserGroupsManager;

