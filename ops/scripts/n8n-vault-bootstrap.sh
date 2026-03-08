#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
PROFILE="${1:-}"

if [[ -z "$PROFILE" ]]; then
  echo "Uso: $0 <dev.local1|dev.vps1|dev.vps2|prod.vps1|prod.vps2>"
  exit 1
fi

PUBLIC_ENV="$ROOT_DIR/n8n/env/${PROFILE}.env"
SECRETS_ENV="$ROOT_DIR/n8n/env/${PROFILE}.secrets.env"
PROFILE_PUBLIC_FILE="$ROOT_DIR/env/${PROFILE}.env"
PROFILE_SECRET_FILE="$ROOT_DIR/env/${PROFILE}.secrets.env"

if [[ ! -f "$PUBLIC_ENV" ]]; then
  echo "No existe archivo base: $PUBLIC_ENV"
  exit 1
fi

# Carga automatica de contexto por perfil (si existe), para no depender de exports manuales.
if [[ -f "$PROFILE_SECRET_FILE" ]]; then
  set -a
  source "$PROFILE_SECRET_FILE"
  set +a
elif [[ -f "$PROFILE_PUBLIC_FILE" ]]; then
  set -a
  source "$PROFILE_PUBLIC_FILE"
  set +a
fi

if [[ -f "$SECRETS_ENV" ]]; then
  set -a
  source "$SECRETS_ENV"
  set +a
elif [[ -f "$PUBLIC_ENV" ]]; then
  set -a
  source "$PUBLIC_ENV"
  set +a
fi

# Si no viene explicitamente, tomar endpoint de perfil.
if [[ -z "${VAULT_ADDR:-}" ]]; then
  VAULT_ADDR="${VAULT_PUBLIC_URL:-${VAULT_INTERNAL_URL:-}}"
fi

required_bootstrap_env=(
  VAULT_ADDR
  VAULT_ROLE_ID
  VAULT_SECRET_ID
)

for v in "${required_bootstrap_env[@]}"; do
  if [[ -z "${!v:-}" ]]; then
    echo "Falta variable de entorno: $v"
    exit 1
  fi
  if [[ "${!v}" == *"<"*">"* ]]; then
    echo "Variable invalida (placeholder): $v=${!v}"
    exit 1
  fi
done

# KV v2 recomendado: secret/data/n8n/<profile>
VAULT_N8N_SECRET_PATH="${VAULT_N8N_SECRET_PATH:-secret/data/n8n/$PROFILE}"

echo ">>> login AppRole en Vault"
LOGIN_JSON="$(curl -fsS \
  -X POST \
  -H "Content-Type: application/json" \
  -d "{\"role_id\":\"$VAULT_ROLE_ID\",\"secret_id\":\"$VAULT_SECRET_ID\"}" \
  "$VAULT_ADDR/v1/auth/approle/login")"

VAULT_TOKEN="$(python3 - <<'PY' "$LOGIN_JSON"
import json, sys
data = json.loads(sys.argv[1])
print(data.get("auth", {}).get("client_token", ""))
PY
)"

if [[ -z "$VAULT_TOKEN" ]]; then
  echo "No se pudo obtener client_token desde AppRole login"
  exit 1
fi

echo ">>> leyendo secreto de Vault: $VAULT_N8N_SECRET_PATH"
SECRET_JSON="$(curl -fsS \
  -H "X-Vault-Token: $VAULT_TOKEN" \
  "$VAULT_ADDR/v1/$VAULT_N8N_SECRET_PATH")"

read_secret_field() {
  local key="$1"
  python3 - <<'PY' "$SECRET_JSON" "$key"
import json, sys
payload = json.loads(sys.argv[1])
key = sys.argv[2]

# KV v2: data.data.<key>
if isinstance(payload.get("data"), dict) and isinstance(payload["data"].get("data"), dict):
    value = payload["data"]["data"].get(key, "")
else:
    # KV v1: data.<key>
    value = payload.get("data", {}).get(key, "")

print("" if value is None else str(value))
PY
}

upsert_env_var() {
  local file="$1"
  local key="$2"
  local value="$3"
  local tmp
  tmp="$(mktemp)"
  awk -v k="$key" -v v="$value" -F= '
    BEGIN { updated = 0 }
    $1 == k { print k "=" v; updated = 1; next }
    { print $0 }
    END { if (!updated) print k "=" v }
  ' "$file" > "$tmp"
  mv "$tmp" "$file"
}

echo ">>> generando $SECRETS_ENV"
cp "$PUBLIC_ENV" "$SECRETS_ENV"
chmod 600 "$SECRETS_ENV"

secret_keys=(
  N8N_BASIC_AUTH_USER
  N8N_BASIC_AUTH_PASSWORD
  N8N_API_KEY_X
  N8N_CUSTOM_SECRET_KEY
  N8N_API_KEY_CALLBACK
)

for key in "${secret_keys[@]}"; do
  value="$(read_secret_field "$key")"
  if [[ -z "$value" ]]; then
    echo "Falta key en Vault: $key"
    exit 1
  fi
  upsert_env_var "$SECRETS_ENV" "$key" "$value"
done

unset VAULT_TOKEN

echo "Bootstrap n8n listo: $SECRETS_ENV"
