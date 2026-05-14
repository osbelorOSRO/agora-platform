# DOC-SECRETS-ESTRATEGIA

## Objetivo
- Mantener el repo sin secretos.
- Mantener secretos operativos solo en el host de cada ambiente.
- Avanzar gradualmente hacia Vault sin frenar operacion.

## Esquema aplicado
- Perfil publico (versionable): `app/env/<perfil>.env`
- Perfil secreto (no versionable): `app/env/<perfil>.secrets.env`
- N8N publico: `n8n/env/<perfil>.env`
- N8N secreto: `n8n/env/<perfil>.secrets.env`

Los scripts (`up/down/status/verify-compose`) priorizan `*.secrets.env`.

## Estado por servicio
- `vault`, `postgres`, `redis`: operan fuera del repo (compose propio en el host).
- `n8n`, `whisper`, `tesseract`: template en repo (`n8n/`), estado y secretos fuera.
- Servicios core (`api-backend-nest`, `websocket`, `abackend`, `wa-backend`, `frontend`): `.env` local por servicio (no versionado).

## Plan para N8N + Vault (pragmatico)
1. Mantener `n8n/env/*.secrets.env` como mecanismo actual estable.
2. Mover gradualmente secretos de N8N a Vault (api keys, passwords, tokens).
3. Antes de iniciar n8n, ejecutar un script bootstrap que:
   - lea secretos desde Vault,
   - genere archivo temporal `n8n/env/<perfil>.secrets.env`,
   - levante n8n,
   - opcionalmente elimine el temporal al detener.

