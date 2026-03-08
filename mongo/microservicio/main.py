from fastapi import FastAPI
from microservicio import app as microservicio_app
from n8n_procesos import app as n8n_procesos_app
from rut_cache_app import app as rut_cache_app

app = FastAPI()

@app.get("/")
async def root():
    return {"message": "Microservicio activo"}

@app.get("/health")
async def health():
    return {"ok": True}

app.mount("/microservicio", microservicio_app)
app.mount("/n8n_procesos", n8n_procesos_app)
app.mount("/rut_cache", rut_cache_app)
