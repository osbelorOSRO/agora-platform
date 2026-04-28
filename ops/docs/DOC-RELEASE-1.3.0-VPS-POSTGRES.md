# DOC-RELEASE-1.3.0-VPS-POSTGRES

Fecha: 2026-04-28

## Objetivo

Documentar el corte `v1.3.0` del repo y los cambios manuales requeridos en PostgreSQL para VPS.

Esta version cierra la migracion conversacional hacia el modelo `Threads`:

- `api_backend_nest` queda como nucleo conversacional.
- `wa_backend` queda como gateway Baileys/WhatsApp.
- `abackend` conserva acceso, auth y reportes, pero sus reportes conversacionales leen `thread_events`, `threads` y `meta_inbox_contacts`.
- `frontend` usa `THREADS` y `Agenda` conversacional; no usa Kanban/Chats legacy.
- `n8n` envia mensajes salientes solo por `POST /meta-inbox/n8n/send-thread-message`.

## Versiones de paquetes

Todos los paquetes operativos del repo quedan en `1.3.0`:

| Paquete | Version |
|---|---:|
| `agora/api-backend-nest` | `1.3.0` |
| `agora/frontend` | `1.3.0` |
| `agora/websocket` | `1.3.0` |
| `accesos/abackend` | `1.3.0` |
| `wa-backend` | `1.3.0` |

## Cambios principales

- Se elimina Mongo del nucleo conversacional.
- Se elimina el microservicio Mongo/RUT/procesos del runtime conversacional.
- Se elimina dependencia operativa de:
  - `clientes`
  - `procesos`
  - `map_journey`
  - `etiquetas`
  - `conversaciones`
  - `scraper_lotes`
  - `oficinas`
- `Postgres` queda como fuente de verdad para:
  - `threads`
  - `thread_messages`
  - `thread_events`
  - `meta_inbox_contacts`
  - `event_history`
  - `stage_templates`
  - `thread_offer_events`
- `ARCHIVED` se puede retomar y vuelve a `OPEN`.
- `CLOSED` no se reutiliza; crea un thread nuevo.
- `attention_mode` valido para el flujo nuevo: `N8N`, `HUMAN`, `SYSTEM`, `PAUSED`.
- Formatos canonicos de media saliente: `text`, `image`, `audio`, `document`, `video`.

## Precheck en VPS

Ejecutar contra la base correcta antes de tocar tablas:

```sql
SELECT current_database(), current_schema();
```

Validar tablas canonicas requeridas:

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'threads',
    'thread_messages',
    'thread_events',
    'meta_inbox_contacts',
    'event_history',
    'stage_templates',
    'thread_offer_events'
  )
ORDER BY table_name;
```

Validar enums que usa `event_history`:

```sql
SELECT t.typname, string_agg(e.enumlabel, ', ' ORDER BY e.enumsortorder) AS labels
FROM pg_type t
JOIN pg_enum e ON t.oid = e.enumtypid
WHERE t.typname IN ('provider_type', 'meta_object_type', 'pipeline_type')
GROUP BY t.typname
ORDER BY t.typname;
```

Esperado:

- `provider_type`: `META`, `BAILEYS`
- `meta_object_type`: `PAGE`, `INSTAGRAM`, `WHATSAPP`
- `pipeline_type`: `MESSAGES`, `CHANGES`, `TRANSITIONS`

## Backup obligatorio

Antes del SQL destructivo:

```bash
pg_dump -Fc "$DATABASE_URL" > agora_v1_3_0_pre_drop_$(date +%Y%m%d_%H%M%S).dump
```

Si se opera desde contenedor Postgres:

```bash
docker exec <postgres_container> pg_dump -U <user> -d <db> -Fc \
  > agora_v1_3_0_pre_drop_$(date +%Y%m%d_%H%M%S).dump
```

## SQL manual de limpieza legacy

Este SQL elimina tablas que ya no deben existir para `v1.3.0`.

```sql
BEGIN;

DROP TABLE IF EXISTS public.clientes CASCADE;
DROP TABLE IF EXISTS public.conversaciones CASCADE;
DROP TABLE IF EXISTS public.etiquetas CASCADE;
DROP TABLE IF EXISTS public.map_journey CASCADE;
DROP TABLE IF EXISTS public.mensajes_buffer CASCADE;
DROP TABLE IF EXISTS public.procesos CASCADE;
DROP TABLE IF EXISTS public.procesos_en_curso CASCADE;
DROP TABLE IF EXISTS public.scraper_lotes CASCADE;
DROP TABLE IF EXISTS public.input_chats_unicos CASCADE;
DROP TABLE IF EXISTS public.n8n_session_audio CASCADE;
DROP TABLE IF EXISTS public.colores CASCADE;
DROP TABLE IF EXISTS public.transiciones_comerciales CASCADE;

