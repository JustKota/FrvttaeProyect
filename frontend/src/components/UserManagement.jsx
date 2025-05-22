import React, { useState, useEffect } from 'react';
import './UserManagementNew.css';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

const API_BASE_URL = 'http://localhost:8000';

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: ''
  });
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState(''); // 'error' o 'success'
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('checking'); // 'checking', 'connected', 'error'

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleApiError = (error, customMessage) => {
    console.error('Error detallado en la API:', {
      name: error.name,
      message: error.message,
      stack: error.stack
    });
    
    setMessageType('error');
    setConnectionStatus('error');
    
    // Análisis detallado del error
    let errorMessage = customMessage;
    if (error.message === 'Failed to fetch') {
      errorMessage = 'Error de conexión: No se puede conectar con el servidor. ' +
        'Verifique que el servidor esté en ejecución y accesible en ' + API_BASE_URL;
    } else if (error.name === 'TypeError') {
      errorMessage = 'Error de red: Verifique su conexión a internet y la configuración de CORS del servidor';
    } else if (error.message.includes('Error del servidor')) {
      // Ya tenemos el mensaje detallado del servidor
      errorMessage = error.message;
    }
    
    setMessage(errorMessage);
    setIsLoading(false);
  };

  const fetchUsers = async (retryCount = 0) => {
    const MAX_RETRIES = 3; // Reducido el número de reintentos para evitar esperas largas
    const INITIAL_RETRY_DELAY = 1000; // Delay inicial de 1 segundo
    const MAX_RETRY_DELAY = 5000; // Máximo delay de 5 segundos
    const TIMEOUT = 5000; // Reducido el timeout a 5 segundos

    if (retryCount === 0) {
      setIsLoading(true);
      setConnectionStatus('checking');
      setMessage('Verificando conexión con el servidor...');
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), TIMEOUT);

      console.log(`Intento de conexión ${retryCount + 1}/${MAX_RETRIES + 1} - Timeout: ${TIMEOUT}ms`);
      
      const response = await fetch(`${API_BASE_URL}/users`, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({
          detail: `Error HTTP ${response.status}: ${response.statusText}`
        }));
        throw new Error(`Error del servidor: ${response.status} - ${errorData.detail || 'Sin detalles adicionales'}`);
      }
      
      const data = await response.json();
      setUsers(data);
      setConnectionStatus('connected');
      setIsLoading(false);
      setMessage('');
      setMessageType('success');
      console.log('Conexión exitosa con la base de datos');
      return true; // Indica éxito en la operación
    } catch (error) {
      console.error('Error de conexión:', {
        name: error.name,
        message: error.message,
        type: error instanceof Error ? error.constructor.name : typeof error,
        attempt: retryCount + 1
      });
      
      const isNetworkError = (
        error.name === 'AbortError' ||
        error.message === 'Failed to fetch' ||
        error.name === 'TypeError' ||
        error.message.includes('NetworkError')
      );

      if (retryCount < MAX_RETRIES && isNetworkError) {
        const delay = Math.min(
          INITIAL_RETRY_DELAY * Math.pow(2, retryCount), // Backoff exponencial
          MAX_RETRY_DELAY // Límite máximo de delay
        );

        console.log(`Reintentando en ${delay}ms... (Intento ${retryCount + 1}/${MAX_RETRIES})`);
        setMessage(`Reintentando conexión... Intento ${retryCount + 1}/${MAX_RETRIES}`);
        
        await new Promise(resolve => setTimeout(resolve, delay));
        return fetchUsers(retryCount + 1);
      }

      let errorMessage = 'Error al cargar los usuarios: ';
      if (error.name === 'AbortError') {
        errorMessage += `Tiempo de espera agotado (${TIMEOUT}ms) al intentar conectar con el servidor`;
      } else if (error.message.includes('Error del servidor')) {
        errorMessage += error.message;
      } else if (error.message === 'Failed to fetch' || error.name === 'TypeError') {
        errorMessage += `No se puede establecer conexión con el servidor (${API_BASE_URL}). `;
        errorMessage += 'Verifique que el servidor esté en ejecución y que su conexión a internet sea estable.';
      } else {
        errorMessage += error.message;
      }

      handleApiError(error, errorMessage);
      return false; // Indica fallo en la operación
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
    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/users/${selectedUser.username}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
      }

      setMessageType('success');
      setMessage('Usuario actualizado exitosamente');
      setIsEditing(false);
      setSelectedUser(null);
      setFormData({ username: '', email: '', password: '' });
      await fetchUsers();
    } catch (error) {
      handleApiError(error, 'Error al actualizar usuario');
    }
    setIsLoading(false);
  };

  const handleDelete = async (username) => {
    if (window.confirm('¿Está seguro de que desea eliminar este usuario?')) {
      setIsLoading(true);
      try {
        const response = await fetch(`${API_BASE_URL}/users/${username}`, {
          method: 'DELETE',
          headers: {
            'Accept': 'application/json'
          },
          credentials: 'include'
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
        }

        setMessageType('success');
        setMessage('Usuario eliminado exitosamente');
        await fetchUsers();
      } catch (error) {
        handleApiError(error, 'Error al eliminar usuario');
      }
      setIsLoading(false);
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
          const ws = XLSX.utils.json_to_sheet(users);
          const wb = XLSX.utils.book_new();
          XLSX.utils.book_append_sheet(wb, ws, 'Usuarios');
          const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
          const dataBlob = new Blob([excelBuffer], { type: 'application/octet-stream' });
          saveAs(dataBlob, 'usuarios.xlsx');
          break;
    }
  };

  const getConnectionStatusStyle = () => {
    switch(connectionStatus) {
      case 'connected':
        return { backgroundColor: '#4CAF50', color: 'white' };
      case 'error':
        return { backgroundColor: '#f44336', color: 'white' };
      default:
        return { backgroundColor: '#ff9800', color: 'white' };
    }
  };

  const getConnectionStatusText = () => {
    switch(connectionStatus) {
      case 'connected':
        return 'Conectado a la base de datos';
      case 'error':
        return 'Error de conexión';
      default:
        return 'Verificando conexión...';
    }
  };

  return (
    <div className="user-management">
      <div className="connection-status" style={{
        padding: '10px',
        margin: '10px 0',
        borderRadius: '4px',
        textAlign: 'center',
        ...getConnectionStatusStyle()
      }}>
        {getConnectionStatusText()}
      </div>
      {isLoading && (
        <div className="loading-spinner">
          Cargando...
        </div>
      )}

      {message && (
        <div className={`message ${messageType}`}>
          {message}
        </div>
      )}

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