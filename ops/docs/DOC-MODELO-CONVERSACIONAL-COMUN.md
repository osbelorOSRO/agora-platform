# DOC-MODELO-CONVERSACIONAL-COMUN

## Objetivo

Homologar el modelo antiguo de `cliente/proceso/map_journey/conversaciones Mongo` con el modelo nuevo de Meta Inbox basado en `threads` y `thread_messages`.

La decision base es que el modelo nuevo no debe copiar todos los nombres antiguos. Debe absorber su significado operativo y dejar los campos viejos como puente, metadata o proyeccion mientras se migra.

## Decision De Modelo

`threads` sera la capa operativa principal de una conversacion.

`thread_messages` sera el historial visible y auditable de mensajes.

`meta_inbox_contacts` sera el perfil comun del actor/contacto, tambien para Baileys. No debe mezclarse informacion de perfil como RUT, direccion o ciudad dentro del historial del hilo salvo que sea parte del contenido de un mensaje.

Mongo dejara de ser la fuente principal del historial conversacional. Durante la transicion puede seguir recibiendo datos como compatibilidad, pero el historial que el panel humano debe leer a futuro es `thread_messages`.

Decision final:

- el modelo final no tendra `proceso_id` como concepto operativo;
- el modelo final no tendra `cliente_id` como identidad canonica del actor;
- el modelo final no dependera de `map_journey`, `etiqueta_id` ni `clientes.etiqueta_actual` como fuente de etapa;
- todo flujo conversacional nuevo debe vivir en `threads` y sus elementos asociados;
- `proceso_id` existe solo como deuda legacy para resolver, backfillear o leer datos historicos durante la migracion;
- `cliente_id` existe solo como alias/puente legacy para resolver al actor o contacto correspondiente;
- `map_journey` y `etiqueta_actual` existen solo como historial/proyeccion legacy mientras se migra;
- ningun desarrollo nuevo debe tomar `proceso_id` como identificador principal de conversacion.
- ningun desarrollo nuevo debe tomar `cliente_id` como identificador principal de persona/contacto.
- ningun desarrollo nuevo debe tomar `map_journey` o `etiqueta_actual` como fuente principal de stage.

El concepto nuevo para la persona, cuenta externa o participante de la conversacion es `actor`. La informacion enriquecida y editable de ese actor debe vivir en el modelo comun de contacto/perfil, complementando lo que ya existe en Meta Inbox.

## Matriz De Homologacion

| Modelo antiguo | Modelo nuevo | Regla |
| --- | --- | --- |
| `proceso` | `thread` | Un proceso activo equivale al thread operativo de una conversacion. |
| `proceso_id` | `session_id` | `session_id` reemplaza al identificador conversacional principal. En puente legacy debe poder resolverse desde `proceso_id`. |
| `estado del proceso` | `thread_status` | Estado operativo del hilo: `OPEN`, `CLOSED`, `ARCHIVED`. |
| `map_journey` | `thread_stage` + stage history/eventos | El stage actual vive en `threads.thread_stage`; `map_journey` deja de ser fuente y puede quedar como historial/backfill legacy. |
| `etiqueta_id` | stage key/template del modelo nuevo | El id legacy de etiqueta no debe ser fuente de stage. Debe resolverse al stage canonico si llega desde rutas viejas. |
| `nombre_etiqueta` | `thread_stage` | La etiqueta/stage canonico debe usar el nombre legible de la etapa mientras no exista un catalogo nuevo de stages. |
| `clientes.etiqueta_actual` | `threads.thread_stage` | `etiqueta_actual` es solo proyeccion legacy del stage actual. |
| `stage_actual` | `threads.thread_stage` | Si viene de templates/flujo, debe converger al mismo valor canonico. |
| `conversaciones` Mongo | `thread_messages` | El historial debe migrar a `thread_messages`; Mongo queda legacy/proyeccion. |
| `direccion_mensaje` | `direction` | `input/output` se mapea a `INCOMING/OUTGOING`. |
| `contenido` | `content_text` | Texto visible del mensaje. |
| `url_archivo` | `content_json.mediaUrl` / attachments | URL de media como parte del contenido estructurado. |
| `cliente_id` | `actor_external_id` / `contact` | Alias legacy del actor. Debe resolverse a identidad de actor y perfil de contacto comun. |
| datos operativos del cliente | `actor_score` / `actor_lifecycle_state` / metadata de actor | Score, lifecycle y estado del actor deben vivir en el modelo actor/contact, no como campos sueltos de cliente legacy. |
| datos extra del cliente | `meta_inbox_contacts` | Perfil editable/contactable: nombre, telefono, RUT, direccion, ciudad, region, notas. |

