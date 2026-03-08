from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from pymongo import MongoClient
from datetime import datetime
import os

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Cambia a la lista de orígenes que necesites
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

mongo_uri = os.getenv("MONGO_URI", "mongodb://localhost:27017")
client = MongoClient(mongo_uri)
db = client['rutificador']
collection = db['rut_cache']

class ResultadoScraping(BaseModel):
    rut: str
    nombre_completo: str
    direccion: str

@app.post("/guardar")
def guardar_resultado(resultado: ResultadoScraping):
    datos = resultado.dict()
    datos["fecha_consulta"] = datetime.utcnow()
    try:
        collection.update_one({"rut": datos["rut"]}, {"$set": datos}, upsert=True)
        return {"estado": "guardado", "rut": datos["rut"]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error guardando en Mongo: {str(e)}")

@app.get("/buscar/{rut}")
def buscar_por_rut(rut: str):
    try:
        doc = collection.find_one({"rut": rut}, {"_id": 0})
        if not doc:
            raise HTTPException(status_code=404, detail="No encontrado")
        return doc
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error consultando Mongo: {str(e)}")
