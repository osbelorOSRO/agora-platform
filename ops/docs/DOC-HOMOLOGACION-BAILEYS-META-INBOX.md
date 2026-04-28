# DOC-HOMOLOGACION-BAILEYS-META-INBOX

## Objetivo

Definir como homologar los eventos de Baileys/`wa-backend` con el contrato conversacional usado por Meta Inbox, sin perder campos importantes para la operacion actual.

La meta no es matar Baileys. La meta es convertirlo en un provider/adaptador del mismo nucleo conversacional:

- Meta: provider oficial de eventos Messenger/Instagram.
- Baileys: provider/adaptador WhatsApp basado en socket.
- API backend: nucleo que entiende actores, threads, mensajes, estado, delegacion y panel humano.

Hay dos responsabilidades distintas para `wa-backend`:

- Entrada `INCOMING`: traducir el evento real de WhatsApp/Baileys hacia el contrato canonico del backend conversacional.
- Salida `OUTGOING`: traducir el contrato canonico del backend hacia el contrato minimo que exige Baileys para enviar: identificador completo de destino, contenido de texto y/o URL de media.

En salida, `wa-backend` no debe intentar transportar todo el envelope canonico hacia Baileys. Debe tomar solo lo necesario y descartar lo que pueda entorpecer el envio.

## Fuentes Revisadas

Baileys actual:

- `wa-backend/src/core/whatsapp/message.handler.ts`
- `wa-backend/src/core/whatsapp/types.ts`
- `wa-backend/src/application/use-cases/handle-incoming.usecase.ts`
- `wa-backend/src/infrastructure/backend-api.client.ts`

Meta Inbox actual:

- `agora/api-backend-nest/src/webhooks/meta/meta.service.ts`
- `agora/api-backend-nest/src/actor-events/actor-events.service.ts`
- `agora/api-backend-nest/src/actor/pipelines/messages.processor.ts`
- `agora/api-backend-nest/src/meta-inbox/meta-inbox.service.ts`
- `agora/api-backend-nest/prisma/schema.prisma`

## Contrato Canonico Propuesto

Este envelope debe representar un evento conversacional independiente del canal:

```ts
type ConversationalEventEnvelope = {
  externalEventId: string;
  actorExternalId: string;
  provider: 'META' | 'BAILEYS';
  objectType: 'PAGE' | 'INSTAGRAM' | 'WHATSAPP';
  pipeline: 'MESSAGES' | 'CHANGES';
  eventType: string;
  occurredAt: string;
  receivedAt: string;
  payload: Record<string, unknown>;
};
```

Para mensajes visibles en inbox/thread:

```ts
type NormalizedMessagePayload = {
  platform: 'messenger' | 'instagram' | 'whatsapp';
  eventKind: string;
  senderId: string;
  recipientId: string;
  timestamp: number | string;
  message?: {
    mid?: string;
    text?: string;
    isEcho?: boolean;
    hasAttachments?: boolean;
    attachmentTypes?: string[];
    attachmentUrls?: string[];
    messageSource?: string;
    rawMessage?: unknown;
  };
  rawEvent: unknown;
};
```

## Regla Principal Para Baileys

`wa-backend` debe funcionar como traductor de borde.

Para mensajes entrantes:

- Recibe `messages.upsert`.
- Resuelve JID/LID completo.
- Resuelve el recipient real desde la cuenta WhatsApp conectada por QR.
- Extrae texto, media, timestamp y `msg.key.id`.
- Sube media si corresponde y obtiene URL publica/local usable.
- Construye un envelope canonico `INCOMING`.
- Conserva el raw completo para reprocesamiento.

Para mensajes salientes:

- Recibe una intencion de envio desde backend/n8n/panel.
- Resuelve destino completo: `jid` o `lid`.
- Extrae texto o URL de media.
- Valida el tipo de contenido.
- Construye el payload minimo que Baileys necesita.
- Descarta parametros canonicos que no sean necesarios para Baileys.

Esto evita dos errores:

- que el nucleo conversacional quede contaminado con detalles de Baileys;
- que Baileys reciba metadata de dominio que no sabe usar y que puede romper o ensuciar el contrato de envio.

## Matriz De Homologacion

