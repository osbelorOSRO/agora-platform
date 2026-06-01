#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PROFILE="${1:-}"

if [[ -z "$PROFILE" ]]; then
  echo "Uso: $0 <dev.local1|prod.vps1>"
  exit 1
fi

PROFILE_SECRET_FILE="$ROOT_DIR/app/env/${PROFILE}.secrets.env"
PROFILE_PUBLIC_FILE="$ROOT_DIR/app/env/${PROFILE}.env"
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

else
fi

project_for_file() {
  case "$1" in
    "app/agora/docker-compose.yml") echo "stack_agora" ;;
    
    "n8n/docker-compose.yml") echo "stack_n8n" ;;
    
    
    
    "app/wa-backend/docker-compose.yml") echo "stack_wa_backend" ;;
    
    *) echo "stack_misc" ;;
  esac
}

print_compose_ps() {
  local file="$1"
  local project
  project="$(project_for_file "$file")"
  echo "--- $file (project=$project)"
  docker compose -p "$project" -f "$ROOT_DIR/$file" ps || true
}

echo "Perfil: $PROFILE"
echo "HOST_BIND_IP=${HOST_BIND_IP:-unset} APP_ENV=${APP_ENV:-unset} TARGET_HOST=${TARGET_HOST:-unset}"
echo ""

print_compose_ps "app/agora/docker-compose.yml"
print_compose_ps "app/wa-backend/docker-compose.yml"
print_compose_ps "n8n/docker-compose.yml"
