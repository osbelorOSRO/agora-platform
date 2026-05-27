# FCA Integration — Facebook Personal Profile Messenger

> Documento de diseño e implementación de la integración de mensajes de perfil personal de Facebook (incluyendo Marketplace) vía `fca-unofficial`.
> Creado: 2026-05-26. Retomar desde aquí si se pierde el contexto de sesión.

---

## Contexto y motivación

**Problema:** Meta Marketplace solo opera sobre perfiles personales de Facebook, pero la Messenger Platform API oficial de Meta solo funciona con Facebook Pages. El perfil personal no tiene API oficial.

**Solución:** Usar `@dongdev/fca-unofficial` (equivalente a Baileys pero para Facebook Messenger), que emula el comportamiento del navegador usando el protocolo HTTP/GraphQL y MQTT que usa Messenger Web. Los mensajes de Marketplace llegan al mismo inbox de Messenger del perfil personal, por lo tanto leerlos y responderlos con fca-unofficial cubre exactamente el caso de uso.

**Objetivo:** Sumar esta fuente de mensajes al pipeline existente de Agora **sin tocar** la integración de Fan Page (Meta Webhook oficial) que ya funciona.

---

## Librería elegida

| Librería | npm | Actividad |
|---|---|---|
| `@dongdev/fca-unofficial` | ✅ | Más activa — versión 3.0.31, mayo 2026 |
| `XaviaTeam/fca-unofficial` | ✅ | Segunda más activa, features rápidas |
| `fca-unofficial/fca-unofficial` | ❌ | **Archivado** — no usar |

```bash
npm install @dongdev/fca-unofficial
```

Autenticación: via **AppState** (array de cookies de sesión exportadas de Facebook). No usa QR code. El AppState se almacena encriptado en DB.

---

## Arquitectura general

```
[Facebook Messenger / Marketplace]
    ↓  fca-unofficial listenMqtt()
[fb-backend]  ← nuevo servicio Express (puerto 3001)
    ↓  POST /internal/fca/events  [x-internal-token: env]
[api-backend-nest → FcaIngressController → FcaIngressService]
    ↓  Q_META_MESSAGES  job: "fca.message"
[MessagesProcessor → pipeline unificado existente]

[api-backend-nest → FcaSenderService]
    ↓  POST fb-backend:3001/enviar-mensaje  [x-internal-token: env]
[fb-backend → api.sendMessage(text, threadID)]
    ↓
[Facebook Messenger]
```

La integración de Fan Page existente (`/webhooks/meta`) **no se modifica**.

---

## Decisiones de diseño

### Tokens de servicio a servicio → env (igual que Baileys)

El header `x-internal-token` entre NestJS y fb-backend vive en env, igual que `BAILEYS_INTERNAL_TOKEN` con wa-backend. No cambia el patrón.

| Variable | Servicio | Propósito |
|---|---|---|
| `FCA_INTERNAL_TOKEN` | NestJS + fb-backend | Header `x-internal-token` (service-to-service) |
| `FCA_CONFIG_ENCRYPTION_KEY` | NestJS | Llave AES-256-GCM para encriptar campos en DB |

### Credenciales de integración → DB encriptada + Redis cache

Patrón idéntico a `meta_app_config` / `MetaConfigService`.

| Campo DB | Tipo | Descripción |
|---|---|---|
| `app_state` | encriptado | JSON del AppState de Facebook (cookies de sesión, ~50KB) |
| `fb_backend_url` | plano | URL dinámica al servicio fb-backend |
| `fb_user_id` | plano | Auto-poblado cuando fb-backend conecta |
| `fb_user_name` | plano | Auto-poblado cuando fb-backend conecta |
| `enabled` | plano | `"true"` / `"false"` |

Cache Redis: key `fca_app_config:singleton`, TTL 300s.

---

## Cambios necesarios por capa

### 1. Prisma — nueva tabla

