# api-backend-nest

API REST principal de la plataforma Agora. Gestiona el pipeline de mensajería WhatsApp, autenticación, control de acceso, delegación a N8N y orquestación de conversaciones.

## Stack

- **Framework:** NestJS v11 + TypeScript v5
- **ORM:** Prisma v7 + PostgreSQL
- **Colas:** BullMQ + Redis
- **Almacenamiento:** MinIO (S3-compatible)
- **Secretos:** HashiCorp Vault (AppRole)
- **Auth:** JWT + bcrypt + TOTP (2FA)
- **Puerto dev:** `4001`

## Arquitectura — módulos principales

| Módulo | Responsabilidad |
|---|---|
| `accesos/` | Auth, usuarios, roles, permisos, sesiones, service tokens |
| `actor/` | Orquestación de conversaciones, scoring, pipelines BullMQ |
| `actor-events/` | Procesador de eventos de estado del actor |
| `meta-inbox/` | Lifecycle de threads/contactos WhatsApp, mensajería |
| `webhooks/meta/` | Recepción y verificación de webhooks de Meta Platform |
| `baileys/` | Ingreso de mensajes vía Baileys + envío por wa-backend |
| `auth/` | Validación JWT, integración con Vault |
| `queues/` | Configuración de colas BullMQ (constantes y módulo) |
| `media/` | Upload/retrieval de archivos con validación de tipo |
| `minio/` | Operaciones S3 (put, get, delete) |
| `cache/` | Redis cache manager |
| `core/` | HttpExceptionFilter + LoggingInterceptor registrados vía APP_FILTER/APP_INTERCEPTOR |

## Comandos de desarrollo

```bash
# Instalar dependencias
npm install

# Modo desarrollo (watch)
npm run start:dev

# Build
npm run build

# Producción (vía Docker — ver docker-compose)
npm run start:prod

# Tests
npm run test          # unit
npm run test:e2e      # e2e
npm run test:cov      # coverage

# TypeScript check sin emitir
npx tsc --noEmit
```

## Variables de entorno

Copiar `app/env/dev.local1.env` como base. Los secretos van en `app/env/dev.local1.secrets.env` (no versionado).

Variables clave:

| Variable | Descripción |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `REDIS_HOST / PORT / PASSWORD` | Redis connection |
| `VAULT_*` | HashiCorp Vault AppRole config |
| `BOT_TOKEN_SECRET` | JWT signing secret para bot |
| `N8N_MSG_DELEGATION_WEBHOOK_URL` | Webhook de delegación a N8N |
| `N8N_SECRET_TOKEN` | Auth token para N8N |
| `N8N_CALLBACK_SECRET_TOKEN` | Auth token para callbacks de N8N |
| `META_PAGE_ACCESS_TOKEN` | Token de Meta Platform |
| `META_VERIFY_TOKEN` | Token verificación webhook Meta |
| `MINIO_*` | Credenciales MinIO |
| `MEDIA_BASE_URL` | URL base para servir media |
| `WS_SERVER` | URL del panel WebSocket |

---

## Plan de refactor activo

> **Contexto:** Trabajo 100% en entorno de desarrollo. Ningún cambio va a producción durante este proceso.
>
> **Restricciones:** No se añaden endpoints. No se eliminan endpoints. Refactoring puro — misma funcionalidad, mismo contrato de API.
>
> **Objetivos:** legibilidad · claridad · consistencia · escalabilidad · separación de responsabilidades · detección temprana de bugs

### Diagnóstico baseline (2026-05-23)

| Métrica | Valor |
|---|---|
| Archivos TypeScript en `src/` | 132 |
| Módulos | 27 |
| Servicios | 34 |
| Controllers | 20 |
| Cobertura de tests estimada | < 1% |
| `strictNullChecks` | `false` |
| `noImplicitAny` | `false` |

**Hallazgos críticos:**
- `MetaInboxService` (~3,621 líneas) — 8+ responsabilidades mezcladas
- `messages.processor.ts` (~1,337 líneas) — 7+ responsabilidades mezcladas
- Sin `HttpExceptionFilter` global → errores inconsistentes entre módulos
- Sin `LoggingInterceptor` → sin trazabilidad de requests
- `strictNullChecks` y `noImplicitAny` desactivados → bugs ocultos no detectados en compilación

---

### FASE 1 — TypeScript Strict
**Estado:** `[x] completado — 2026-05-23`

Activar en `tsconfig.json`:
```json
"strictNullChecks": true,
"noImplicitAny": true
```

**Proceso:**
1. Activar flags
2. Correr `npx tsc --noEmit` — inventario de errores
3. Resolver módulo por módulo en orden: `auth/` → `accesos/` → `actor/pipelines/` → `meta-inbox/` → `webhooks/` → resto

**Criterio de éxito:** `npx tsc --noEmit` sin errores con ambas flags activas.

---

### FASE 2 — CoreModule
**Estado:** `[x] completado — 2026-05-23`

Crear `src/core/` con:

```
src/core/
├── core.module.ts
├── filters/
│   └── http-exception.filter.ts     ← respuesta estándar: { statusCode, message, error, timestamp, path }
└── interceptors/
    └── logging.interceptor.ts       ← log de cada request: método, path, statusCode, duración ms
```

Registrar globalmente en `main.ts` con `app.useGlobalFilters()` y `app.useGlobalInterceptors()`.

