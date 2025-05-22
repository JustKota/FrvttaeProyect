import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './reproductor.jsx';
import reportWebVitals from './reportWebVitals';
import Albums from './components/Albums';

import { BrowserRouter, Routes, Route } from 'react-router-dom';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/albums" element={<Albums />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);

reportWebVitals();