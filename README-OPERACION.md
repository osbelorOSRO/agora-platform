# Operacion de Stack por Perfil

## Version
- Actual: `v1.6.0` (2026-05-20)
- Al hacer release: actualizar versión aquí y en `README.md`, y crear tag `vX.Y.Z`.

Scripts:
- `scripts/up-profile.sh`
- `scripts/down-profile.sh`
- `scripts/status-profile.sh`
- `scripts/verify-env.sh`
- `scripts/verify-compose.sh`
- `scripts/smoke-core.sh`
- `scripts/reload-core-with-vault.sh`

Perfiles disponibles:
- `dev.local1`
- `dev.vps1`
- `dev.vps2`
- `prod.vps1`
- `prod.vps2`

## Modelo de archivos env

El repo separa los env en dos grupos independientes:

**App** (agora, accesos, wa-backend):
- Template: `app/env/<perfil>.env`
- Secretos locales: `app/env/<perfil>.secrets.env`

**N8N** (n8n, whisper, tesseract):
- Template: `n8n/env/<perfil>.env`
- Secretos locales: `n8n/env/<perfil>.secrets.env`

Los scripts usan prioridad: `*.secrets.env` > `*.env`.

Inicializacion recomendada en un host nuevo:
```bash
cp app/env/dev.local1.env app/env/dev.local1.secrets.env
cp n8n/env/dev.local1.env n8n/env/dev.local1.secrets.env
# luego editar *.secrets.env con valores reales
```

Si faltan `.env` no versionados de servicios (api/websocket/abackend/wa-backend):
```bash
./scripts/init-service-envs.sh
```
Luego completar valores reales antes de validar o levantar.

## Servicios externos al repo

Los siguientes servicios operan con su propio compose fuera del repo y se unen a `npm_network`:

- **Postgres**: compose en el host, fuera del repo
- **Redis**: compose propio en el host, levantar desde la ruta donde este ubicado
- **Nginx Proxy Manager**: compose propio en el host, levantar desde la ruta donde este ubicado

La red Docker compartida debe existir antes de levantar cualquier stack:
```bash
docker network create npm_network
```
(el script `up-profile.sh` la crea automaticamente si no existe)

## N8N con Vault (sin token root)
Script:
- `ops/scripts/n8n-vault-bootstrap.sh <perfil>`
- `scripts/reload-core-with-vault.sh <perfil>` (recomendado para recarga de `api_backend_nest`, `websocket`, `n8n`)

Uso:
```bash
export VAULT_ADDR=http://<host_bind_ip>:8200
export VAULT_ROLE_ID=<role_id>
export VAULT_SECRET_ID=<secret_id>

./ops/scripts/n8n-vault-bootstrap.sh dev.local1
./scripts/reload-core-with-vault.sh dev.local1
```

Documentacion de policy/role:
- `ops/docs/DOC-N8N-VAULT-APPROLE.md`

## Vault compartido entre `api_backend_nest` y `websocket`
`API_KEY_WS` es una clave de comunicacion interna. Debe existir con el mismo valor en ambos paths de Vault.

Paths esperados en `prod.vps1`:
- `secret/data/prod.vps1/agora/api-backend-nest`
- `secret/data/prod.vps1/agora/websocket`

Comando operativo en VPS1, ejecutado dentro del contenedor de Vault:
```bash
sudo docker exec -i \
  -e VAULT_ADDR=http://127.0.0.1:8200 \
  -e VAULT_TOKEN="$VAULT_TOKEN" \
  vault sh -lc '
    set -euo pipefail
    secret="${API_KEY_WS:?export API_KEY_WS antes de ejecutar}"
    vault kv patch secret/prod.vps1/agora/api-backend-nest API_KEY_WS="$secret"
    vault kv patch secret/prod.vps1/agora/websocket API_KEY_WS="$secret"
  '
```

Notas:
- `vault kv patch` evita borrar otros campos ya existentes en el secreto.
- Si el path no existe todavia, crear primero con `vault kv put` y luego usar `vault kv patch`.
- Repetir el mismo valor en ambos paths; no son dos claves distintas.

## Arrancar
```bash
cd <repo_root>
./scripts/up-profile.sh dev.local1
```

## Estado
```bash
cd <repo_root>
./scripts/status-profile.sh dev.local1
```

## Validar antes de deploy
```bash
cd <repo_root>
./scripts/verify-env.sh dev.local1
./scripts/verify-compose.sh dev.local1
./scripts/smoke-core.sh dev.local1
```

## Detener
```bash
cd <repo_root>
./scripts/down-profile.sh dev.local1
```

## N8N por perfil
`n8n/docker-compose.yml` es independiente del env de app. Toma su propia configuracion desde:
- `n8n/env/<perfil>.secrets.env` (si existe)
- `n8n/env/<perfil>.env` (fallback)

Cada archivo de env de n8n incluye `HOST_BIND_IP`, `N8N_DATA_TYPE`, `N8N_DATA_VOLUME` y `N8N_ENV_FILE` — no depende del env global de app.

Para levantar n8n de forma independiente:
```bash
docker compose -p stack_n8n --env-file n8n/env/prod.vps1.secrets.env -f n8n/docker-compose.yml up -d
```
