import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import App from './App';
import AdminDashboard from './admin/dashboard';
import Reproductor from './reproductor';

function AppRoutes() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/admin/dashboard" element={<AdminDashboard />} />
        <Route path="/reproductor" element={<Reproductor />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default AppRoutes;