ALTER TABLE public.usuarios
  DROP CONSTRAINT IF EXISTS usuarios_oficina_id_fkey;

ALTER TABLE public.usuarios
  DROP COLUMN IF EXISTS oficina_id;

DROP TABLE IF EXISTS public.oficinas CASCADE;

COMMIT;
```

Los `NOTICE` de PostgreSQL por objetos inexistentes son correctos si el ambiente ya fue limpiado:

```txt
NOTICE: constraint "... " does not exist, skipping
NOTICE: table "... " does not exist, skipping
```

## Postcheck del SQL

Este query debe devolver cero filas:

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'clientes',
    'conversaciones',
    'etiquetas',
    'map_journey',
    'mensajes_buffer',
    'procesos',
    'procesos_en_curso',
    'scraper_lotes',
    'input_chats_unicos',
    'n8n_session_audio',
    'colores',
    'transiciones_comerciales',
    'oficinas'
  )
ORDER BY table_name;
```

Este query tambien debe devolver cero filas:

```sql
SELECT column_name
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'usuarios'
  AND column_name = 'oficina_id';
```

Validar que el nucleo conversacional sigue disponible:

```sql
SELECT
  (SELECT COUNT(*) FROM threads) AS threads,
  (SELECT COUNT(*) FROM thread_messages) AS thread_messages,
  (SELECT COUNT(*) FROM thread_events) AS thread_events,
  (SELECT COUNT(*) FROM meta_inbox_contacts) AS contacts;
```

## Regenerar Prisma despues del SQL

En VPS, usar el `DATABASE_URL` real del ambiente. Ejemplo con placeholder:

```bash
export DATABASE_URL='postgresql://USER:PASSWORD@HOST:5432/DB?schema=public'
```

Regenerar `api_backend_nest`:

```bash
cd /home/oscar/Documentos/GitHub/agora-platform/agora/api-backend-nest
npx prisma db pull
npx prisma generate
npm run build
```

Regenerar `abackend`:

```bash
cd /home/oscar/Documentos/GitHub/agora-platform/accesos/abackend
npx prisma db pull
npx prisma generate
npm run build
```

Verificacion esperada:

- `prisma db pull` introspecta la base sin modelos legacy.
- No aparecen modelos `clientes`, `procesos`, `map_journey`, `etiquetas`, `scraper_lotes`, `oficinas`.
- `npm run build` pasa en ambos backends.

## Rebuild de contenedores

Recomendado tras actualizar repo en VPS:

```bash
cd /home/oscar/Documentos/GitHub/agora-platform
docker compose -p stack_agora --env-file env/<perfil>.env -f agora/docker-compose.yml build api_backend_nest frontend
docker compose -p stack_agora --env-file env/<perfil>.env -f agora/docker-compose.yml up -d --force-recreate api_backend_nest frontend
```

Para `abackend`, usar el compose/perfil que corresponda a Accesos en ese host.

`wa_backend` no requiere cambios de BD por esta limpieza, pero queda versionado en `1.3.0`.

## Smoke tests recomendados

Backend Nest:

```bash
curl https://api.llevatuplan.cl/ping
curl https://api.llevatuplan.cl/meta-inbox/threads
```

Stage templates:

```bash
curl https://api.llevatuplan.cl/meta-inbox/stage-templates/inicio
```

n8n saliente:

```txt
POST /meta-inbox/n8n/send-thread-message
```

Reportes Accesos:

```txt
GET /reportes
GET /reportes/procesos
GET /reportes/procesos-semanales
GET /reportes/clientes-info
```

Aunque las rutas de reportes conserven nombres historicos, sus fuentes son:

- `thread_events`
- `threads`
- `meta_inbox_contacts`

No deben consultar `clientes` ni `procesos`.

## Auditoria npm

En el corte local de `v1.3.0`, estos paquetes quedaron con `npm audit --audit-level=moderate` en cero vulnerabilidades:

- `agora/api-backend-nest`
- `agora/frontend`
- `agora/websocket`
- `accesos/abackend`
- `wa-backend`

## Rollback

Si algo falla despues del drop:

1. Detener servicios que escriben en la base.
2. Restaurar backup:

```bash
pg_restore --clean --if-exists -d "$DATABASE_URL" agora_v1_3_0_pre_drop_<fecha>.dump
```

3. Volver al commit anterior a `v1.3.0`.
4. Regenerar Prisma y reconstruir contenedores.

## Criterio de cierre

La migracion PostgreSQL de `v1.3.0` queda correcta cuando:

- las tablas legacy indicadas no existen;
- `usuarios.oficina_id` no existe;
- `api_backend_nest` y `abackend` generan Prisma y compilan;
- `Threads`, `Agenda`, reportes y n8n operan sobre `threads/thread_events/meta_inbox_contacts`;
- no hay dependencias runtime de Mongo, scraping legacy, `cliente_id`, `proceso_id`, `map_journey` ni `etiquetas`.
