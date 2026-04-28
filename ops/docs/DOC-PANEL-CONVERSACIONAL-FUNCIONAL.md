# DOC-PANEL-CONVERSACIONAL-FUNCIONAL

Fecha: 2026-04-26

## Objetivo

Definir la forma funcional del panel humano cuando el modelo conversacional final ya no dependa de `cliente_id`, `proceso_id`, `map_journey`, `etiqueta_actual` ni Mongo conversacional.

El panel final no debe tener dos modulos separados para `Chats/Kanban` y `Meta Inbox`. Debe existir un modulo conversacional unico basado en:

- `threads`
- `thread_messages`
- actor/contact
- `thread_stage`
- `thread_status`
- `attention_mode`
- provider/canal

`Meta` no debe ser el nombre final del modulo, porque Meta es un provider. El modulo debe representar conversaciones/atencion/inbox multicanal.

## Vistas Principales

El modulo debe tener tres controles principales:

- `OPEN`
- `ARCHIVED`
- `CLOSED`

Cada control opera una vista de actores/threads.

### OPEN / Inbox

Vista principal de operacion.

Debe mostrar todo lo que esta activo y siendo operado:

- conversaciones nuevas;
- conversaciones en bot/n8n;
- conversaciones delegadas a humano;
- conversaciones abiertas por canal WhatsApp, Instagram, Page u otros providers futuros.

Esta vista puede llamarse `Inbox`, `Open` o equivalente operativo. Debe priorizar lectura rapida y accion.

### ARCHIVED

Muestra solo threads archivados.

`ARCHIVED` significa fuera de operacion visible, no necesariamente cerrado comercialmente.

### CLOSED

Muestra solo threads cerrados.

El cierre del flujo debe operar con `thread_status = CLOSED`, no con cierre de proceso legacy.

## Tarjeta Compacta De Thread / Actor

La tarjeta debe optimizar espacio. No debe gastar texto en estados que pueden representarse mejor con iconos o chips compactos.

Informacion recomendada:

- icono de provider/canal:
  - Instagram;
  - Page/Messenger;
  - WhatsApp;
- si es WhatsApp, mostrar telefono o prefijo identificable derivado del actor id;
- nombre/display name si existe, pero no como dato totalmente confiable ni dominante;
- ultimo mensaje en formato truncado, estilo notificacion:
  - ejemplo: `si por supuesto ind...`;
- tiempo relativo:
  - ejemplo: `hace 1 min`;
- stage legible:
  - ejemplo tecnico: `delegacion_humano`;
  - ejemplo visual: `Delegado Humano`;
- indicador de `attention_mode` mediante icono/color, no texto largo.
- acciones de tarjeta con iconos lucide:
  - cerrar;
  - archivar;
  - reabrir;
  - asignar/tomar;
  - menu contextual;
  - enviar;
  - adjuntar;
  - audio.

## Attention Mode Visual

`attention_mode` debe ser una senal visual compacta y brillante:

- `HUMAN`: azul brillante.
- `N8N`: rojo brillante.
- `BOT`: verde brillante.

La tarjeta no debe ocupar espacio escribiendo `HUMAN`, `N8N` o `BOT` como texto principal si un icono/color lo comunica mejor.

El espacio textual debe priorizar:

- ultimo mensaje;
- identificador legible del actor/contacto;
- stage actual;
- tiempo relativo.

Iconografia recomendada:

- usar iconos de `lucide-react` siempre que exista un icono adecuado;
- `HUMAN`: icono tipo usuario/agente, por ejemplo `UserRound`, `Headset` o equivalente;
- `N8N`: icono de automatizacion/flujo, por ejemplo `Workflow`, `Network` o equivalente;
- `BOT`: icono `Bot`;
- cada icono debe tener tooltip o `aria-label` con el significado exacto;
- evitar escribir `HUMAN`, `N8N` o `BOT` como texto visible en la tarjeta salvo en filtros, tooltips o vistas de detalle.

Regla general:

- reemplazar texto operativo repetitivo por iconos lucide cuando reduzca ruido visual;
- mantener texto para datos que diferencian la conversacion: ultimo mensaje, actor/contacto, stage, tiempo y busqueda;
- no inventar SVGs manuales si existe icono lucide suficiente.

## Stage Visual

`thread_stage` debe mostrarse de forma legible y llamativa.

Ejemplo:

- valor tecnico: `delegacion_humano`;
- display recomendado: `Delegado Humano`;
- color recomendado: verde brillante u otro color consistente para stage operativo.

El stage visible debe venir del modelo comun (`thread_stage`), no desde `map_journey` ni `etiqueta_actual`.

## Busqueda Global Y Filtros

La parte superior de la vista debe tener busqueda global con filtros.

Es un componente critico porque puede haber muchas conversaciones simultaneas, incluso 50 o mas, y muchas pueden aparecer como `Nuevo` si no hay nombre confiable.

Debe permitir buscar o filtrar por:

- texto del ultimo mensaje;
- texto historico del thread si el backend lo soporta;
- nombre/display name;
- telefono;
- JID/LID/actor id;
- provider/canal;
- `thread_status`;
- `attention_mode`;
- `thread_stage`;
- fecha/ultimo mensaje;
- asignacion humana si se implementa;
- archivados/cerrados segun vista.

La busqueda debe ayudar a diferenciar actores/contactos aunque no tengan nombre confiable.

## Relacion Con Modulos Actuales

### Meta Inbox

Debe convertirse en la base funcional del modulo conversacional comun, porque ya trabaja con `threads`, `thread_messages`, estados y tiempo real.

No debe quedar como modulo exclusivo de Meta.

### Chats / Kanban

No debe mantenerse como modulo separado al final de la migracion.

Pero no se debe borrar sin rescatar capacidades utiles.

Se deben evaluar y rescatar:

- busqueda o navegacion rapida;
- manejo de muchas conversaciones;
- acciones de operador;
- componentes utiles de chat;
- patrones de lectura rapida.

Se deben retirar o aislar:

- contratos dentro de `FloatingChat` o tarjeta de info cliente;
- tarjeta scraping;
- cierre de proceso;
- dependencias de `cliente_id`, `proceso_id`, `map_journey`, `etiqueta_actual` y Mongo conversacional.

### Agenda

El modulo Agenda actual depende de `clientes`/`clientesLite`.

En el modelo final debe mantener el nombre visual `Agenda`, pero redisenarse sobre:

- actor/contact;
- `meta_inbox_contacts` como tabla base de perfiles;
- threads;
- tareas/eventos vinculados a actor/contact;
- o quedar como frente separado si requiere logica propia.

No debe quedar dependiendo de `clientes` como fuente final.

Reglas de migracion:

- `Agenda` es el modulo visual; `contactos` son perfiles/actores resolubles por `actor_external_id + object_type`.
- Debe permitir filtrar por provider/canal, identificador, nombre, telefono, lifecycle, score y actividad conversacional.
- Debe permitir crear contactos para mensajeria Baileys/WhatsApp.
- No debe exponer eliminacion fisica; no se usara `DELETE` para contactos nuevos.
- Cualquier salida de vista debe modelarse como lifecycle, archivado, oculto, inactivo o filtro.

### Reportes / Graficas De Procesos

Las graficas actuales basadas en procesos no tienen migracion directa automatica.

Deben redisenarse sobre metricas del modelo nuevo:

- threads abiertos/cerrados/archivados;
- threads por stage;
- volumen por provider;
- tiempo a primera respuesta;
- tiempo en atencion humana;
- handoff N8N/BOT/HUMAN;
- mensajes entrantes/salientes;
- cierres por periodo;
- carga por operador si existe asignacion.

## Criterios De Cierre

- [ ] Existe un modulo conversacional unico multicanal.
- [ ] `OPEN`, `ARCHIVED` y `CLOSED` filtran por `thread_status`.
- [ ] La vista `OPEN` funciona como inbox operativo.
- [ ] Las tarjetas usan iconos/colores para provider y `attention_mode`.
- [ ] El ultimo mensaje tiene mas prioridad visual que textos de estado largos.
- [ ] `thread_stage` se muestra desde el modelo comun y no desde legacy.
- [ ] Existe busqueda global util para muchos actores/threads sin nombre confiable.
- [ ] Chats/Kanban no queda como modulo conversacional separado.
- [ ] Se rescatan capacidades utiles de Chats/Kanban antes de retirarlo.
- [ ] Contratos, scraping y cierre de proceso quedan retirados o aislados.
- [ ] Agenda deja de depender de `clientes` como fuente final.
- [ ] Reportes/graficas dejan de depender de procesos legacy como fuente final.