```prisma
// prisma/schema.prisma
model fca_app_config {
  id             Int       @id @default(1)
  enabled        String?
  display_name   String?
  fb_backend_url String?
  fb_user_id     String?
  fb_user_name   String?
  internal_token String?   // reservado, no usado aún
  app_state      String?   @db.Text   // encriptado AES-256-GCM
  updated_at     DateTime? @updatedAt @db.Timestamp(6)
}
```

Migración:
```bash
npx prisma migrate dev --name add_fca_app_config
```

---

### 2. api-backend-nest — archivos nuevos

```
src/fca-config/
├── fca-config.module.ts
├── fca-config.controller.ts     # GET /fca-config, PATCH /fca-config, GET /fca-config/reveal/:field
├── fca-config.service.ts        # AES-256-GCM + Redis cache — espejo de MetaConfigService
└── dto/
    └── update-fca-config.dto.ts

src/fca/
├── fca.module.ts
├── fca-ingress.controller.ts    # POST /internal/fca/events — x-internal-token guard
├── fca-ingress.service.ts       # → Q_META_MESSAGES job:"fca.message"
├── fca-sender.service.ts        # POST fb-backend:3001/enviar-mensaje
├── fca-config-internal.controller.ts  # GET /internal/fca/config — para que fb-backend obtenga app_state
└── dto/
    └── fca-ingress-envelope.dto.ts    # Espejo de BaileysIngressEnvelopeDto con provider:'FCA', objectType:'FACEBOOK'

src/shared/guards/
└── fca-internal-token.guard.ts  # Lee FCA_INTERNAL_TOKEN de env — igual que BaileysInternalTokenGuard
```

**Archivos modificados:**

| Archivo | Cambio |
|---|---|
| `actor/pipelines/messages.processor.ts` línea 37 | Agregar `'fca.message'` en la whitelist de job names |
| `app.module.ts` | Importar `FcaModule` y `FcaConfigModule` |

---

### 3. Envelope que fb-backend envía a NestJS

```typescript
// POST /internal/fca/events
{
  externalEventId: string,     // messageID de fca (único por mensaje)
  actorExternalId: string,     // senderID (Facebook UID del remitente)
  provider: 'FCA',
  objectType: 'FACEBOOK',
  pipeline: 'MESSAGES',
  eventType: 'messaging.message',
  occurredAt: string,          // ISO 8601
  receivedAt: string,          // ISO 8601
  payload: {
    platform: 'facebook_personal',
    eventKind: 'message',
    senderId: string,
    threadID: string,          // CRÍTICO — necesario para responder
    timestamp: number,
    isMarketplace: boolean,    // detectado por metadata del thread
    message: {
      mid: string,
      text: string,
      isEcho: boolean,
      hasAttachments: boolean,
      attachmentTypes: string[],
      rawMessage: object
    },
    rawEvent: object
  }
}
```

---

### 4. Processor — único cambio en código existente

```typescript
// src/actor/pipelines/messages.processor.ts — línea 37
// ANTES:
if (job.name !== 'meta.message' && job.name !== 'baileys.message') {

// DESPUÉS:
if (job.name !== 'meta.message' && job.name !== 'baileys.message' && job.name !== 'fca.message') {
```

---

### 5. Endpoint interno para que fb-backend obtenga su config

```typescript
// GET /internal/fca/config
// Guard: FcaInternalTokenGuard (x-internal-token env)
// Responde con:
{
  app_state: string,    // JSON desencriptado del AppState
  enabled: string,
  fb_backend_url: string
}
```

fb-backend llama esto al arrancar para obtener el AppState y conectarse a Facebook.

---

### 6. fb-backend — nuevo servicio

```
app/fb-backend/
├── package.json                         # @dongdev/fca-unofficial, express, axios
├── Dockerfile
├── src/
│   ├── main.ts                          # Express server + ciclo de vida FCA
│   ├── config/env.ts                    # NESTJS_INTERNAL_URL, FCA_INTERNAL_TOKEN, PORT
│   ├── application/
│   │   ├── facebook.gateway.ts          # Wrapper FCA — login, reconexión, eventos
│   │   └── use-cases/
│   │       ├── handle-incoming.usecase.ts  # Normaliza mensaje → POST /internal/fca/events
│   │       └── send-message.usecase.ts    # api.sendMessage(text, threadID)
│   └── infrastructure/
│       └── backend-api.client.ts        # HTTP client a NestJS
```

