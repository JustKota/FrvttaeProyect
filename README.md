# Sistema de Login Facial

Sistema de autenticación que utiliza reconocimiento facial y Google Sign-in, desarrollado con FastAPI y React.

## Requisitos Previos

- Python 3.8 o superior
- Node.js 14 o superior
- MongoDB
- Webcam

## Instalación

### Backend

1. Instalar las dependencias de Python:
```bash
pip install -r requirements.txt
```

2. Configurar las variables de entorno en el archivo `.env`:
```
MONGO_URL="mongodb+srv://SamuelDani:2003@cluster0.o0c70at.mongodb.net/"
SECRET_KEY="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"
GOOGLE_CLIENT_ID="826716563276-aevnjk67kjjpgq6kgp8jbvt840k43n8p.apps.googleusercontent.com"
```

3. Iniciar el servidor backend:
```bash
uvicorn main:app --reload
```

### Frontend

1. Navegar al directorio frontend:
```bash
cd frontend
```

2. Instalar las dependencias:
```bash
npm install
```

3. Crear un archivo `.env` en el directorio frontend:
```
VITE_GOOGLE_CLIENT_ID=826716563276-aevnjk67kjjpgq6kgp8jbvt840k43n8p.apps.googleusercontent.com
```

4. Iniciar el servidor de desarrollo:
```bash
npm run dev
```

## Características

- Registro de usuarios con reconocimiento facial
- Login mediante reconocimiento facial
- Autenticación alternativa con Google Sign-in
- Operaciones CRUD para gestión de usuarios
- Registro de logs de inicio de sesión

## Estructura de la Base de Datos

### Colección "usuarios"
- username: string
- email: string
- password: string (hash)
- face_encoding: array
- google_id: string (opcional)

### Colección "logs"
- username: string
- timestamp: date
- login_type: string ("face" o "google")

## Uso

1. Acceder a la aplicación web en `http://localhost:5173`
2. Para registrarse:
   - Hacer clic en "Registrarse"
   - Completar el formulario y capturar imagen facial
3. Para iniciar sesión:
   - Usar reconocimiento facial
   - O iniciar sesión con Google
