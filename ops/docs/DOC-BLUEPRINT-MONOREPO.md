# DOC-BLUEPRINT-MONOREPO

## 1. Identidad del Proyecto

- Nombre oficial del monorepo: `agora-platform`
- Plataforma modular de atención, automatización y control de conversaciones.

## 2. Estructura del Repo

```text
agora-platform/
  app/
    agora/
      frontend/          # React (Nginx)
      api-backend-nest/  # API REST principal (NestJS)
      websocket/         # WebSocket panel humano (Socket.IO)
    accesos/
      abackend/          # Autenticación y accesos (Express)
    wa-backend/          # Bridge WhatsApp/Baileys (Express)
    env/                 # Templates de configuración por perfil (app)

  n8n/
    docker-compose.yml
    whisper/             # STT — solo usado por n8n
    tesseract/           # OCR — solo usado por n8n
    env/                 # Templates de configuración por perfil (n8n)

  scripts/               # Operación del stack por perfil
  ops/
    docs/                # Diseño, arquitectura, DDL de Postgres
    RUNBOOKS.md          # Guía operativa de referencia rápida
    RELEASE-CHECKLIST.md # Checklist genérico de release
```

## 3. Servicios Core

| Contenedor | Stack | Descripción |
|---|---|---|
| `panel_frontend` | app/agora | Frontend React |
| `api_backend_nest` | app/agora | API REST principal |
| `panel_websocket` | app/agora | WebSocket panel humano |
| `abackend` | app/accesos | Autenticación y accesos |
| `wa-backend` | app/wa-backend | Bridge WhatsApp/Baileys |

## 4. Servicios de Soporte (fuera del repo)

Los siguientes servicios operan con su propio compose en el host, fuera del árbol del repo:

- **Postgres** — BD principal, accedida por DSN (`DATABASE_URL`)
- **Redis** — caché y rate limiting
- **Nginx Proxy Manager** — proxy inverso y TLS
- **Vault** — gestor de secretos (ver sección 7)

Todos se unen a la red Docker compartida `npm_network`.

## 5. Automatización e IA

N8N es completamente autónomo: su compose y env son independientes del stack de app.

- `n8n/` — orquestador de flujos
- `n8n/whisper/` — Speech-to-Text (solo usado por n8n)
- `n8n/tesseract/` — OCR (solo usado por n8n)

## 6. Política de Configuración

Los archivos `*.env` versionados en `app/env/` y `n8n/env/` son **templates con placeholders** — nunca contienen valores reales.

Cada despliegue completa su propia capa de secretos en `*.secrets.env` (ignorados por git).

Convenciones:
- `HOST_BIND_IP` — IP de bind de puertos públicos por entorno
- `*_PUBLIC_URL` — URLs accesibles desde el exterior
- `*_INTERNAL_URL` — URLs internas de red Docker

## 7. Vault

Vault es el gestor centralizado de secretos. Los servicios que lo consumen leen sus variables sensibles desde Vault en arranque, usando AppRole con policy estricta por servicio.

Vault opera fuera del repo (compose propio en el host). En repo solo existe documentación de referencia:

- `ops/docs/DOC-SECRETS-MAP-VAULT.md` — mapa de paths y secretos por servicio
- `ops/docs/DOC-N8N-VAULT-APPROLE.md` — configuración de AppRole para n8n

## 8. Política de Estado Persistente

El repo contiene únicamente configuración declarativa versionada. Todo estado operativo queda en el host:

- Sesiones WhatsApp (`auth/`)
- Datos de n8n
- Uploads y media (almacenados en gestor de objetos S3-compatible, fuera del repo)
- Volúmenes de BD
- Certificados TLS
- Backups y dumps

## 9. Bases de Datos

Las apps consumen Postgres como servicio externo por DSN (`DATABASE_URL`). El repo no incluye compose de BD.

Los DDL necesarios para crear las tablas del sistema están en `ops/docs/*.sql`.

## 10. Ambientes

Perfiles definidos:

| Perfil | Uso |
|---|---|
| `dev.local1` | Desarrollo en máquina local |
| `dev.vps1` | Desarrollo en VPS1 |
| `dev.vps2` | Desarrollo en VPS2 |
| `prod.vps1` | Producción VPS1 |
| `prod.vps2` | Producción VPS2 |

Cada perfil tiene su propio par `<perfil>.env` (template) + `<perfil>.secrets.env` (valores reales, no versionado).