**Env vars de fb-backend:**

| Variable | Descripción |
|---|---|
| `NESTJS_INTERNAL_URL` | URL a NestJS (`http://api_backend_nest:4001`) |
| `FCA_INTERNAL_TOKEN` | Token header `x-internal-token` |
| `PORT` | Puerto del servidor (3001) |

**Flujo de arranque:**
1. Lee env vars
2. `GET /internal/fca/config [x-internal-token]` → obtiene `app_state`
3. `fca.login({ appState: JSON.parse(app_state) })`
4. Registra listener: `api.listenMqtt(onMessage)`
5. Al conectar: `POST /internal/fca/status { fb_user_id, fb_user_name }` → NestJS actualiza DB
6. Express server listo en puerto 3001 — expone `POST /enviar-mensaje`

**Reconexión:** backoff exponencial idéntico al de wa-backend.

---

### 7. docker-compose.yml — nuevo servicio

```yaml
fb-backend:
  build:
    context: ../../fb-backend
    dockerfile: Dockerfile
  container_name: fb-backend
  restart: unless-stopped
  env_file:
    - ../env/dev.local1.secrets.env
  environment:
    - PORT=3001
    - NESTJS_INTERNAL_URL=http://api_backend_nest:4001
  networks:
    - npm_network
  depends_on:
    - api_backend_nest
```

---

### 8. Nuevas variables de entorno

**En `dev.local1.env` (template, sin valores):**
```bash
FCA_INTERNAL_TOKEN=
FCA_CONFIG_ENCRYPTION_KEY=
```

**En `dev.local1.secrets.env` (valores reales, no versionado):**
```bash
FCA_INTERNAL_TOKEN=<generar con: openssl rand -hex 32>
FCA_CONFIG_ENCRYPTION_KEY=<generar con: openssl rand -hex 32>
```

---

### 9. Frontend — FcaConfigPage

Nueva página en `frontend/src/pages/FcaConfigPage.tsx`, espejo de `MetaConfigPage.tsx`.

```
Tabs:
├── "Conexión"   → enabled (toggle), fb_backend_url, fb_user_id (read-only), fb_user_name (read-only)
└── "Sesión"     → app_state (sensitive — aquí se pega el AppState JSON exportado de Facebook)
```

Servicios frontend: `src/services/fcaConfig.service.ts`
- `getFcaConfig()` → `GET /fca-config`
- `updateFcaConfig(payload)` → `PATCH /fca-config`
- `revealFcaField(field)` → `GET /fca-config/reveal/:field`

**Cómo obtener el AppState de Facebook:**
El admin extrae las cookies de su sesión de Facebook con una herramienta (ej: extensión "Cookie Editor" en el navegador o `npx @xaviabot/fca-unofficial get-appstate`) y pega el JSON resultante en el campo `app_state` de esta página.

---

## Orden de implementación recomendado

### Fase 1 — Base de datos + config service (NestJS)
1. Agregar `fca_app_config` a `schema.prisma`
2. Correr `npx prisma migrate dev --name add_fca_app_config`
3. Crear `FcaConfigService` (copia adaptada de `MetaConfigService`)
4. Crear `FcaConfigController` + DTO
5. Registrar `FcaConfigModule` en `AppModule`
6. Agregar env vars `FCA_CONFIG_ENCRYPTION_KEY` al `.env`
7. **Prueba:** `PATCH /fca-config { app_state: "test" }` → verificar encriptación en DB y cache

### Fase 2 — Ingress pipeline (NestJS)
1. Crear `FcaInternalTokenGuard`
2. Crear `FcaIngressController` + `FcaIngressService` + DTO
3. Crear `FcaConfigInternalController` (`GET /internal/fca/config`)
4. Crear `FcaSenderService`
5. Modificar `messages.processor.ts` línea 37 — agregar `'fca.message'`
6. Registrar `FcaModule` en `AppModule`
7. **Prueba:** `curl POST /internal/fca/events` con envelope de prueba → verificar job en BullMQ → verificar procesamiento en logs