| Concepto | Meta Inbox actual | Baileys actual | Homologacion recomendada | Estado |
| --- | --- | --- | --- | --- |
| Provider | `META` | No existe como campo; vive implicitamente en `wa-backend` | `provider: 'BAILEYS'` | Nace en Baileys |
| Object type | `PAGE` o `INSTAGRAM` | No existe | `objectType: 'WHATSAPP'` | Nace en Baileys |
| Actor externo | `event.sender.id` | `cliente_id` derivado de JID/LID | `actorExternalId = cliente_id` o JID canonico | Homologar |
| Recipient externo | `event.recipient.id` | numero de WhatsApp logueado por QR; disponible en `gateway.getSocket().user?.id` | `recipientId = jid/numero real conectado` | Nace/conservar |
| External event id | `message.mid` o fallback construido | `msg.key.id` disponible en raw, no usado hoy | `externalEventId = msg.key.id` con fallback deterministico | Homologar critico |
| Event type | `messaging.message`, `messaging.postback`, etc. | No existe; se parsea por tipo de payload | `eventType = 'messaging.message'` para mensajes entrantes | Nace |
| Event kind | `message`, `postback`, `message_echo`, etc. | `texto`, `imagen`, `audio`, `video`, `documento` | `eventKind = 'message'`; tipo contenido va en `messageType/contentType` | Cambia semantica |
| Direction | Derivada por processor: `INCOMING`, `OUTGOING`, `SYSTEM` | `direccion: 'input'` al guardar conversacion | `direction = 'INCOMING'` para mensajes no `fromMe` | Homologar |
| Echo / from me | `message.is_echo` | `msg.key.fromMe` | `message.isEcho = msg.key.fromMe` | Conservar |
| Timestamp | `event.timestamp` ms | `msg.messageTimestamp` segundos | `occurredAt = new Date(messageTimestamp * 1000)` | Homologar |
| Texto visible | `message.text` | `conversation`, `extendedTextMessage.text`, captions | `message.text` y `contentText` | Homologar |
| Media type | attachments `type` | `imageMessage`, `audioMessage`, `videoMessage`, `documentMessage` | `message.attachmentTypes`, `contentType`, `mediaType` | Homologar ampliado |
| Media URL | attachment payload URL | primero se descarga y se sube a `/media/guardar`; retorna URL | `attachmentUrls = [url_archivo]` | Homologar |
| Raw payload | `rawEvent`, `rawMessage` | `event.raw` contiene `messages.upsert` completo | Guardar `rawEvent` y `rawMessage` | Conservar critico |
| Source channel | `inbox_dm`, `post_comment_ref` | No existe | `sourceChannel = 'baileys_whatsapp'` o `whatsapp_socket` | Nace |
| Tipo ID | No existe | `tipo_id: 'jid' | 'lid'` | Guardar en `payload.wa.tipoId` o metadata | Conservar Baileys |
| Remote JID | No existe | `remoteJid`, `remoteJidAlt`, `senderPn`, `senderKey` | Guardar en `payload.wa.identifiers` | Conservar Baileys |
| Push name | Contact profile separado | `msg.pushName` | `contact.displayName` candidato y `payload.wa.pushName` | Homologar |
| Foto perfil | No viene en evento Meta normalizado | Puede existir en legacy, pero no se usara en el modelo nuevo | No persistir como dato operativo de `meta_inbox_contacts` | No usar |
| Grupos/broadcast | No procesado en Meta Inbox | Se ignoran `@g.us`, status, broadcast, newsletter | Mantener filtro antes de emitir evento | No migrar por ahora |
| Mensaje automatico Meta detectado en WA | No aplica | `META_AUTO_SIGNATURES` + map TTL | Metadata/heuristica local de Baileys | Conservar temporal |
| Modo piloto | No es parte de evento | `clientes/modo-piloto/estado` | Decision de routing posterior al evento, no campo canonico | Mover fuera |
| Proceso PG | No aplica directamente | `obtenerProceso/crearProceso` antes de guardar conversacion | Debe migrar a thread/session o bridge temporal | Campo que muere gradualmente |
| Mongo conversacion | No es fuente en Meta Inbox | Se guarda conversacion en Mongo | Proyeccion/compatibilidad, no contrato canonico | Muere o queda proyeccion |
| N8N payload | Meta usa cola/eventos/thread delegation | Baileys postea `{ cliente_id, contenido, tipo, url_archivo }` | N8N deberia recibir envelope o selector de thread + mensaje | Migrar con adaptador |
| Socket humano | Meta Inbox notifica por websocket notifier | Baileys emite directo `nuevoMensaje`, `emitirGlobito` | Notificacion desde backend/event bus, no desde adapter | Mover |

## Homologacion Thread / Proceso

Decision:

