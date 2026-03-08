# rut_cache_app.py
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from pymongo import MongoClient
from datetime import datetime
import os

# ==================================================
# 🔧 Configuración base
# ==================================================
app = FastAPI(title="RUT Cache API")

# Permitir solicitudes CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Cambia si quieres restringir a tu dominio
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ==================================================
# 📦 Conexión Mongo
# ==================================================
mongo_uri = os.getenv("MONGO_URI", "mongodb://localhost:27017")
client = MongoClient(mongo_uri)
db = client["rutificador"]
coleccion = db["rut_cache"]

# ==================================================
# 📥 Modelos
# ==================================================
class RUTPayload(BaseModel):
    rut: str

class RUTGuardarPayload(BaseModel):
    rut: str
    nombre_completo: str
    direccion: str

# ==================================================
# 🔍 Consultar cache
# ==================================================
@app.post("/consultar")
def consultar_rut(payload: RUTPayload):
    rut = payload.rut.strip()
    if not rut or len(rut) < 8:
        raise HTTPException(status_code=400, detail="RUT inválido")

    doc = coleccion.find_one({"rut": rut})
    if not doc:
        print(f"[❌] RUT {rut} no encontrado en cache")
        raise HTTPException(status_code=404, detail="RUT no encontrado en cache")

    print(f"[✅] RUT {rut} encontrado en cache")
    return {
        "rut": doc["rut"],
        "encontrado": True,
        "cache": True,
        "datos": {
            "nombre_completo": doc.get("nombre_completo"),
            "direccion": doc.get("direccion"),
            "fecha_consulta": doc.get("fecha_consulta"),
        },
    }

# ==================================================
# 💾 Guardar/actualizar cache (usado por el scraper remoto)
# ==================================================
@app.post("/guardar")
def guardar_en_cache(payload: RUTGuardarPayload):
    rut = payload.rut.strip()
    if not rut:
        raise HTTPException(status_code=400, detail="RUT inválido")

    doc = {
        "rut": rut,
        "nombre_completo": payload.nombre_completo,
        "direccion": payload.direccion,
        "fecha_consulta": datetime.utcnow(),
        "fuente": "scraper_pc"
    }

    result = coleccion.update_one({"rut": rut}, {"$set": doc}, upsert=True)
    print(f"[💾] Guardado/actualizado cache RUT {rut} - matched: {result.matched_count}, modified: {result.modified_count}")

    return {"estado": "ok", "rut": rut, "guardado": True}

# ==================================================
# 🧹 Endpoint opcional para limpiar cache
# ==================================================
@app.delete("/limpiar")
def limpiar_cache():
    result = coleccion.delete_many({})
    print(f"[🧹] Cache limpiado ({result.deleted_count} documentos)")
    return {"mensaje": f"Cache vaciado. Documentos eliminados: {result.deleted_count}"}
