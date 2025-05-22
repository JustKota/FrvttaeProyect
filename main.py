import logging
import sys

# Configurar logging para que sea más visible
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler("app.log")
    ]
)
logger = logging.getLogger("main")
logger.setLevel(logging.INFO)

# Mensaje de inicio de la aplicación
logger.info("=== INICIANDO APLICACIÓN DE LOGIN FACIAL ===")

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
import aiofiles
from bson import ObjectId

# Cargar variables de entorno
load_dotenv()

# Configuración de Google OAuth
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")

app = FastAPI()

# Función para insertar usuario de prueba
async def insert_test_user():
    try:
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
        logger.info("Usuario de prueba insertado exitosamente")
    except Exception as e:
        logger.error(f"Error al insertar usuario de prueba: {str(e)}")
        raise

# Configuración CORS mejorada y flexible
frontend_origins = [
    "http://localhost:5173",  # Vite dev server
    "http://localhost:3000",  # Alternativa común
    "http://127.0.0.1:5173",  # Usando IP en lugar de localhost
    "http://127.0.0.1:3000",  # Alternativa con IP
]

# Permitir orígenes adicionales desde variables de entorno si están definidos
env_origins = os.getenv("CORS_ORIGINS")
if env_origins:
    additional_origins = [origin.strip() for origin in env_origins.split(",")]
    frontend_origins.extend(additional_origins)
    logger.info(f"Orígenes CORS adicionales configurados: {additional_origins}")

logger.info(f"Configurando CORS con los siguientes orígenes: {frontend_origins}")

app.add_middleware(
    CORSMiddleware,
    allow_origins=frontend_origins,  # Usar la lista de orígenes configurada
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],  # Métodos específicos permitidos
    allow_headers=["Authorization", "Content-Type"],  # Headers específicos permitidos
    expose_headers=["*"],  # Headers expuestos al navegador
    max_age=3600  # Tiempo de caché para preflight requests
)

# Importar el módulo de conexión a la base de datos
from database import get_database, mongo_connection

# Variable global para la base de datos con tipado
db: Optional[AsyncIOMotorClient] = None

# Evento de startup para inicializar la conexión a la base de datos y crear usuario de prueba
@app.on_event("startup")
async def startup_event():
    global db
    try:
        # Inicializar conexión a la base de datos con reintentos
        logger.info("Inicializando conexión a MongoDB...")
        max_startup_retries = 5
        retry_count = 0
        startup_success = False
        
        while retry_count < max_startup_retries and not startup_success:
            try:
                db = await get_database()
                # Verificar conexión explícitamente
                if await mongo_connection.check_connection():
                    startup_success = True
                    logger.info("Conexión a MongoDB inicializada correctamente")
                else:
                    raise Exception("La verificación de conexión falló")
            except Exception as retry_error:
                retry_count += 1
                logger.warning(f"Intento {retry_count}/{max_startup_retries} de conexión a MongoDB falló: {str(retry_error)}")
                if retry_count < max_startup_retries:
                    await asyncio.sleep(2 * retry_count)  # Espera exponencial
                else:
                    logger.error("Se agotaron los reintentos de conexión durante el arranque")
                    # Continuamos a pesar del error para permitir que la aplicación inicie
                    # y pueda reconectar más tarde
        
        # Verificar si existe un usuario admin
        try:
            admin_user = await get_user("admin123")
            if not admin_user:
                # Crear usuario administrador
                admin_dict = {
                    "username": "admin123",
                    "email": "admin@example.com",
                    "password": get_password_hash("admin123"),
                    "role": UserRole.ADMIN
                }
                await db.usuarios.insert_one(admin_dict)
                logger.info("Usuario administrador creado exitosamente")
        except Exception as user_error:
            logger.error(f"Error al verificar/crear usuario administrador: {str(user_error)}")
            # No interrumpimos el arranque por este error
    except Exception as e:
        logger.error(f"Error crítico durante el arranque de la aplicación: {str(e)}")
        # No lanzamos la excepción para permitir que la aplicación inicie de todos modos
        # y pueda intentar reconectar más tarde

# Evento de shutdown para cerrar la conexión a la base de datos
@app.on_event("shutdown")
async def shutdown_event():
    try:
        logger.info("Cerrando conexión a MongoDB...")
        await mongo_connection.close()
        logger.info("Conexión a MongoDB cerrada correctamente")
    except Exception as e:
        logger.error(f"Error al cerrar la conexión a MongoDB: {str(e)}")
        # No lanzamos la excepción para permitir que la aplicación se cierre correctamente

# Configuración de seguridad
SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

# Modelos Pydantic
from auth import UserRole, create_access_token, get_current_user, get_current_admin

class UserBase(BaseModel):
    username: str
    email: Optional[str] = None
    role: UserRole = UserRole.NORMAL

class UserCreate(UserBase):
    password: str

