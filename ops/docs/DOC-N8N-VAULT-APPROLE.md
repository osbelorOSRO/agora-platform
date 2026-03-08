# DOC-N8N-VAULT-APPROLE

## Objetivo
- Permitir que bootstrap de n8n lea secretos desde Vault sin usar token root.
- Usar AppRole con permisos de solo lectura por perfil.

## 1) Estructura de secretos en Vault
Recomendado (KV v2):
- `secret/data/n8n/dev.local1`
- `secret/data/n8n/dev.vps1`
- `secret/data/n8n/dev.vps2`
- `secret/data/n8n/prod.vps1`
- `secret/data/n8n/prod.vps2`

Keys esperadas dentro de cada secreto:
- `N8N_BASIC_AUTH_USER`
- `N8N_BASIC_AUTH_PASSWORD`
- `N8N_API_KEY_X`
- `N8N_CUSTOM_SECRET_KEY`
- `N8N_API_KEY_CALLBACK`

## 2) Policy minima (solo lectura n8n)
```hcl
path "secret/data/n8n/*" {
  capabilities = ["read"]
}
path "secret/metadata/n8n/*" {
  capabilities = ["read", "list"]
}
```

## 3) Crear policy + AppRole (comando admin)
Ejecutar como admin de Vault (manual, no en scripts de app):
```bash
vault policy write n8n-reader n8n-reader.hcl
vault auth enable approle || true
vault write auth/approle/role/n8n-services \
  token_policies="n8n-reader" \
  token_ttl="1h" \
  token_max_ttl="4h" \
  secret_id_ttl="24h"
```

Obtener credenciales del role:
```bash
vault read auth/approle/role/n8n-services/role-id
vault write -f auth/approle/role/n8n-services/secret-id
```

## 4) Bootstrap sin token root
Usar script:
- `ops/scripts/n8n-vault-bootstrap.sh <perfil>`
- `scripts/reload-core-with-vault.sh <perfil>` (bootstrap + recreate de servicios core)

Variables requeridas:
- `VAULT_ADDR`
- `VAULT_ROLE_ID`
- `VAULT_SECRET_ID`
- Opcional: `VAULT_N8N_SECRET_PATH` (default `secret/data/n8n/<perfil>`)

Nota:
- Si no exportas `VAULT_ADDR`, el script intenta usar `VAULT_PUBLIC_URL` o `VAULT_INTERNAL_URL` del `env/<perfil>.env`.
- El script debe ejecutarse en host (no dentro de contenedor): `cd /home/oscar/dev/proyectos`.

Ejemplo:
```bash
export VAULT_ADDR=http://100.101.61.94:8200
export VAULT_ROLE_ID=<role_id_n8n_services>
export VAULT_SECRET_ID=<secret_id_n8n_services>

./ops/scripts/n8n-vault-bootstrap.sh dev.local1
./scripts/reload-core-with-vault.sh dev.local1
```

## 5) Seguridad operacional
- No guardar `VAULT_ROLE_ID/SECRET_ID` en repo.
- Guardarlos en archivo local ignorado por git o variable de entorno de host.
- Rotar `secret_id` periodicamente.