- `thread` sera el nombre canonico de la conversacion operativa.
- `proceso` queda como concepto legacy equivalente solo durante la transicion.
- `session_id` sera el identificador canonico que une `threads`, `thread_messages`, delegacion n8n y panel humano.
- `proceso_id` debe mapearse a `session_id` para no perder compatibilidad con rutas y flujos viejos.
- en el modelo final no existira `proceso_id` como identificador operativo.
- en el modelo final no existira `cliente_id` como identidad canonica del actor.
- en el modelo final no existira dependencia operativa de `map_journey`, `etiqueta_id` ni `clientes.etiqueta_actual`.
- todo desarrollo nuevo debe usar `thread`/`session_id` para conversaciones, `thread_stage` para etapa y actor/contact para personas o cuentas externas; `proceso_id`, `cliente_id`, `map_journey` y `etiqueta_actual` solo pueden aparecer en adaptadores legacy, backfill o metadata historica.

Matriz especifica:

| Concepto viejo | Concepto nuevo | Regla |
| --- | --- | --- |
| `proceso` | `thread` | Un proceso activo equivale al thread operativo de una conversacion. |
| `proceso_id` | `session_id` | `session_id` reemplaza al id conversacional principal; durante puente debe resolverse desde `proceso_id`. |
| `estado proceso` | `thread_status` | Abierto/cerrado/archivado se expresa como `OPEN`, `CLOSED`, `ARCHIVED`. |
| `map_journey` | `thread_stage` + historial/transiciones | El stage actual queda en `threads.thread_stage`; `map_journey` deja de ser fuente operativa. |
| `etiqueta_id` | stage key/template del modelo nuevo | El id legacy de etiqueta debe resolverse hacia el stage canonico cuando venga desde rutas viejas. |
| `nombre_etiqueta` | `thread_stage` | La etiqueta legible representa la etapa actual del hilo mientras no exista catalogo nuevo de stages. |
| `clientes.etiqueta_actual` | `thread_stage` | Proyeccion legacy del stage actual. |
| `stage_actual` | `thread_stage` | Equivalente cuando viene desde templates/flujo. |
| Mongo `conversaciones` | `thread_messages` | `thread_messages` sera la fuente canonica del historial visible. |

Regla operativa:

- Si un flujo viejo solo conoce `proceso_id`, el backend debe encontrar el `session_id` del thread equivalente.
- Si se crea un thread desde un proceso viejo, conservar `proceso_id` en `threads.metadata.legacy.proceso_id`.
- Despues de resolver el `session_id`, no se debe seguir propagando `proceso_id` por el flujo nuevo.
- Si un flujo viejo solo conoce `cliente_id`, el backend debe resolver el actor/contact equivalente y continuar con `actorExternalId`/contacto comun.
- Despues de resolver actor/contact, no se debe seguir usando `cliente_id` como identidad canonica.
- Si un flujo viejo escribe `map_journey`, `etiqueta_id` o `etiqueta_actual`, el backend debe resolver el `thread_stage` canonico.
- Despues de resolver `thread_stage`, no se debe seguir usando `map_journey` como fuente operativa de etapa.
- Nuevas conversaciones no deben depender de Mongo para construir el historial del panel humano.
- Mongo puede quedar como compatibilidad/backfill, pero no como fuente canonica futura.
- Datos de perfil como nombre, apellido, telefono, RUT, direccion, ciudad, region y notas deben vivir en `meta_inbox_contacts`, no en `threads` ni en `thread_messages`.
- Score, lifecycle, estado de actor e informacion de contacto deben unificarse con el modelo de Meta Inbox en vez de duplicarse en campos legacy de cliente.
- `wa-backend` no debe conocer ni crear `proceso_id`, ni tratar `cliente_id` como modelo de dominio; debe actuar como gateway/adaptador WhatsApp-Baileys y entregar eventos normalizados al backend conversacional.

Mapeo de estado:

| Condicion legacy | `thread_status` |
| --- | --- |
| `procesos.fecha_fin IS NULL` | `OPEN` |
| `procesos.fecha_fin IS NOT NULL` | `CLOSED` |
| Conversacion historica/inactiva fuera de operacion visible | `ARCHIVED` |

## Contrato INCOMING Para Baileys

Para entrada, Baileys puede cumplir el contrato porque `wa-backend` ve el evento completo:

- `msg.key.id`: id de mensaje candidato para idempotencia.
- `msg.key.remoteJid`: JID/LID principal.
- `msg.key.remoteJidAlt`: posible JID alternativo.
- `msg.key.senderPn`: PN real cuando entra LID.
- `msg.key.senderKey`: fallback cuando entra LID.
- `msg.key.fromMe`: echo/salida detectada por Baileys.
- `msg.messageTimestamp`: timestamp del mensaje.
- `msg.pushName`: nombre visible del contacto.
- `msg.message`: contenido real.
- `gateway.getSocket().user?.id`: cuenta WhatsApp conectada por QR; debe alimentar `recipientId`.

