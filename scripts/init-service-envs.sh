#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

services=(
  "agora/api-backend-nest"
  "agora/websocket"
  "accesos/abackend"
  "wa-backend"
)

for svc in "${services[@]}"; do
  env_file="$ROOT_DIR/$svc/.env"
  example_file="$ROOT_DIR/$svc/.env.example"

  if [[ -f "$env_file" ]]; then
    echo "OK  $svc/.env ya existe"
    continue
  fi

  if [[ ! -f "$example_file" ]]; then
    echo "WARN $svc/.env.example no existe; se omite"
    continue
  fi

  cp "$example_file" "$env_file"
  echo "NEW $svc/.env creado desde .env.example"
done

echo ""
echo "Listo. Revisa y completa los valores reales antes de levantar servicios."
