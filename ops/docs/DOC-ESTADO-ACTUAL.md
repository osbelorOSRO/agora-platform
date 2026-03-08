# DOC-ESTADO-ACTUAL

Fecha de corte: 2026-03-08

## Estado general
- Stack operativo en `dev.local1` con perfiles por entorno.
- Estandarización de `env/` aplicada para 5 perfiles (`dev.local1`, `dev.vps1`, `dev.vps2`, `prod.vps1`, `prod.vps2`).
- BD en VPS1 ya separadas en compose bajo `/root` (fuera de `/proyectos`).
- BD de pruebas en VPS2 restauradas y operativas bajo `/root/bd`.
- Red Docker unificada objetivo: `npm_network`.
- Vault en VPS1 y VPS2 conectado a `npm_network`.

## Cambios cerrados
- Hardcodes críticos de URLs/servicios reducidos y pasados a variables por perfil.
- `n8n` con env por perfil (`/n8n/env/*.env`).
- Compose de Mongo y Postgres separados del stack principal para operación independiente.
- URI Mongo globales normalizadas a formato canónico:
  - `mongodb://adminbot:***@HOST:27017/?authSource=admin`
- Vault cross-VPS cerrado:
  - VPS2 manual unseal (ancla)
  - VPS1 auto-unseal por transit hacia VPS2

## Decisiones activas
- Nombre oficial del proyecto: `agora-platform`.
- BD tratadas como capa externa al monorepo (por DSN/URI).
- Producción BD oficial en VPS1 (`100.67.8.81`).
- BD de pruebas en VPS2 (`100.101.61.94`) operativas para dev/pruebas.
- Vault cross-VPS activo (auto-unseal `vps1 <- vps2`).
- `vault` queda como servicio operativo fuera de repo.

## Pendiente inmediato
- Rotación de secretos expuestos durante pruebas (tokens/keys).
- Consolidar runbook final de contingencia de Vault (caida de VPS2, renovacion de token transit).
- Aplicar matriz definitiva `repo vs estado` por servicio (ver `DOC-MATRIZ-REPO-ESTADO.md`).
- Aplicar mapa oficial de secretos en Vault (ver `DOC-SECRETS-MAP-VAULT.md`).
