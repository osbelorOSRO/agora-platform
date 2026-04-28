# DOC-PLAN-BACKEND-CONVERSACIONAL-CHECKLIST

## Objetivo

Preparar la evolucion del backend hacia un nucleo conversacional mas serio, operable y seguro, sin perder la operacion actual entre panel humano, n8n, Baileys, Meta Inbox, WebSocket, Redis y Mongo.

Este documento es el checklist vivo para planificar, ejecutar y cerrar frentes de trabajo por etapas.

## Backup Inicial

- [x] Backup de trabajo creado en `/tmp/agora-platform-backup-20260425-113744-full`
- [ ] Confirmar si se necesita respaldo adicional fuera de `/tmp`
- [ ] Confirmar si se requiere respaldo de datos runtime Redis con permisos elevados del host

Notas:

- El backup copio el arbol de proyecto y codigo.
- No se pudieron copiar `redis/redis_cache/appendonlydir` ni `redis/redis_cache/dump.rdb` por permisos del sistema.
- Esos archivos parecen estado runtime de Redis, no codigo fuente.

## Estado Inicial Del Worktree

Cambios locales detectados antes de iniciar:

- [ ] `env/dev.local1.env`
- [ ] `n8n/env/dev.local1.env`
- [ ] `ops/docs/DOC-N8N-META-THREAD-DELEGATION.md`
- [ ] `ops/docs/stage_templates.sql`
- [ ] `ops/docs/stage_templates_final.sql`
- [ ] `.codex`
- [ ] uploads nuevos en `agora/uploads/`
- [ ] `ops/docs/stage_templates_patch_nuevos_campos.sql`

Regla de trabajo:

- [ ] No revertir cambios existentes sin instruccion explicita.
- [ ] Antes de tocar archivos modificados, revisar su diff.
- [ ] Separar cambios de refactor/seguridad de cambios operativos existentes.

## Grupos De Archivos Involucrados

### Agora / API Backend Nest

Nucleo HTTP y runtime:

- [ ] `agora/api-backend-nest/src/main.ts`
- [ ] `agora/api-backend-nest/src/app.module.ts`
- [ ] `agora/api-backend-nest/src/database/prisma/prisma.service.ts`
- [ ] `agora/api-backend-nest/src/cache/cache.module.ts`
- [ ] `agora/api-backend-nest/src/cache/cache.service.ts`
- [ ] `agora/api-backend-nest/src/queues/queues.module.ts`
- [ ] `agora/api-backend-nest/src/queues/queues.constants.ts`

Auth, guards y secretos runtime:

- [ ] `agora/api-backend-nest/src/auth/auth.module.ts`
- [ ] `agora/api-backend-nest/src/auth/jwt-auth.guard.ts`
- [ ] `agora/api-backend-nest/src/auth/auth.service.ts`
- [ ] `agora/api-backend-nest/src/auth/auth.controller.ts`
- [ ] `agora/api-backend-nest/src/shared/runtime-secrets.ts`

Meta Inbox y modelo conversacional:

- [ ] `agora/api-backend-nest/src/meta-inbox/meta-inbox.controller.ts`
- [ ] `agora/api-backend-nest/src/meta-inbox/meta-inbox.service.ts`
- [ ] `agora/api-backend-nest/src/meta-inbox/dto/*`
- [ ] `agora/api-backend-nest/src/webhooks/meta/meta.controller.ts`
- [ ] `agora/api-backend-nest/src/webhooks/meta/meta.service.ts`
- [ ] `agora/api-backend-nest/src/webhooks/meta/meta.module.ts`

Actor, eventos y colas:

- [ ] `agora/api-backend-nest/src/actor-events/*`
- [ ] `agora/api-backend-nest/src/actor/*`
- [ ] `agora/api-backend-nest/src/actor/pipelines/messages.processor.ts`
- [ ] `agora/api-backend-nest/src/actor/pipelines/msg-delegation.processor.ts`
- [ ] `agora/api-backend-nest/src/actor/pipelines/thread-msg-delegation.processor.ts`
- [ ] `agora/api-backend-nest/src/actor/pipelines/msg-delegation-callback.controller.ts`
- [ ] `agora/api-backend-nest/src/actor/transitions/actor-transitions.processor.ts`
- [ ] `agora/api-backend-nest/src/actor/scoring/actor-scoring.service.ts`

