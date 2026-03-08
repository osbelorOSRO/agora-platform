# DOC-SECRETS-ESTRATEGIA

Fecha de corte: 2026-03-08

## Objetivo
- Mantener el repo sin secretos.
- Mantener secretos operativos solo en host local/VPS.
- Avanzar gradualmente hacia Vault sin frenar operacion.

## Esquema aplicado
- Perfil publico (versionable): `env/<perfil>.env`
- Perfil secreto (no versionable): `env/<perfil>.secrets.env`
- N8N publico: `n8n/env/<perfil>.env`
- N8N secreto: `n8n/env/<perfil>.secrets.env`

Los scripts (`up/down/status/verify-compose`) priorizan `*.secrets.env`.

## Estado por servicio
- `vault`, `postgres`, `mongo`: operacion fuera de repo.
- `n8n`, `nmp`, `pgadmin`: template en repo, estado y secretos fuera.
- servicios core: `.env` local + `.env.example` en repo.

## Plan para N8N + Vault (pragmatico)
1. Mantener `n8n/env/*.secrets.env` como mecanismo actual estable.
2. Mover gradualmente secretos de N8N a Vault (api keys, passwords, tokens).
3. Antes de iniciar n8n, ejecutar un script bootstrap que:
   - lea secretos desde Vault,
   - genere archivo temporal `n8n/env/<perfil>.secrets.env`,
   - levante n8n,
   - opcionalmente elimine el temporal al detener.

## Pendiente critico inmediato
- Rotar secretos expuestos durante pruebas recientes (tokens, keys, passwords).

