import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma/prisma.service';

@Injectable()
export class MetaInboxSchemaService {
  constructor(private readonly prisma: PrismaService) {}

  // raw: DDL e idempotent migrations — la API de modelos Prisma no soporta CREATE/ALTER/CREATE INDEX
  async ensureSchema(): Promise<void> {
    await this.prisma.$executeRawUnsafe(`
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
      )
    `);
    await this.prisma.$executeRawUnsafe(`
      ALTER TABLE threads
      ADD COLUMN IF NOT EXISTS awaiting_first_incoming_delegate boolean NOT NULL DEFAULT false
    `);
    await this.prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS idx_threads_actor_object
      ON threads(actor_external_id, object_type)
    `);
    await this.prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS idx_threads_status_last_message
      ON threads(thread_status, last_message_at DESC NULLS LAST)
    `);
    await this.prisma.$executeRawUnsafe(`
      ALTER TABLE stage_templates
      ADD COLUMN IF NOT EXISTS stage_route varchar(64) NULL
    `);
    await this.prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS meta_inbox_contacts (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        actor_external_id varchar(255) NOT NULL,
        object_type varchar(32) NOT NULL,
        display_name varchar(120) NOT NULL DEFAULT 'Nuevo',
        first_name varchar(120) NULL,
        last_name varchar(120) NULL,
        phone varchar(50) NULL,
        rut varchar(20) NULL,
        address varchar(250) NULL,
        email varchar(200) NULL,
        notes text NULL,
        city varchar(120) NULL,
        region varchar(120) NULL,
        metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        UNIQUE(actor_external_id, object_type)
      )
    `);
    await this.prisma.$executeRawUnsafe(`
      ALTER TABLE meta_inbox_contacts
      ADD COLUMN IF NOT EXISTS city varchar(120) NULL
    `);
    await this.prisma.$executeRawUnsafe(`
      ALTER TABLE meta_inbox_contacts
      ADD COLUMN IF NOT EXISTS first_name varchar(120) NULL,
      ADD COLUMN IF NOT EXISTS last_name varchar(120) NULL,
      ADD COLUMN IF NOT EXISTS rut varchar(20) NULL,
      ADD COLUMN IF NOT EXISTS address varchar(250) NULL,
      ADD COLUMN IF NOT EXISTS region varchar(120) NULL,
      ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb
    `);
    await this.prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS wa_ad_leads (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        source_id text NOT NULL,
        session_id varchar(255) NOT NULL,
        actor_external_id varchar(255) NULL,
        pn_jid varchar(255) NULL,
        lid_jid varchar(255) NULL,
        source_url text NULL,
        title text NULL,
        thumbnail_url text NULL,
        original_image_url text NULL,
        first_message_text text NULL,
        metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
        first_seen_at timestamptz NOT NULL DEFAULT now(),
        last_seen_at timestamptz NOT NULL DEFAULT now(),
        seen_count integer NOT NULL DEFAULT 1,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        UNIQUE(source_id, session_id)
      )
    `);
    await this.prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS idx_wa_ad_leads_source_seen
      ON wa_ad_leads(source_id, first_seen_at DESC)
    `);
    await this.prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS idx_wa_ad_leads_session
      ON wa_ad_leads(session_id)
    `);
    await this.prisma.$executeRawUnsafe(`
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
      )
    `);
    await this.prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS idx_thread_messages_session_time
      ON thread_messages(session_id, occurred_at DESC)
    `);
    await this.prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS idx_thread_messages_actor_object_time
      ON thread_messages(actor_external_id, object_type, occurred_at DESC)
    `);
    await this.prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS idx_thread_messages_direction
      ON thread_messages(direction)
    `);
    await this.prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS thread_events (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        session_id varchar(255) NOT NULL,
        thread_id uuid NULL,
        actor_external_id varchar(255) NOT NULL,
        object_type varchar(32) NOT NULL,
        event_type varchar(64) NOT NULL,
        event_source varchar(32) NOT NULL DEFAULT 'SYSTEM',
        from_value text NULL,
        to_value text NULL,
        user_id text NULL,
        username text NULL,
        external_event_id varchar(255) NULL,
        message_external_id varchar(255) NULL,
        direction varchar(16) NULL,
        provider varchar(32) NULL,
        source_channel varchar(32) NULL,
        metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
        occurred_at timestamptz NOT NULL DEFAULT now(),
        created_at timestamptz NOT NULL DEFAULT now(),
        dedupe_key text NULL UNIQUE
      )
    `);
    await this.prisma.$executeRawUnsafe(`
      ALTER TABLE thread_events
      ADD COLUMN IF NOT EXISTS dedupe_key text NULL UNIQUE,
      ADD COLUMN IF NOT EXISTS message_external_id varchar(255) NULL,
      ADD COLUMN IF NOT EXISTS direction varchar(16) NULL,
      ADD COLUMN IF NOT EXISTS provider varchar(32) NULL,
      ADD COLUMN IF NOT EXISTS source_channel varchar(32) NULL
    `);
    await this.prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS idx_thread_events_session_time
      ON thread_events(session_id, occurred_at DESC)
    `);
    await this.prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS idx_thread_events_type_time
      ON thread_events(event_type, occurred_at DESC)
    `);
    await this.prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS idx_thread_events_actor_object_time
      ON thread_events(actor_external_id, object_type, occurred_at DESC)
    `);
    await this.prisma.$executeRawUnsafe(`
      INSERT INTO thread_events (
        session_id, thread_id, actor_external_id, object_type, event_type,
        event_source, to_value, provider, source_channel, metadata, occurred_at, dedupe_key
      )
      SELECT
        t.session_id, t.id, t.actor_external_id, t.object_type, 'THREAD_CREATED', 'SYSTEM',
        t.thread_status,
        CASE WHEN t.object_type = 'WHATSAPP' THEN 'BAILEYS' ELSE 'META' END,
        t.source_channel,
        jsonb_build_object('backfilledFrom', 'threads', 'attentionMode', t.attention_mode, 'threadStage', t.thread_stage),
        COALESCE(t.opened_at, t.created_at, now()),
        'THREAD_CREATED:' || t.session_id
      FROM threads t
      ON CONFLICT (dedupe_key) DO NOTHING
    `);
    await this.prisma.$executeRawUnsafe(`
      INSERT INTO thread_events (
        session_id, thread_id, actor_external_id, object_type, event_type, event_source,
        external_event_id, message_external_id, direction, provider, source_channel, metadata, occurred_at, dedupe_key
      )
      SELECT
        m.session_id, t.id, m.actor_external_id, m.object_type,
        CASE WHEN m.direction = 'OUTGOING' THEN 'MESSAGE_OUTGOING' ELSE 'MESSAGE_INCOMING' END,
        CASE
          WHEN m.direction = 'OUTGOING' THEN COALESCE(NULLIF(m.content_json->>'senderType', ''), 'SYSTEM')
          ELSE COALESCE(m.provider, 'META')
        END,
        m.external_event_id, m.message_external_id, m.direction, m.provider, m.source_channel,
        jsonb_build_object('backfilledFrom', 'thread_messages', 'eventKind', m.event_kind, 'status', m.status, 'messageType', COALESCE(m.content_json->>'messageType', NULL)),
        m.occurred_at,
        (CASE WHEN m.direction = 'OUTGOING' THEN 'MESSAGE_OUTGOING:' ELSE 'MESSAGE_INCOMING:' END) || m.external_event_id
      FROM thread_messages m
      LEFT JOIN threads t ON t.session_id = m.session_id
      ON CONFLICT (dedupe_key) DO NOTHING
    `);
    await this.prisma.$executeRawUnsafe(`
      INSERT INTO thread_messages (
        session_id, external_event_id, message_external_id, actor_external_id,
        provider, object_type, source_channel, event_kind, direction,
        content_text, content_json, in_reply_to_external_event_id,
        status, occurred_at, received_at, created_at, updated_at
      )
      SELECT
        session_id, external_event_id, message_external_id, actor_external_id,
        provider, object_type, source_channel, event_kind, direction,
        content_text, content_json, in_reply_to_external_event_id,
        status, occurred_at, received_at, created_at, updated_at
      FROM n8n_message_sessions
      ON CONFLICT (external_event_id) DO NOTHING
    `);
    await this.prisma.$executeRawUnsafe(`
      INSERT INTO threads (
        session_id, actor_external_id, object_type, source_channel,
        last_message_text, last_direction, last_message_at, last_incoming_at, last_outgoing_at, metadata
      )
      SELECT DISTINCT ON (s.session_id)
        s.session_id, s.actor_external_id, s.object_type, s.source_channel,
        s.content_text, s.direction, s.occurred_at,
        (SELECT s2.occurred_at FROM thread_messages s2 WHERE s2.session_id = s.session_id AND s2.direction = 'INCOMING' ORDER BY s2.occurred_at DESC LIMIT 1),
        (SELECT s3.occurred_at FROM thread_messages s3 WHERE s3.session_id = s.session_id AND s3.direction = 'OUTGOING' ORDER BY s3.occurred_at DESC LIMIT 1),
        jsonb_build_object('backfilledFrom', 'thread_messages')
      FROM thread_messages s
      WHERE s.direction IN ('INCOMING', 'OUTGOING')
      ORDER BY s.session_id, s.occurred_at DESC
      ON CONFLICT (session_id) DO NOTHING
    `);
    await this.prisma.$executeRawUnsafe(`
      WITH visible_last AS (
        SELECT DISTINCT ON (s.session_id) s.session_id, s.content_text, s.direction, s.occurred_at
        FROM thread_messages s WHERE s.direction IN ('INCOMING', 'OUTGOING')
        ORDER BY s.session_id, s.occurred_at DESC
      ),
      visible_incoming AS (SELECT s.session_id, MAX(s.occurred_at) AS last_incoming_at FROM thread_messages s WHERE s.direction = 'INCOMING' GROUP BY s.session_id),
      visible_outgoing AS (SELECT s.session_id, MAX(s.occurred_at) AS last_outgoing_at FROM thread_messages s WHERE s.direction = 'OUTGOING' GROUP BY s.session_id)
      UPDATE threads t
      SET last_message_text = vl.content_text, last_direction = vl.direction, last_message_at = vl.occurred_at,
          last_incoming_at = vi.last_incoming_at, last_outgoing_at = vo.last_outgoing_at, updated_at = now()
      FROM visible_last vl
      LEFT JOIN visible_incoming vi ON vi.session_id = vl.session_id
      LEFT JOIN visible_outgoing vo ON vo.session_id = vl.session_id
      WHERE t.session_id = vl.session_id
    `);
    await this.prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS thread_offer_events (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        session_id varchar(255) NOT NULL,
        stage_actual varchar(64) NOT NULL,
        tipo varchar(32) NOT NULL,
        codigo varchar(120) NOT NULL,
        nombre_plan varchar(255) NOT NULL,
        precio_base numeric(12,2) NOT NULL,
        descripcion text NULL,
        precio_normal numeric(12,2) NULL,
        url_archivo text NULL,
        decision varchar(32) NOT NULL DEFAULT 'indefinido',
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NULL
      )
    `);
    await this.prisma.$executeRawUnsafe(`
      ALTER TABLE thread_offer_events
      ADD COLUMN IF NOT EXISTS updated_at timestamptz NULL
    `);
    await this.prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS idx_thread_offer_events_session_id
      ON thread_offer_events(session_id)
    `);
    await this.prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS idx_thread_offer_events_session_decision
      ON thread_offer_events(session_id, decision)
    `);
    await this.prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS idx_thread_offer_events_session_codigo
      ON thread_offer_events(session_id, codigo)
    `);
    await this.prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS idx_thread_offer_events_created_at
      ON thread_offer_events(created_at DESC)
    `);
  }
}