Operacion antigua cliente/proceso/journey:

- [ ] `agora/api-backend-nest/src/clientes/clientes.controller.ts`
- [ ] `agora/api-backend-nest/src/clientes/clientes.lite.controller.ts`
- [ ] `agora/api-backend-nest/src/clientes/clientes.service.ts`
- [ ] `agora/api-backend-nest/src/clientes/estado-cliente.service.ts`
- [ ] `agora/api-backend-nest/src/clientes/dto/*`
- [ ] `agora/api-backend-nest/src/procesos_pg/procesos_pg.controller.ts`
- [ ] `agora/api-backend-nest/src/procesos_pg/procesos_pg.service.ts`
- [ ] `agora/api-backend-nest/src/procesos_pg/dto/*`

Mongo bridge:

- [ ] `agora/api-backend-nest/src/mongodb/mongodb.module.ts`
- [ ] `agora/api-backend-nest/src/mongodb/controllers/*`
- [ ] `agora/api-backend-nest/src/mongodb/services/*`
- [ ] `agora/api-backend-nest/src/mongodb/schemas/*`
- [ ] `agora/api-backend-nest/src/mongodb/dto/*`

Media y archivos:

- [ ] `agora/api-backend-nest/src/media/media.controller.ts`
- [ ] `agora/api-backend-nest/src/media/media.service.ts`
- [ ] `agora/api-backend-nest/src/media/media.module.ts`
- [ ] `agora/api-backend-nest/src/config/multer.config.ts`
- [ ] `agora/api-backend-nest/src/utils/convertidorAudio.service.ts`

Integraciones salientes:

- [ ] `agora/api-backend-nest/src/websocket-notifier/websocket-notifier.service.ts`
- [ ] `agora/api-backend-nest/src/websocket-notifier/websocket-notifier.module.ts`
- [ ] `agora/api-backend-nest/src/baileys/baileys-sender.service.ts`
- [ ] `agora/api-backend-nest/src/baileys/baileys.module.ts`

DB y migraciones:

- [ ] `agora/api-backend-nest/prisma/schema.prisma`
- [ ] `ops/docs/stage_templates.sql`
- [ ] `ops/docs/stage_templates_final.sql`
- [ ] `ops/docs/stage_templates_patch_nuevos_campos.sql`
- [ ] `ops/docs/DOC-META-INBOX-THREADS-SQL.md`

### Accesos / ABackend

- [ ] `accesos/abackend/src/index.ts`
- [ ] `accesos/abackend/src/routes/auth.ts`
- [ ] `accesos/abackend/src/routes/serviceAuth.ts`
- [ ] `accesos/abackend/src/controllers/LoginController.ts`
- [ ] `accesos/abackend/src/controllers/ServiceAuthController.ts`
- [ ] `accesos/abackend/src/middlewares/verifyToken.ts`
- [ ] `accesos/abackend/src/middlewares/requirePermission.ts`
- [ ] `accesos/abackend/src/middlewares/validateServiceIp.ts`
- [ ] `accesos/abackend/src/utils/jwtKeys.ts`
- [ ] `accesos/abackend/src/secrets/vault.service.ts`

### WA Backend / Baileys Adapter

- [ ] `wa-backend/src/main.ts`
- [ ] `wa-backend/src/config/env.ts`
- [ ] `wa-backend/src/interfaces/http/routes/routes.ts`
- [ ] `wa-backend/src/interfaces/http/controllers/message.controller.ts`
- [ ] `wa-backend/src/infrastructure/http/middleware/auth.middleware.ts`
- [ ] `wa-backend/src/infrastructure/auth/jwt.service.ts`
- [ ] `wa-backend/src/infrastructure/backend-api.client.ts`
- [ ] `wa-backend/src/infrastructure/socket/socket.client.ts`
- [ ] `wa-backend/src/application/use-cases/handle-incoming.usecase.ts`
- [ ] `wa-backend/src/application/use-cases/send-message.usecase.ts`
- [ ] `wa-backend/src/application/use-cases/send-media.usecase.ts`
- [ ] `wa-backend/src/application/whatsapp.gateway.ts`
- [ ] `wa-backend/src/core/whatsapp/*`

