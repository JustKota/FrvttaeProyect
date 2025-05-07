from fastapi import FastAPI, HTTPException, Depends, File, UploadFile, Form, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from fastapi.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime
from typing import Optional
from pydantic import BaseModel
import face_recognition
import os
from dotenv import load_dotenv
from passlib.context import CryptContext
from jose import JWTError, jwt
from google.oauth2 import id_token
from google.auth.transport import requests
from google.oauth2.credentials import Credentials
import asyncio
import numpy as np
import io
from PIL import Image

# Cargar variables de entorno
load_dotenv()

# Configuración de Google OAuth
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")

app = FastAPI()

# Función para insertar usuario de prueba
async def insert_test_user():
    # Verificar si el usuario ya existe
    existing_user = await get_user("samue123")
    if existing_user:
        return
    
    # Crear usuario de prueba
    user_dict = {
        "username": "samue123",
        "email": "samue123@gmail.com",
        "password": get_password_hash("contraseña123"),
        "face_encoding": [0.0] * 128  # Codificación facial simulada
    }
    
    await db.usuarios.insert_one(user_dict)
    print("Usuario de prueba insertado exitosamente")

# Configuración CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Función para probar la conexión a MongoDB
async def test_connection():
    try:
        await db.command("ping")
        print("Conexión exitosa a MongoDB en el arranque")
    except Exception as e:
        print(f"Fallo al conectar a MongoDB en el arranque: {str(e)}")

# Configuración MongoDB
import os
from motor.motor_asyncio import AsyncIOMotorClient

try:
    print("Iniciando configuración de MongoDB...")

    MONGO_URL = os.getenv("MONGO_URL")
    if not MONGO_URL:
        raise ValueError("MONGO_URL no está configurada en el archivo .env")

    # Oculta usuario/clave para debug
    safe_url = MONGO_URL.replace(
        MONGO_URL[MONGO_URL.find("://")+3:MONGO_URL.find("@")+1], "[hidden]@"
    )
    print(f"Intentando conectar a MongoDB con URL: {safe_url}")

    # Quitar comillas si las hay
    MONGO_URL = MONGO_URL.strip('"').strip("'")

    # Crear cliente de forma asíncrona
    client = AsyncIOMotorClient(MONGO_URL, serverSelectionTimeoutMS=5000)
    db = client.face_login_db
    print("Conectado a MongoDB - Base de datos: face_login_db")

except Exception as e:
    print(f"Error durante la configuración de MongoDB: {str(e)}")
    import traceback
    traceback.print_exc()
    raise


# Evento de startup para verificar conexión y crear usuario de prueba
@app.on_event("startup")
async def startup_event():
    await test_connection()

# Configuración de seguridad
SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

# Modelos Pydantic
class UserBase(BaseModel):
    username: str
    email: Optional[str] = None

class UserCreate(UserBase):
    password: str

class User(UserBase):
    id: str
    face_encoding: Optional[list] = None

class Token(BaseModel):
    access_token: str
    token_type: str

# Funciones de autenticación
def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

async def get_user(username: str):
    user = await db.usuarios.find_one({"username": username})
    return user

async def authenticate_user(username: str, password: str):
    user = await get_user(username)
    if not user:
        return False
    if not verify_password(password, user["password"]):
        return False
    return user


@app.get("/health")
async def check_database_connection():
    try:
        print("Verificando conexión a MongoDB...")
        await db.command("ping")
        print("Ping a MongoDB exitoso")
        return {"status": "connected", "message": "Conexión exitosa a MongoDB"}
    except Exception as e:
        error_msg = f"Error de conexión a la base de datos: {str(e)}"
        print(error_msg)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=error_msg
        )

from fastapi import Form


