# DOC-N8N-META-THREAD-DELEGATION

Fecha: 2026-04-17

## Objetivo

Documentar la integración entre `api_backend_nest` y `n8n` para la delegación de mensajes de conversaciones de `meta-inbox`.

Este documento cubre:

- webhook que Agora llama cuando un mensaje entrante debe ser delegado a `n8n`
- endpoints que `n8n` usa para operar sobre el thread y el contacto
- reglas de comportamiento esperadas

## Principios

- `bootstrap` sigue en backend; `n8n` no reemplaza bootstrap
- `n8n` trabaja sobre un `thread/session` ya resuelto
- historial único de mensajes: `thread_messages`
- capa operativa de conversación: `threads`
- el webhook de conversaciones es independiente del flujo de scoring/intención

## Separación de flujos

### Flujo de scoring/intención

Se mantiene por separado y no debe reutilizarse para conversaciones delegadas.

- env var: `N8N_MSG_DELEGATION_WEBHOOK_URL`
- webhook actual: `/webhook/flujo-eventos`
- comportamiento:
  - espera procesamiento semántico del flujo
  - usa callback/timeout
  - impacta actor lifecycle/scoring

### Flujo de conversaciones delegadas

Es el flujo específico de `meta-inbox`.

- env var: `N8N_THREAD_MSG_DELEGATION_WEBHOOK_URL`
- webhook esperado en `n8n`: `/webhook/meta-thread-messages-delegation`
- comportamiento:
  - Agora solo espera aceptación HTTP del nodo webhook
  - no espera callback de negocio
  - no usa `completeUrl` / `failedUrl`
  - no queda bloqueado esperando que el workflow completo termine

## Cuándo Agora delega a `n8n`

Agora delega mensajes entrantes a `n8n` si:

- el evento es un mensaje de inbox válido
- la dirección es `INCOMING`
- existe un thread resoluble para ese actor
- `attention_mode = N8N`
- `thread_status` no está en `PAUSED`, `ARCHIVED`, `CLOSED`

## Reglas de thread al llegar un incoming

- actor nuevo:
  - crea thread nuevo con defaults
  - `OPEN / N8N / inicio`
  - persiste el incoming
  - agrega un mensaje interno de bienvenida al historial
  - marca el thread con `awaiting_first_incoming_delegate = true`
  - no delega ese primer incoming a `n8n`
  - el segundo incoming limpia la bandera y ya sí delega normalmente
  - no debe volver a crear otro saludo mientras el thread siga abierto

- actor con thread `OPEN`:
  - reutiliza el mismo thread

- actor con thread `PAUSED`:
  - reutiliza el mismo thread
  - persiste mensaje
  - no delega

- actor con thread `ARCHIVED` o `CLOSED`:
  - crea thread nuevo
  - defaults del thread nuevo:
    - `OPEN`
    - `N8N`
    - `inicio`
  - persiste el incoming
  - agrega un mensaje interno de bienvenida al historial
  - marca el thread nuevo con `awaiting_first_incoming_delegate = true`
  - no delega ese primer incoming a `n8n`
  - el siguiente incoming del nuevo thread limpia la bandera y ya sí delega
  - no debe volver a crear otro saludo sobre ese mismo thread nuevo

## Control anti-bucle del saludo bootstrap

La regla del saludo no debe inferirse desde conteos de mensajes ni desde heurísticas de texto.

El control se hace con una bandera explícita en `threads`:

- `awaiting_first_incoming_delegate boolean`

Comportamiento:

- al crear un thread nuevo por actor nuevo, o por incoming sobre `ARCHIVED/CLOSED`
  - se inserta el saludo bootstrap
  - la bandera queda en `true`

- cuando llega el siguiente incoming a ese mismo thread
  - no se vuelve a crear saludo
  - no se vuelve a primar el thread
  - la bandera pasa a `false`
  - desde ese mensaje ya aplica delegación normal

- si más adelante el thread pasa a `ARCHIVED` o `CLOSED`
  - y luego entra un nuevo incoming
  - no se reutiliza esa bandera vieja
  - se crea un thread nuevo con una bandera nueva

## Webhook Agora -> n8n

### URL esperada

`POST /webhook/meta-thread-messages-delegation`

### Autenticación

Header:

```text
Authorization: Bearer <N8N_SECRET_TOKEN>
```

### Semántica esperada

El webhook debe devolver `2xx` y, si responde JSON, no debe poner:

```json
{ "accepted": false }
```

Respuesta mínima recomendada:

```json
{
  "accepted": true
}
```

## Payload enviado por Agora a n8n

Ejemplo conceptual:

```json
{
  "externalEventId": "mid.123",
  "actorExternalId": "17841403830857157",
  "sessionId": "META:INSTAGRAM:17841403830857157",
  "occurredAt": "2026-04-17T18:00:00.000Z",
  "provider": "META",
  "objectType": "INSTAGRAM",
  "threadStatus": "OPEN",
  "attentionMode": "N8N",
  "threadStage": "inicio",
  "payload": {},
  "thread": {
    "threadId": "uuid",
    "sessionId": "META:INSTAGRAM:17841403830857157",
    "actorExternalId": "17841403830857157",
    "objectType": "INSTAGRAM",
    "sourceChannel": "inbox_dm",
    "threadStatus": "OPEN",
    "attentionMode": "N8N",
    "threadStage": "inicio",
    "displayName": "Oscar IG",
    "phone": null,
    "email": null,
    "notes": null,
    "city": null,
    "actorScore": "0.82",
    "actorLifecycleState": "QUALIFIED",
    "actorLifecycleUpdatedAt": "2026-04-17T17:58:00.000Z"
  },
  "contact": {
    "displayName": "Oscar IG",
    "phone": null,
    "email": null,
    "city": null,
    "notes": null
  },
  "actor": {
    "actorExternalId": "17841403830857157",
    "objectType": "INSTAGRAM",
    "score": "0.82",
    "lifecycleState": "QUALIFIED",
    "lifecycleUpdatedAt": "2026-04-17T17:58:00.000Z"
  },
  "message": {
    "externalEventId": "mid.123",
    "messageExternalId": "mid.123",
    "eventKind": "message",
    "direction": "INCOMING",
    "senderType": "ACTOR",
    "messageType": "text",
    "sourceChannel": "inbox_dm",
    "contentText": "Hola",
    "structuredPayload": null,
    "media": null
  },
  "jobTrace": {
    "queueName": "q_thread_msg_delegation",
    "jobId": "thread_mid.123",
    "jobName": "thread.msg.delegation",
    "createdAtMs": 0,
    "processedAtMs": 0,
    "attemptsMade": 0,
    "maxAttempts": 5
  }
}
```

## Endpoints Agora que `n8n` puede usar

Todos estos endpoints usan:

```text
Authorization: Bearer <N8N_SECRET_TOKEN>
```

### 1. Resolver thread

`POST /meta-inbox/n8n/resolve-thread`

Uso:

- obtener el thread preferido por `actorExternalId + objectType`
- útil como apoyo, debug o flujos secundarios

Payload:

```json
{
  "actorExternalId": "17841403830857157",
  "objectType": "INSTAGRAM",
  "includeClosed": false
}
```

### 2. Cambiar control del thread

`PATCH /meta-inbox/n8n/thread-control`

Uso:

- cambiar `threadStatus`
- cambiar `attentionMode`
- cambiar `threadStage`

Payload:

```json
{
  "sessionId": "META:INSTAGRAM:17841403830857157",
  "threadStatus": "ARCHIVED",
  "attentionMode": "HUMAN",
  "threadStage": "delegado_humano"
}
```

También puede resolver por actor:

```json
{
  "actorExternalId": "17841403830857157",
  "objectType": "INSTAGRAM",
  "threadStatus": "ARCHIVED"
}
```

### 3. Guardar contacto

`PATCH /meta-inbox/n8n/contact`

Uso:

- persistir nombre
- teléfono
- email
- ciudad
- notas

Payload:

```json
{
  "sessionId": "META:INSTAGRAM:17841403830857157",
  "displayName": "Oscar IG",
  "phone": "+56912345678",
  "email": "oscar@example.com",
  "city": "Santiago",
  "notes": "Cliente pide portabilidad"
}
```

### 4. Enviar mensaje saliente unificado

`POST /meta-inbox/n8n/send-message`

Uso:

- enviar texto a Meta
- o enviar media por URL pública
- persistir el mensaje en `thread_messages`
- actualizar `threads`
- notificar al frontend

#### Texto

```json
{
  "sessionId": "META:INSTAGRAM:17841403830857157",
  "text": "Hola, te ayudo con eso."
}
```

#### Media por URL

```json
{
  "sessionId": "META:INSTAGRAM:17841403830857157",
  "mediaType": "audio",
  "mediaUrl": "https://media.example.com/audio.m4a"
}
```

Notas:

- soporta `mediaType = audio | image`
- el `mediaUrl` debe ser público y accesible por Meta
- el mensaje queda persistido en `thread_messages`
- `senderType` se guarda como `N8N`

### 5. Atajo compatible para texto

`POST /meta-inbox/n8n/send-text`

Hace lo mismo que `send-message` cuando se envía solo texto.

Se puede conservar por compatibilidad, pero el endpoint recomendado es:

- `POST /meta-inbox/n8n/send-message`

## Qué persiste y qué no

### Persistido

- incoming persistido por backend en `thread_messages`
- outgoing enviado por panel en `thread_messages`
- outgoing enviado por `n8n` en `thread_messages`
- preview/estado del thread en `threads`
- datos de contacto en `meta_inbox_contacts`

### No persistido por este webhook de delegación

- el workflow interno completo de `n8n`
- estados transitorios internos de nodos
- resultados no devueltos a Agora vía endpoints

## Recomendación de uso en workflows

Orden recomendado para un workflow de conversación:

1. recibir webhook `/meta-thread-messages-delegation`
2. leer `message`, `thread`, `contact`, `actor`
3. decidir stage / modo / respuesta
4. si corresponde, llamar:
   - `PATCH /meta-inbox/n8n/thread-control`
   - `PATCH /meta-inbox/n8n/contact`
   - `POST /meta-inbox/n8n/send-message`
5. responder `accepted: true` al webhook inicial

## Notas operativas

- `n8n` no debe hacer bootstrap de actor/thread
- `sessionId` es la referencia preferida siempre que ya venga en el payload
- `resolve-thread` debe ser apoyo, no reemplazo de bootstrap
- el flujo de conversaciones no debe mezclarse con el webhook de scoring/intención
