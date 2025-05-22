from motor.motor_asyncio import AsyncIOMotorClient
import asyncio
import os
from dotenv import load_dotenv
import logging
from typing import Optional
from datetime import datetime, timedelta

# Configurar logging para que sea más visible
import sys
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler("database.log")
    ]
)
logger = logging.getLogger("database")
logger.setLevel(logging.INFO)

# Cargar variables de entorno
load_dotenv()

class MongoDBConnection:
    _instance = None
    _client: Optional[AsyncIOMotorClient] = None
    _db = None
    _is_connected = False
    _connection_attempts = 0
    _max_retries = 5  # Aumentado para mayor tolerancia
    _retry_delay = 2  # segundos
    _last_connection_check = None  # Timestamp de la última verificación
    _connection_check_interval = 60  # Intervalo en segundos para verificar conexión

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(MongoDBConnection, cls).__new__(cls)
        return cls._instance

    async def connect(self):
        """Establece conexión con MongoDB con reintentos automáticos"""
        if self._is_connected and self._client is not None:
            return self._db

        self._connection_attempts = 0
        while self._connection_attempts < self._max_retries:
            try:
                # Obtener URL de MongoDB desde variables de entorno
                mongo_url = os.getenv("MONGO_URL")
                if not mongo_url:
                    raise ValueError("MONGO_URL no está configurada en el archivo .env")

                # Ocultar credenciales para logs
                if "@" in mongo_url:
                    safe_url = mongo_url.replace(
                        mongo_url[mongo_url.find("://")+3:mongo_url.find("@")+1], "[credenciales]@"
                    )
                else:
                    safe_url = mongo_url
                
                logger.info(f"Intentando conectar a MongoDB: {safe_url}")

                # Limpiar URL de posibles comillas
                mongo_url = mongo_url.strip('"').strip("'")

                # Configuración del cliente con opciones mejoradas
                self._client = AsyncIOMotorClient(
                    mongo_url,
                    serverSelectionTimeoutMS=5000,
                    connectTimeoutMS=5000,
                    socketTimeoutMS=10000,
                    maxPoolSize=10,
                    minPoolSize=1,
                    maxIdleTimeMS=30000,
                    retryWrites=True,
                    retryReads=True
                )

                # Verificar conexión con ping
                await self._client.admin.command('ping')
                
                # Establecer base de datos
                self._db = self._client.face_login_db
                self._is_connected = True
                
                logger.info("Conexión exitosa a MongoDB - Base de datos: face_login_db")
                return self._db
                
            except Exception as e:
                self._connection_attempts += 1
                logger.error(f"Error al conectar a MongoDB (intento {self._connection_attempts}/{self._max_retries}): {str(e)}")
                
                if self._connection_attempts >= self._max_retries:
                    logger.critical(f"No se pudo establecer conexión a MongoDB después de {self._max_retries} intentos")
                    raise
                
                # Esperar antes de reintentar
                await asyncio.sleep(self._retry_delay * self._connection_attempts)
    
    async def get_db(self):
        """Obtiene la instancia de la base de datos, conectando si es necesario"""
        if not self._is_connected:
            await self.connect()
        return self._db
    
    async def close(self):
        """Cierra la conexión a MongoDB"""
        if self._client and self._is_connected:
            self._client.close()
            self._is_connected = False
            logger.info("Conexión a MongoDB cerrada")
    
    async def check_connection(self):
        """Verifica el estado de la conexión con información detallada"""
        try:
            if not self._is_connected or not self._client:
                logger.warning("Verificación de conexión: No hay conexión activa")
                return False
            
            # Verificar conexión con ping y medir tiempo de respuesta
            start_time = datetime.now()
            await self._client.admin.command('ping')
            response_time = (datetime.now() - start_time).total_seconds() * 1000
            
            # Actualizar timestamp de última verificación
            self._last_connection_check = datetime.now()
            
            logger.info(f"Verificación de conexión exitosa. Tiempo de respuesta: {response_time:.2f}ms")
            return True
        except Exception as e:
            logger.error(f"Error al verificar conexión a MongoDB: {str(e)}")
            self._is_connected = False
            # Intentar reconectar automáticamente
            asyncio.create_task(self._reconnect())
            return False
            
    async def _reconnect(self):
        """Intenta reconectar automáticamente cuando se detecta una desconexión"""
        logger.warning("Intentando reconexión automática a MongoDB...")
        try:
            self._is_connected = False
            self._client = None
            await self.connect()
            logger.info("Reconexión automática exitosa")
        except Exception as e:
            logger.error(f"Error en reconexión automática: {str(e)}")
            # No lanzamos la excepción para evitar interrumpir el flujo de la aplicación

# Instancia global de la conexión
mongo_connection = MongoDBConnection()

# Función para obtener la base de datos
async def get_database():
    """Función auxiliar para obtener la instancia de la base de datos"""
    db = await mongo_connection.get_db()
    # Verificar si es necesario comprobar la conexión
    if (mongo_connection._last_connection_check is None or 
        (datetime.now() - mongo_connection._last_connection_check).total_seconds() > mongo_connection._connection_check_interval):
        # Verificar conexión en segundo plano para no bloquear
        asyncio.create_task(mongo_connection.check_connection())
    return db