### Agora WebSocket

- [ ] `agora/websocket/src/index.ts`
- [ ] `agora/websocket/src/socketManager.ts`
- [ ] `agora/websocket/src/apiKeyAuthMiddleware.ts`
- [ ] `agora/websocket/src/tokenVerifier.ts`
- [ ] `agora/websocket/src/ws.ts`
- [ ] `agora/websocket/src/vaultService.ts`

### Mongo Microservicio

- [x] Retirado del runtime conversacional.
- [x] Eliminadas rutas legacy de RUT/cache/procesos/scraping.

### Redis / Colas / Cache

- [ ] `redis/docker-compose.yml`
- [ ] `agora/api-backend-nest/src/cache/*`
- [ ] `agora/api-backend-nest/src/queues/*`
- [ ] `agora/api-backend-nest/src/actor/pipelines/msg-delegation-state.service.ts`
- [ ] `agora/api-backend-nest/src/actor/pipelines/msg-delegation.finalizer.ts`

### Compose, Ops Y Scripts

- [ ] `agora/docker-compose.yml`
- [ ] `accesos/docker-compose.yml`
- [ ] `wa-backend/docker-compose.yml`
- [ ] `redis/docker-compose.yml`
- [ ] `scripts/smoke-core.sh`
- [ ] `scripts/verify-compose.sh`
- [ ] `scripts/verify-env.sh`
- [ ] `scripts/up-profile.sh`
- [ ] `scripts/down-profile.sh`
- [ ] `README-OPERACION.md`
- [ ] `ops/docs/DOC-RUNBOOKS.md`

## Frentes De Trabajo

### Frente A: Modelo Conversacional Comun

- [x] Definir lenguaje canonico: actor, contact, thread, message, event, channel, transport.
- [x] Crear matriz de homologacion Baileys/Meta Inbox: `ops/docs/DOC-HOMOLOGACION-BAILEYS-META-INBOX.md`
- [x] Documentar como Baileys emite eventos normalizados hacia el mismo modelo.
- [ ] Documentar como Meta Inbox se vuelve referencia del modelo nuevo.
- [x] Decidir relacion entre `clientes/procesos/map_journey` y `threads/thread_messages`.
- [x] Definir que queda como sistema fuente y que queda como proyeccion.
- [x] Definir que `proceso_id` desaparece como concepto operativo final y solo queda como puente legacy temporal.
- [x] Definir que `cliente_id` desaparece como identidad canonica final y se resuelve hacia actor/contact.
- [x] Definir que `map_journey`/`etiqueta_actual` desaparecen como fuente operativa de stage y convergen a `thread_stage`.

Criterio de cierre:

- [x] Existe documento de dominio con entidades y responsabilidades.
- [x] No hay ambiguedad entre proceso, thread y journey.
- [x] No hay ambiguedad entre cliente legacy, actor y contacto.
- [x] No hay ambiguedad entre `map_journey` legacy y `thread_stage` canonico.

### Frente B: Auth Y Fronteras Internas

- [ ] Definir rutas publicas reales.
- [ ] Definir guard humano JWT.
- [ ] Definir guard interno para n8n/wa-backend/websocket.
- [ ] Revisar rutas de `api-backend-nest` sin auth.
- [ ] Revisar `/api/enviar-desde-n8n` en `wa-backend`.
- [ ] Revisar autorizacion de salas en WebSocket.

Criterio de cierre:

- [ ] Todo endpoint sensible requiere identidad.
- [ ] Rutas internas usan token/clave de servicio.
- [ ] Rutas publicas estan marcadas explicitamente.

### Frente C: Outbox, Idempotencia Y Efectos Secundarios