Importante:

- `recipientId` no es un literal generico como `bot`.
- `recipientId` debe representar el numero/JID real de WhatsApp que esta logueado en `wa-backend`.
- Hoy `wa-backend` ya obtiene ese dato en runtime con `gateway.getSocket().user?.id` y lo usa para estado con `runtimeState.setNumero(...)`.
- Para envelope canonico, se debe conservar lo mas completo posible. Si `user.id` viene con formato `569...:device@s.whatsapp.net`, se puede guardar:
  - `recipientId`: valor completo disponible.
  - `payload.wa.recipientRawId`: valor crudo de `socket.user.id`.
  - `payload.wa.recipientPhone`: numero limpio derivado si se necesita para UI.

## Clasificacion De Contenido Entrante Baileys

Regla base:

- No todo evento de Baileys debe convertirse en mensaje entrante de negocio.
- Los mensajes salientes que Baileys re-entrega como eventos (`fromMe`) no deben disparar flujo `INCOMING`.
- Llamadas y reacciones no son mensajes conversacionales procesables en esta etapa.

| Tipo/evento Baileys | Estado esperado | Contrato canonico | Nota |
| --- | --- | --- | --- |
| `msg.key.fromMe === true` | Ignorar como incoming | No emitir `INCOMING` | Puede auditarse como echo en el futuro, pero no debe disparar n8n/saludo |
| Llamada / call | Bloqueada o ignorada | No emitir mensaje | Debe permanecer bloqueada/no procesada |
| `reactionMessage` | Procesar como evento visible para humano | Evento de reaccion, no mensaje normal para n8n | Debe mostrarse en panel humano sin disparar saludo/modo piloto/n8n |
| Texto normal | Procesar | `messageType/contentType = text` | Incluye texto simple |
| Solo emojis | Procesar como texto | `text` | Un emoji enviado solo es contenido textual |
| Imagen sola | Procesar | `mediaType = image`, `text = [imagen]` | Requiere URL luego de subir media |
| Imagen con texto/caption | Procesar | `mediaType = image`, caption/text | Conservar caption como texto visible |
| Audio nota de voz | Procesar | `mediaType = audio` | Mantener URL de audio y marcar como audio |
| MP3/audio no grabado en conversacion | Procesar como audio/documento segun Baileys lo entregue | `mediaType = audio` si llega como `audioMessage`; si llega documento, `document` | No forzar a nota de voz si no corresponde |
| PDF/documento sin texto | Procesar | `mediaType/document`, `text = [documento]` | Conservar filename/ext/mimetype si existe |
| PDF/documento con texto/caption | Procesar | `document` + caption | Caption debe ir como texto visible |
| Video | No soportado para respuesta automatica | Mantener como unsupported o responder formato no soportado | No debe entrar como media canonica soportada por n8n si el flujo no lo maneja |
| Mensaje desconocido | No procesar como texto real | `unsupported` o ignorar segun decision | Evitar contaminar conversaciones con `[mensaje no soportado]` como si fuera texto del cliente |

Estado actual de codigo:

- [x] `fromMe` se ignora antes de procesar como entrante.
- [x] `reactionMessage` se procesa como reaccion visible para panel humano.
- [x] `call` se ignora explicitamente si llega dentro de `messages.upsert`.
- [ ] Falta modelar formalmente `unsupported` para video/desconocidos sin contaminar el texto conversacional.
- [ ] Falta diferenciar audio nota de voz versus audio archivo si Baileys entrega metadata suficiente.

Regla especifica para reacciones:

- Una reaccion no es texto nuevo del cliente para automatizacion.
- Debe verse en panel humano.
- Puede guardarse como conversacion legacy de tipo `texto` mientras no exista tipo `reaccion`.
- No debe disparar saludo, modo piloto ni webhook n8n.
- Debe conservar el `targetMessageId` del mensaje reaccionado cuando Baileys lo entregue en `reactionMessage.key.id`.

Campos canonicos que debe producir:

```ts
{
  externalEventId,
  actorExternalId,
  provider: 'BAILEYS',
  objectType: 'WHATSAPP',
  pipeline: 'MESSAGES',
  eventType: 'messaging.message',
  occurredAt,
  receivedAt,
  payload: {
    platform: 'whatsapp',
    eventKind: 'message',
    senderId,
    recipientId,
    message: {
      mid,
      text,
      isEcho,
      hasAttachments,
      attachmentTypes,
      attachmentUrls,
      messageSource: 'baileys_whatsapp',
      rawMessage,
    },
    media,
    wa,
    rawEvent,
  }
}
```

