#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

# Bandera global: cualquier hallazgo serio la pone en 1 y el script termina con exit 1
# (bloquea el push cuando corre como hook pre-push de Husky).
FAIL=0

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
  echo "[FAIL] Se encontraron repos anidados:"
  echo "$NESTED_GIT"
  echo "      Remover esos .git antes de push del monorepo."
  FAIL=1
else
  echo "[OK] Sin .git anidados."
fi

echo ""
echo "== prepush-audit: archivos sensibles no ignorados =="
if [[ "$HAS_GIT_ROOT" -eq 1 ]]; then
  SENSITIVE_LIST="$(find . -type f \
    \( -name '*.secrets.env' -o -name '*.pem' -o -name '*.key' -o -name '*.p12' -o -name '*.crt' -o -name '*.sql' -o -name '*.dump' -o -name '*.backup' -o -name '*.bak' \) \
    -not -path './node_modules/*' -not -path './*/node_modules/*' \
    -not -path '*/prisma/migrations/*' 2>/dev/null || true)"

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
  else
    FAIL=1
  fi
else
  echo "[INFO] Saltado: requiere .git en raiz para evaluar ignore real."
fi

echo ""
echo "== prepush-audit: busqueda de patrones de secreto (tracked files) =="

if ! command -v rg >/dev/null 2>&1; then
  echo "[FAIL] ripgrep (rg) no esta instalado: no se puede auditar secretos."
  echo "       Instala ripgrep o corre el push con --no-verify bajo tu responsabilidad."
  FAIL=1
fi

# Corre rg sobre los archivos versionados (o el arbol si no hay .git),
# excluyendo artefactos ruidosos y el propio script.
run_rg() {
  if [[ "$HAS_GIT_ROOT" -eq 1 ]]; then
    git ls-files -z \
      | grep -zvE '(^|/)(package-lock\.json|.*\.min\.(js|css))$' \
      | grep -zv '^scripts/prepush-audit.sh$' \
      | xargs -0 rg -n "$@" 2>/dev/null || true
  else
    rg -n --hidden \
      -g '!**/node_modules/**' -g '!**/dist/**' -g '!**/.git/**' \
      -g '!**/redis_cache/**' -g '!**/n8n-data/**' -g '!**/coverage/**' \
      -g '!**/*.min.js' -g '!**/*.min.css' -g '!package-lock.json' \
      -g '!scripts/prepush-audit.sh' \
      "$@" . 2>/dev/null || true
  fi
}

# 1) Alta señal: secretos inequivocos (sin falsos positivos esperables).
HIGH_SIGNAL="$(run_rg \
  -e 'PGADMIN_DEFAULT_PASSWORD=[^<$[:space:]]+' \
  -e 'REDIS_PASSWORD=[^<$[:space:]]+' \
  -e 'META_PAGE_ACCESS_TOKEN=[^<[:space:]]+' \
  -e 'hvs\.[A-Za-z0-9]' \
  -e '\bs\.[A-Za-z0-9]{24}' \
  -e 'BEGIN (RSA |EC |OPENSSH |DSA )?PRIVATE KEY' \
  -e 'BEGIN CERTIFICATE' \
  -e 'eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}' \
  -e 'sk-[A-Za-z0-9]{20,}' \
  -e 'AKIA[0-9A-Z]{16}' \
  -e 'gh[pousr]_[A-Za-z0-9]{20,}' \
  -e 'xox[baprs]-[A-Za-z0-9-]{10,}' \
)"

# 2) Infraestructura: IPs reales y connection strings con credenciales.
#    Filtramos loopback/genericas/placeholders/CI para evitar ruido.
ALLOW='127\.0\.0\.1|0\.0\.0\.0|255\.255\.|8\.8\.8\.8|1\.1\.1\.1|169\.254\.|224\.0\.|::1|localhost|ci:ci|example\.(com|org|local)|prefijo\.|sufijo\.|<[a-z_]+>|USER:PASS|:PASSWORD@|@HOST[:/]|@<'
INFRA="$(run_rg \
  -e '\b(?:[0-9]{1,3}\.){3}[0-9]{1,3}\b' \
  -e '(postgres(ql)?|mongodb(\+srv)?|redis|mysql)://[^<[:space:]:]+:[^<@[:space:]]+@' \
  | grep -vE "$ALLOW" || true)"

MATCHES="$(printf '%s\n%s\n' "$HIGH_SIGNAL" "$INFRA" | grep -vE '^[[:space:]]*$' || true)"

if [[ -n "$MATCHES" ]]; then
  echo "[FAIL] Se detectaron posibles secretos / datos de infraestructura:"
  echo "$MATCHES" | sed -n '1,120p'
  echo ""
  echo "      Revisa cada linea. Los valores reales (IPs, tokens, hosts) van"
  echo "      SOLO en *.secrets.env (gitignored); en el repo solo placeholders."
  FAIL=1
else
  echo "[OK] Sin patrones obvios en archivos evaluados."
fi

echo ""
echo "== prepush-audit: npm audit =="
for PKG_DIR in app/agora/api-backend-nest app/agora/frontend; do
  if [[ -f "$PKG_DIR/package.json" ]]; then
    echo "→ audit $PKG_DIR"
    (cd "$PKG_DIR" && npm audit --audit-level=moderate) || {
      echo "[WARN] npm audit encontró vulnerabilidades en $PKG_DIR"
    }
  fi
done

echo ""
if [[ "$FAIL" -eq 1 ]]; then
  echo "prepush-audit: BLOQUEADO (hallazgos arriba). Push cancelado."
  echo "Si es un falso positivo y estas seguro: git push --no-verify"
  exit 1
fi
echo "prepush-audit finalizado: OK."