- [ ] Sacar llamadas websocket de transacciones Postgres.
- [ ] Sacar llamadas Mongo de transacciones Postgres cuando sea posible.
- [ ] Sacar llamadas Meta/n8n de transacciones.
- [ ] Crear diseno de `outbox_events`.
- [ ] Definir worker/retry para notificaciones y envios.
- [ ] Definir idempotency key para mensajes salientes.
- [ ] Decidir auditoria de salientes: `event_history`, outbox/auditoria dedicada o modelo mixto.

Criterio de cierre:

- [ ] Operaciones DB criticas hacen commit antes de efectos externos.
- [ ] Efectos externos son reintentables.
- [ ] Eventos fallidos quedan auditables.

### Frente D: Migraciones Y Arranque

- [ ] Mover DDL de `MetaInboxService.onModuleInit` a migraciones/scripts.
- [ ] Separar backfills de arranque runtime.
- [ ] Definir readiness/liveness.
- [ ] Revisar health checks de compose.

Criterio de cierre:

- [ ] El backend no hace trabajo pesado al iniciar.
- [ ] Migraciones son explicitas y reproducibles.

### Frente E: Media Y Archivos

- [ ] Proteger uploads con auth.
- [ ] Usar UUID siempre.
- [ ] Definir allowlist MIME/extensiones.
- [ ] Definir limites de tamano por ruta.
- [ ] Agregar timeout/control de ffmpeg.
- [ ] Separar archivos publicos y privados.
- [ ] Definir retencion/limpieza.

Criterio de cierre:

- [ ] No se puede escribir a `/uploads` sin identidad.
- [ ] No se aceptan archivos fuera de politica.
- [ ] Media no puede tumbar CPU/disco facilmente.

### Frente F: Observabilidad Y Auditoria

- [ ] Agregar correlation id/request id.
- [ ] Estandarizar logs por `externalEventId`, `sessionId`, `cliente_id`.
- [ ] Definir eventos auditables: mensaje enviado, intervencion, cierre, etiqueta, delegation.
- [ ] Medir latencia de DB, Meta, n8n, wa-backend, websocket.
- [ ] Medir colas pendientes/fallidas.

Criterio de cierre:

- [ ] Se puede diagnosticar un flujo completo sin entrar a revisar codigo.
- [ ] Acciones importantes tienen rastro auditable.

### Frente G: Datos, Indices Y Performance

- [ ] Revisar indices Postgres para clientes/procesos/map_journey/threads/messages.
- [ ] Revisar indices Mongo para cliente_id/proceso_id/subprocesos/conversaciones.
- [ ] Revisar paginacion obligatoria en listados.
- [ ] Revisar pool de Postgres.
- [ ] Revisar cache e invalidacion.

Criterio de cierre:

- [ ] Listados principales tienen limites.
- [ ] Queries calientes tienen indices.
- [ ] Cache no deja UI con estado viejo por mucho tiempo.

### Frente H: Pruebas De Flujo

- [ ] Prueba: mensaje Meta nuevo crea thread y mensaje.
- [ ] Prueba: n8n responde y registra salida.
- [ ] Prueba: humano toma control.
- [ ] Prueba: cerrar/reabrir thread/proceso.
- [ ] Prueba: llega mensaje atrasado.
- [ ] Prueba: websocket caido no rompe DB.
- [ ] Prueba: Meta falla al enviar.
- [ ] Prueba: upload invalido se rechaza.

Criterio de cierre:

- [ ] Los flujos criticos estan cubiertos por smoke/e2e o scripts.
- [ ] Fallas esperadas tienen resultado controlado.

### Frente I: Panel Conversacional Funcional