## Reglas De Identidad

`thread` es la conversacion operativa canonica. `proceso` solo es equivalente durante la transicion desde el modelo viejo.

`session_id` es el identificador estable que une:

- la fila en `threads`;
- los mensajes en `thread_messages`;
- la delegacion a n8n;
- el panel humano.

Durante la migracion:

- si existe `proceso_id`, debe conservarse en `threads.metadata.legacy.proceso_id`;
- si un flujo viejo solo conoce `proceso_id`, el backend debe resolver el `session_id` correspondiente;
- no se deben crear dos historiales paralelos para la misma conversacion.
- una vez resuelto el `session_id`, el resto del flujo debe continuar en modelo `thread`; no se debe propagar `proceso_id` a capas nuevas.

Reglas para codigo nuevo:

- endpoints nuevos deben aceptar `session_id` o identificador de `thread`, no `proceso_id`;
- endpoints nuevos deben aceptar `actorExternalId`, `contactId` o el identificador canonico que se defina para actor/contact, no `cliente_id`;
- cambios de etapa nuevos deben escribir `threads.thread_stage` o el mecanismo de stage comun, no `map_journey`/`etiqueta_actual`;
- n8n nuevo debe recibir contexto de `thread`/`message` y actor/contact, no depender de `cliente_id` + `proceso_id`;
- panel humano nuevo debe leer y escribir sobre `threads`, `thread_messages` y `meta_inbox_contacts`;
- Baileys no debe conocer `proceso_id` ni usar `cliente_id` como concepto canonico; solo debe entregar eventos normalizados con identificadores externos de actor y ejecutar comandos de envio;
- cualquier uso de `proceso_id` o `cliente_id` debe quedar encapsulado en adaptadores legacy o scripts de migracion.

## Estado Del Thread

Mapeo recomendado:

| Estado antiguo | Condicion | `thread_status` |
| --- | --- | --- |
| Proceso abierto/activo | `procesos.fecha_fin IS NULL` | `OPEN` |
| Proceso cerrado | `procesos.fecha_fin IS NOT NULL` | `CLOSED` |
| Inactivo sin proceso abierto | sin proceso abierto y sin necesidad operativa inmediata | `ARCHIVED` o lectura historica |

`ARCHIVED` no debe significar "cerrado comercialmente" necesariamente. Debe usarse para sacar un thread de la operacion visible sin borrar historial.

## Stage Del Thread

`threads.thread_stage` debe ser el stage operativo actual y la fuente canonica de etapa, siguiendo el modelo que ya funciona en Meta Inbox.

Fuentes legacy que deben migrar o proyectarse:

- `clientes.etiqueta_actual`
- `etiquetas.nombre_etiqueta`
- `stage_templates.stage_actual`
- `map_journey.etiqueta_id -> etiquetas.nombre_etiqueta`

Regla:

- el panel nuevo debe leer `thread_stage`;
- n8n nuevo y rutas nuevas deben leer/escribir `thread_stage`;
- los sistemas viejos pueden seguir leyendo `etiqueta_actual` solo durante la transicion;
- si una ruta vieja escribe `map_journey` o `etiqueta_actual`, debe existir un adaptador que lo proyecte a `thread_stage`;
- si una ruta nueva cambia `thread_stage`, solo se proyecta hacia `etiqueta_actual`/`map_journey` mientras existan consumidores legacy;
- la meta final es dejar de depender de `map_journey` para el stage operativo.

## Historial De Mensajes

`thread_messages` reemplaza el rol de historial conversacional que hoy cumple Mongo.

Cada mensaje debe guardar:

- `session_id`;
- `external_event_id`;
- `message_external_id` si existe;
- `actor_external_id`;
- `provider`;
- `object_type`;
- `source_channel`;
- `event_kind`;
- `direction`;
- `content_text`;
- `content_json`;
- `occurred_at`;
- `received_at`.

Mongo puede quedar temporalmente como:

- compatibilidad para endpoints viejos;
- fuente de backfill;
- lectura legacy de procesos anteriores.

No debe ser la fuente nueva para inbox/historial humano.

## Implicacion Para Baileys

Cuando `wa-backend` emita un envelope Baileys hacia `api-backend-nest`, el backend debe:

1. resolver o crear `thread`;
2. obtener un `session_id`;
3. escribir el mensaje en `thread_messages`;
4. actualizar resumen del `thread`;
5. mantener puente legacy hacia `proceso_id` solo mientras sea necesario.

Esto permite que WhatsApp/Baileys y Meta Inbox compartan el mismo modelo de conversacion.

`wa-backend` no debe ser cerebro conversacional ni orquestador de negocio. Su responsabilidad final es ser gateway experto de WhatsApp/Baileys: mantener conexion, QR, reconexion, eventos crudos/normalizados, media y envio. Las decisiones de estado, stage, routing, delegacion, historial y atencion humana pertenecen al backend conversacional comun.

## Dominio Comercial Diferido

Contratos, abonados, SIM cards, estados de envio, Chilexpress y logistica asociada no forman parte del nucleo conversacional final.

Ese dominio debe quedar aislado para un proyecto futuro. Puede estar relacionado historicamente con `cliente_id`, `proceso_id`, Mongo o rutas legacy, pero no debe bloquear la migracion del modelo conversacional a `threads`, `thread_messages`, `thread_stage` y actor/contact.

Reglas:

- no migrar contratos/abonados/SIM/logistica como parte del cierre del nucleo conversacional;
- no mezclar campos de contrato o envio dentro de `thread_messages`;
- si el panel necesita mostrar datos comerciales, debe hacerlo como datos relacionados, no como fuente del thread;
- en la ultima fase, identificar acoples legacy que puedan romper por retiro de `cliente_id`, `proceso_id`, `map_journey` o Mongo;
- cualquier codigo de contratos/abonados/SIM/envios que dependa del modelo viejo y no tenga reemplazo en este proyecto debe quedar aislado, documentado o comentado para no causar errores runtime;
- ese aislamiento debe preservar la posibilidad de retomarlo como proyecto propio despues.

## Contactos

`meta_inbox_contacts` se amplia como tabla comun de perfil del actor:

- `display_name`
- `first_name`
- `last_name`
- `phone`
- `rut`
- `address`
- `email`
- `notes`
- `city`
- `region`
- `metadata`

Regla:

- `threads` conserva estado operacional de la conversacion.
- `thread_messages` conserva mensajes/eventos visibles.
- `meta_inbox_contacts` conserva datos de contacto y negocio que pueden alimentar contratos, validaciones o enriquecimiento posterior.
- `actor` representa la identidad externa o participante conversacional; `contact` representa el perfil enriquecido/contactable de ese actor.
- `cliente_id` no debe reemplazarse de golpe si aun alimenta flujos legacy, pero debe complementarse y resolverse hacia actor/contact hasta desaparecer del modelo operativo.
- score, lifecycle, origen, etiquetas de actor y atributos de contacto deben unificarse con el modelo que ya funciona en Meta Inbox, evitando duplicar datos entre Baileys y Meta.
- si un mismo humano aparece por Meta y WhatsApp, el modelo debe permitir relacionar identidades de provider distintas con un perfil/contacto comun cuando exista evidencia suficiente.

### Agenda

El modulo visual seguira llamandose `Agenda`, pero su fuente final no debe ser `clientes` ni `clientes-lite`.

Decision:

- `Agenda` es el nombre de interfaz para administrar y encontrar contactos.
- `Contactos` son perfiles basados en `meta_inbox_contacts`.
- La identidad operativa del contacto se resuelve por `actor_external_id + object_type`.
- La agenda debe poder clasificar y filtrar contactos de forma similar al buscador del inbox conversacional:
  - nombre/display name;
  - telefono;
  - RUT;
  - email;
  - JID/LID/actor id;
  - provider/canal (`WHATSAPP`, `INSTAGRAM`, `PAGE`);
  - lifecycle;
  - score;
  - ultimo thread/stage/status cuando exista.
- La agenda debe permitir crear contactos para mensajeria Baileys/WhatsApp.
- Crear un contacto Baileys no obliga a crear un thread inmediatamente; puede dejar preparada la identidad WhatsApp para iniciar o resolver conversacion despues.
- No se debe usar `DELETE` para contactos en la agenda nueva.
- Si un contacto debe salir de una vista, debe manejarse con estado, lifecycle, metadata, archivado/oculto/inactivo o filtros, no con borrado fisico.
- Durante la transicion, la agenda puede convivir con lecturas legacy de `clientes-lite`, pero el desarrollo nuevo debe orientarse a `meta_inbox_contacts`.
- Si se usa la tabla legacy `clientes` para enriquecer la agenda, solo deben migrarse:
  - `cliente_id` -> `phone` y `actor_external_id = <cliente_id>@s.whatsapp.net`;
  - `nombre` -> `display_name`.
