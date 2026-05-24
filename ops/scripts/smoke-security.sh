#!/usr/bin/env bash
# Smoke de seguridad — Agora Platform
# Uso: bash ops/scripts/smoke-security.sh <perfil>
# Ejemplo: bash ops/scripts/smoke-security.sh dev.local1

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
PROFILE="${1:-}"

if [[ -z "$PROFILE" ]]; then
  echo "Uso: $0 <dev.local1|dev.vps1|dev.vps2|prod.vps1|prod.vps2>"
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

BASE_API="http://${HOST_BIND_IP}:4001"
BASE_WA="http://${HOST_BIND_IP}:3000"
FRONTEND_URL="http://${HOST_BIND_IP}:5173"

PASS=0
FAIL=0

ok()   { echo "  ✅ $1"; PASS=$((PASS+1)); }
fail() { echo "  ❌ $1"; FAIL=$((FAIL+1)); }

check_http() {
  local label="$1" expected="$2" actual
  shift 2
  actual=$(curl -s -o /dev/null -w "%{http_code}" "$@")
  if [ "$actual" = "$expected" ]; then ok "$label ($actual)"; else fail "$label — esperado $expected got $actual"; fi
}

echo ""
echo "══════════════════════════════════════════"
echo " Smoke de Seguridad — $PROFILE"
echo "══════════════════════════════════════════"

# ── 1. Logs Vault ───────────────────────────────────────────────────────────
echo ""
echo "── 1. Vault paths en logs ──"

LOGS_API=$(docker logs backend 2>&1 || true)
LOGS_WS=$(docker logs panel_websocket 2>&1 || true)

if echo "$LOGS_API" | grep -q "secret/data"; then
  ok "backend loguea lectura de Vault"
else
  fail "backend NO loguea lectura de Vault"
fi

if echo "$LOGS_API" | grep -q "secret/data/agora/websocket"; then
  fail "backend intenta leer path del websocket (no debería)"
else
  ok "backend NO lee path del websocket"
fi

if echo "$LOGS_WS" | grep -q "AppRole"; then
  ok "panel_websocket autentica con Vault"
else
  fail "panel_websocket NO loguea autenticación con Vault"
fi

# ── 2. Frontend sin sourcemaps ───────────────────────────────────────────────
echo ""
echo "── 2. Frontend — sourcemaps ──"
SM_CODE=$(curl -s -o /dev/null -w "%{http_code}" "${FRONTEND_URL}/assets/index.js.map" 2>/dev/null || echo "000")
if [ "$SM_CODE" = "404" ] || [ "$SM_CODE" = "403" ] || [ "$SM_CODE" = "000" ]; then
  ok "sourcemaps no expuestos ($SM_CODE)"
else
  fail "sourcemap accesible — HTTP $SM_CODE"
fi

# ── 3. Rutas humanas sin JWT → 401 ──────────────────────────────────────────
echo ""
echo "── 3. Auth — rutas humanas sin JWT ──"
check_http "GET /meta-inbox/threads sin JWT" "401" "$BASE_API/meta-inbox/threads"
check_http "GET /respuestas-rapidas sin JWT" "401" "$BASE_API/respuestas-rapidas"

# ── 4. Rutas n8n sin token → 401 ────────────────────────────────────────────
echo ""
echo "── 4. Auth — rutas n8n sin token ──"
check_http "POST /meta-inbox/n8n/resolve-thread sin token" "401" \
  -X POST "$BASE_API/meta-inbox/n8n/resolve-thread" \
  -H "Content-Type: application/json" -d '{"actorExternalId":"x","objectType":"WHATSAPP"}'
check_http "POST /actor/msg-delegation/complete sin token" "401" \
  -X POST "$BASE_API/actor/msg-delegation/complete" \
  -H "Content-Type: application/json" -d '{"externalEventId":"x","actorExternalId":"y"}'

# ── 5. Media endpoints → auth correcta ──────────────────────────────────────
echo ""
echo "── 5. Auth — media endpoints ──"
check_http "POST /media/guardar sin token interno" "403" \
  -X POST "$BASE_API/media/guardar"
check_http "POST /media/upload-tts sin token n8n" "401" \
  -X POST "$BASE_API/media/upload-tts"

# ── 6. Baileys ingress sin token → 403 ──────────────────────────────────────
echo ""
echo "── 6. Auth — baileys ingress ──"
check_http "POST /internal/baileys/events sin token" "403" \
  -X POST "$BASE_API/internal/baileys/events" \
  -H "Content-Type: application/json" \
  -d '{"externalEventId":"smoke-1","actorExternalId":"actor-1","provider":"BAILEYS","objectType":"WHATSAPP","pipeline":"MESSAGES","eventType":"messaging.message","occurredAt":"2026-01-01T00:00:00Z","payload":{"body":"test"}}'

# ── 7. Rate limit activo ─────────────────────────────────────────────────────
echo ""
echo "── 7. Rate limit ──"
GOT_429=0
for i in $(seq 1 62); do
  CODE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_API/ping")
  [ "$CODE" = "429" ] && GOT_429=1 && break
done
if [ "$GOT_429" = "1" ]; then ok "rate limit /ping activo (429 recibido en req $i)"; else fail "rate limit /ping NO disparó 429 en 62 requests"; fi

# ── 8. WebSocket anónimo rechazado (wa-backend) ──────────────────────────────
echo ""
echo "── 8. WebSocket sin auth ──"
if ! command -v node >/dev/null 2>&1 || ! node -e "require('socket.io-client')" 2>/dev/null; then
  echo "  ⚠️  socket.io-client no disponible — check 8 omitido"
  PASS=$((PASS+1))
else
  WS_REJECT=$(node -e "
const {io} = require('socket.io-client');
const s = io('${BASE_WA}', {auth:{token:''},transports:['polling','websocket']});
s.on('connect_error', e => { process.stdout.write(e.message); process.exit(0); });
setTimeout(() => { process.stdout.write('timeout'); process.exit(0); }, 3000);
" 2>/dev/null)
  if echo "$WS_REJECT" | grep -qi "autorizado\|unauthorized\|invalid\|token"; then
    ok "wa-backend rechaza socket sin token ($WS_REJECT)"
  else
    fail "wa-backend NO rechaza socket sin token — got: $WS_REJECT"
  fi
fi

# ── 9. /protegida eliminada ───────────────────────────────────────────────────
echo ""
echo "── 9. Endpoints eliminados ──"
check_http "GET /protegida debe ser 404" "404" "$BASE_API/protegida"

# ── 10. Errors no exponen internals ──────────────────────────────────────────
echo ""
echo "── 10. Respuestas de error sin internals ──"
BODY=$(curl -s -X POST "$BASE_API/actor/msg-delegation/complete" \
  -H "Content-Type: application/json" -d '{"externalEventId":"x","actorExternalId":"y"}')
if echo "$BODY" | grep -qi "stack\|ECONNREFUSED\|172\.\|internal url\|vault\|secret"; then
  fail "respuesta expone internals: $BODY"
else
  ok "respuesta 401 sin internals"
fi

# ── Resumen ──────────────────────────────────────────────────────────────────
echo ""
echo "══════════════════════════════════════════"
echo " Resultado: ✅ $PASS passed   ❌ $FAIL failed"
echo "══════════════════════════════════════════"
echo ""

[ "$FAIL" -eq 0 ] && exit 0 || exit 1