### Fase 3 — fb-backend (nuevo servicio)
1. Crear estructura de carpetas en `app/fb-backend/`
2. `npm init` + instalar `@dongdev/fca-unofficial`, `express`, `axios`
3. Implementar `main.ts` — arranque, fetch de config, login FCA, listener
4. Implementar `handle-incoming.usecase.ts` — normalización del evento a envelope
5. Implementar `send-message.usecase.ts` — `api.sendMessage(text, threadID)`
6. Crear `Dockerfile`
7. Agregar servicio a `docker-compose.yml`
8. **Prueba local:** arrancar fb-backend solo, enviar mensaje desde otro perfil de Facebook, verificar logs

### Fase 4 — Prueba end-to-end
1. Publicar artículo en Marketplace con el perfil personal
2. Desde otro perfil, enviar mensaje al artículo
3. Verificar: fb-backend recibe → normaliza → POST a NestJS → job en BullMQ → processor → persiste en DB
4. Verificar: `POST /meta-inbox/threads/:sessionId/send-text` → NestJS → FcaSenderService → fb-backend → `api.sendMessage()` → llega el mensaje
5. Verificar que el flujo de Fan Page sigue funcionando sin regresiones

### Fase 5 — Frontend
1. Crear `FcaConfigPage.tsx` (espejo de `MetaConfigPage.tsx`)
2. Crear `fcaConfig.service.ts`
3. Agregar ruta en `App.tsx`
4. Agregar link en sidebar/navegación

---

## Archivos clave de referencia para implementar

| Qué necesitas implementar | Copiar patrón de |
|---|---|
| `FcaConfigService` | `src/meta-config/meta-config.service.ts` |
| `FcaConfigController` | `src/meta-config/meta-config.controller.ts` |
| `FcaIngressController` | `src/baileys/baileys-ingress.controller.ts` |
| `FcaIngressService` | `src/baileys/baileys-ingress.service.ts` |
| `FcaIngressEnvelopeDto` | `src/baileys/dto/baileys-ingress-envelope.dto.ts` |
| `FcaInternalTokenGuard` | `src/shared/guards/baileys-internal-token.guard.ts` |
| `fb-backend/src/main.ts` | `app/wa-backend/src/main.ts` |
| `fb-backend/handle-incoming.usecase.ts` | `app/wa-backend/src/application/use-cases/handle-incoming.usecase.ts` |
| `FcaConfigPage.tsx` | `frontend/src/pages/MetaConfigPage.tsx` |
| `fcaConfig.service.ts` | `frontend/src/services/metaConfig.service.ts` |

---

## Lo que NO cambia

- `/webhooks/meta` — integración Fan Page intacta
- `MetaService`, `MetaConfigService` — sin tocar
- `MessagesProcessor` — solo se agrega `'fca.message'` en la whitelist (línea 37)
- `Q_META_MESSAGES` — misma cola, mismo processor
- Todo el pipeline de scoring, delegación a N8N, lifecycle — funciona igual con el nuevo provider

---

## Notas importantes

- **AppState size:** El JSON puede ser ~20-150KB. Postgres TEXT aguanta hasta 1GB. El hex-encoded encriptado será ~3x el tamaño original — sin problema.
- **Reconnect:** fca-unofficial puede perder sesión si Facebook expira las cookies. Cuando esto ocurre, fb-backend debe avisar (log + endpoint de status) y el admin debe refrescar el AppState desde la UI.
- **Marketplace detection:** Los mensajes de Marketplace llegan al mismo inbox de Messenger. Se pueden identificar porque el `threadID` tiene metadata de listing. fca-unofficial expone `threadInfo` para detectarlo.
- **Echo messages:** fca-unofficial también recibe los mensajes que TÚ envías (echo). Filtrar con `senderID === myUserID` para no procesarlos como entrantes.
- **provider/objectType en el envelope:** `provider: 'FCA'`, `objectType: 'FACEBOOK'`. El processor los guarda en `event_history` y los usa en `delegationGate.getDelegationControlState()`.
