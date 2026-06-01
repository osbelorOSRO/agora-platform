# Hoja de Ruta — Auditoría Baseline (v3.4.2)

Diagnóstico inicial de seguridad en dependencias, testing y documentación Swagger para cada subproyecto del monorepo. Fecha: 2026-06-01.

---

## 1. api-backend-nest (NestJS)

**Path:** `app/agora/api-backend-nest/`

### Dependencias
- **Producción:** 31 paquetes
- **Desarrollo:** 19 paquetes
- **Overrides:** `lodash`, `cross-spawn`, `got`, `rimraf`, `@hono/node-server`, `glob` → `minimatch` → `brace-expansion`

### Vulnerabilidades (`npm audit`)
- **Total:** 1 (high)
- **Paquete:** `axios` 1.12.2 → [GHSA-35jp-ww65-95wh] (CVE-2025-62718 bypass, DoS, Header Injection)
- **Solución:** `npm audit fix` → axios 1.15.3+
- **Bloquea CI:** Sí (`--audit-level=moderate`)

### Testing
- **Framework:** Jest 29.7 + ts-jest
- **Unit tests:** 23 archivos `*.spec.ts` con 100+ bloques `describe()`
- **E2E tests:** 3 archivos en `test/` (app.e2e, sales-record.e2e, auth-guard.e2e)
- **Coverage threshold:** 70% lines / 60% functions
- **Estado:** ✅ Sólido. Buena cobertura de pipelines, servicios core y meta-inbox.

### Swagger
- **Paquete:** `@nestjs/swagger` 11.4.4
- **Endpoint:** `/api-docs` (condicional: `SWAGGER_ENABLED=true`)
- **Tags documentados:** Automatización N8N, Interno, Health, Legal, Media, MetaInbox, StageTemplates, Offers, etc.
- **DTOs decorados:** `@ApiProperty`, `@ApiPropertyOptional` en los DTOs principales
- **Estado:** ✅ Completo. Habilitado solo en dev/staging.

---

## 2. frontend (React + Vite)

**Path:** `app/agora/frontend/`

### Dependencias
- **Producción:** 17 paquetes (MUI 7, React 19, react-router 6, recharts 3, framer-motion 12)
- **Desarrollo:** 19 paquetes (vitest 4, testing-library, eslint 9, tailwindcss 3)
- **Sin overrides de seguridad**

### Vulnerabilidades (`npm audit`)
- **Total:** 1 (high)
- **Paquete:** `axios` 1.9.0 (misma cadena CVE-2025-62718)
- **Solución:** `npm audit fix`
- **Bloquea CI:** Sí

### Testing
- **Framework:** Vitest 4.1.7 + jsdom + @testing-library/react
- **Test files:** 22 archivos en `src/test/`
- **Tipos:** Tests de servicios (api clients), hooks, componentes React y utilidades
- **Coverage:** Sin threshold configurado
- **Estado:** ⚠️ Moderado. Hay tests pero sin coverage threshold ni integración CI de coverage.

### Swagger
- **No aplica** (frontend no expone API)

---

## 3. panel_websocket (Socket.IO)

**Path:** `app/agora/websocket/`

### Dependencias
- **Producción:** 7 paquetes (express 5, socket.io 4.7, jsonwebtoken, cors, node-vault)
- **Desarrollo:** 6 paquetes (solo types y ts-node)
- **Overrides:** `diff` → 8.0.3

### Vulnerabilidades (`npm audit`)
- **Total:** 1 (high)
- **Paquete:** `axios` 1.10.0
- **Solución:** `npm audit fix`
- **Bloquea CI:** Sí

### Testing
- **Framework:** Ninguno
- **Test scripts:** No declarados en package.json
- **Archivos de test:** 0
- **Estado:** ❌ Sin cobertura de tests

### Swagger
- **No aplica** (no expone API REST documentable)

---

## 4. wa-backend (WhatsApp Bridge — Baileys)

**Path:** `app/wa-backend/`

