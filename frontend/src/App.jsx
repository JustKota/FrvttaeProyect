import React, { useState, useRef, useEffect } from 'react';
import Webcam from 'react-webcam';
import { GoogleLogin } from '@react-oauth/google';
import UserManagement from './components/UserManagement';
import './App.css';
import './components/UserManagement.css';

const checkDatabaseConnection = async () => {
  try {
    const response = await fetch('http://localhost:8000/health');
    const data = await response.json();
    return data.status === 'connected';
  } catch (error) {
    return false;
  }
};

function App() {
  const [message, setMessage] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [dbConnected, setDbConnected] = useState(false);
  const [capturedImage, setCapturedImage] = useState(null);
  const webcamRef = useRef(null);

  useEffect(() => {
    const checkConnection = async () => {
      const isConnected = await checkDatabaseConnection();
      setDbConnected(isConnected);
    };
    checkConnection();
    const interval = setInterval(checkConnection, 30000);
    return () => clearInterval(interval);
  }, []);

  const processImage = (screenshot) => {
    const img = new Image();
    img.src = screenshot;
    const canvas = document.createElement('canvas');
    // Ajustar dimensiones para mejor calidad
    canvas.width = 640;
    canvas.height = 480;
    const ctx = canvas.getContext('2d');
    // Aplicar suavizado
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    // Dibujar imagen con mejor calidad
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    // Aumentar la calidad de la compresión JPEG
    return canvas.toDataURL('image/jpeg', 1.0);
  };

  const handleFaceLogin = async () => {
    if (!username || !password) {
      setMessage('Por favor, ingrese su usuario y contraseña.');
      return;
    }

    if (!capturedImage) {
      setMessage('Por favor, capture una foto antes de intentar iniciar sesión.');
      return;
    }

    const formData = new FormData();
    formData.append('username', username);
    formData.append('password', password);

    setMessage('Procesando imagen...');
    // Procesar la imagen capturada para asegurar formato correcto
    const processedImage = processImage(capturedImage);
    // Convertir base64 a Blob
    const byteString = atob(processedImage.split(',')[1]);
    const mimeString = processedImage.split(',')[0].split(':')[1].split(';')[0];
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i);
    }
    const blob = new Blob([ab], { type: mimeString });
    formData.append('face_image', blob, 'face.jpg');
    try {
      const response = await fetch('http://localhost:8000/login/face', {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });
  
      const data = await response.json();
      if (response.ok) {
        setMessage('Inicio de sesión exitoso!');
        setIsLoggedIn(true);
        window.location.href = '/Frvttae/albumes.html'; // Redirigir a la carpeta Frvttae dentro de frontend
      } else {
        setMessage(typeof data.detail === 'string' ? data.detail : 'Error en el inicio de sesión');
      }
    } catch (error) {
      setMessage(typeof error.message === 'string' ? error.message : 'Error al conectar con el servidor');
    }
};