- [x] Documentar destino funcional del panel conversacional: `ops/docs/DOC-PANEL-CONVERSACIONAL-FUNCIONAL.md`
- [ ] Definir nombre final del modulo conversacional multicanal.
- [ ] Fusionar funcionalmente Meta Inbox y Chats/Kanban sobre `threads`.
- [ ] Definir vistas `OPEN`, `ARCHIVED`, `CLOSED`.
- [ ] Disenar tarjeta compacta de actor/thread con provider, attention mode, stage, ultimo mensaje y tiempo.
- [ ] Reemplazar textos operativos repetitivos por iconos `lucide-react` cuando sea posible, especialmente `HUMAN`, `N8N` y `BOT`.
- [ ] Disenar busqueda global con filtros.
- [ ] Retirar contratos, tarjeta scraping y cierre de proceso del flujo conversacional.
- [ ] Redisenar Agenda sobre actor/contact/thread o aislarla como frente separado.
- [ ] Redisenar reportes/graficas desde procesos legacy hacia metricas de threads/eventos.

Criterio de cierre:

- [ ] El panel humano opera conversaciones desde un unico modulo multicanal.
- [ ] No depende de `cliente_id`, `proceso_id`, `map_journey` ni `etiqueta_actual` para operar conversaciones.
- [ ] Permite encontrar y diferenciar muchas conversaciones activas aunque no tengan nombre confiable.

## Etapas Propuestas

### Etapa 0: Preparacion

- [x] Crear backup.
- [x] Crear checklist.
- [ ] Confirmar alcance inicial.
- [ ] Elegir primer frente.

### Etapa 1: Mapa Y Contratos

- [x] Documentar matriz inicial de homologacion Baileys/Meta.
- [x] Documentar modelo conversacional comun.
- [ ] Documentar rutas publicas/internas/humanas.
- [ ] Documentar eventos de entrada/salida por canal.
- [x] Implementar primer corte en modo sombra: `normalizeBaileysIncomingEvent(upsert)`.
- [x] Implementar traductor saliente `toBaileysOutgoingCommand(input)` en `wa-backend`.
- [x] Implementar bridge interno Baileys -> `thread_messages`/`threads` en dual-write.
- [x] Validar prueba manual E2E: WhatsApp/Baileys -> Meta Inbox panel humano -> salida por `wa_backend` -> WhatsApp destino.

### Etapa 2: Seguridad Basica Sin Romper Operacion

- [ ] Guard interno para rutas n8n/servicios.
- [ ] Auth en uploads sensibles.
- [ ] Proteccion de `/api/enviar-desde-n8n`.
- [ ] Validacion webhook Meta.

### Etapa 3: Confiabilidad Operativa

- [ ] Disenar outbox.
- [ ] Mover notificaciones websocket a outbox.
- [ ] Idempotencia para mensajes salientes.
- [ ] Reintentos y estados.
- [ ] Aplicar migracion enum DB para `event_history`: `provider_type.BAILEYS`, `meta_object_type.WHATSAPP`. Ver `ops/docs/DOC-BAILEYS-BRIDGE-ENUMS-Y-SMOKE.md`.

### Etapa 4: Migraciones Y Performance

- [ ] Migrar rutas nuevas desde `proceso_id` hacia `thread`/`session_id`.
- [ ] Migrar rutas nuevas desde `cliente_id` hacia actor/contact.
- [ ] Migrar cambios de etapa desde `map_journey`/`etiqueta_actual` hacia `thread_stage`.
- [ ] Encapsular cualquier lectura de `proceso_id`, `cliente_id`, `map_journey` o `etiqueta_actual` en adaptadores legacy o backfills.
- [ ] Unificar score, lifecycle e informacion de contacto con el modelo actor/contact de Meta Inbox.
- [ ] Inventariar acoples de contratos, abonados, SIM cards, envios y Chilexpress con `cliente_id`, `proceso_id`, Mongo o `map_journey`.
- [ ] Aislar ese dominio comercial/logistico como proyecto futuro, fuera del cierre del nucleo conversacional.
- [ ] Sacar DDL de runtime.
- [ ] Indices faltantes.
- [ ] Paginacion/limites.
- [ ] Pool y timeouts.

### Etapa 5: Cierre Y Validacion

