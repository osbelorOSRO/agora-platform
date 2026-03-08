from fastapi import FastAPI, HTTPException
import os
from pymongo import MongoClient
from pydantic import BaseModel

app = FastAPI()

mongo_uri = os.getenv("MONGO_URI", "mongodb://localhost:27017")
client = MongoClient(mongo_uri)
db = client['admin']

@app.get("/subprocesos/{proceso_id}")
def get_subprocesos(proceso_id: str):
    doc = db['procesos'].find_one({"proceso_id": proceso_id})
    if not doc:
        raise HTTPException(status_code=404, detail="proceso no encontrado")
    return {"subprocesos": doc.get("subprocesos", [])}

class ProcesoUpdateModel(BaseModel):
    proceso_id: str
    delegacion: str
    motivo: str
    updatedAt: str

@app.put("/procesos/delegar")
def delegar_proceso(data: ProcesoUpdateModel):
    result = db['procesos'].update_one(
        {"proceso_id": data.proceso_id},
        {"$set": {
            "delegacion": data.delegacion,
            "motivo": data.motivo,
            "updatedAt": data.updatedAt
        }}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="No se encontró el documento para delegar")
    return {"estado": "delegado", "proceso_id": data.proceso_id}

class ProcesoCerrarModel(BaseModel):
    proceso_id: str
    cerrado_por_id: str
    fecha_cierre: str
    updatedAt: str

@app.put("/procesos/cerrar")
def cerrar_proceso(data: ProcesoCerrarModel):
    result = db['procesos'].update_one(
        {"proceso_id": data.proceso_id},
        {"$set": {
            "estado": "cerrado",
            "cerrado_por_id": data.cerrado_por_id,
            "fecha_cierre": data.fecha_cierre,
            "updatedAt": data.updatedAt
        }}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="No se encontró el documento para cerrar")
    return {"estado": "cerrado", "proceso_id": data.proceso_id}
