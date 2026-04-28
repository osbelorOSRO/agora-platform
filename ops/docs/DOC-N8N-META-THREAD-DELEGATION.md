# DOC-N8N-THREADS-DELEGATION

Fecha: 2026-04-28

## Objetivo

Documentar el contrato actual entre `api_backend_nest` y `n8n` para operar conversaciones sobre el modelo comun de `threads`, tanto Meta (`PAGE`, `INSTAGRAM`) como Baileys/WhatsApp (`WHATSAPP`).

Este documento reemplaza el enfoque viejo de `clientes`, `procesos`, `map_journey`, Mongo conversacional y endpoints directos de `wa_backend` desde n8n.

## Principios

- `api_backend_nest` es el nucleo conversacional.
- `wa_backend` solo mantiene conexion Baileys y ejecuta envios WhatsApp cuando Nest lo pide.
- `n8n` no crea procesos, no usa `cliente_id`, no usa `proceso_id`, no consulta Mongo y no decide bootstrap de thread.
- `n8n` recibe contexto de `thread`, `message`, `actor` y `contact`.
- `sessionId` es el identificador canonico de trabajo.
- `thread_messages` es el historial visible y auditable.
- `thread_events` es la fuente unificada de estadistica/eventos del thread.
- `thread_stage` reemplaza `map_journey` y etiquetas legacy.
- `attention_mode` decide si el mensaje entrante se delega a `n8n`, humano o sistema.

## Variables n8n vigentes

Variables que pueden quedar en `n8n/env/<perfil>.env`:

```txt
N8N_CUSTOM_API_TOKEN=http://abackend:4002/api/service-auth/service-token
N8N_CUSTOM_API_SCRAPER=<url externa del scraper movistar>/scrapear-async
N8N_CUSTOM_API_STATUS=<url externa del scraper movistar>/status/
N8N_CUSTOM_WHISPER=http://whisper-stt:9000/asr?output=json&task=transcribe&language=es
N8N_CUSTOM_TESSERACT=http://tesseract-ocr:8884/tesseract
N8N_CUSTOM_API_DAEMON=<url daemon externo si aplica>
N8N_CUSTOM_API_CALLBACK=http://api_backend_nest:4001/actor/msg-delegation/complete
```

Variables retiradas:

```txt
N8N_CUSTOM_API_BOT
N8N_CUSTOM_API_CONVERSACION
N8N_CUSTOM_API_HISTORIAL
N8N_CUSTOM_API_SUBPROCESOS
N8N_CUSTOM_API_CERRAR
N8N_CUSTOM_API_DELEGAR
N8N_CUSTOM_API_ESTADOS
```

## Flujo general

1. Llega un mensaje desde Meta o Baileys.
2. Nest normaliza el evento.
3. Nest registra `event_history`.
4. Nest crea o retoma `thread`.
5. Nest persiste `thread_messages`.
6. Nest registra `thread_events`.
7. Nest actualiza resumen de `threads`.
8. Si `attention_mode = N8N` y el thread esta delegable, Nest llama al webhook de n8n.
9. n8n decide respuesta, etapa, contacto u oferta.
10. n8n llama endpoints protegidos de Nest.
11. Nest decide si el saliente se envia por Meta Graph o por Baileys.
12. Nest persiste y notifica al frontend.

## Reglas de thread

- `OPEN`: se reutiliza.
- `ARCHIVED`: se puede retomar; al llegar incoming o al preparar envio, vuelve a `OPEN`.
- `CLOSED`: no se reutiliza como hilo operativo; se crea un thread nuevo.
- `PAUSED`: se persiste incoming, pero no se delega a n8n.

Regla clave: `ARCHIVED` es recuperable; `CLOSED` es final para ese `sessionId`.

## Webhook Agora -> n8n

Ruta esperada en n8n:

```txt
POST /webhook/meta-thread-messages-delegation
```

URL publica esperada:

```txt
https://automate.llevatuplan.cl/webhook/meta-thread-messages-delegation
```

Header:

```txt
Authorization: Bearer <N8N_SECRET_TOKEN>
```