const handleGoogleSuccess = async (credentialResponse) => {
    try {
      const response = await fetch('http://localhost:8000/login/google', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token: credentialResponse.credential }),
      });
  
      const data = await response.json();
      if (response.ok) {
        setMessage('Inicio de sesión con Google exitoso!');
        setIsLoggedIn(true);
        window.location.href = '/Frvttae/albumes.html'; // Redirigir a la carpeta Frvttae dentro de frontend
      } else {
        setMessage(typeof data.detail === 'string' ? data.detail : 'Error en el inicio de sesión con Google');
      }
    } catch (error) {
      setMessage(typeof error.message === 'string' ? error.message : 'Error al conectar con el servidor');
    }
};

  const handleCapture = () => {
    const screenshot = webcamRef.current.getScreenshot();
    if (!screenshot) {
      setMessage('Por favor, asegúrese de que la cámara esté activa y visible.');
      return;
    }
    setCapturedImage(screenshot);
    setMessage('¡Foto capturada con éxito! Asegúrese de que su rostro esté claramente visible en la imagen.');
  };

  const handleRegister = async () => {
    if (!capturedImage) {
      setMessage('Por favor, capture una foto antes de registrarse.');
      return;
    }

    const formData = new FormData();
    formData.append('username', username);
    formData.append('password', password);
    formData.append('email', email);
    
    // Procesar la imagen para asegurar formato correcto
    const processedImage = processImage(capturedImage);
    // Convertir base64 a Blob
    const byteString = atob(processedImage.split(',')[1]);
    const mimeString = processedImage.split(',')[0].split(':')[1].split(';')[0];
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i);
    }
    const blob = new Blob([ab], { type: mimeString });
    formData.append('face_image', blob, 'face.jpg');

    try {
      const response = await fetch('http://localhost:8000/register', {
        method: 'POST',
        body: formData,
      });
      const data = await response.json();
      if (response.ok) {
        setMessage('¡Registro exitoso! Ahora puede iniciar sesión');
        setIsRegistering(false);
        setUsername('');
        setPassword('');
        setEmail('');
      } else {
        setMessage(typeof data.detail === 'string' ? data.detail : 'Error en el registro. Por favor, inténtelo de nuevo.');
      }
    } catch (error) {
      setMessage(typeof error.message === 'string' ? error.message : 'Error al conectar con el servidor');
    }
  };

  return (
    <div className="App">
      <div style={{
        width: '100%',
        padding: '10px',
        backgroundColor: dbConnected ? '#d4edda' : '#f8d7da',
        color: dbConnected ? '#155724' : '#721c24',
        textAlign: 'center',
        fontWeight: 'bold',
        marginBottom: '16px',
      }}>
        {dbConnected ? 'Conectado a la base de datos' : 'Sin conexión a la base de datos'}
      </div>
      <h1>Sistema de Login Facial</h1>
      <div className={`db-status ${dbConnected ? 'connected' : 'disconnected'}`}>
        Base de datos: {dbConnected ? 'Conectada' : 'Desconectada'}
      </div>
      {!isLoggedIn ? (
        <div>
          {!isRegistering ? (
            <div className="login-container">
              <div className="camera-container">
                <Webcam
                  ref={webcamRef}
                  screenshotFormat="image/jpeg"
                  className="webcam"
                  videoConstraints={{
                    width: 720,
                    height: 480,
                    facingMode: "user",
                  }}
                  imageSmoothing={false}
                />
                {capturedImage && (
                  <div className="captured-image">
                    <img src={capturedImage} alt="Foto capturada" className="webcam" />
                  </div>
                )}
                <button
                  type="button"
                  onClick={handleCapture}
                  className="capture-button"
                >
                  {capturedImage ? 'Tomar otra foto' : 'Capturar foto'}
                </button>
              </div>
              <form style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
                <input
                  type="text"
                  placeholder="Usuario"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                />
                <input
                  type="password"
                  placeholder="Contraseña"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </form>
              <button onClick={handleFaceLogin} className="login-button">
                Verificar Identidad con Foto
              </button>
              <GoogleLogin
                clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID}
                onSuccess={handleGoogleSuccess}
                onError={() => setMessage('Error al iniciar sesión con Google')}
                redirectUri="http://localhost:5174"
              />
              <button
                onClick={() => setIsRegistering(true)}
                className="register-button"
              >
                Registrarse
              </button>
            </div>
          ) : (
            <div className="register-container">
              <div className="camera-container">
                <Webcam
                  ref={webcamRef}
                  screenshotFormat="image/jpeg"
                  className="webcam"
                  videoConstraints={{
                    width: 720,
                    height: 480,
                    facingMode: "user",
                  }}
                  imageSmoothing={false}
                />
                {capturedImage && (
                  <div className="captured-image">
                    <img src={capturedImage} alt="Foto capturada" className="webcam" />
                  </div>
                )}
                <button
                  type="button"
                  onClick={handleCapture}
                  className="capture-button"
                >
                  {capturedImage ? 'Tomar otra foto' : 'Capturar foto'}
                </button>
              </div>
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  await handleRegister();
                }}
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}
              >
                <input
                  type="text"
                  placeholder="Usuario"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                />
                <input
                  type="password"
                  placeholder="Contraseña"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <input
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
                <button type="submit" className="register-button">
                  Completar Registro
                </button>
              </form>
              <button
                onClick={() => setIsRegistering(false)}
                className="back-button"
              >
                Volver
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="welcome-container">
          <h2>¡Bienvenido!</h2>
          <UserManagement />
          <button
            onClick={() => {
              setIsLoggedIn(false);
              setMessage('');
            }}
            className="logout-button"
          >
            Cerrar Sesión
          </button>
        </div>
      )}
      {message && <p className="message">{message}</p>}
    </div>
  );
}

export default App;