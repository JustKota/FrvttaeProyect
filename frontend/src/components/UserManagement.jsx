import React, { useState, useEffect } from 'react';
import './UserManagementNew.css';

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: ''
  });
  const [message, setMessage] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await fetch('http://localhost:8000/users');
      if (response.ok) {
        const data = await response.json();
        setUsers(data);
      } else {
        setMessage('Error al cargar usuarios');
      }
    } catch (error) {
      setMessage('Error de conexión al servidor');
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleEdit = (user) => {
    setSelectedUser(user);
    setFormData({
      username: user.username,
      email: user.email,
      password: ''
    });
    setIsEditing(true);
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`http://localhost:8000/users/${selectedUser.username}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        setMessage('Usuario actualizado exitosamente');
        setIsEditing(false);
        setSelectedUser(null);
        setFormData({ username: '', email: '', password: '' });
        fetchUsers();
      } else {
        const data = await response.json();
        setMessage(data.detail || 'Error al actualizar usuario');
      }
    } catch (error) {
      setMessage('Error de conexión al servidor');
    }
  };

  const handleDelete = async (username) => {
    if (window.confirm('¿Está seguro de que desea eliminar este usuario?')) {
      try {
        const response = await fetch(`http://localhost:8000/users/${username}`, {
          method: 'DELETE',
        });

        if (response.ok) {
          setMessage('Usuario eliminado exitosamente');
          fetchUsers();
        } else {
          const data = await response.json();
          setMessage(data.detail || 'Error al eliminar usuario');
        }
      } catch (error) {
        setMessage('Error de conexión al servidor');
      }
    }
  };

  const [searchTerm, setSearchTerm] = useState('');

  const filteredUsers = users.filter(user => 
    user.username.toLowerCase().includes(searchTerm.toLowerCase()) || 
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
  };

  const exportData = (type) => {
    let data;
    let filename;
    let link;

    switch(type) {
      case 'PDF':
        alert('Exportación a PDF no implementada');
        break;
      case 'JSON':
        data = JSON.stringify(users);
        filename = 'usuarios.json';
        link = document.createElement('a');
        link.setAttribute('href', 'data:text/json;charset=utf-8,' + encodeURIComponent(data));
        link.setAttribute('download', filename);
        link.click();
        break;
      case 'CSV':
        data = 'Usuario,Email,Tipo de Login\n';
        users.forEach(user => {
          data += `${user.username},${user.email},${user.login_type || 'N/A'}\n`;
        });
        filename = 'usuarios.csv';
        link = document.createElement('a');
        link.setAttribute('href', 'data:text/csv;charset=utf-8,' + encodeURIComponent(data));
        link.setAttribute('download', filename);
        link.click();
        break;
      case 'EXCEL':
        alert('Exportación a EXCEL no implementada');
        break;
      default:
        break;
    }
  };

  return (
    <div className="user-management">
      {message && <p className="message">{message}</p>}

      {isEditing ? (
        <form onSubmit={handleUpdate} className="user-form">
          <h3>Editar Usuario</h3>
          <input
            type="text"
            name="username"
            value={formData.username}
            onChange={handleInputChange}
            placeholder="Usuario"
            required
            disabled
          />
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleInputChange}
            placeholder="Email"
            required
          />
          <input
            type="password"
            name="password"
            value={formData.password}
            onChange={handleInputChange}
            placeholder="Nueva Contraseña (opcional)"
          />
          <div className="form-buttons">
            <button type="submit">Guardar Cambios</button>
            <button type="button" onClick={() => {
              setIsEditing(false);
              setSelectedUser(null);
              setFormData({ username: '', email: '', password: '' });
            }}>Cancelar</button>
          </div>
        </form>
      ) : null}

      <main className="table" id="users_table">
        <section className="table__header">
          <h1>Usuarios Frvttae</h1>
          <div className="input-users">
            <input 
              type="text" 
              placeholder="Buscar Usuarios" 
              value={searchTerm} 
              onChange={handleSearch}
            />
            <i className="bi bi-search"></i>
          </div>
          <div className="export__file">
            <label htmlFor="export-file" className="export__file-btn" title="Exportar"></label>
            <input type="checkbox" id="export-file" />
            <div className="export__file-options">
              <label>Exportar como: &nbsp; &#10140;</label>
              <label htmlFor="export-file" id="toPDF" onClick={() => exportData('PDF')}>PDF <i className="bi bi-file-earmark-pdf"></i></label>
              <label htmlFor="export-file" id="toJSON" onClick={() => exportData('JSON')}>JSON <i className="bi bi-filetype-json"></i></label>
              <label htmlFor="export-file" id="toCSV" onClick={() => exportData('CSV')}>CSV <i className="bi bi-filetype-csv"></i></label>
              <label htmlFor="export-file" id="toEXCEL" onClick={() => exportData('EXCEL')}>EXCEL <i className="bi bi-file-earmark-excel"></i></label>
            </div>
          </div>
        </section>
        <section className="table__body">
          <table>
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Correo</th>
                <th>Tipo de Login</th>
                <th>Fecha de Registro</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((user) => (
                <tr key={user.username}>
                  <td>{user.username}</td>
                  <td>{user.email}</td>
                  <td>{user.login_type || 'N/A'}</td>
                  <td>{new Date().toLocaleDateString()}</td>
                  <td>
                    <button className="edit" onClick={() => handleEdit(user)}>
                      <i className="bi bi-pencil-square"></i>
                    </button>
                    <button className="delete" onClick={() => handleDelete(user.username)}>
                      <i className="bi bi-trash3"></i>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </main>
    </div>
  );
};

export default UserManagement;