class User(UserBase):
    id: str
    face_encoding: Optional[list] = None

class Token(BaseModel):
    access_token: str
    token_type: str
    role: UserRole


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
    
    # Asignar rol por defecto si no existe
    if "role" not in user:
        user["role"] = UserRole.NORMAL
        await db.usuarios.update_one(
            {"username": username},
            {"$set": {"role": UserRole.NORMAL}}
        )
    return user


@app.get("/health")
async def check_database_connection():
    try:
        logger.info("Verificando conexión a MongoDB...")
        start_time = datetime.now()
        is_connected = await mongo_connection.check_connection()
        response_time = (datetime.now() - start_time).total_seconds() * 1000
        
        if is_connected:
            # Obtener información adicional del servidor MongoDB
            server_info = None
            try:
                server_info = await mongo_connection._client.admin.command('serverStatus')
            except Exception as e:
                logger.warning(f"No se pudo obtener información del servidor MongoDB: {str(e)}")
            
            # Preparar respuesta con información detallada
            response = {
                "status": "connected",
                "message": "Conexión exitosa a MongoDB",
                "database": "face_login_db",
                "response_time_ms": round(response_time, 2),
                "connection_info": {
                    "max_pool_size": 10,
                    "min_pool_size": 1,
                    "retry_enabled": True
                }
            }
            
            # Añadir información del servidor si está disponible
            if server_info:
                response["server_info"] = {
                    "version": server_info.get("version", "Desconocida"),
                    "uptime_seconds": server_info.get("uptime", 0),
                    "connections": server_info.get("connections", {}).get("current", 0)
                }
            
            logger.info(f"Verificación de conexión a MongoDB exitosa. Tiempo de respuesta: {response_time:.2f}ms")
            return response
        else:
            # Intentar reconectar automáticamente
            logger.warning("Intentando reconexión automática desde endpoint /health")
            try:
                await mongo_connection.connect()
                is_reconnected = await mongo_connection.check_connection()
                if is_reconnected:
                    logger.info("Reconexión exitosa desde endpoint /health")
                    return {
                        "status": "reconnected",
                        "message": "Reconexión exitosa a MongoDB",
                        "response_time_ms": round(response_time, 2)
                    }
            except Exception as reconnect_error:
                logger.error(f"Error en reconexión desde endpoint /health: {str(reconnect_error)}")
            
            error_msg = "La conexión a MongoDB no está activa"
            logger.error(error_msg)
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail={
                    "status": "disconnected",
                    "message": error_msg,
                    "error_details": "No se pudo establecer conexión con MongoDB"
                }
            )
    except Exception as e:
        error_msg = f"Error de conexión a la base de datos: {str(e)}"
        logger.error(error_msg)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={
                "status": "error",
                "message": error_msg,
                "error_type": type(e).__name__
            }
        )

@app.get("/system/diagnostics")
async def system_diagnostics(current_user = Depends(get_current_admin)):
    """Endpoint para diagnóstico detallado del sistema (solo administradores)"""
    try:
        # Recopilar información del sistema
        system_info = {
            "app": {
                "timestamp": datetime.now().isoformat(),
                "uptime": "No disponible",  # Se podría implementar con una variable global
                "environment": os.getenv("ENVIRONMENT", "development")
            },
            "database": {
                "status": "checking"
            },
            "memory": {
                "process_memory_mb": "No disponible"  # Se podría implementar con psutil
            }
        }
        
        # Verificar conexión a la base de datos
        db_start_time = datetime.now()
        is_db_connected = await mongo_connection.check_connection()
        db_response_time = (datetime.now() - db_start_time).total_seconds() * 1000
        
        # Actualizar información de la base de datos
        if is_db_connected:
            system_info["database"] = {
                "status": "connected",
                "response_time_ms": round(db_response_time, 2),
                "connection_attempts": mongo_connection._connection_attempts,
                "max_retries": mongo_connection._max_retries,
                "last_check": mongo_connection._last_connection_check.isoformat() if mongo_connection._last_connection_check else None
            }
            
            # Intentar obtener estadísticas adicionales
            try:
                # Contar documentos en colecciones principales
                collections_stats = {}
                db = await get_database()
                collections = ["usuarios"]
                
                for collection in collections:
                    try:
                        count = await db[collection].count_documents({})
                        collections_stats[collection] = {
                            "document_count": count
                        }
                    except Exception as coll_error:
                        collections_stats[collection] = {
                            "error": str(coll_error)
                        }
                
                system_info["database"]["collections"] = collections_stats
                
                # Obtener estadísticas del servidor MongoDB
                try:
                    server_stats = await mongo_connection._client.admin.command('serverStatus')
                    system_info["database"]["server"] = {
                        "version": server_stats.get("version", "Desconocida"),
                        "connections": server_stats.get("connections", {}).get("current", 0),
                        "active_clients": server_stats.get("globalLock", {}).get("activeClients", {}).get("total", 0)
                    }
                except Exception as stats_error:
                    logger.warning(f"No se pudieron obtener estadísticas del servidor: {str(stats_error)}")
            except Exception as db_stats_error:
                system_info["database"]["stats_error"] = str(db_stats_error)
        else:
            system_info["database"] = {
                "status": "disconnected",
                "error": "No hay conexión activa a la base de datos"
            }
        
        # Información de logs
        try:
            log_info = {
                "database_log": os.path.exists("database.log"),
                "app_log": os.path.exists("app.log")
            }
            system_info["logs"] = log_info
        except Exception as log_error:
            system_info["logs"] = {"error": str(log_error)}
        
        return system_info
    except Exception as e:
        logger.error(f"Error al generar diagnóstico del sistema: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "status": "error",
                "message": f"Error al generar diagnóstico: {str(e)}",
                "error_type": type(e).__name__
            }
        )