@app.post("/register")
async def register_user(
    username: str = Form(...),
    password: str = Form(...),
    email: str = Form(...),
    face_image: UploadFile = File(...)
):
    print(f"Intentando registrar usuario: {username}, email: {email}, filename imagen: {face_image.filename}")
    
    # Validar el formato de la imagen
    content_type = face_image.content_type
    if not content_type or not content_type.startswith('image/'):
        print(f"Tipo de contenido no válido: {content_type}")
        raise HTTPException(status_code=400, detail="El archivo debe ser una imagen válida (JPEG, PNG)")
    
    # Verificar si el usuario ya existe
    existing_user = await get_user(username)
    if existing_user:
        print("Usuario ya registrado")
        raise HTTPException(status_code=400, detail="El nombre de usuario ya está registrado")

    try:
        # Leer contenido de la imagen
        contents = await face_image.read()
        if not contents:
            print("Contenido de imagen vacío")
            raise HTTPException(status_code=400, detail="La imagen está vacía o corrupta")
        
        print(f"Tamaño de la imagen recibida: {len(contents)} bytes")
        
        # Procesar y validar la imagen
        try:
            # Abrir la imagen con PIL
            image = Image.open(io.BytesIO(contents))
            print(f"Formato de imagen: {image.format}, Modo: {image.mode}, Tamaño: {image.size}")
            
            # Validar formato de imagen
            if image.format not in ['JPEG', 'PNG']:
                raise HTTPException(status_code=400, detail="Por favor, use una imagen en formato JPEG o PNG")
            
            # Convertir a RGB y redimensionar si es necesario
            image = image.convert('RGB')
            
            # Validar dimensiones mínimas
            if image.size[0] < 50 or image.size[1] < 50:
                raise HTTPException(status_code=400, detail="La imagen es demasiado pequeña. Debe ser al menos 50x50 píxeles")
            
            # Convertir a array numpy
            np_image = np.array(image)
            
            # Detectar rostros
            face_locations = face_recognition.face_locations(np_image)
            if not face_locations:
                raise HTTPException(status_code=400, detail="No se detectó ningún rostro en la imagen. Por favor, use una imagen clara de su rostro")
            
            if len(face_locations) > 1:
                raise HTTPException(status_code=400, detail="Se detectó más de un rostro en la imagen. Por favor, use una imagen con un solo rostro")
            
            # Obtener codificación facial
            face_encodings = face_recognition.face_encodings(np_image, face_locations)
            face_encoding = face_encodings[0]
            print("Rostro detectado y codificado exitosamente")
            
            # Guardar imagen como bytes
            img_byte_arr = io.BytesIO()
            image.save(img_byte_arr, format=image.format or 'JPEG')
            img_byte_arr = img_byte_arr.getvalue()
            
        except HTTPException:
            raise
        except Exception as e:
            print(f"Error procesando la imagen: {str(e)}")
            raise HTTPException(status_code=400, detail="Error al procesar la imagen. Asegúrese de que sea una imagen válida y clara")
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error inesperado procesando la imagen: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail="Error interno al procesar la imagen")

    try:
        # Crear usuario
        user_dict = {
            "username": username,
            "email": email,
            "password": get_password_hash(password),
            "face_encoding": face_encoding.tolist(),
            "face_image": img_byte_arr  # Guardar la imagen como bytes
        }
        
        print(f"Insertando usuario en la base de datos: {username}")
        result = await db.usuarios.insert_one(user_dict)
        print("Usuario registrado exitosamente")
        return {"message": "Usuario registrado exitosamente"}
        
    except Exception as e:
        print(f"Error al guardar usuario en la base de datos: {str(e)}")
        raise HTTPException(status_code=500, detail="Error al guardar el usuario en la base de datos")


