# DOC-VPS1-VALIDACION-META-THREADS

Fecha: 2026-04-17

## Objetivo

Checklist de validación para `VPS1` del flujo real de `meta-inbox`, `threads`, `thread_messages` y delegación de conversaciones a `n8n`.

Esta validación se hace en `VPS1` porque en local no llegan los webhooks reales de Meta.

## Pre-checks

- backend `api_backend_nest` levantado
- frontend levantado
- websocket levantado
- Redis sano
- `n8n` levantado
- webhook de Meta apuntando al entorno correcto
- SQL manual aplicado:
  - `threads`
  - `thread_messages`
  - `awaiting_first_incoming_delegate`

## Consultas base

```sql
SELECT
  session_id,
  actor_external_id,
  object_type,
  thread_status,
  attention_mode,
  thread_stage,
  awaiting_first_incoming_delegate,
  updated_at
FROM threads
ORDER BY updated_at DESC
LIMIT 30;
```

```sql
SELECT
  session_id,
  external_event_id,
  event_kind,
  direction,
  content_text,
  occurred_at
FROM thread_messages
ORDER BY occurred_at DESC
LIMIT 50;
```

## Caso 1. Actor nuevo

Acción:

- enviar primer mensaje desde un actor que nunca haya escrito

Esperado:

- se crea thread nuevo
- thread queda en:
  - `OPEN`
  - `N8N`
  - `inicio`
- `awaiting_first_incoming_delegate = true`
- en `thread_messages` aparecen:
  - el incoming real
  - un `bootstrap_greeting`
- ese primer incoming no se delega a `n8n`

Luego:

- enviar segundo mensaje del mismo actor

Esperado:

- no se crea otro `bootstrap_greeting`
- `awaiting_first_incoming_delegate = false`
- ese segundo incoming sí se delega a `n8n`

## Caso 2. Actor con thread OPEN

Acción:

- enviar mensaje desde actor con thread `OPEN`

Esperado:

- reutiliza el mismo `session_id`
- persiste incoming en `thread_messages`
- si `attention_mode = N8N`, delega a `n8n`

## Caso 3. Actor con thread PAUSED

Acción:

- poner thread en `PAUSED`
- enviar mensaje entrante

Esperado:

- reutiliza mismo thread
- persiste mensaje
- no delega a `n8n`
- no crea saludo bootstrap

## Caso 4. Actor con thread ARCHIVED

Acción:

- dejar thread en `ARCHIVED`
- enviar primer mensaje nuevo

Esperado:

- se crea thread nuevo
- el thread viejo queda intacto
- el thread nuevo queda:
  - `OPEN`
  - `N8N`
  - `inicio`
- `awaiting_first_incoming_delegate = true`
- se inserta `bootstrap_greeting`
- no delega el primer incoming

Luego:

- enviar segundo mensaje

Esperado:

- sin saludo duplicado
- `awaiting_first_incoming_delegate = false`
- ese segundo incoming sí delega

## Caso 5. Actor con thread CLOSED

Acción:

- dejar thread en `CLOSED`
- enviar mensaje nuevo

Esperado:

- mismo comportamiento que `ARCHIVED`
- thread nuevo operativo
- saludo bootstrap una sola vez
- segundo incoming delega

## Caso 6. Envío saliente desde panel

Acción:

- responder texto desde el panel

Esperado:

- el mensaje llega a Meta
- se inserta en `thread_messages`
- `threads.last_message_text` y `last_message_at` se actualizan
- el frontend lo muestra

## Caso 7. Envío saliente desde n8n

Acción:

- usar `POST /meta-inbox/n8n/send-message`

Texto:

```json
{
  "sessionId": "SESSION_ID",
  "text": "Hola desde n8n"
}
```

Esperado:

- llega a Meta
- persiste en `thread_messages`
- actualiza `threads`
- `content_json.senderType = N8N`

## Caso 8. Thread control desde n8n

Acción:

- usar `PATCH /meta-inbox/n8n/thread-control`

Esperado:

- cambia `thread_status`, `attention_mode`, `thread_stage`
- persiste
- el frontend refleja el cambio

## Caso 9. Contacto desde n8n

Acción:

- usar `PATCH /meta-inbox/n8n/contact`

Esperado:

- persiste en `meta_inbox_contacts`
- el panel lateral muestra los datos

## Caso 10. Payload de delegación hacia n8n

Acción:

- capturar el payload recibido en `/webhook/meta-thread-messages-delegation`

Esperado:

- incluye:
  - `sessionId`
  - `threadStatus`
  - `attentionMode`
  - `threadStage`
  - `thread`
  - `contact`
  - `actor`
  - `message`
  - `payload`

## Señales de error a vigilar

- saludo bootstrap repetido dos o más veces en el mismo thread
- `awaiting_first_incoming_delegate` queda siempre en `true`
- segundo incoming no delega cuando debería
- un incoming sobre `ARCHIVED/CLOSED` reutiliza el thread viejo
- `n8n/send-message` envía pero no persiste
- thread preview no se actualiza tras salida

## Criterio de aceptación

Se considera correcto si:

- `thread_messages` concentra entrantes y salientes
- `threads` refleja el estado operativo correcto
- bootstrap saluda solo una vez por apertura
- delegación a `n8n` ocurre en el mensaje correcto
- panel y backend muestran un estado consistente