# Rutas protegidas para administradores
@app.get("/api/users")
async def get_users(current_user = Depends(get_current_admin)):
    users = await db.usuarios.find().to_list(length=None)
    return users

@app.post("/api/users")
async def create_user(user: UserCreate, current_user = Depends(get_current_admin)):
    existing_user = await get_user(user.username)
    if existing_user:
        raise HTTPException(status_code=400, detail="El usuario ya existe")
    
    hashed_password = get_password_hash(user.password)
    user_dict = user.dict()
    user_dict["password"] = hashed_password
    result = await db.usuarios.insert_one(user_dict)
    return {"id": str(result.inserted_id), **user_dict}

@app.put("/api/users/{user_id}")
async def update_user(user_id: str, user: UserBase, current_user = Depends(get_current_admin)):
    result = await db.usuarios.update_one(
        {"_id": ObjectId(user_id)},
        {"$set": user.dict(exclude_unset=True)}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    return {"message": "Usuario actualizado"}

@app.delete("/api/users/{user_id}")
async def delete_user(user_id: str, current_user = Depends(get_current_admin)):
    result = await db.usuarios.delete_one({"_id": ObjectId(user_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    return {"message": "Usuario eliminado"}

# Rutas protegidas para álbumes
@app.get("/api/albums")
async def get_albums(current_user = Depends(get_current_user)):
    albums = await db.albums.find().to_list(length=None)
    return albums

@app.post("/api/albums")
async def create_album(album: dict, current_user = Depends(get_current_admin)):
    result = await db.albums.insert_one(album)
    return {"id": str(result.inserted_id), **album}

@app.put("/api/albums/{album_id}")
async def update_album(album_id: str, album: dict, current_user = Depends(get_current_admin)):
    result = await db.albums.update_one(
        {"_id": ObjectId(album_id)},
        {"$set": album}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Álbum no encontrado")
    return {"message": "Álbum actualizado"}

@app.delete("/api/albums/{album_id}")
async def delete_album(album_id: str, current_user = Depends(get_current_admin)):
    result = await db.albums.delete_one({"_id": ObjectId(album_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Álbum no encontrado")
    return {"message": "Álbum eliminado"}

from fastapi import Form


@app.post("/register", status_code=status.HTTP_201_CREATED, response_model=User)
async def register_user(
    username: str = Form(..., min_length=3, max_length=50),
    password: str = Form(..., min_length=8),
    email: str = Form(...),
    role: UserRole = Form(default=UserRole.NORMAL),
    face_image: UploadFile = File(...)
):
    logger.info(f"Intentando registrar usuario: {username}, email: {email}, filename imagen: {face_image.filename}")
    
    # Validar el formato de la imagen
    content_type = face_image.content_type
    allowed_types = ['image/jpeg', 'image/png']
    if not content_type or content_type not in allowed_types:
        logger.warning(f"Tipo de contenido no válido: {content_type}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "error": "Formato de imagen no válido",
                "message": "El archivo debe ser una imagen en formato JPEG o PNG",
                "allowed_types": allowed_types
            }
        )
    
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
        # Validar el rol
        if role not in [UserRole.ADMIN, UserRole.NORMAL]:
            raise HTTPException(status_code=400, detail="Rol no válido")
            
        user_dict = {
            "username": username,
            "email": email,
            "password": get_password_hash(password),
            "role": role,
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
        
        # Generar token JWT con rol
        access_token = create_access_token(
            data={"sub": user["username"], "role": user.get("role", UserRole.NORMAL)}
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
        return {
            "message": "Login exitoso", 
            "username": user["username"], 
            "access_token": access_token,
            "token_type": "bearer",
            "role": user.get("role", UserRole.NORMAL),
            "redirect": "/Frvttae/albumes.html" if user.get("role") == UserRole.NORMAL else "/admin/dashboard"
        }
    
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
