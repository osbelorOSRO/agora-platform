# DOC-BAILEYS-BRIDGE-ENUMS-Y-SMOKE

Fecha: 2026-04-25

## Objetivo

Habilitar formalmente a Baileys como provider del pipeline conversacional comun y validar el dual-write:

- `event_history`
- `threads`
- `thread_messages`
- metadata legacy de `proceso_id`
- flujo viejo `clientes/procesos/Mongo` sin romperse

## SQL Manual

Aplicar en la base Postgres del `api-backend-nest`.

Archivo SQL:

```txt
ops/docs/baileys_bridge_enums.sql
```

```sql
ALTER TYPE provider_type ADD VALUE IF NOT EXISTS 'BAILEYS';
ALTER TYPE meta_object_type ADD VALUE IF NOT EXISTS 'WHATSAPP';
```

Validacion:

```sql
SELECT enumlabel
FROM pg_enum
WHERE enumtypid = 'provider_type'::regtype
ORDER BY enumsortorder;

SELECT enumlabel
FROM pg_enum
WHERE enumtypid = 'meta_object_type'::regtype
ORDER BY enumsortorder;
```

Resultado esperado:

- `provider_type` contiene `META` y `BAILEYS`.
- `meta_object_type` contiene `PAGE`, `INSTAGRAM` y `WHATSAPP`.

Para ampliar `meta_inbox_contacts` como perfil comun de contacto, aplicar tambien:

```txt
ops/docs/meta_inbox_contacts_common_fields.sql
```

Ese SQL agrega `first_name`, `last_name`, `rut`, `address`, `region` y `metadata`.

## Smoke Payload

Enviar al `api-backend-nest`:

```bash
curl -X POST "$API_BACKEND_URL/internal/baileys/events" \
  -H "Content-Type: application/json" \
  -H "x-internal-token: $BAILEYS_INTERNAL_TOKEN" \
  -d '{
    "externalEventId": "baileys:smoke:56999999999@s.whatsapp.net:test001",
    "actorExternalId": "56999999999@s.whatsapp.net",
    "provider": "BAILEYS",
    "objectType": "WHATSAPP",
    "pipeline": "MESSAGES",
    "eventType": "messaging.message",
    "occurredAt": "2026-04-25T15:00:00.000Z",
    "receivedAt": "2026-04-25T15:00:01.000Z",
    "payload": {
      "platform": "whatsapp",
      "eventKind": "message",
      "senderId": "56999999999@s.whatsapp.net",
      "recipientId": "56911111111:1@s.whatsapp.net",
      "timestamp": 1777138800,
      "message": {
        "mid": "test001",
        "text": "smoke baileys bridge",
        "isEcho": false,
        "hasAttachments": false,
        "attachmentTypes": [],
        "attachmentUrls": [],
        "messageSource": "baileys_whatsapp",
        "rawMessage": {
          "conversation": "smoke baileys bridge"
        }
      },
      "media": null,
      "wa": {
        "tipoId": "jid",
        "phone": true,
        "remoteJid": "56999999999@s.whatsapp.net",
        "remoteJidAlt": null,
        "senderPn": null,
        "senderKey": null,
        "resolvedJid": "56999999999@s.whatsapp.net",
        "recipientRawId": "56911111111:1@s.whatsapp.net",
        "recipientPhone": "56911111111",
        "pushName": "Smoke Test"
      },
      "legacy": {
        "proceso_id": 999999,
        "cliente_id": "56999999999",
        "tipo_id": "jid"
      },
      "rawEvent": {
        "smoke": true
      }
    }
  }'
```

Respuesta esperada:

```json
{
  "accepted": true,
  "externalEventId": "baileys:smoke:56999999999@s.whatsapp.net:test001"
}
```

## Validaciones SQL

### 1. Event History

```sql
SELECT
  external_event_id,
  actor_external_id,
  provider,
  object_type,
  pipeline,
  event_type,
  occurred_at
FROM event_history
WHERE external_event_id = 'baileys:smoke:56999999999@s.whatsapp.net:test001';
```

Esperado:

- `provider = BAILEYS`
- `object_type = WHATSAPP`
- `pipeline = MESSAGES`
- `event_type = messaging.message`

### 2. Thread Messages

```sql
SELECT
  session_id,
  external_event_id,
  message_external_id,
  actor_external_id,
  provider,
  object_type,
  source_channel,
  event_kind,
  direction,
  content_text,
  content_json->>'messageType' AS message_type,
  occurred_at
FROM thread_messages
WHERE external_event_id = 'baileys:smoke:56999999999@s.whatsapp.net:test001';
```

Esperado:

- `session_id = BAILEYS:WHATSAPP:56999999999@s.whatsapp.net`
- `message_external_id = test001`
- `provider = BAILEYS`
- `object_type = WHATSAPP`
- `source_channel = baileys_whatsapp`
- `event_kind = message`
- `direction = INCOMING`
- `content_text = smoke baileys bridge`
- `message_type = text`

### 3. Threads

```sql
SELECT
  session_id,
  actor_external_id,
  object_type,
  source_channel,
  thread_status,
  attention_mode,
  thread_stage,
  last_message_text,
  last_direction,
  metadata
FROM threads
WHERE session_id = 'BAILEYS:WHATSAPP:56999999999@s.whatsapp.net';
```

Esperado:

- `thread_status = OPEN`
- `attention_mode = N8N`
- `thread_stage = inicio`
- `last_message_text = smoke baileys bridge`
- `last_direction = INCOMING`
- `metadata->'legacy'->>'proceso_id' = 999999`

## Smoke De Idempotencia

Ejecutar el mismo `curl` dos veces.

Validar:

```sql
SELECT COUNT(*)
FROM thread_messages
WHERE external_event_id = 'baileys:smoke:56999999999@s.whatsapp.net:test001';

SELECT COUNT(*)
FROM event_history
WHERE external_event_id = 'baileys:smoke:56999999999@s.whatsapp.net:test001';
```

Esperado:

- ambos conteos deben ser `1`.

## Smoke De Reaccion

Payload minimo:

```json
{
  "externalEventId": "baileys:smoke:56999999999@s.whatsapp.net:reaction001",
  "actorExternalId": "56999999999@s.whatsapp.net",
  "provider": "BAILEYS",
  "objectType": "WHATSAPP",
  "pipeline": "MESSAGES",
  "eventType": "messaging.reaction",
  "occurredAt": "2026-04-25T15:01:00.000Z",
  "payload": {
    "platform": "whatsapp",
    "eventKind": "reaction",
    "senderId": "56999999999@s.whatsapp.net",
    "recipientId": "56911111111:1@s.whatsapp.net",
    "timestamp": 1777138860,
    "message": {
      "mid": "reaction001",
      "text": "Reaccionó 👍",
      "isEcho": false,
      "hasAttachments": false,
      "attachmentTypes": [],
      "attachmentUrls": [],
      "messageSource": "baileys_whatsapp",
      "rawMessage": {}
    },
    "media": null,
    "reaction": {
      "emoji": "👍",
      "targetMessageId": "test001"
    },
    "wa": {
      "tipoId": "jid",
      "phone": true,
      "resolvedJid": "56999999999@s.whatsapp.net"
    },
    "rawEvent": {
      "smoke": true
    }
  }
}
```

Validar en `thread_messages`:

- `event_kind = reaction`
- `direction = SYSTEM`
- `content_text = Reaccionó 👍`
- `content_json->>'messageType' = reaction`

## Criterio De Cierre

- [ ] Enums aplicados en DB real.
- [ ] Smoke texto responde `accepted: true`.
- [ ] `event_history` guarda provider `BAILEYS`.
- [ ] `thread_messages` contiene el mensaje.
- [ ] `threads` se crea o actualiza.
- [ ] `threads.metadata.legacy.proceso_id` queda poblado cuando viene desde `wa-backend`.
- [ ] Repetir el mismo evento no duplica filas.
- [ ] Reaccion queda visible como evento `reaction`.
- [ ] Flujo legacy sigue escribiendo en Mongo/procesos durante dual-write.
- [x] Prueba manual saliente desde Meta Inbox hacia actor WhatsApp llega al WhatsApp real de destino.
- [x] Mensajes entrantes y salientes quedan visibles en tiempo real en panel humano.
- [x] Mensajes entrantes y salientes quedan persistidos en el modelo de thread.
- [ ] Definir donde auditar/idempotentizar salientes: `event_history`, outbox dedicada o modelo mixto.

## Evidencia Manual Actual

Fecha: 2026-04-26.

Prueba realizada desde pantalla Meta Inbox del panel humano:

- conversacion creada desde evento WhatsApp/Baileys;
- actor/thread visible en panel humano;
- envio saliente desde la conversacion del actor;
- backend envia al gateway `wa_backend`;
- `wa_backend` envia por Baileys al destino WhatsApp real;
- mensaje recibido en tiempo real en el WhatsApp de destino `979555395`;
- el saliente queda visible en el panel humano como mensaje `OUTGOING`;
- entrantes y salientes quedan persistidos.

Logs relevantes:

```txt
Nest application successfully started
Enviando mensaje a Gateway: http://wa_backend:3000/api/enviar-mensaje
Payload: destino=56979555395@s.whatsapp.net, tipo=texto, tipoId=undefined
Mensaje enviado via Gateway a 56979555395@s.whatsapp.net (texto)
Autenticacion exitosa con Vault
Leyendo clave de Vault: secret/data/dev.local1/agora/api-backend-nest
```

## Pendiente De Auditoria Saliente

Estado observado el 2026-04-26:

- `thread_messages` contiene entrantes y salientes Baileys.
- `threads` actualiza resumen con el ultimo saliente.
- `event_history` contiene entrantes Baileys auditados.
- No se observaron salientes `baileys:out:*` en `event_history`.

Decision pendiente:

1. Usar `event_history` tambien para salientes.
   - Ventaja: un solo historial de eventos por provider.
   - Riesgo: mezclar eventos recibidos desde providers con intenciones/efectos generados internamente.

2. Crear outbox/auditoria dedicada para salientes, por ejemplo `outbox_events`, `message_delivery_attempts` o equivalente.
   - Ventaja: modela mejor retries, estados de entrega, errores y efectos externos.
   - Riesgo: requiere mas implementacion y migracion.

3. Modelo mixto.
   - `event_history` conserva eventos externos/incoming.
   - outbox/auditoria dedicada registra salientes, intentos, respuesta del gateway y delivery.
   - Requiere definir relacion clara con `thread_messages.external_event_id`.

Hasta tomar esta decision, el criterio operativo es:

- salientes deben persistir en `thread_messages`;
- `threads` debe reflejar el ultimo saliente;
- la auditoria/idempotencia formal de salientes queda abierta.