### Dependencias
- **Producción:** 11 paquetes (baileys rc13, express 5, socket.io 4.8, qrcode, OpenTelemetry)
- **Desarrollo:** 6 paquetes (solo types y ts-node)
- **Overrides:** `protobufjs` → 7.6.1

### Vulnerabilidades (`npm audit`)
- **Total:** 1 (high)
- **Paquete:** `axios` 1.9.0
- **Solución:** `npm audit fix`
- **Bloquea CI:** Sí (con el nuevo trigger `app/wa-backend/**`)

### Testing
- **Framework:** Ninguno
- **Test scripts:** No declarados en package.json
- **Archivos de test:** 0
- **Estado:** ❌ Sin cobertura de tests

### Swagger
- **No aplica** (API interna sin documentar)

---

## 5. fb-backend (Facebook Bridge — FCA)

**Path:** `app/fb-backend/`

### Dependencias
- **Producción:** 3 paquetes (`@dongdev/fca-unofficial`, axios, express 4)
- **Desarrollo:** 4 paquetes (types + ts-node + typescript)
- **Sin overrides de seguridad**

### Vulnerabilidades (`npm audit`)
- **Total:** 10 — 2 low, 2 moderate, 6 high
- **Paquetes críticos (high):**
  - `@tootallnate/once` — Control Flow Scoping
  - `http-proxy-agent` — hereda de @tootallnate/once
  - `make-fetch-happen` — hereda de http-proxy-agent + cacache
  - `node-gyp` — hereda de make-fetch-happen + tar
  - `sqlite3` — hereda de node-gyp (dependencia de fca-unofficial)
  - `axios` 1.9.0 — mismo GHSA-35jp
- **Solución:** Cadena compleja. `npm audit fix --force` rompe `fca-unofficial` (fuerza downgrade a 0.0.7).
- **Bloquea CI:** Sí (con el nuevo trigger `app/fb-backend/**`)

### Testing
- **Framework:** Ninguno
- **Test scripts:** No declarados en package.json
- **Archivos de test:** 0
- **Estado:** ❌ Sin cobertura de tests

### Swagger
- **No aplica**

---

## Resumen Ejecutivo

| Subproyecto | Vulns npm | Testing | Swagger | CI bloqueado |
|---|---|---|---|---|
| api-backend-nest | 1 high | ✅ Jest 23 spec + 3 e2e | ✅ `/api-docs` | Sí |
| frontend | 1 high | ⚠️ 22 tests, sin threshold | N/A | Sí |
| websocket | 1 high | ❌ 0 tests | N/A | Sí |
| wa-backend | 1 high | ❌ 0 tests | N/A | Sí |
| fb-backend | 10 (6 high) | ❌ 0 tests | N/A | Sí |

---

## Plan de Acción Inmediato

### Fase 1 — Desbloquear CI (prioridad crítica)

1. **api-backend-nest:** `cd app/agora/api-backend-nest && npm audit fix`
2. **frontend:** `cd app/agora/frontend && npm audit fix`
3. **websocket:** `cd app/agora/websocket && npm audit fix`
4. **wa-backend:** `cd app/wa-backend && npm audit fix`
5. **fb-backend:** Revisar cadena `fca-unofficial` → sqlite3 → node-gyp. Opciones:
   - Forzar `axios` con override a `>=1.16.0`
   - Congelar `sqlite3` a una versión sin vulns via override
   - Considerar migrar a `@whiskeysockets/baileys` también para FB (unificar bridges)

### Fase 2 — Testing

| Subproyecto | Acción |
|---|---|
| websocket | Agregar jest/vitest + tests de sockets, auth middleware y token verification |
| wa-backend | Agregar jest/vitest + tests de handlers Express y socket events |
| fb-backend | Agregar jest/vitest + tests de handlers Express |
| frontend | Configurar coverage threshold (ej: 60% lines) en vitest config |

### Fase 3 — Swagger

- Swagger ya está completo en NestJS. No requiere acción.
- En websocket, wa-backend y fb-backend: Swagger no aplica (APIs internas).

---

_Última actualización: 2026-06-01 — v3.4.2_
