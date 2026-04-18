# DOC-META-INBOX-THREADS-SQL

Fecha: 2026-04-17

## Objetivo
- Mantener `threads` como capa operativa del inbox.
- Unificar el historial visible en una sola tabla: `thread_messages`.
- Dejar `n8n_message_sessions` solo como fuente legacy de backfill durante la transición.
- Recordatorio: este SQL se aplica manualmente en VPS.

## Alcance
- Crear `threads`
- Crear `thread_messages`
- Crear índices mínimos
- Backfill de `thread_messages` desde `n8n_message_sessions`
- Backfill y recálculo de `threads` desde `thread_messages`

## SQL manual

```sql
CREATE TABLE IF NOT EXISTS threads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id varchar(255) NOT NULL UNIQUE,
  actor_external_id varchar(255) NOT NULL,
  object_type varchar(32) NOT NULL,
  source_channel varchar(32) NULL,
  thread_status varchar(32) NOT NULL DEFAULT 'OPEN',
  attention_mode varchar(32) NOT NULL DEFAULT 'N8N',
  thread_stage varchar(64) NOT NULL DEFAULT 'inicio',
  awaiting_first_incoming_delegate boolean NOT NULL DEFAULT false,
  last_message_text text NULL,
  last_direction varchar(16) NULL,
  last_message_at timestamptz NULL,
  last_incoming_at timestamptz NULL,
  last_outgoing_at timestamptz NULL,
  opened_at timestamptz NOT NULL DEFAULT now(),
  paused_at timestamptz NULL,
  archived_at timestamptz NULL,
  closed_at timestamptz NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_threads_actor_object
ON threads(actor_external_id, object_type);

CREATE INDEX IF NOT EXISTS idx_threads_status_last_message
ON threads(thread_status, last_message_at DESC NULLS LAST);

ALTER TABLE threads
ADD COLUMN IF NOT EXISTS awaiting_first_incoming_delegate boolean NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS thread_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id varchar(255) NOT NULL,
  external_event_id varchar(255) NOT NULL UNIQUE,
  message_external_id varchar(255) NULL,
  actor_external_id varchar(255) NOT NULL,
  provider varchar(32) NOT NULL DEFAULT 'META',
  object_type varchar(32) NOT NULL,
  source_channel varchar(32) NULL,
  event_kind varchar(64) NOT NULL,
  direction varchar(16) NOT NULL,
  content_text text NULL,
  content_json jsonb NULL,
  in_reply_to_external_event_id varchar(255) NULL,
  status varchar(32) NOT NULL DEFAULT 'received',
  occurred_at timestamptz NOT NULL,
  received_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_thread_messages_session_time
ON thread_messages(session_id, occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_thread_messages_actor_object_time
ON thread_messages(actor_external_id, object_type, occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_thread_messages_direction
ON thread_messages(direction);
```

## Backfill de `thread_messages`

```sql
INSERT INTO thread_messages (
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
  content_json,
  in_reply_to_external_event_id,
  status,
  occurred_at,
  received_at,
  created_at,
  updated_at
)
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
  content_json,
  in_reply_to_external_event_id,
  status,
  occurred_at,
  received_at,
  created_at,
  updated_at
FROM n8n_message_sessions
ON CONFLICT (external_event_id) DO NOTHING;
```

## Backfill inicial de `threads`

```sql
INSERT INTO threads (
  session_id,
  actor_external_id,
  object_type,
  source_channel,
  last_message_text,
  last_direction,
  last_message_at,
  last_incoming_at,
  last_outgoing_at,
  metadata
)
SELECT DISTINCT ON (s.session_id)
  s.session_id,
  s.actor_external_id,
  s.object_type,
  s.source_channel,
  s.content_text,
  s.direction,
  s.occurred_at,
  (
    SELECT s2.occurred_at
    FROM thread_messages s2
    WHERE s2.session_id = s.session_id
      AND s2.direction = 'INCOMING'
    ORDER BY s2.occurred_at DESC
    LIMIT 1
  ),
  (
    SELECT s3.occurred_at
    FROM thread_messages s3
    WHERE s3.session_id = s.session_id
      AND s3.direction = 'OUTGOING'
    ORDER BY s3.occurred_at DESC
    LIMIT 1
  ),
  jsonb_build_object('backfilledFrom', 'thread_messages')
FROM thread_messages s
WHERE s.direction IN ('INCOMING', 'OUTGOING')
ORDER BY s.session_id, s.occurred_at DESC
ON CONFLICT (session_id) DO NOTHING;
```

