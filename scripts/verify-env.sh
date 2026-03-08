#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PROFILE="${1:-}"

if [[ -z "$PROFILE" ]]; then
  echo "Uso: $0 <dev.local1|dev.vps1|dev.vps2|prod.vps1|prod.vps2>"
  exit 1
fi

PROFILE_SECRET_FILE="$ROOT_DIR/env/${PROFILE}.secrets.env"
PROFILE_PUBLIC_FILE="$ROOT_DIR/env/${PROFILE}.env"
if [[ -f "$PROFILE_SECRET_FILE" ]]; then
  PROFILE_FILE="$PROFILE_SECRET_FILE"
elif [[ -f "$PROFILE_PUBLIC_FILE" ]]; then
  PROFILE_FILE="$PROFILE_PUBLIC_FILE"
else
  echo "Perfil no encontrado: $PROFILE_SECRET_FILE o $PROFILE_PUBLIC_FILE"
  exit 1
fi

set -a
source "$PROFILE_FILE"
set +a

required_vars=(
  APP_ENV TARGET_HOST HOST_BIND_IP DOMAIN_BASE HTTP_SCHEME WS_SCHEME
  FRONTEND_PUBLIC_URL API_PUBLIC_URL ABACKEND_PUBLIC_URL WS_PUBLIC_URL N8N_PUBLIC_URL WA_PUBLIC_URL
  API_INTERNAL_URL ABACKEND_INTERNAL_URL WS_INTERNAL_URL N8N_INTERNAL_URL WA_INTERNAL_URL
  VAULT_INTERNAL_URL REDIS_INTERNAL_URL MICROSERVICIO_INTERNAL_URL WHISPER_INTERNAL_URL TESSERACT_INTERNAL_URL
  MEDIA_BASE_URL SOCKET_HTTP_PUBLIC_URL GATEWAY_BASE_URL SERVICE_ALLOWED_IPS
  API_DATABASE_URL ABACKEND_DATABASE_URL API_MONGODB_URI MICROSERVICIO_MONGO_URI
)

fail=0
for v in "${required_vars[@]}"; do
  if [[ -z "${!v:-}" ]]; then
    echo "[FAIL] variable faltante: $v"
    fail=1
  fi
done

check_prefix() {
  local name="$1"
  local value="${!name:-}"
  local prefix="$2"
  if [[ -n "$value" && "$value" != "$prefix"* ]]; then
    echo "[FAIL] $name debe iniciar con $prefix -> actual: $value"
    fail=1
  fi
}

check_prefix API_DATABASE_URL "postgresql://"
check_prefix ABACKEND_DATABASE_URL "postgresql://"
check_prefix API_MONGODB_URI "mongodb://"
check_prefix MICROSERVICIO_MONGO_URI "mongodb://"

sensitive_vars=(
  API_DATABASE_URL
  ABACKEND_DATABASE_URL
  API_MONGODB_URI
  MICROSERVICIO_MONGO_URI
)

for v in "${sensitive_vars[@]}"; do
  if [[ "${!v:-}" == *"<"*">"* ]]; then
    echo "[FAIL] $v contiene placeholder; usa archivo *.secrets.env"
    fail=1
  fi
done

if [[ "${APP_ENV:-}" == "prod" ]]; then
  if [[ "${HTTP_SCHEME:-}" != "https" ]]; then
    echo "[FAIL] en prod HTTP_SCHEME debe ser https"
    fail=1
  fi
  if [[ "${WS_SCHEME:-}" != "wss" ]]; then
    echo "[FAIL] en prod WS_SCHEME debe ser wss"
    fail=1
  fi
fi

if [[ "$fail" -ne 0 ]]; then
  echo ""
  echo "verify-env: FALLÓ para perfil $PROFILE"
  exit 1
fi

echo "verify-env: OK ($PROFILE)"
