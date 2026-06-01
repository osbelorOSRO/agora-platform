# DOC-SECRETS-MAP-VAULT

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
  - `secret/data/wa-backend`
  - `secret/data/n8n/<perfil>` (bootstrap)

Opcional por entorno:
- `secret/data/<entorno>/<servicio>`
- Ejemplo: `secret/data/prod.vps1/agora/api-backend-nest`

## Mapa de secretos a migrar

### 1) agora/api-backend-nest
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

Nota:
- `api-backend-nest` lee `API_KEY_WS` desde su propio `VAULT_APP_SECRETS_PATH`.
- El mismo valor puede existir tambien en el path del websocket, pero el backend no consulta el path del websocket.

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
Path por perfil (solo dos perfiles):
- `secret/data/n8n/dev.local1`
- `secret/data/n8n/prod.vps1`

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