Regla para `externalEventId`:

- La fuente primaria debe ser Baileys/WhatsApp: `msg.key.id`.
- El valor canonico debe ser estable e idempotente.
- Para evitar colisiones entre providers o chats, en `wa-backend` se recomienda namespacing:

```ts
externalEventId = `baileys:${actorExternalId}:${msg.key.id}`
```

- El `msg.key.id` puro debe conservarse como `message.mid` o futuro `messageExternalId`.
- Si `msg.key.id` no existe, usar fallback deterministico con actor, timestamp y tipo de mensaje, nunca `Math.random()` para eventos entrantes.
- El fallback sirve solo para no perder eventos raros; no debe ser el camino normal.

Estado actual:

- [x] `wa-backend` ya construye `externalEventId` desde `msg.key.id` y lo agrega a payload n8n/socket humano.
- [ ] Falta guardar `messageExternalId`/`mid` puro en el envelope canonico cuando exista el endpoint/cola de eventos Baileys.

Regla:

- Si el mensaje es entrante real, `direction` derivada debe ser `INCOMING`.
- Si `fromMe` es `true`, el evento no debe entrar al flujo entrante normal; puede registrarse como echo/salida si se necesita auditoria, pero no debe disparar n8n ni saludo.

## Contrato OUTGOING Para Baileys

Para salida, el contrato canonico no debe pasar completo a Baileys. Debe transformarse a una orden minima de envio.

Entrada esperada desde backend/n8n/panel:

```ts
type BaileysOutgoingCommand = {
  destino?: string;
  cliente_id?: string;
  actorExternalId?: string;
  recipientId?: string;
  tipoId?: 'jid' | 'lid';
  tipo: 'texto' | 'imagen' | 'audio' | 'video' | 'documento';
  contenido?: string;
  url_archivo?: string;
};
```

O, si viene desde el contrato canonico:

```ts
type CanonicalOutgoingMessage = {
  actorExternalId: string;
  objectType: 'WHATSAPP';
  provider: 'BAILEYS';
  direction: 'OUTGOING';
  contentText?: string;
  contentJson?: {
    mediaType?: 'audio' | 'image' | 'video' | 'document';
    mediaUrl?: string;
    text?: string;
  };
  payload?: {
    wa?: {
      tipoId?: 'jid' | 'lid';
      resolvedJid?: string;
    };
  };
};
```

Salida hacia Baileys debe reducirse a:

```ts
{
  to: '56912345678@s.whatsapp.net',
  content: {
    text?: string,
    image?: Buffer,
    audio?: Buffer,
    video?: Buffer,
    document?: Buffer,
    caption?: string,
    mimetype?: string,
    ptt?: boolean
  }
}
```

Reglas de traduccion:

- `to` se construye desde el destino completo si existe (`actorExternalId`, `destino`, `cliente_id`).
- Si el destino viene sin sufijo, se construye con `tipoId`; si `tipoId` no viene, se asume `jid`.
- Para texto, solo debe pasar `text`.
- Para media, debe descargar `mediaUrl`/`url_archivo`, construir `Buffer`, tipo Baileys y metadata minima.
- Parametros de dominio como `threadId`, `sessionId`, `attentionMode`, `threadStage`, `actorScore`, `journey`, `proceso_id` no deben viajar hacia Baileys.
- Si falta `to`, texto o URL de media requerida, el comando debe rechazarse antes de llamar a Baileys.

Estado actual de codigo:

- [x] `wa-backend` tiene `toBaileysOutgoingCommand(...)` como traductor saliente.
- [x] Los endpoints salientes aceptan contrato legacy y campos homologados (`actorExternalId`, `recipientId`, `payload`, `message`, `media`).
- [x] La orden final hacia Baileys queda reducida a `to` + contenido minimo.
- [x] El panel humano recibe en eco saliente `actorExternalId` y `phone` sin perder `cliente_id`.
- [x] Prueba manual validada: desde Meta Inbox se envio mensaje saliente a actor WhatsApp creado por Baileys; `api-backend-nest` llamo a `wa_backend`, Baileys entrego al WhatsApp real de destino y el mensaje quedo visible/persistido.
- [ ] Falta idempotencia formal para salientes cuando el backend empiece a mandar `externalEventId`/`clientMessageId`.
- [ ] Falta decidir si la auditoria de salientes vive en `event_history`, en outbox/auditoria dedicada o en un modelo mixto.

Campos que deben descartarse al enviar por Baileys:

