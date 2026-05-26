# api-backend-nest

API REST principal de la plataforma Agora. Gestiona el pipeline de mensajería WhatsApp/Meta, autenticación, control de acceso, ciclo de vida de conversaciones y delegación a N8N.

**Puerto:** `4001`

## Stack

| Capa | Tecnología |
|---|---|
| Framework | NestJS v11 + TypeScript v5 (strict) |
| ORM | Prisma v7 + PostgreSQL |
| Colas | BullMQ + Redis |
| Cache | Redis (cache-manager) |
| Almacenamiento | MinIO (S3-compatible) |
| Secretos | HashiCorp Vault — AppRole |
| Auth | JWT + bcrypt + TOTP (2FA) |
| Rate limiting | express-rate-limit v8 + rate-limit-redis |

## Módulos

### Dominio principal

| Módulo | Responsabilidad |
|---|---|
| `actor/` | Orquestación de conversaciones: scoring, estado del ciclo de vida, delegación a N8N |
| `actor/pipelines/` | Procesador de mensajes entrantes (BullMQ): normalización, persistencia, gate de delegación |
| `actor/scoring/` | Señales de puntuación y acumulación de score por actor |
| `actor/transitions/` | Reglas de transición de estado configurables en DB |
| `actor-events/` | Procesamiento de eventos de estado del actor |
| `meta-inbox/` | Ciclo de vida de threads y contactos WhatsApp/Meta |
| `meta-inbox/services/` | ThreadService, ContactService, MessageSendService, OfferContextService, WhatsappIdentityService, ThreadEventService |
| `webhooks/meta/` | Recepción y verificación de webhooks de Meta Platform |
| `baileys/` | Ingreso de mensajes vía Baileys + envío por wa-backend |

### Acceso y configuración

| Módulo | Responsabilidad |
|---|---|
| `accesos/` | Módulo raíz: autenticación, usuarios, roles, permisos, sesiones, service tokens |
| `accesos/access-auth/` | Login, registro, recuperación de contraseña, 2FA (TOTP) |
| `accesos/sessions/` | Gestión de sesiones JWT, limpieza periódica de expiradas |
| `accesos/users/` | CRUD de usuarios del panel |
| `accesos/roles/` | CRUD de roles |
| `accesos/permissions/` | Permisos por rol |
| `accesos/reports/` | Reportes de acceso |
| `settings/` | Reglas de transición de ciclo de vida y señales de scoring — editables vía panel |

### Infraestructura

| Módulo | Responsabilidad |
|---|---|
| `auth/` | Validación JWT y extracción de secretos desde Vault |
| `core/` | HttpExceptionFilter y LoggingInterceptor globales |
| `cache/` | Configuración del cache Redis |
| `queues/` | Constantes y módulo BullMQ |
| `media/` | Upload y retrieval de archivos con validación de tipo |
| `minio/` | Operaciones S3: put, get, delete |
| `websocket-notifier/` | Emisión de eventos al panel WebSocket (panel_websocket) |
| `health/` | Endpoint `/health` |

### Otros

| Módulo | Responsabilidad |
|---|---|
| `offers/` | Módulo de ofertas |
| `stage-templates/` | Templates de etapas para el chatbot |
| `meta-config/` | Configuración de Meta Platform |
| `user-profile/` | Perfil de usuario del panel |
| `respuestas-rapidas/` | Respuestas rápidas predefinidas |
| `legal/` | Recursos legales |

## Auth por tipo de cliente

| Cliente | Mecanismo | Header |
|---|---|---|
| Panel humano | JWT (firmado con Vault) | `Authorization: Bearer <token>` |
| N8N | Token estático | `Authorization: Bearer <N8N_SECRET_TOKEN>` |
| N8N callback | Token estático | `Authorization: Bearer <N8N_CALLBACK_SECRET_TOKEN>` |
| Baileys interno | Token interno | `x-internal-token: <BAILEYS_INTERNAL_TOKEN>` |
| Webhook Meta | Firma HMAC en body | — |

## Variables de entorno

Las variables se resuelven en dos capas:
- Template público: `app/env/<perfil>.env`
- Secretos locales: `app/env/<perfil>.secrets.env` (no versionado, tiene prioridad)

Variables clave:

| Variable | Descripción |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `REDIS_HOST / REDIS_PORT / REDIS_PASSWORD` | Redis |
| `VAULT_ADDR / VAULT_ROLE_ID / VAULT_SECRET_ID` | HashiCorp Vault AppRole |
| `JWT_SECRET` | Signing secret del JWT del panel |
| `N8N_SECRET_TOKEN` | Auth token para N8N |
| `N8N_CALLBACK_SECRET_TOKEN` | Auth token para callbacks de N8N |
| `N8N_MSG_DELEGATION_WEBHOOK_URL` | Webhook de delegación a N8N |
| `META_PAGE_ACCESS_TOKEN` | Token de Meta Platform |
| `META_VERIFY_TOKEN` | Token de verificación de webhook Meta |
| `MINIO_ENDPOINT / MINIO_ACCESS_KEY / MINIO_SECRET_KEY` | MinIO |
| `MEDIA_BASE_URL` | URL base para servir media |
| `WS_SERVER` | URL interna del panel WebSocket |
| `API_KEY_WS` | Clave de comunicación interna con panel_websocket |

## Comandos

```bash
# Dependencias
npm install

# Desarrollo (watch)
npm run start:dev

# Build
npm run build

# Producción (vía Docker — ver docker-compose.yml)
npm run start:prod

# TypeScript check
npx tsc --noEmit

# Tests unitarios
npm run test

# Tests e2e
npm run test:e2e

# Coverage
npm run test:cov
```

## Schema de DB — Prisma Migrate

Los cambios al schema se gestionan con Prisma Migrate, **nunca con `db push`**.

```bash
# 1. Modificar prisma/schema.prisma
# 2. Generar y aplicar migración en DB local
npx prisma migrate dev --name descripcion_del_cambio
# 3. Commitear schema.prisma + archivo generado en prisma/migrations/
```

El CI/CD aplica las migraciones en prod automáticamente antes de reiniciar el backend. Ante un fallo ver `ops/docs/RUNBOOK-PRISMA-MIGRATIONS.md`.

## Operación via Docker

```bash
# Rebuild del servicio
docker compose -p stack_agora --env-file app/env/dev.local1.secrets.env \
  -f app/agora/docker-compose.yml up -d --build --force-recreate backend

# Logs en vivo
docker logs -f backend
```

Ver `README-OPERACION.md` en la raíz del repo para el flujo completo de operación por perfil.
