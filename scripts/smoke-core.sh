#!/usr/bin/env bash
set -euo pipefail

PROFILE="${1:-}"
if [[ -z "$PROFILE" ]]; then
  echo "Uso: $0 <dev.local1|dev.vps1|dev.vps2|prod.vps1|prod.vps2>"
  exit 1
fi

containers=(
  api_backend_nest
  panel_websocket
  abackend
  wa_backend
  fastapi_microservicio
  n8n
  redis-server
)

fail=0
for c in "${containers[@]}"; do
  if ! docker inspect "$c" >/dev/null 2>&1; then
    echo "[FAIL] contenedor no existe: $c"
    fail=1
    continue
  fi

  running="$(docker inspect -f '{{.State.Running}}' "$c")"
  if [[ "$running" != "true" ]]; then
    echo "[FAIL] contenedor no está running: $c"
    fail=1
  else
    echo "[OK] running: $c"
  fi

  health="$(docker inspect -f '{{if .State.Health}}{{.State.Health.Status}}{{else}}none{{end}}' "$c")"
  if [[ "$health" == "unhealthy" ]]; then
    echo "[FAIL] unhealthy: $c"
    fail=1
  elif [[ "$health" == "healthy" ]]; then
    echo "[OK] healthy: $c"
  else
    echo "[INFO] healthcheck no definido: $c"
  fi
done

echo ""
if ! docker network inspect npm_network >/dev/null 2>&1; then
  echo "[FAIL] red no existe: npm_network"
  fail=1
else
  echo "[OK] red existe: npm_network"
fi

if [[ "$fail" -ne 0 ]]; then
  echo ""
  echo "smoke-core: FALLÓ ($PROFILE)"
  exit 1
fi

echo ""
echo "smoke-core: OK ($PROFILE)"