@app.post("/login/face")
async def face_login(
    username: str = Form(...),
    password: str = Form(...),
    face_image: UploadFile = File(...)
):
    try:
        # Verificar credenciales del usuario
        user = await authenticate_user(username, password)
        if not user:
            raise HTTPException(
                status_code=401,
                detail="Nombre de usuario o contraseña incorrectos"
            )

        # Validar el formato de la imagen
        content_type = face_image.content_type
        if not content_type or not content_type.startswith('image/'):
            print(f"Tipo de contenido no válido: {content_type}")
            raise HTTPException(status_code=400, detail="El archivo debe ser una imagen válida (JPEG, PNG)")

        # Verificar que el archivo no esté vacío
        contents = await face_image.read()
        if not contents:
            print("Archivo de imagen vacío")
            raise HTTPException(status_code=400, detail="La imagen está vacía o corrupta")
        
        print(f"Imagen recibida: {face_image.filename}, tamaño: {len(contents)} bytes")
        
        try:
            # Abrir y validar la imagen
            image = Image.open(io.BytesIO(contents))
            print(f"Formato de imagen: {image.format}, modo: {image.mode}, tamaño: {image.size}")
            
            # Validar formato de imagen
            if image.format not in ['JPEG', 'PNG']:
                raise HTTPException(status_code=400, detail="Por favor, use una imagen en formato JPEG o PNG")
            
            # Validar dimensiones mínimas
            if image.size[0] < 50 or image.size[1] < 50:
                raise HTTPException(status_code=400, detail="La imagen es demasiado pequeña. Debe ser al menos 50x50 píxeles")
            
            # Convertir a RGB y mejorar la imagen
            image = image.convert('RGB')
            print("Imagen convertida a RGB")
            
            # Ajustar brillo y contraste
            from PIL import ImageEnhance
            enhancer = ImageEnhance.Brightness(image)
            image = enhancer.enhance(1.2)  # Aumentar brillo en 20%
            enhancer = ImageEnhance.Contrast(image)
            image = enhancer.enhance(1.3)  # Aumentar contraste en 30%
            print("Brillo y contraste ajustados")
            
            # Convertir a array numpy
            np_image = np.array(image)
            print(f"Array numpy creado con forma: {np_image.shape}")
            
            # Detectar rostros con parámetros más flexibles
            face_locations = face_recognition.face_locations(np_image, model='hog', number_of_times_to_upsample=2)
            if not face_locations:
                print("Intento adicional con diferentes parámetros...")
                # Segundo intento con parámetros más permisivos
                face_locations = face_recognition.face_locations(np_image, model='hog', number_of_times_to_upsample=3)
                if not face_locations:
                    raise HTTPException(status_code=400, detail="No se detectó ningún rostro en la imagen. Por favor, asegúrese de tener buena iluminación y que su rostro esté claramente visible")
            
            if len(face_locations) > 1:
                raise HTTPException(status_code=400, detail="Se detectó más de un rostro en la imagen. Por favor, use una imagen con un solo rostro")
            
            # Obtener codificación facial
            face_encodings = face_recognition.face_encodings(np_image, face_locations)
            face_encoding = face_encodings[0]
            print("Rostro detectado y codificado exitosamente")
            
        except HTTPException:
            raise
        except Exception as e:
            print(f"Error procesando la imagen: {str(e)}")
            import traceback
            traceback.print_exc()
            raise HTTPException(status_code=400, detail="Error al procesar la imagen. Asegúrese de que sea una imagen válida y clara")
        
        # Verificar coincidencia con el rostro registrado del usuario
        if "face_encoding" not in user:
            raise HTTPException(status_code=400, detail="Usuario no tiene rostro registrado")
            
        if not face_recognition.compare_faces([user["face_encoding"]], face_encoding)[0]:
            print("Rostro no coincide con el usuario")
            raise HTTPException(status_code=401, detail="El rostro no coincide con el usuario autenticado")

        # Registrar el inicio de sesión exitoso
        log_entry = {
            "username": user["username"],
            "timestamp": datetime.now(),
            "login_type": "face"
        }
        await db.logs.insert_one(log_entry)
        return {"message": "Login exitoso", "username": user["username"], "redirect": "/Frvttae/albumes.html"}
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error inesperado: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail="Error interno del servidor al procesar la imagen")

@app.post("/login/google")
async def google_login(token_data: dict):
    try:
        # Verifica si recibimos el token directamente o dentro de un objeto
        credential = token_data.get('token') if isinstance(token_data.get('token'), str) else token_data.get('credential')
        if not credential:
            raise HTTPException(status_code=400, detail="Token no proporcionado")
            
        idinfo = id_token.verify_oauth2_token(
            credential,
            requests.Request(),
            GOOGLE_CLIENT_ID
        )
        
        # Verificar si el usuario existe o crear uno nuevo
        user = await get_user(idinfo["email"])
        if not user:
            user_dict = {
                "username": idinfo["email"],
                "email": idinfo["email"],
                "google_id": idinfo["sub"]
            }
            await db.usuarios.insert_one(user_dict)

        # Registrar el inicio de sesión
        log_entry = {
            "username": idinfo["email"],
            "timestamp": datetime.now(),
            "login_type": "google"
        }
        await db.logs.insert_one(log_entry)
        
        return {"message": "Google login successful", "email": idinfo["email"], "redirect": "/Frvttae/albumes.html"}
    except ValueError as e:
        raise HTTPException(status_code=401, detail=str(e))

# CRUD operations
@app.get("/users")
async def get_users():
    users = await db.usuarios.find().to_list(length=None)
    # Convertir ObjectId a string para serialización JSON
    for user in users:
        if '_id' in user:
            user['_id'] = str(user['_id'])
        # Convertir face_encoding a lista si existe
        if 'face_encoding' in user and user['face_encoding'] is not None:
            user['face_encoding'] = user['face_encoding'] if isinstance(user['face_encoding'], list) else user['face_encoding'].tolist()
    return users

@app.get("/users/{username}")
async def get_user_by_username(username: str):
    user = await get_user(username)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    return user

@app.put("/users/{username}")
async def update_user(username: str, user: UserBase):
    existing_user = await get_user(username)
    if existing_user is None:
        raise HTTPException(status_code=404, detail="User not found")
    
    await db.usuarios.update_one(
        {"username": username},
        {"$set": user.dict(exclude_unset=True)}
    )
    return {"message": "User updated successfully"}

@app.delete("/users/{username}")
async def delete_user(username: str):
    result = await db.usuarios.delete_one({"username": username})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    return {"message": "User deleted successfully"}

@app.get("/logs")
async def get_logs():
    logs = await db.logs.find().to_list(length=None)
    return logs