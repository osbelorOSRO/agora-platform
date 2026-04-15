#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

echo "== prepush-audit: repo root =="
pwd

HAS_GIT_ROOT=0
if [[ ! -d .git ]]; then
  echo "[WARN] No existe .git en raiz. Inicializa repo aqui antes de push."
else
  HAS_GIT_ROOT=1
fi

echo ""
echo "== prepush-audit: nested .git =="
NESTED_GIT="$( (find . -mindepth 2 -type d -name .git -not -path './.git' 2>/dev/null || true) | sed 's#^\./##')"
if [[ -n "$NESTED_GIT" ]]; then
  echo "[WARN] Se encontraron repos anidados:"
  echo "$NESTED_GIT"
  echo "      Recomendado: remover esos .git antes de monorepo push."
else
  echo "[OK] Sin .git anidados."
fi

echo ""
echo "== prepush-audit: archivos sensibles no ignorados =="
if [[ "$HAS_GIT_ROOT" -eq 1 ]]; then
  SENSITIVE_LIST="$(find . -type f \
    \( -name '*.secrets.env' -o -name '*.pem' -o -name '*.key' -o -name '*.p12' -o -name '*.crt' -o -name '*.sql' -o -name '*.dump' -o -name '*.backup' -o -name '*.bak' \) \
    -not -path './node_modules/*' -not -path './*/node_modules/*' 2>/dev/null || true)"

  LEAK=0
  while IFS= read -r f; do
    [[ -z "$f" ]] && continue
    if ! git check-ignore -q "$f"; then
      echo "[LEAK] no ignorado: ${f#./}"
      LEAK=1
    fi
  done <<< "$SENSITIVE_LIST"

  if [[ "$LEAK" -eq 0 ]]; then
    echo "[OK] No hay sensibles fuera de ignore."
  fi
else
  echo "[INFO] Saltado: requiere .git en raiz para evaluar ignore real."
fi

echo ""
echo "== prepush-audit: busqueda de patrones de secreto (tracked files) =="
if [[ "$HAS_GIT_ROOT" -eq 1 ]]; then
  MATCHES="$(
    git ls-files -z | grep -zv '^scripts/prepush-audit.sh$' | xargs -0 rg -n \
      -e 'PGADMIN_DEFAULT_PASSWORD=[^<$[:space:]]+' \
      -e 'REDIS_PASSWORD=[^<$[:space:]]+' \
      -e 'hvs\.' \
      -e 'BEGIN (RSA|PRIVATE) KEY' \
      -e 'META_PAGE_ACCESS_TOKEN=[^<[:space:]]+' \
      2>/dev/null || true
  )"
else
  MATCHES="$(
    rg -n --hidden \
      -g '!**/node_modules/**' \
      -g '!**/dist/**' \
      -g '!**/.git/**' \
      -g '!**/redis_cache/**' \
      -g '!**/n8n-data/**' \
      -g '!scripts/prepush-audit.sh' \
      -e 'PGADMIN_DEFAULT_PASSWORD=[^<$[:space:]]+' \
      -e 'REDIS_PASSWORD=[^<$[:space:]]+' \
      -e 'hvs\.' \
      -e 'BEGIN (RSA|PRIVATE) KEY' \
      -e 'META_PAGE_ACCESS_TOKEN=[^<[:space:]]+' \
      . 2>/dev/null || true
  )"
fi

if [[ -n "$MATCHES" ]]; then
  echo "[WARN] Se detectaron posibles secretos:"
  echo "$MATCHES" | sed -n '1,120p'
else
  echo "[OK] Sin patrones obvios en archivos evaluados."
fi

echo ""
echo "prepush-audit finalizado."
