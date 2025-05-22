import asyncio
import logging
import sys
from database import mongo_connection, get_database

# Configurar logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger("test_db_connection")

async def test_connection():
    """Prueba la conexión a MongoDB y verifica su funcionamiento"""
    logger.info("=== INICIANDO PRUEBA DE CONEXIÓN A MONGODB ===")
    
    try:
        # Intentar conectar a la base de datos
        logger.info("Intentando conectar a MongoDB...")
        db = await get_database()
        logger.info("Conexión inicial establecida")
        
        # Verificar estado de la conexión
        is_connected = await mongo_connection.check_connection()
        logger.info(f"Estado de la conexión: {'Conectado' if is_connected else 'Desconectado'}")
        
        if is_connected:
            # Probar operaciones básicas
            try:
                # Intentar obtener la lista de colecciones
                collections = await db.list_collection_names()
                logger.info(f"Colecciones disponibles: {collections}")
                
                # Verificar si existe la colección de usuarios
                if "usuarios" in collections:
                    # Contar documentos
                    count = await db.usuarios.count_documents({})
                    logger.info(f"Número de usuarios en la base de datos: {count}")
                else:
                    logger.warning("La colección 'usuarios' no existe en la base de datos")
                
                # Probar reconexión automática
                logger.info("Probando reconexión automática...")
                # Forzar desconexión simulada
                mongo_connection._is_connected = False
                # Intentar operación que debería reconectar
                await get_database()
                # Verificar si se reconectó
                is_reconnected = await mongo_connection.check_connection()
                logger.info(f"Reconexión automática: {'Exitosa' if is_reconnected else 'Fallida'}")
                
            except Exception as op_error:
                logger.error(f"Error en operaciones de prueba: {str(op_error)}")
        else:
            logger.error("No se pudo establecer conexión a MongoDB")
    
    except Exception as e:
        logger.error(f"Error general en prueba de conexión: {str(e)}")
    finally:
        # Cerrar conexión
        await mongo_connection.close()
        logger.info("Prueba finalizada")

# Ejecutar la prueba
if __name__ == "__main__":
    asyncio.run(test_connection())