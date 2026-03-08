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

APP_ENV="${APP_ENV:-dev}"
USE_LOCAL_POSTGRES="${USE_LOCAL_POSTGRES:-}"
USE_LOCAL_MONGO="${USE_LOCAL_MONGO:-}"

if [[ -z "$USE_LOCAL_POSTGRES" ]]; then
  if [[ "$APP_ENV" == "dev" ]]; then USE_LOCAL_POSTGRES="true"; else USE_LOCAL_POSTGRES="false"; fi
fi
if [[ -z "$USE_LOCAL_MONGO" ]]; then
  if [[ "$APP_ENV" == "dev" ]]; then USE_LOCAL_MONGO="true"; else USE_LOCAL_MONGO="false"; fi
fi

project_for_file() {
  case "$1" in
    "accesos/docker-compose.yml") echo "stack_accesos" ;;
    "agora/docker-compose.yml") echo "stack_agora" ;;
    "infraestructura/docker-compose.yml") echo "stack_infra_pgadmin" ;;
    "infraestructura/docker-compose.postgres.yml") echo "stack_infra_postgres" ;;
    "mongo/docker-compose.yml") echo "stack_mongo_micro" ;;
    "mongo/docker-compose.mongo.yml") echo "stack_mongo_db" ;;
    "n8n/docker-compose.yml") echo "stack_n8n" ;;
    "nmp/docker-compose.yml") echo "stack_nmp" ;;
    "redis/docker-compose.yml") echo "stack_redis" ;;
    "tesseract/docker-compose.yml") echo "stack_tesseract" ;;
    "wa-backend/docker-compose.yml") echo "stack_wa_backend" ;;
    "whisper/docker-compose.yml") echo "stack_whisper" ;;
    *) echo "stack_misc" ;;
  esac
}

validate_compose() {
  local file="$1"
  local project
  project="$(project_for_file "$file")"
  echo ">>> config: $file (project=$project)"
  docker compose -p "$project" -f "$ROOT_DIR/$file" config >/dev/null
}

if [[ "$USE_LOCAL_POSTGRES" == "true" ]]; then
  validate_compose "infraestructura/docker-compose.postgres.yml"
fi
if [[ "$USE_LOCAL_MONGO" == "true" ]]; then
  validate_compose "mongo/docker-compose.mongo.yml"
fi

validate_compose "redis/docker-compose.yml"
validate_compose "whisper/docker-compose.yml"
validate_compose "tesseract/docker-compose.yml"
validate_compose "mongo/docker-compose.yml"
validate_compose "infraestructura/docker-compose.yml"
validate_compose "accesos/docker-compose.yml"
validate_compose "agora/docker-compose.yml"
validate_compose "wa-backend/docker-compose.yml"
validate_compose "n8n/docker-compose.yml"
validate_compose "nmp/docker-compose.yml"

echo ""
echo "verify-compose: OK ($PROFILE)"
