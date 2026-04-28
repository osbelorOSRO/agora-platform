# DOC-ESTADO-ACTUAL

Fecha de corte: 2026-04-28

## Estado general
- Version operativa del repo: `v1.3.0`.
- Stack operativo en `dev.local1` con perfiles por entorno.
- Estandarización de `env/` aplicada para 5 perfiles (`dev.local1`, `dev.vps1`, `dev.vps2`, `prod.vps1`, `prod.vps2`).
- BD en VPS1 ya separadas en compose bajo `/root` (fuera de `/proyectos`).
- BD de pruebas en VPS2 restauradas y operativas bajo `/root/bd`.
- Red Docker unificada objetivo: `npm_network`.
- Vault en VPS1 y VPS2 conectado a `npm_network`.

## Cambios cerrados
- Hardcodes críticos de URLs/servicios reducidos y pasados a variables por perfil.
- `n8n` con env por perfil (`/n8n/env/*.env`).
- Postgres queda como BD externa operativa fuera del stack principal.
- Mongo conversacional, microservicio Mongo/RUT/procesos y dependencias de scraping legacy quedan retirados del runtime conversacional.
- Vault cross-VPS cerrado:
  - VPS2 manual unseal (ancla)
  - VPS1 auto-unseal por transit hacia VPS2

## Decisiones activas
- Nombre oficial del proyecto: `agora-platform`.
- BD tratadas como capa externa al monorepo (por DSN).
- Producción BD oficial en VPS1 (`<host_bind_ip>`).
- BD de pruebas en VPS2 (`<host_bind_ip>`) operativas para dev/pruebas.
- Vault cross-VPS activo (auto-unseal `vps1 <- vps2`).
- `vault` queda como servicio operativo fuera de repo.

## Pendiente inmediato
- Aplicar en VPS el runbook Postgres de `v1.3.0` si el ambiente aun conserva tablas legacy.
- Rotación de secretos expuestos durante pruebas (tokens/keys).
- Consolidar runbook final de contingencia de Vault (caida de VPS2, renovacion de token transit).
- Aplicar matriz definitiva `repo vs estado` por servicio (ver `DOC-MATRIZ-REPO-ESTADO.md`).
- Aplicar mapa oficial de secretos en Vault (ver `DOC-SECRETS-MAP-VAULT.md`).