- [ ] Ejecutar build/test por servicio afectado.
- [ ] Ejecutar smoke core.
- [ ] Comentar, desactivar o aislar codigo legacy de contratos/abonados/SIM/envios que pueda causar errores por retiro de `cliente_id`, `proceso_id`, `map_journey` o Mongo conversacional.
- [ ] Revisar checklist completo.
- [ ] Documentar cambios operativos requeridos.

## Pendientes De Decision

- [ ] El modelo canonico se llamara `conversation`, `thread` o se mantiene `meta-inbox` como bounded context.
- [x] Baileys quedara como provider `BAILEYS` dentro del mismo pipeline o como bridge temporal.
- [x] Mongo sera fuente de verdad, proyeccion o legado de lectura.
- [x] `map_journey` deja de ser fuente de estado actual y converge a `thread_stage` + historial/eventos de dominio.
- [ ] Donde se alojara outbox: Postgres del API o Redis/BullMQ.
- [ ] Donde se auditan/idempotentizan salientes: `event_history`, outbox dedicada o modelo mixto.
- [x] Definir si `actorExternalId` para Baileys sera numero limpio (`cliente_id`) o JID canonico completo.
- [x] Definir `sourceChannel` canonico para Baileys: `baileys_whatsapp`, `whatsapp_socket` u otro.
- [x] Definir endpoint/cola para recibir envelopes Baileys en `api-backend-nest`.
- [x] Definir destino final de `proceso_id`: desaparece del modelo operativo y queda solo como legacy temporal.
- [x] Definir destino final de `cliente_id`: desaparece como identidad canonica y queda solo como alias legacy hacia actor/contact.
- [x] Definir destino final de `map_journey`/`etiqueta_actual`: desaparecen como fuente de stage y quedan como legacy/proyeccion temporal.
- [x] Definir alcance de contratos/abonados/SIM/envios/Chilexpress: dominio diferido para proyecto futuro, no parte del nucleo conversacional.

## Registro De Avance

| Fecha | Frente | Cambio | Estado | Notas |
| --- | --- | --- | --- | --- |
| 2026-04-25 | Preparacion | Backup y checklist inicial | En progreso | Backup en `/tmp`; Redis runtime no copiado por permisos |
| 2026-04-25 | Modelo conversacional | Matriz Baileys/Meta Inbox | En progreso | Ver `DOC-HOMOLOGACION-BAILEYS-META-INBOX.md` |
| 2026-04-25 | WA Backend / Baileys Adapter | Normalizacion INCOMING/OUTGOING en modo compatible | En progreso | `normalizeBaileysIncomingEvent` y `toBaileysOutgoingCommand` aplicados; build OK |
| 2026-04-25 | Modelo conversacional | Homologacion thread/proceso/session/stage/status | Cerrado conceptual | Ver `DOC-MODELO-CONVERSACIONAL-COMUN.md` |
| 2026-04-25 | Bridge Baileys | Dual-write hacia `thread_messages`/`threads` | En progreso | Endpoint interno y enqueue aplicados; falta migracion enum para `event_history` |
| 2026-04-25 | Bridge Baileys | SQL enums y smoke test documentados | Pendiente de ejecutar | Ver `DOC-BAILEYS-BRIDGE-ENUMS-Y-SMOKE.md` |
| 2026-04-26 | Modelo conversacional | Decision final sobre `proceso_id` y `cliente_id` | Cerrado conceptual | `proceso_id` converge a `thread`/`session_id`; `cliente_id` converge a actor/contact |
| 2026-04-26 | Modelo conversacional | Decision final sobre `map_journey`/`etiqueta_actual` | Cerrado conceptual | Stage operativo converge a `thread_stage`; legacy queda como historial/proyeccion temporal |
| 2026-04-26 | Alcance futuro | Dominio contratos/abonados/SIM/envios | Diferido | Aislar para proyecto futuro; comentar/desactivar acoples legacy que rompan el cierre conversacional |
| 2026-04-26 | Bridge Baileys | Prueba manual saliente desde Meta Inbox | Validado manual | Panel envio a `wa_backend`; Baileys entrego al WhatsApp destino `979555395`; entrantes/salientes visibles en tiempo real y persistidos |
