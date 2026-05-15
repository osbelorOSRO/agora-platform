# CLAUDE.md — Agora Platform

## Stack

Monorepo con cuatro servicios principales:

| Contenedor | Descripción | Puerto dev.local1 |
|---|---|---|
| `api_backend_nest` | API REST principal (NestJS) | 4001 |
| `panel_websocket` | WebSocket panel humano (Socket.IO) | 5050 |
| `abackend` | Auth y accesos (Express) | 4002 |
| `wa-backend` | Bridge WhatsApp/Baileys (Express) | 3000 |
| `panel_frontend` | Frontend React (Nginx) | 5173 |

Infra de soporte: Vault, Redis, Postgres — todos en red Docker interna `npm_network`.

## Ambiente de pruebas — dev.local1

- **IP Tailscale de Local1:** `100.110.37.17`
- **Protocolo:** HTTP (sin TLS en dev)
- **Base de curl:** `http://100.110.37.17:<puerto>/ruta`
- El `HOST_BIND_IP` real está en `env/dev.local1.secrets.env`

Ejemplo base:
```bash
curl -s http://100.110.37.17:4001/ping
```

## Auth por servicio

### api_backend_nest (4001)

| Grupo | Header | Valor |
|---|---|---|
| Panel humano | `Authorization` | `Bearer <JWT_PANEL>` |
| N8N | `Authorization` | `Bearer <N8N_SECRET_TOKEN>` |
| Baileys interno | `x-internal-token` | `<BAILEYS_INTERNAL_TOKEN>` |
| N8N callback | `Authorization` | `Bearer <N8N_CALLBACK_SECRET_TOKEN>` |
| Webhook Meta | ninguno (firma HMAC en body) | — |

JWT de panel: se obtiene haciendo POST login contra `abackend` (4002) con credenciales válidas.

### abackend (4002)

| Grupo | Header |
|---|---|
| Rutas protegidas admin | `Authorization: Bearer <JWT_ABACKEND>` |
| Rutas públicas (login, reset) | ninguno |

### wa-backend (3000)

Tráfico interno Docker. No se expone directamente en pruebas manuales.

## Cómo obtener JWT de panel para pruebas

```bash
curl -s -X POST http://100.110.37.17:4002/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"<user>","password":"<pass>","token_2fa":"<6digits>"}'
```

El token devuelto se usa como `Bearer` en las rutas protegidas de `api_backend_nest` y `abackend`.

## Estructura de respuesta esperada por bloque de trabajo

Cada bloque cerrado debe documentarse así (compatible con `ops/private/DOC-SECURITY-HARDENING-MATRIX.md`):

- **Hecho:** lista concreta de cambios aplicados
- **Validación:** comandos exactos para confirmar que funciona
- **Riesgo residual:** qué queda sin cubrir
- **Archivos tocados:** trazabilidad

Cuando termino un bloque, entrego esa estructura — no un resumen narrativo.

## Comandos útiles

```bash
# Ver variables efectivas de un servicio
docker compose -p stack_agora --env-file env/dev.local1.secrets.env -f app/agora/docker-compose.yml config api_backend_nest

# Rebuild de un servicio (dejar arriba)
docker compose -p stack_agora --env-file env/dev.local1.secrets.env -f app/agora/docker-compose.yml up -d --build --force-recreate api_backend_nest

# Logs en vivo
docker logs -f api_backend_nest
docker logs -f abackend
```

## Notas operativas

- `trust proxy` debe estar activo en servicios detrás de Nginx para que rate limit funcione correctamente
- Redis: credenciales en `REDIS_HOST` / `REDIS_PORT` (desde `.env` del servicio) + `REDIS_PASSWORD` (desde secrets)
- Vault: unsealed si el log muestra `✅ Autenticación exitosa con Vault`
- No correr `npm run build` directamente en servidor — build siempre vía Docker