- `threadId`
- `sessionId`
- `threadStatus`
- `attentionMode`
- `threadStage`
- `actorScore`
- `actorLifecycleState`
- `journey`
- `map_journey`
- `proceso_id`
- `cliente` completo
- `rawEvent`
- `graphResponse`
- cualquier metadata que no participe en `to`, `tipo`, `texto`, `mediaUrl` o `caption`

Esto no significa perderlos: deben quedar en el backend como auditoria/contexto, pero no entrar al contrato de Baileys.

## Campos Que Deben Nacer En Baileys

Estos campos no existen hoy como contrato explicito, pero deben generarse para homologar:

- `provider: 'BAILEYS'`
- `objectType: 'WHATSAPP'`
- `pipeline: 'MESSAGES'`
- `eventType: 'messaging.message'`
- `eventKind: 'message'`
- `externalEventId` basado en `msg.key.id`
- `receivedAt`
- `payload.platform: 'whatsapp'`
- `payload.senderId`
- `payload.recipientId`
- `payload.wa.recipientRawId`
- `payload.wa.recipientPhone`
- `payload.message.mid`
- `payload.message.isEcho`
- `payload.message.hasAttachments`
- `payload.message.attachmentTypes`
- `payload.message.attachmentUrls`
- `payload.message.messageSource`
- `payload.wa.tipoId`
- `payload.wa.identifiers`
- `payload.rawEvent`

## Campos Que Deben Sobrevivir Por Ser Importantes Para Baileys

No se deben borrar ni perder durante la migracion:

- `tipo_id` (`jid` o `lid`): importante para responder al destino correcto.
- `remoteJid`: identificador original del chat.
- `remoteJidAlt`: puede contener PN real.
- `senderPn`: fallback importante cuando entra LID.
- `senderKey`: fallback importante cuando entra LID.
- `msg.key.id`: mejor candidato para idempotencia.
- `msg.key.fromMe`: permite distinguir echo/salida.
- `messageTimestamp`: tiempo real del mensaje.
- `pushName`: enrichment de contacto.
- `gateway.getSocket().user?.id`: numero/JID real de la cuenta WhatsApp conectada.
- `message` completo: necesario para tipos aun no soportados.
- media descargada/localizada: necesaria porque Baileys no entrega URL publica tipo Meta.

Ubicacion recomendada:

```ts
payload: {
  platform: 'whatsapp',
  ...,
  wa: {
    tipoId,
    remoteJid,
    remoteJidAlt,
    senderPn,
    senderKey,
    resolvedJid,
    recipientRawId,
    recipientPhone,
    pushName
  },
  rawEvent,
}
```

## Campos Que Pueden Morir Gradualmente

Estos campos son operativos del modelo viejo, no deberian ser el contrato canonico futuro:

- `cliente_id` como nombre principal del actor.
- `tipo_id` como campo top-level fuera del namespace `wa`.
- `proceso_id` como identificador conversacional principal.
- `map_journey` como fuente del stage actual.
- `etiqueta_id` como fuente directa de etapa operativa.
- `clientes.etiqueta_actual` como fuente principal del stage.
- `direccion: 'input' | 'output'` en favor de `direction: 'INCOMING' | 'OUTGOING' | 'SYSTEM'`.
- `tipo: 'texto' | 'imagen' | ...` en favor de `contentType/messageType/mediaType`, manteniendo adaptador legacy.
- `contenido` como unica representacion del mensaje.
- `url_archivo` como campo top-level unico; debe vivir tambien en attachments/media.
- Emisiones directas desde `wa-backend` a socket humano.
- Decisiones de modo piloto dentro del adapter Baileys.
- Mongo como fuente primaria del historial conversacional.

Importante:

- "Morir" no significa borrar ahora.
- Primero deben tener equivalente canonico y puente legacy.
- Para `cliente_id`, el equivalente canonico es actor/contact: identidad externa por provider, perfil comun, score, lifecycle y datos de contacto unificados.
- Contratos, abonados, SIM cards, Chilexpress y envios no son equivalente canonico del modelo conversacional; deben aislarse como dominio comercial/logistico diferido para un proyecto futuro.
- Si esos modulos dependen de `cliente_id`, `proceso_id`, Mongo o `map_journey`, no se deben migrar dentro del bridge Baileys/Meta. En la fase final deben quedar aislados, documentados o comentados si pueden causar errores runtime.

## Campos Que No Deben Homologarse 1:1

Algunos conceptos se parecen, pero no son lo mismo:

- `tipo` de Baileys no debe mapearse a `eventKind`. `eventKind` deberia ser `message`; `tipo` es contenido.
- `cliente_id` no siempre equivale al JID completo. Es actor, pero el JID completo debe conservarse aparte.
- `sourceChannel` de Meta (`inbox_dm`, `post_comment_ref`) no equivale a `tipo_id`. Para Baileys conviene `baileys_whatsapp` o `whatsapp_socket`.
- `proceso_id` no debe seguir siendo el nombre canonico, aunque durante la transicion debe poder resolverse como `session_id`.
- `cliente_id` no debe seguir siendo el nombre canonico del actor, aunque durante la transicion debe poder resolverse hacia actor/contact.
- `thread_stage` no debe duplicar indefinidamente `etiqueta_actual`; debe ser la fuente canonica y proyectarse hacia campos legacy solo mientras existan consumidores viejos.
- `map_journey` no debe seguir decidiendo el estado actual del flujo; si se conserva, debe ser historial/backfill o proyeccion legacy.

## Contrato Baileys Normalizado Propuesto

Ejemplo para texto entrante:

```json
{
  "externalEventId": "BAILEYS:message-id",
  "actorExternalId": "56912345678",
  "provider": "BAILEYS",
  "objectType": "WHATSAPP",
  "pipeline": "MESSAGES",
  "eventType": "messaging.message",
  "occurredAt": "2026-04-25T15:00:00.000Z",
  "receivedAt": "2026-04-25T15:00:01.000Z",
  "payload": {
    "platform": "whatsapp",
    "eventKind": "message",
    "senderId": "56912345678",
    "recipientId": "56999999999:1@s.whatsapp.net",
    "timestamp": 1777138800,
    "message": {
      "mid": "message-id",
      "text": "hola",
      "isEcho": false,
      "hasAttachments": false,
      "attachmentTypes": [],
      "attachmentUrls": [],
      "messageSource": "baileys_whatsapp",
      "rawMessage": {}
    },
    "wa": {
      "tipoId": "jid",
      "remoteJid": "56912345678@s.whatsapp.net",
      "remoteJidAlt": null,
      "senderPn": null,
      "senderKey": null,
      "resolvedJid": "56912345678@s.whatsapp.net",
      "recipientRawId": "56999999999:1@s.whatsapp.net",
      "recipientPhone": "56999999999",
      "pushName": "Cliente desde bot"
    },
    "rawEvent": {}
  }
}
```

Ejemplo para media entrante:

```json
{
  "externalEventId": "BAILEYS:message-id",
  "actorExternalId": "56912345678",
  "provider": "BAILEYS",
  "objectType": "WHATSAPP",
  "pipeline": "MESSAGES",
  "eventType": "messaging.message",
  "occurredAt": "2026-04-25T15:00:00.000Z",
  "receivedAt": "2026-04-25T15:00:01.000Z",
  "payload": {
    "platform": "whatsapp",
    "eventKind": "message",
    "senderId": "56912345678",
    "recipientId": "56999999999:1@s.whatsapp.net",
    "message": {
      "mid": "message-id",
      "text": "[audio]",
      "isEcho": false,
      "hasAttachments": true,
      "attachmentTypes": ["audio"],
      "attachmentUrls": ["https://.../uploads/file.ogg"],
      "messageSource": "baileys_whatsapp",
      "rawMessage": {}
    },
    "media": {
      "mediaType": "audio",
      "mediaUrl": "https://.../uploads/file.ogg",
      "mimeType": "audio/ogg"
    },
    "wa": {
      "tipoId": "jid",
      "resolvedJid": "56912345678@s.whatsapp.net"
    },
    "rawEvent": {}
  }
}
```

## Primer Corte Recomendado

No migrar todo de golpe. Crear una funcion pura en `wa-backend`:

```ts
normalizeBaileysIncomingEvent(upsert): ConversationalEventEnvelope | null
```

Esa funcion debe:

- Ignorar grupos/broadcast/newsletter como hoy.
- Resolver JID/LID sin perder identificadores originales.
- Extraer texto/media como hoy.
- Generar `externalEventId`.
- Construir envelope canonico.
- Mantener `rawEvent` completo.

Crear tambien, en el mismo espiritu, una funcion pura de salida:

```ts
toBaileysOutgoingCommand(input): {
  to: string;
  tipo: 'texto' | 'imagen' | 'audio' | 'video' | 'documento';
  text?: string;
  mediaUrl?: string;
  caption?: string;
}
```

Esa funcion debe:

- Aceptar el comando legacy actual o el mensaje canonico futuro.
- Resolver `to` de forma deterministica.
- Extraer solo texto/media/caption.
- Rechazar comandos incompletos.
- Descartar metadata no usada por Baileys.

