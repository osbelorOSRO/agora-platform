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

N8N_SECRET_FILE="$ROOT_DIR/n8n/env/${PROFILE}.secrets.env"
N8N_PUBLIC_FILE="$ROOT_DIR/n8n/env/${PROFILE}.env"
if [[ -f "$N8N_SECRET_FILE" ]]; then
  N8N_ENV_FILE="./env/${PROFILE}.secrets.env"
else
  N8N_ENV_FILE="./env/${PROFILE}.env"
fi

echo ">>> perfil: $PROFILE"
echo ">>> env app: $PROFILE_FILE"
echo ">>> env n8n: $N8N_ENV_FILE"

(
  cd "$ROOT_DIR"
  ./ops/scripts/n8n-vault-bootstrap.sh "$PROFILE"
)

(
  cd "$ROOT_DIR"
  docker compose --env-file "$PROFILE_FILE" -f agora/docker-compose.yml up -d --force-recreate api_backend_nest websocket
)

(
  cd "$ROOT_DIR"
  N8N_ENV_FILE="$N8N_ENV_FILE" docker compose --env-file "$PROFILE_FILE" -f n8n/docker-compose.yml up -d --force-recreate n8n
)

echo "OK: api_backend_nest + websocket + n8n recargados para $PROFILE"