## Recalculo de preview visible

```sql
WITH visible_last AS (
  SELECT DISTINCT ON (s.session_id)
    s.session_id,
    s.content_text,
    s.direction,
    s.occurred_at
  FROM thread_messages s
  WHERE s.direction IN ('INCOMING', 'OUTGOING')
  ORDER BY s.session_id, s.occurred_at DESC
),
visible_incoming AS (
  SELECT
    s.session_id,
    MAX(s.occurred_at) AS last_incoming_at
  FROM thread_messages s
  WHERE s.direction = 'INCOMING'
  GROUP BY s.session_id
),
visible_outgoing AS (
  SELECT
    s.session_id,
    MAX(s.occurred_at) AS last_outgoing_at
  FROM thread_messages s
  WHERE s.direction = 'OUTGOING'
  GROUP BY s.session_id
)
UPDATE threads t
SET
  last_message_text = vl.content_text,
  last_direction = vl.direction,
  last_message_at = vl.occurred_at,
  last_incoming_at = vi.last_incoming_at,
  last_outgoing_at = vo.last_outgoing_at,
  updated_at = now()
FROM visible_last vl
LEFT JOIN visible_incoming vi ON vi.session_id = vl.session_id
LEFT JOIN visible_outgoing vo ON vo.session_id = vl.session_id
WHERE t.session_id = vl.session_id;
```

## Limpieza opcional de hilos solo-system

```sql
DELETE FROM threads t
WHERE NOT EXISTS (
  SELECT 1
  FROM thread_messages s
  WHERE s.session_id = t.session_id
    AND s.direction IN ('INCOMING', 'OUTGOING')
);
```

## Normalizacion opcional de multimedia legacy

Si el historial viejo trae adjuntos en `content_json.message.attachments[*]` pero no tiene
`content_json.mediaType` / `content_json.mediaUrl`, se puede normalizar así:

```sql
UPDATE thread_messages
SET content_json = jsonb_strip_nulls(
  COALESCE(content_json, '{}'::jsonb) ||
  jsonb_build_object(
    'mediaType',
    CASE
      WHEN lower(content_json #>> '{message,attachments,0,type}') IN ('audio', 'image')
        THEN lower(content_json #>> '{message,attachments,0,type}')
      ELSE NULL
    END,
    'mediaUrl',
    NULLIF(content_json #>> '{message,attachments,0,payload,url}', '')
  )
)
WHERE
  (content_json ->> 'mediaUrl' IS NULL OR content_json ->> 'mediaType' IS NULL)
  AND lower(content_json #>> '{message,attachments,0,type}') IN ('audio', 'image')
  AND NULLIF(content_json #>> '{message,attachments,0,payload,url}', '') IS NOT NULL;
```

## Validaciones

```sql
SELECT COUNT(*) FROM thread_messages;
SELECT COUNT(*) FROM threads;

SELECT session_id, actor_external_id, object_type, thread_status, attention_mode, thread_stage, last_message_at
FROM threads
ORDER BY last_message_at DESC
LIMIT 20;

SELECT session_id, external_event_id, direction, content_text, occurred_at
FROM thread_messages
ORDER BY occurred_at DESC
LIMIT 20;
```

## Notas
- A partir de esta fase, el historial del inbox se considera `thread_messages`.
- `n8n_message_sessions` queda solo como tabla legacy para transición/backfill.
- Defaults de un thread nuevo:
  - `OPEN`
  - `N8N`
  - `inicio`
- Regla operativa importante:
  - `PAUSED` se conserva si ya existe
  - `ARCHIVED/CLOSED` + incoming debe abrir una atención nueva operativa