- Para esos registros, `object_type = WHATSAPP`; si se requiere fuente/proveedor, usar metadata minima como `source = legacy` y `provider = BAILEYS`.
- No migrar a `meta_inbox_contacts` campos legacy como `foto_perfil`, `etiqueta_actual`, `estado_actual`, `fecha_actual`, `intervenida`, `creado_por_id` o `actualizado_por_id`.

SQL manual disponible:

```txt
ops/docs/meta_inbox_contacts_common_fields.sql
```

## Bootstrap Conversacional

La decision de saludar al primer mensaje entrante pasa a una capa comun (`ConversationBootstrapService`).

Estado actual:

- Meta puede seguir enviando saludo desde bootstrap usando su sender Graph.
- Baileys queda preparado para usar la misma decision, pero el envio debe hacerse por un sender especifico de Baileys/`wa-backend`.
- Mientras el sender comun no exista, Baileys no debe intentar enviar saludo por Graph.
- Los endpoints internos ya aceptan `objectType = WHATSAPP` para resolver threads/contactos; el envio saliente por `MetaInboxService` bloquea `WHATSAPP` con error explicito hasta implementar sender provider-aware.

## Pendientes Tecnicos

- Definir la tabla o regla exacta para resolver `proceso_id -> session_id` desde rutas legacy, solo como mecanismo temporal de migracion.
- Definir la regla exacta para resolver `cliente_id -> actor/contact` desde rutas legacy, solo como mecanismo temporal de migracion.
- Definir la regla exacta para migrar `map_journey`/`etiqueta_id`/`etiqueta_actual` hacia `thread_stage` y futuro historial de stages.
- [x] Agregar `legacy.proceso_id` en metadata de `threads` cuando el evento Baileys venga desde flujo antiguo.
- [x] Crear dual-write controlado desde Baileys hacia `thread_messages`.
- [x] Ampliar `meta_inbox_contacts` como perfil comun de contacto.
- [x] Extraer decision de saludo inicial a bootstrap conversacional comun.
- Crear sender provider-aware: Meta -> Graph, Baileys -> `wa-backend`.
- Migrar lecturas del panel humano desde Mongo hacia `thread_messages`.
- Migrar n8n y rutas nuevas para operar por `session_id`/`thread` y actor/contact, no por `proceso_id`/`cliente_id`.
- Migrar cambios de etapa para operar por `thread_stage`, no por `map_journey`/`etiqueta_actual`.
- Retirar escrituras conversacionales nuevas hacia `proceso_id`, `cliente_id` como identidad canonica, `map_journey` como fuente de stage y Mongo cuando el panel y n8n ya lean el modelo comun.
- Aislar o comentar acoples del dominio diferido de contratos/abonados/SIM/envios que dependan de legacy y puedan causar errores al retirar el modelo viejo.
- Definir si `ARCHIVED` se usara automaticamente para inactividad o solo por accion explicita.

## Bridge Baileys Aplicado

Entrada interna:

```txt
POST /internal/baileys/events
```

Responsabilidad:

- recibe el envelope normalizado desde `wa-backend`;
- fuerza `provider = BAILEYS`, `objectType = WHATSAPP`, `pipeline = MESSAGES`;
- encola el evento como `baileys.message`;
- el processor comun resuelve/crea `session_id`;
- escribe `thread_messages`;
- actualiza `threads`;
- conserva `payload.legacy.proceso_id` en `threads.metadata.legacy`.

El flujo legacy sigue vivo porque `wa-backend` primero guarda en `clientes/procesos/Mongo` y luego hace dual-write al bridge. Si el bridge falla, la operacion vieja no se corta.

SQL requerido para que `event_history` acepte Baileys:

```sql
ALTER TYPE provider_type ADD VALUE IF NOT EXISTS 'BAILEYS';
ALTER TYPE meta_object_type ADD VALUE IF NOT EXISTS 'WHATSAPP';
```

Sin ese SQL, `thread_messages` y `threads` pueden funcionar porque usan `varchar`, pero `event_history` no podra persistir provider/object type de Baileys.