Despues, en una segunda etapa, enviar ese envelope al `api-backend-nest` por un endpoint interno nuevo o cola, sin apagar todavia el flujo legacy.

## Estrategia De Migracion Segura

### Fase 1: Shadow Mode

- [x] Preservar extraccion legacy de `cliente_id` y agregar `actorExternalId` completo + `phone` en `wa-backend`.
- [x] Normalizar evento Baileys en `normalizeBaileysIncomingEvent(...)`.
- [x] Loguear resumen del envelope en shadow mode.
- [x] Normalizar comando saliente Baileys sin cambiar envio actual.
- [x] Comparar comando normalizado contra parametros actuales enviados a Baileys.
- [ ] Guardarlo en `event_history` como provider `BAILEYS` luego de migrar enum DB.
- [x] Mantener flujo legacy intacto.

### Fase 2: Dual Write Controlado

- [x] Crear endpoint interno `POST /internal/baileys/events` en `api-backend-nest`.
- [x] Encolar envelope Baileys en el pipeline comun de mensajes.
- [x] Crear `thread_messages` equivalente usando `session_id`.
- [x] Actualizar `threads` con resumen del mensaje y metadata legacy.
- [x] Seguir guardando en Mongo/procesos legacy.
- [ ] Guardar evento Baileys en `event_history` luego de aplicar enum DB `BAILEYS`/`WHATSAPP`.
- [ ] Comparar resultados.

### Fase 3: Routing Unificado

- [ ] N8N recibe evento/thread normalizado.
- [ ] Panel humano consume thread/message unificado.
- [ ] Baileys solo se encarga de entrada/salida del canal.
- [ ] Definir auditoria/idempotencia formal para mensajes salientes.
- [ ] Rutas nuevas dejan de aceptar `proceso_id` como identificador principal.
- [ ] Rutas nuevas dejan de aceptar `cliente_id` como identidad principal de actor/contact.
- [ ] Rutas nuevas dejan de escribir `map_journey`/`etiqueta_actual` como fuente de stage.
- [ ] Decisiones de negocio se ejecutan sobre `thread`, no sobre `proceso`.
- [ ] Decisiones de etapa se ejecutan sobre `thread_stage`, no sobre `map_journey`.
- [ ] Score, lifecycle y datos de contacto se leen desde actor/contact comun.

### Fase 4: Retiro Legacy

- [ ] Eliminar dependencia de `proceso_id` para conversaciones nuevas.
- [ ] Dejar `proceso_id` solo para lectura historica, backfill o auditoria legacy.
- [ ] Eliminar dependencia de `cliente_id` para identidad de actor en flujos nuevos.
- [ ] Dejar `cliente_id` solo como alias legacy resoluble hacia actor/contact.
- [ ] Eliminar dependencia de `map_journey` para stage operativo.
- [ ] Dejar `map_journey`/`etiqueta_actual` solo como lectura historica, backfill o proyeccion legacy.
- [ ] Convertir Mongo conversacion en proyeccion o lectura legacy.
- [ ] Aislar dominio de contratos/abonados/SIM/envios/Chilexpress para proyecto futuro.
- [ ] Comentar o desactivar acoples legacy de ese dominio que puedan fallar al retirar `cliente_id`, `proceso_id`, `map_journey` o Mongo conversacional.
- [ ] Mover modo piloto a decision de dominio, no del adapter.

## Riesgos De Migracion

- Perder `tipo_id` y responder mal a LID/JID.
- Duplicar mensajes si `externalEventId` no es estable.
- Cortar saludo/mode piloto antes de tener decision equivalente.
- Perder media si se cambia el orden de descarga/subida.
- Duplicar notificaciones al panel en dual-write.
- Mezclar thread/session con proceso legacy sin criterio claro.

## Checklist De Cierre De Homologacion

- [ ] Cada mensaje Baileys tiene `externalEventId` estable.
- [x] JID/LID empieza a conservarse como `actorExternalId` completo en `wa-backend`.
- [x] JID/LID se conserva en `payload.wa` dentro del envelope shadow.
- [ ] `actorExternalId` es consistente para el mismo contacto.
- [ ] Texto, audio, imagen, video y documento tienen representacion canonica.
- [ ] El raw completo queda disponible para re-procesamiento.
- [ ] Salidas hacia Baileys solo usan destino completo, texto, URL/media y caption.
- [ ] Metadata canonica no se filtra al contrato de envio Baileys.
- [ ] El flujo legacy sigue funcionando durante shadow/dual-write.
- [ ] N8N puede recibir un payload nuevo sin perder campos viejos.
- [ ] Panel puede mostrar mensaje desde Baileys y Meta usando la misma forma.
