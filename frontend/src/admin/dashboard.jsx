import React from 'react';
import UserManagement from '../components/UserManagement';
import '../App.css';
import '../components/UserManagement.css';

function AdminDashboard() {
  return (
    <div className="App">
      <div className="admin-dashboard">
        <h1>Panel de Administración</h1>
        <div className="dashboard-content">
          <UserManagement />
        </div>
      </div>
    </div>
  );
}

export default AdminDashboard;