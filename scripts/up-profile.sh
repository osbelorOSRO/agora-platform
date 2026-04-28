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

N8N_SECRET_FILE="$ROOT_DIR/n8n/env/${PROFILE}.secrets.env"
N8N_PUBLIC_FILE="$ROOT_DIR/n8n/env/${PROFILE}.env"
if [[ -f "$N8N_SECRET_FILE" ]]; then
  export N8N_ENV_FILE="$N8N_SECRET_FILE"
else
  export N8N_ENV_FILE="$N8N_PUBLIC_FILE"
fi

project_for_file() {
  case "$1" in
    "accesos/docker-compose.yml") echo "stack_accesos" ;;
    "agora/docker-compose.yml") echo "stack_agora" ;;
    "infraestructura/docker-compose.yml") echo "stack_infra_pgadmin" ;;
    "n8n/docker-compose.yml") echo "stack_n8n" ;;
    "nmp/docker-compose.yml") echo "stack_nmp" ;;
    "redis/docker-compose.yml") echo "stack_redis" ;;
    "tesseract/docker-compose.yml") echo "stack_tesseract" ;;
    "wa-backend/docker-compose.yml") echo "stack_wa_backend" ;;
    "whisper/docker-compose.yml") echo "stack_whisper" ;;
    *) echo "stack_misc" ;;
  esac
}

compose_up() {
  local file="$1"
  local project
  project="$(project_for_file "$file")"
  echo ">>> up: $file (project=$project)"
  docker compose -p "$project" -f "$ROOT_DIR/$file" up -d
}

if ! docker network inspect npm_network >/dev/null 2>&1; then
  echo ">>> creating docker network: npm_network"
  docker network create npm_network >/dev/null
fi

compose_up "redis/docker-compose.yml"
compose_up "whisper/docker-compose.yml"
compose_up "tesseract/docker-compose.yml"
compose_up "infraestructura/docker-compose.yml"
compose_up "accesos/docker-compose.yml"
compose_up "agora/docker-compose.yml"
compose_up "wa-backend/docker-compose.yml"
compose_up "n8n/docker-compose.yml"
compose_up "nmp/docker-compose.yml"

echo ""
echo "Perfil cargado: $PROFILE"
echo "HOST_BIND_IP=${HOST_BIND_IP:-unset} APP_ENV=${APP_ENV:-unset} TARGET_HOST=${TARGET_HOST:-unset}"
echo "Stack arriba."