Respuesta minima:

```json
{
  "accepted": true
}
```

Nest solo necesita aceptacion HTTP. El workflow de n8n puede seguir trabajando y luego llamar endpoints de Nest.

## Payload enviado a n8n

Ejemplo conceptual:

```json
{
  "externalEventId": "baileys:56979555395@s.whatsapp.net:ABC123",
  "actorExternalId": "56979555395@s.whatsapp.net",
  "sessionId": "BAILEYS:WHATSAPP:56979555395@s.whatsapp.net",
  "occurredAt": "2026-04-28T12:00:00.000Z",
  "provider": "BAILEYS",
  "objectType": "WHATSAPP",
  "threadStatus": "OPEN",
  "attentionMode": "N8N",
  "threadStage": "inicio",
  "thread": {
    "sessionId": "BAILEYS:WHATSAPP:56979555395@s.whatsapp.net",
    "actorExternalId": "56979555395@s.whatsapp.net",
    "objectType": "WHATSAPP",
    "sourceChannel": "baileys_whatsapp",
    "threadStatus": "OPEN",
    "attentionMode": "N8N",
    "threadStage": "inicio",
    "displayName": "Oscar",
    "phone": "56979555395"
  },
  "contact": {
    "displayName": "Oscar",
    "phone": "56979555395",
    "email": null,
    "city": null,
    "notes": null
  },
  "actor": {
    "actorExternalId": "56979555395@s.whatsapp.net",
    "objectType": "WHATSAPP",
    "score": null,
    "lifecycleState": "NEW"
  },
  "message": {
    "externalEventId": "baileys:56979555395@s.whatsapp.net:ABC123",
    "messageExternalId": "ABC123",
    "eventKind": "message",
    "direction": "INCOMING",
    "senderType": "ACTOR",
    "messageType": "text",
    "sourceChannel": "baileys_whatsapp",
    "contentText": "Hola",
    "structuredPayload": null,
    "media": null
  }
}
```

Para Meta, `provider = META` y `objectType = PAGE` o `INSTAGRAM`.

## Endpoint publico de matriz de stage

```txt
GET /meta-inbox/stage-templates/:stageActual
```

Uso:

- consultar caminos del stage actual;
- leer `stage_route`;
- decidir proximo `threadStage`.

Ejemplo:

```bash
curl https://api.llevatuplan.cl/meta-inbox/stage-templates/inicio
```

Este endpoint no usa bearer token.

## Endpoints protegidos para n8n

Todos usan:

```txt
Authorization: Bearer <N8N_SECRET_TOKEN>
Content-Type: application/json
```

Base publica:

```txt
https://api.llevatuplan.cl
```

Base interna desde n8n:

```txt
http://api_backend_nest:4001
```

## 1. Resolver thread

```txt
POST /meta-inbox/n8n/resolve-thread
```

Uso:

- apoyo/debug;
- resolver un thread por `actorExternalId + objectType` si el workflow no tiene `sessionId`;
- no reemplaza el bootstrap de Nest.

Payload:

```json
{
  "actorExternalId": "56979555395@s.whatsapp.net",
  "objectType": "WHATSAPP",
  "includeClosed": false
}
```

Nota: `includeClosed = false` es lo normal. Un thread `CLOSED` no debe retomarse para operar.

## 2. Control del thread

```txt
PATCH /meta-inbox/n8n/thread-control
```

Uso:

- cambiar `threadStatus`;
- cambiar `attentionMode`;
- cambiar `threadStage`.

Payload recomendado:

```json
{
  "sessionId": "BAILEYS:WHATSAPP:56979555395@s.whatsapp.net",
  "threadStatus": "OPEN",
  "attentionMode": "N8N",
  "threadStage": "intencion_ofertas"
}
```

Valores esperados:

```txt
threadStatus: OPEN | ARCHIVED | CLOSED
attentionMode: HUMAN | N8N | SYSTEM | PAUSED
threadStage: string canonico del stage
```

Regla:

- para sacar de operacion temporalmente, usar `ARCHIVED`;
- para cierre final, usar `CLOSED`;
- para derivar a humano, usar `attentionMode = HUMAN` y stage canonico, por ejemplo `delegacion_humano`.

## 3. Actualizar contacto

```txt
PATCH /meta-inbox/n8n/contact
```

Uso:

- enriquecer `meta_inbox_contacts`;
- guardar datos de agenda/contacto;
- no escribir estos datos dentro de mensajes.

Payload:

```json
{
  "sessionId": "BAILEYS:WHATSAPP:56979555395@s.whatsapp.net",
  "displayName": "Oscar",
  "phone": "56979555395",
  "email": "oscar@example.com",
  "city": "Santiago",
  "notes": "Pidio informacion de portabilidad"
}
```

## 4. Enviar mensaje saliente unificado

Endpoint principal:

```txt
POST /meta-inbox/n8n/send-thread-message
```

Uso:

- endpoint multiproposito para salientes de `N8N`;
- decide internamente Meta Graph vs Baileys;
- persiste `thread_messages`;
- registra `thread_events`;
- actualiza `threads`;
- notifica al frontend.

Payload base:

```json
{
  "sessionId": "BAILEYS:WHATSAPP:56979555395@s.whatsapp.net",
  "senderType": "N8N",
  "text": "Hola, te ayudo con eso."
}
```

Tambien puede resolver por actor si no hay `sessionId`:

```json
{
  "actorExternalId": "56979555395@s.whatsapp.net",
  "objectType": "WHATSAPP",
  "senderType": "N8N",
  "text": "Hola, te ayudo con eso."
}
```

Regla recomendada: usar siempre `sessionId` cuando venga en el webhook.

### Formatos soportados

El nombre canonico del formato es siempre ingles, igual para Meta y Baileys:

```txt
text
image
audio
document
video
```

No usar `imagen`, `audio_wa`, `archivo`, `destino`, `cliente_id` ni `proceso_id` en contratos nuevos.

### Texto

```json
{
  "sessionId": "BAILEYS:WHATSAPP:56979555395@s.whatsapp.net",
  "senderType": "N8N",
  "text": "Hola, te ayudo con eso."
}
```

### Imagen

```json
{
  "sessionId": "BAILEYS:WHATSAPP:56979555395@s.whatsapp.net",
  "senderType": "N8N",
  "mediaType": "image",
  "mediaUrl": "https://media.llevatuplan.cl/uploads/oferta.jpg"
}
```

### Texto + imagen

```json
{
  "sessionId": "BAILEYS:WHATSAPP:56979555395@s.whatsapp.net",
  "senderType": "N8N",
  "text": "Te dejo la oferta recomendada.",
  "caption": "Te dejo la oferta recomendada.",
  "mediaType": "image",
  "mediaUrl": "https://media.llevatuplan.cl/uploads/oferta.jpg"
}
```

Nota: para proveedores que solo acepten caption con media, Nest debe usar `caption` como texto visible asociado al archivo.

### Audio

```json
{
  "sessionId": "BAILEYS:WHATSAPP:56979555395@s.whatsapp.net",
  "senderType": "N8N",
  "mediaType": "audio",
  "mediaUrl": "https://media.llevatuplan.cl/uploads/audio.m4a",
  "mimeType": "audio/mp4"
}
```

No se fuerza texto + audio.

### Documento

```json
{
  "sessionId": "BAILEYS:WHATSAPP:56979555395@s.whatsapp.net",
  "senderType": "N8N",
  "mediaType": "document",
  "mediaUrl": "https://media.llevatuplan.cl/uploads/contrato.pdf",
  "fileName": "informacion.pdf",
  "mimeType": "application/pdf"
}
```

### Texto + documento

```json
{
  "sessionId": "BAILEYS:WHATSAPP:56979555395@s.whatsapp.net",
  "senderType": "N8N",
  "text": "Te dejo el documento.",
  "caption": "Te dejo el documento.",
  "mediaType": "document",
  "mediaUrl": "https://media.llevatuplan.cl/uploads/informacion.pdf",
  "fileName": "informacion.pdf",
  "mimeType": "application/pdf"
}
```

