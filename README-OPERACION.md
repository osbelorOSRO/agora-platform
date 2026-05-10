# Operacion de Stack por Perfil

## Version
- Actual: `v1.3.4` (2026-05-10)
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
- Repo (sin secretos): `env/<perfil>.env` y `n8n/env/<perfil>.env`
- Local privado (con secretos): `env/<perfil>.secrets.env` y `n8n/env/<perfil>.secrets.env`
- Los scripts usan prioridad:
1. `*.secrets.env`
2. `*.env`

Inicializacion recomendada en un host nuevo:
```bash
cp env/dev.local1.env env/dev.local1.secrets.env
cp n8n/env/dev.local1.env n8n/env/dev.local1.secrets.env
# luego editar *.secrets.env con valores reales
```

Si faltan `.env` no versionados de servicios (api/websocket/abackend/wa-backend):
```bash
./scripts/init-service-envs.sh
```
Luego completar valores reales antes de validar o levantar.

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

## Compose en repo
- PgAdmin: `infraestructura/docker-compose.yml`

Nota:
- Compose de BD (`postgres`) queda fuera del repo y se opera externamente por host.
- Desde `v1.3.0`, el nucleo conversacional opera solo sobre `threads`, `thread_messages`, `thread_events` y `meta_inbox_contacts`

## N8N por perfil
`n8n/docker-compose.yml` toma env exclusivo por perfil desde:
- `n8n/env/dev.local1.env`
- `n8n/env/dev.vps1.env`
- `n8n/env/dev.vps2.env`
- `n8n/env/prod.vps1.env`
- `n8n/env/prod.vps2.env`

Si existe `n8n/env/<perfil>.secrets.env`, se usa ese archivo automaticamente.
