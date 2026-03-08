# DOC-SECRETS-MAP-VAULT

Fecha de corte: 2026-03-08

## Regla base
- En repo (`*.env`, `.env.example`): solo placeholders de acceso a Vault.
  - `VAULT_ADDR`
  - `VAULT_ROLE_ID`
  - `VAULT_SECRET_ID`
- No dejar en repo tokens, passwords, API keys, access tokens ni DSN con credenciales.

## Convencion de paths en Vault
- Base por servicio:
  - `secret/data/agora/api-backend-nest`
  - `secret/data/agora/websocket`
  - `secret/data/accesos/abackend`
  - `secret/data/wa-backend`
  - `secret/data/n8n/<perfil>` (bootstrap)

Opcional por entorno:
- `secret/data/<entorno>/<servicio>`
- Ejemplo: `secret/data/prod.vps1/agora/api-backend-nest`

## Mapa de secretos a migrar

### 1) accesos/abackend
Path sugerido:
- `secret/data/accesos/abackend`

Keys:
- `DATABASE_URL`

### 2) agora/api-backend-nest
Path sugerido:
- `secret/data/agora/api-backend-nest`

Keys:
- `DATABASE_URL`
- `MONGODB_URI`
- `REDIS_PASSWORD`
- `API_KEY_WS`
- `N8N_SECRET_TOKEN`
- `N8N_CALLBACK_SECRET_TOKEN`
- `N8N_API_KEY`
- `BOT_TOKEN_SECRET`
- `META_PAGE_ACCESS_TOKEN`
- `META_INSTAGRAM_ACCESS_TOKEN`
- `META_VERIFY_TOKEN`
- `META_IG_VERIFY_TOKEN`

### 3) agora/websocket
Path sugerido:
- `secret/data/agora/websocket`

Keys:
- `API_KEY_WS`

### 4) wa-backend
Path sugerido:
- `secret/data/wa-backend`

Keys:
- `TOKEN_ENDPOINT_SECRET` (si se usa en runtime)

Nota:
- llaves RSA/socket ya van por Vault y se mantienen ahi.

### 5) n8n (via bootstrap AppRole)
Path por perfil:
- `secret/data/n8n/dev.local1`
- `secret/data/n8n/dev.vps1`
- `secret/data/n8n/dev.vps2`
- `secret/data/n8n/prod.vps1`
- `secret/data/n8n/prod.vps2`

Keys:
- `N8N_BASIC_AUTH_USER`
- `N8N_BASIC_AUTH_PASSWORD`
- `N8N_API_KEY_X`
- `N8N_CUSTOM_SECRET_KEY`
- `N8N_API_KEY_CALLBACK`

## Checklist de adopcion (host nuevo / repo fuera de este equipo)
1. Crear roles/policies AppRole por servicio.
2. Cargar secretos en los paths definidos.
3. Mantener en `.secrets.env` solo:
   - `VAULT_ADDR`
   - `VAULT_ROLE_ID`
   - `VAULT_SECRET_ID`
4. Ejecutar bootstrap de n8n:
   - `./ops/scripts/n8n-vault-bootstrap.sh <perfil>`
5. Levantar stack:
   - `./scripts/up-profile.sh <perfil>`
6. Verificar:
   - `./scripts/verify-env.sh <perfil>`
   - `./scripts/verify-compose.sh <perfil>`
   - `./scripts/smoke-core.sh <perfil>`