### Video

```json
{
  "sessionId": "BAILEYS:WHATSAPP:56979555395@s.whatsapp.net",
  "senderType": "N8N",
  "mediaType": "video",
  "mediaUrl": "https://media.llevatuplan.cl/uploads/video.mp4",
  "mimeType": "video/mp4"
}
```

Video se trata como formato soportado por contrato. Si el proveedor real no lo acepta, Nest debe devolver error claro y registrar evento fallido.

## 5. Eventos de oferta

Crear evento:

```txt
POST /meta-inbox/n8n/offer-events
```

Consultar por id:

```txt
GET /meta-inbox/n8n/offer-events/:id
```

Consultar por filtros:

```txt
GET /meta-inbox/n8n/offer-events?sessionId=...&codigo=...&decision=...
```

Payload minimo:

```json
{
  "sessionId": "BAILEYS:WHATSAPP:56979555395@s.whatsapp.net",
  "stageActual": "rut_factible",
  "tipo": "alta",
  "codigo": "P001",
  "decision": "indefinido"
}
```

Uso:

- registrar oferta presentada, aceptada, objetada o rechazada;
- conservar snapshot auditable de oferta;
- alimentar estadisticas desde threads/eventos, no desde procesos legacy.

## Scraper Movistar

El scraper queda fuera del nucleo conversacional.

Variables disponibles en n8n:

```txt
N8N_CUSTOM_API_SCRAPER
N8N_CUSTOM_API_STATUS
```

Reglas:

- el scraper no llama `/scraping/tarea`;
- el scraper no llama `/scraping/respuesta`;
- el scraper no persiste en Mongo;
- el scraper no usa `proceso_id`;
- si necesita correlacion, usa `sessionId` o su `scraper_id` interno;
- el resultado del scraper solo entra al thread si n8n decide llamar endpoints conversacionales de Nest.

Ejemplo conceptual:

1. n8n recibe mensaje delegado.
2. n8n llama `N8N_CUSTOM_API_SCRAPER`.
3. n8n consulta `N8N_CUSTOM_API_STATUS`.
4. n8n procesa el resultado.
5. n8n actualiza contacto, stage o envia mensaje usando endpoints de `meta-inbox/n8n`.

## Endpoints retirados del flujo n8n

No usar:

```txt
wa_backend:3000/api/enviar-desde-n8n
api_backend_nest:4001/n8n/conversacion/*
api_backend_nest:4001/mongo/procesos/*
api_backend_nest:4001/clientes/*
fastapi_microservicio:8500/n8n_procesos/*
/scraping/tarea
/scraping/respuesta
```

## Orden recomendado del workflow n8n

1. Recibir webhook `meta-thread-messages-delegation`.
2. Tomar `sessionId`, `threadStage`, `attentionMode`, `message.contentText`, `message.media`.
3. Consultar `GET /meta-inbox/stage-templates/:stageActual` si necesita matriz.
4. Ejecutar logica del workflow.
5. Si usa scraper, llamarlo como servicio externo independiente.
6. Si hay datos nuevos del actor, llamar `PATCH /meta-inbox/n8n/contact`.
7. Si cambia etapa/modo/estado, llamar `PATCH /meta-inbox/n8n/thread-control`.
8. Si envia respuesta, llamar `POST /meta-inbox/n8n/send-thread-message`.
9. Si presenta oferta, llamar `POST /meta-inbox/n8n/offer-events`.

## Validacion minima

- Incoming Meta con `attentionMode=N8N` llega a n8n con `sessionId`.
- Incoming Baileys con `attentionMode=N8N` llega al mismo webhook.
- n8n envia texto por `send-thread-message`.
- n8n envia imagen con `mediaType=image`.
- n8n envia texto + imagen usando `caption`.
- n8n envia documento con `mediaType=document`.
- `ARCHIVED` se puede retomar y vuelve a `OPEN`.
- `CLOSED` crea un thread nuevo.
- No aparece `cliente_id`, `proceso_id`, `map_journey`, Mongo ni `wa_backend/enviar-desde-n8n` en workflows nuevos.