> **Nota:** El filter cambia el formato de respuestas de error. Verificar compatibilidad con panel frontend y n8n antes de promover a entornos compartidos.

**Criterio de éxito:** Todos los endpoints retornan el mismo formato de error. Todos los requests aparecen en logs con duración.

---

### FASE 3 — Split de MetaInboxService
**Estado:** `[x] completado — 2026-05-24`

Romper `src/meta-inbox/meta-inbox.service.ts` (3,621 líneas) en servicios con una sola responsabilidad:

| Servicio | Responsabilidad | Líneas reales |
|---|---|---|
| `MetaInboxSchemaService` | DDL idempotente en onModuleInit | 313 |
| `ThreadService` | CRUD de threads, cambios de status, control flags | 782 |
| `ContactService` | Sync de contactos, metadata, block/unblock | 310 |
| `MessageSendService` | Envío vía Baileys y Meta Graph API | 619 |
| `OfferContextService` | Construcción del catálogo de ofertas por modo | 532 |
| `WhatsappIdentityService` | Resolución de JIDs (pnJid/lidJid), mapping | 216 |
| `ThreadEventService` | Registro de eventos y lectura de mensajes | 163 |
| `MetaInboxService` (residual) | Orquestador — solo delegaciones + updateWhatsappBlockStatus | 276 |

```
src/meta-inbox/
├── meta-inbox.module.ts        ← actualizado con todos los providers
├── meta-inbox.service.ts       ← 276 líneas (orquestador)
├── meta-inbox.controller.ts    ← sin cambios
└── services/
    ├── meta-inbox-schema.service.ts
    ├── thread.service.ts
    ├── contact.service.ts
    ├── message-send.service.ts
    ├── offer-context.service.ts
    ├── thread-event.service.ts
    └── whatsapp-identity.service.ts
```

**Criterio de éxito:** `MetaInboxService` residual < 300 líneas ✅ (276). `tsc --noEmit` sin errores ✅. Todos los endpoints responden igual ✅.

> **Nota:** ThreadService (782) y MessageSendService (619) superan el límite aspiracional de <400 por el volumen de SQL y la lógica dual (Baileys + Meta Graph). Cada uno tiene responsabilidad única — el criterio de líneas es orientativo, el de SRP está cumplido.

---

### FASE 4 — Split de MessagesProcessor
**Estado:** `[x] completado — 2026-05-24`

Reducir `src/actor/pipelines/messages.processor.ts` (1,337 líneas) a pipeline coordinator delgado:

| Servicio | Responsabilidad | Líneas reales |
|---|---|---|
| `MessageNormalizerService` | Normalización de media, extracción de ad context, mapping de tipos | 277 |
| `DelegationGateService` | Lógica de decisión: cuándo delegar, cuándo bloquear, gates de estado | 243 |
| `IncomingMessagePersistenceService` | Persistencia de mensaje entrante, contact/ad-lead upsert, resolución de sesión | 602 |
| `MessagesProcessor` (residual) | Coordinador del pipeline — solo orquesta, no persiste | 170 |

```
src/actor/pipelines/
├── messages.processor.ts           ← 170 líneas (coordinador)
├── services/
│   ├── message-normalizer.service.ts
│   ├── delegation-gate.service.ts
│   └── incoming-message-persistence.service.ts
└── ...resto sin cambios
```

**Criterio de éxito:** `messages.processor.ts` < 200 líneas ✅ (170). `tsc --noEmit` sin errores ✅.

---

### FASE 5 — Tests sobre servicios extraídos
**Estado:** `[x] completado — 2026-05-24`

| Servicio | Spec file | Funcs | Stmts | Tests |
|---|---|---|---|---|
| `WhatsappIdentityService` | `whatsapp-identity.service.spec.ts` | 90.9% | 91.52% | 37 |
| `DelegationGateService` | `delegation-gate.service.spec.ts` | 100% | 100% | 30 |

**Criterio de éxito:** Cobertura de funciones públicas > 70% ✅. `tsc --noEmit` sin errores ✅.

> **Nota:** `OfferContextService` y `AccesosAuthService` requieren tests de integración (DB real) por la densidad de SQL raw — quedan fuera del scope de esta fase de unit tests. Los dos servicios con lógica de decisión pura quedan cubiertos.

---

### Progreso

| Fase | Estado | Notas |
|---|---|---|
| 1 — TypeScript strict | `[x] completado` | `tsc --noEmit` sin errores de código. 1 bug real capturado en msg-delegation-completion.service.ts:115 |
| 2 — CoreModule | `[x] completado` | HttpExceptionFilter + LoggingInterceptor globales vía APP_FILTER/APP_INTERCEPTOR |
| 3 — Split MetaInboxService | `[x] completado` | 7 servicios extraídos. MetaInboxService en 276 líneas. tsc --noEmit 0 errores. ThreadService (782) y MessageSendService (619) superan limite orientativo de 400 — justificado por volumen SQL y lógica dual (Baileys + Graph API). |
| 4 — Split MessagesProcessor | `[x] completado` | IncomingMessagePersistenceService (602 líneas) extraído. MessagesProcessor en 170 líneas. tsc 0 errores. |
| 5 — Tests | `[x] completado` | WhatsappIdentityService (90.9% funcs) y DelegationGateService (100% funcs). 67 tests pasando. OfferContextService y AccesosAuthService requieren integración — fuera de scope. |

### Notas de sesión

_Decisiones tomadas durante el refactor, desvíos del plan y razones._
