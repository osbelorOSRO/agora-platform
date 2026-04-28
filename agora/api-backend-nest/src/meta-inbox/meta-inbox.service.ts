import { BadRequestException, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../database/prisma/prisma.service';
import axios from 'axios';
import { WebsocketNotifierService } from '../websocket-notifier/websocket-notifier.service';
import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';
import util from 'util';
import { getRuntimeSecret } from '../shared/runtime-secrets';
import { BaileysSenderService } from '../baileys/baileys-sender.service';

type ThreadRow = {
  threadId: string;
  sessionId: string;
  actorExternalId: string;
  objectType: string;
  sourceChannel: string | null;
  threadStatus: string;
  attentionMode: string;
  threadStage: string;
  displayName: string;
  phone: string | null;
  email: string | null;
  notes: string | null;
  city: string | null;
  actorScore: string | null;
  actorLifecycleState: string | null;
  actorLifecycleUpdatedAt: Date | null;
  lastMessageText: string | null;
  lastDirection: string;
  lastMessageAt: Date;
};

type ContactDirectoryRow = {
  actorExternalId: string;
  objectType: string;
  displayName: string;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  rut: string | null;
  address: string | null;
  email: string | null;
  notes: string | null;
  city: string | null;
  region: string | null;
  metadata: any;
  actorScore: string | null;
  actorLifecycleState: string | null;
  actorLifecycleUpdatedAt: Date | null;
  lastThreadSessionId: string | null;
  lastThreadStatus: string | null;
  lastThreadStage: string | null;
  lastAttentionMode: string | null;
  lastMessageText: string | null;
  lastMessageAt: Date | null;
  totalCount: string;
};

type ThreadIdentity = {
  sessionId: string;
  actorExternalId: string;
  objectType: string;
  sourceChannel: string | null;
};

type ThreadControlSnapshot = ThreadIdentity & {
  threadId: string;
  threadStatus: string;
  attentionMode: string;
  threadStage: string;
  lastMessageText: string | null;
  lastDirection: string | null;
  lastMessageAt: Date | null;
};

type ThreadEventInput = {
  sessionId: string;
  threadId?: string | null;
  actorExternalId: string;
  objectType: string;
  eventType: string;
  eventSource?: string | null;
  fromValue?: string | null;
  toValue?: string | null;
  userId?: string | null;
  username?: string | null;
  externalEventId?: string | null;
  messageExternalId?: string | null;
  direction?: string | null;
  provider?: string | null;
  sourceChannel?: string | null;
  metadata?: any;
  occurredAt?: Date;
  dedupeKey?: string | null;
};

type ThreadSelectorInput = {
  sessionId?: string;
  actorExternalId?: string;
  objectType?: string;
};

type ThreadMessageSenderType = 'HUMAN' | 'N8N' | 'SYSTEM';
type ThreadMessageMediaType = 'image' | 'audio' | 'document' | 'video';
type BaileysMessageType = 'text' | 'image' | 'audio' | 'document' | 'video';

type MessageRow = {
  externalEventId: string;
  messageExternalId: string | null;
  sessionId: string;
  actorExternalId: string;
  objectType: string;
  eventKind: string;
  direction: string;
  contentText: string | null;
  contentJson: any;
  status: string;
  occurredAt: Date;
};

type StageTemplateRow = {
  stageActual: string;
  posicion: number | null;
  posiblesMatch: string;
  esFallback: boolean;
  procesaDatos: boolean;
  datoEsperado: string | null;
  modoDefault: string | null;
  factible: boolean | null;
  decision: string | null;
  accion: string | null;
  nuevoStage: string;
  tipoRespuesta: string;
  stageRoute: string | null;
};

type OfferPlanRow = {
  codigo: string;
  nombre: string;
  precioBase: string | number;
  descripcion: string | null;
  precioNormal: string | number | null;
  urlArchivo: string | null;
};

type OfferEventRow = {
  id: string;
  sessionId: string;
  stageActual: string;
  tipo: string;
  codigo: string;
  nombrePlan: string;
  precioBase: string;
  descripcion: string | null;
  precioNormal: string | null;
  urlArchivo: string | null;
  decision: string;
  createdAt: Date;
};

@Injectable()
export class MetaInboxService implements OnModuleInit {
  private readonly logger = new Logger(MetaInboxService.name);
  private readonly execPromise = util.promisify(exec);

  constructor(
    private readonly prisma: PrismaService,
    private readonly websocketNotifier: WebsocketNotifierService,
    private readonly baileysSender: BaileysSenderService,
  ) {}

  async onModuleInit() {
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
        session_id,
        thread_id,
        actor_external_id,
        object_type,
        event_type,
        event_source,
        to_value,
        provider,
        source_channel,
        metadata,
        occurred_at,
        dedupe_key
      )
      SELECT
        t.session_id,
        t.id,
        t.actor_external_id,
        t.object_type,
        'THREAD_CREATED',
        'SYSTEM',
        t.thread_status,
        CASE WHEN t.object_type = 'WHATSAPP' THEN 'BAILEYS' ELSE 'META' END,
        t.source_channel,
        jsonb_build_object(
          'backfilledFrom', 'threads',
          'attentionMode', t.attention_mode,
          'threadStage', t.thread_stage
        ),
        COALESCE(t.opened_at, t.created_at, now()),
        'THREAD_CREATED:' || t.session_id
      FROM threads t
      ON CONFLICT (dedupe_key) DO NOTHING
    `);
    await this.prisma.$executeRawUnsafe(`
      INSERT INTO thread_events (
        session_id,
        thread_id,
        actor_external_id,
        object_type,
        event_type,
        event_source,
        external_event_id,
        message_external_id,
        direction,
        provider,
        source_channel,
        metadata,
        occurred_at,
        dedupe_key
      )
      SELECT
        m.session_id,
        t.id,
        m.actor_external_id,
        m.object_type,
        CASE WHEN m.direction = 'OUTGOING' THEN 'MESSAGE_OUTGOING' ELSE 'MESSAGE_INCOMING' END,
        CASE
          WHEN m.direction = 'OUTGOING' THEN COALESCE(NULLIF(m.content_json->>'senderType', ''), 'SYSTEM')
          ELSE COALESCE(m.provider, 'META')
        END,
        m.external_event_id,
        m.message_external_id,
        m.direction,
        m.provider,
        m.source_channel,
        jsonb_build_object(
          'backfilledFrom', 'thread_messages',
          'eventKind', m.event_kind,
          'status', m.status,
          'messageType', COALESCE(m.content_json->>'messageType', NULL)
        ),
        m.occurred_at,
        (CASE WHEN m.direction = 'OUTGOING' THEN 'MESSAGE_OUTGOING:' ELSE 'MESSAGE_INCOMING:' END) || m.external_event_id
      FROM thread_messages m
      LEFT JOIN threads t ON t.session_id = m.session_id
      ON CONFLICT (dedupe_key) DO NOTHING
    `);
    await this.prisma.$executeRawUnsafe(`
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
      ON CONFLICT (external_event_id) DO NOTHING
    `);
    await this.prisma.$executeRawUnsafe(`
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
      ON CONFLICT (session_id) DO NOTHING
    `);
    await this.prisma.$executeRawUnsafe(`
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
        created_at timestamptz NOT NULL DEFAULT now()
      )
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

  async recordThreadEvent(input: ThreadEventInput) {
    const eventSource = String(input.eventSource || 'SYSTEM').toUpperCase();
    const occurredAt = input.occurredAt || new Date();
    const dedupeKey =
      input.dedupeKey ??
      (input.externalEventId
        ? `${input.eventType}:${input.externalEventId}`
        : null);

    await this.prisma.$executeRawUnsafe(
      `
      INSERT INTO thread_events (
        session_id,
        thread_id,
        actor_external_id,
        object_type,
        event_type,
        event_source,
        from_value,
        to_value,
        user_id,
        username,
        external_event_id,
        message_external_id,
        direction,
        provider,
        source_channel,
        metadata,
        occurred_at,
        dedupe_key
      ) VALUES (
        $1, $2::uuid, $3, $4, $5, $6, $7, $8, $9, $10,
        $11, $12, $13, $14, $15, COALESCE($16::jsonb, '{}'::jsonb), $17, $18
      )
      ON CONFLICT (dedupe_key) DO NOTHING
    `,
      input.sessionId,
      input.threadId ?? null,
      input.actorExternalId,
      input.objectType,
      input.eventType,
      eventSource,
      input.fromValue ?? null,
      input.toValue ?? null,
      input.userId ?? null,
      input.username ?? null,
      input.externalEventId ?? null,
      input.messageExternalId ?? null,
      input.direction ?? null,
      input.provider ?? null,
      input.sourceChannel ?? null,
      input.metadata ? JSON.stringify(input.metadata) : null,
      occurredAt,
      dedupeKey,
    );
  }

  async listThreads(input: { limit?: number; offset?: number; includeClosed?: boolean }) {
    const limit = Math.min(Math.max(input.limit ?? 50, 1), 200);
    const offset = Math.max(input.offset ?? 0, 0);
    const includeClosed = input.includeClosed === true;

    const rows = await this.prisma.$queryRawUnsafe<ThreadRow[]>(`
      SELECT
        t.id AS "threadId",
        t.session_id AS "sessionId",
        t.actor_external_id AS "actorExternalId",
        t.object_type AS "objectType",
        t.source_channel AS "sourceChannel",
        t.thread_status AS "threadStatus",
        t.attention_mode AS "attentionMode",
        t.thread_stage AS "threadStage",
        COALESCE(c.display_name, 'Nuevo') AS "displayName",
        c.phone AS "phone",
        c.email AS "email",
        c.notes AS "notes",
        c.city AS "city",
        sc.score::text AS "actorScore",
        lc.state::text AS "actorLifecycleState",
        lc.occurred_at AS "actorLifecycleUpdatedAt",
        t.last_message_text AS "lastMessageText",
        COALESCE(t.last_direction, 'INCOMING') AS "lastDirection",
        t.last_message_at AS "lastMessageAt"
      FROM threads t
      LEFT JOIN meta_inbox_contacts c
        ON c.actor_external_id = t.actor_external_id
       AND c.object_type = t.object_type
      LEFT JOIN actor_score sc
        ON sc.actor_external_id = t.actor_external_id
      LEFT JOIN LATERAL (
        SELECT al.state, al.occurred_at
        FROM actor_lifecycle al
        WHERE al.actor_external_id = t.actor_external_id
        ORDER BY al.occurred_at DESC
        LIMIT 1
      ) lc ON true
      WHERE (${includeClosed ? 'true' : 'false'} OR t.thread_status <> 'CLOSED')
        AND (
          t.last_direction IN ('INCOMING', 'OUTGOING')
          OR EXISTS (
            SELECT 1
            FROM thread_messages s
            WHERE s.session_id = t.session_id
              AND s.direction IN ('INCOMING', 'OUTGOING')
          )
          OR (t.last_message_at IS NOT NULL AND t.thread_status IN ('OPEN', 'PAUSED', 'ARCHIVED', 'CLOSED'))
          OR (t.object_type = 'WHATSAPP' AND t.metadata->>'openedFromAgenda' = 'true')
        )
      ORDER BY t.last_message_at DESC NULLS LAST
      LIMIT ${limit}
      OFFSET ${offset}
    `);

    return rows;
  }

  async listContacts(input: { search?: string; objectType?: string; limit?: number; offset?: number }) {
    const limit = Math.min(Math.max(input.limit ?? 50, 1), 200);
    const offset = Math.max(input.offset ?? 0, 0);
    const search = (input.search || '').trim();
    const objectType = (input.objectType || '').trim().toUpperCase();
    const hasSearch = search.length > 0;
    const hasObjectType = ['PAGE', 'INSTAGRAM', 'WHATSAPP'].includes(objectType);

    const rows = await this.prisma.$queryRawUnsafe<ContactDirectoryRow[]>(
      `
      SELECT
        c.actor_external_id AS "actorExternalId",
        c.object_type AS "objectType",
        c.display_name AS "displayName",
        c.first_name AS "firstName",
        c.last_name AS "lastName",
        c.phone AS "phone",
        c.rut AS "rut",
        c.address AS "address",
        c.email AS "email",
        c.notes AS "notes",
        c.city AS "city",
        c.region AS "region",
        c.metadata AS "metadata",
        sc.score::text AS "actorScore",
        lc.state::text AS "actorLifecycleState",
        lc.occurred_at AS "actorLifecycleUpdatedAt",
        lt.session_id AS "lastThreadSessionId",
        lt.thread_status AS "lastThreadStatus",
        lt.thread_stage AS "lastThreadStage",
        lt.attention_mode AS "lastAttentionMode",
        lt.last_message_text AS "lastMessageText",
        lt.last_message_at AS "lastMessageAt",
        COUNT(*) OVER()::text AS "totalCount"
      FROM meta_inbox_contacts c
      LEFT JOIN actor_score sc
        ON sc.actor_external_id = c.actor_external_id
      LEFT JOIN LATERAL (
        SELECT al.state, al.occurred_at
        FROM actor_lifecycle al
        WHERE al.actor_external_id = c.actor_external_id
        ORDER BY al.occurred_at DESC
        LIMIT 1
      ) lc ON true
      LEFT JOIN LATERAL (
        SELECT
          t.session_id,
          t.thread_status,
          t.thread_stage,
          t.attention_mode,
          t.last_message_text,
          t.last_message_at
        FROM threads t
        WHERE t.actor_external_id = c.actor_external_id
          AND t.object_type = c.object_type
        ORDER BY t.last_message_at DESC NULLS LAST, t.updated_at DESC
        LIMIT 1
      ) lt ON true
      WHERE ($1::boolean = false OR c.object_type = $2)
        AND (
          $3::boolean = false
          OR c.display_name ILIKE '%' || $4 || '%'
          OR c.first_name ILIKE '%' || $4 || '%'
          OR c.last_name ILIKE '%' || $4 || '%'
          OR c.phone ILIKE '%' || $4 || '%'
          OR c.rut ILIKE '%' || $4 || '%'
          OR c.email ILIKE '%' || $4 || '%'
          OR c.city ILIKE '%' || $4 || '%'
          OR c.region ILIKE '%' || $4 || '%'
          OR c.actor_external_id ILIKE '%' || $4 || '%'
        )
      ORDER BY
        lt.last_message_at DESC NULLS LAST,
        c.updated_at DESC,
        c.display_name ASC
      LIMIT ${limit}
      OFFSET ${offset}
    `,
      hasObjectType,
      objectType,
      hasSearch,
      search,
    );

    return {
      items: rows.map(({ totalCount, ...row }) => row),
      total: rows[0]?.totalCount ? Number(rows[0].totalCount) : 0,
      limit,
      offset,
      hasNext: offset + rows.length < (rows[0]?.totalCount ? Number(rows[0].totalCount) : 0),
    };
  }

  async createWhatsappContact(input: {
    phone: string;
    displayName?: string;
    firstName?: string;
    lastName?: string;
    rut?: string;
    address?: string;
    email?: string;
    notes?: string;
    city?: string;
    region?: string;
  }) {
    const phone = this.normalizeWhatsappPhone(input.phone);
    const actorExternalId = `${phone}@s.whatsapp.net`;
    const displayName =
      input.displayName?.trim() ||
      [input.firstName?.trim(), input.lastName?.trim()].filter(Boolean).join(' ') ||
      phone;

    await this.prisma.$executeRawUnsafe(
      `
      INSERT INTO meta_inbox_contacts(
        actor_external_id, object_type, display_name, first_name, last_name, phone,
        rut, address, email, notes, city, region, metadata, updated_at
      )
      VALUES (
        $1, 'WHATSAPP', COALESCE(NULLIF($2,''), $3), NULLIF($4,''), NULLIF($5,''),
        $3, NULLIF($6,''), NULLIF($7,''), NULLIF($8,''), NULLIF($9,''),
        NULLIF($10,''), NULLIF($11,''), $12::jsonb, now()
      )
      ON CONFLICT (actor_external_id, object_type)
      DO UPDATE SET
        display_name = COALESCE(NULLIF(EXCLUDED.display_name,''), meta_inbox_contacts.display_name),
        first_name = COALESCE(EXCLUDED.first_name, meta_inbox_contacts.first_name),
        last_name = COALESCE(EXCLUDED.last_name, meta_inbox_contacts.last_name),
        phone = COALESCE(EXCLUDED.phone, meta_inbox_contacts.phone),
        rut = COALESCE(EXCLUDED.rut, meta_inbox_contacts.rut),
        address = COALESCE(EXCLUDED.address, meta_inbox_contacts.address),
        email = COALESCE(EXCLUDED.email, meta_inbox_contacts.email),
        notes = COALESCE(EXCLUDED.notes, meta_inbox_contacts.notes),
        city = COALESCE(EXCLUDED.city, meta_inbox_contacts.city),
        region = COALESCE(EXCLUDED.region, meta_inbox_contacts.region),
        metadata = meta_inbox_contacts.metadata || EXCLUDED.metadata,
        updated_at = now()
    `,
      actorExternalId,
      displayName,
      phone,
      input.firstName ?? null,
      input.lastName ?? null,
      input.rut ?? null,
      input.address ?? null,
      input.email ?? null,
      input.notes ?? null,
      input.city ?? null,
      input.region ?? null,
      JSON.stringify({
        created_from: 'agenda',
        transport: 'baileys',
        jid: actorExternalId,
      }),
    );

    const result = await this.listContacts({
      search: actorExternalId,
      objectType: 'WHATSAPP',
      limit: 1,
      offset: 0,
    });

    return result.items[0] || {
      actorExternalId,
      objectType: 'WHATSAPP',
      displayName,
      phone,
    };
  }

  async ensureWhatsappThreadForContact(actorExternalId: string) {
    const normalizedActor = String(actorExternalId || '').trim();
    if (!normalizedActor.endsWith('@s.whatsapp.net')) {
      throw new BadRequestException('Solo se puede preparar thread para contactos WhatsApp/Baileys con JID telefonico');
    }

    const contactRows = await this.prisma.$queryRawUnsafe<Array<{ actorExternalId: string }>>(
      `
      SELECT actor_external_id AS "actorExternalId"
      FROM meta_inbox_contacts
      WHERE actor_external_id = $1
        AND object_type = 'WHATSAPP'
      LIMIT 1
    `,
      normalizedActor,
    );
    if (!contactRows[0]) {
      throw new BadRequestException('whatsapp_contact_not_found');
    }

    const openRows = await this.prisma.$queryRawUnsafe<Array<{ sessionId: string }>>(
      `
      SELECT session_id AS "sessionId"
      FROM threads
      WHERE actor_external_id = $1
        AND object_type = 'WHATSAPP'
        AND thread_status IN ('OPEN', 'PAUSED', 'ARCHIVED')
      ORDER BY updated_at DESC, last_message_at DESC NULLS LAST
      LIMIT 1
    `,
      normalizedActor,
    );

    if (openRows[0]?.sessionId) {
      await this.prisma.$executeRawUnsafe(
        `
        UPDATE threads
        SET
          thread_status = CASE WHEN thread_status = 'ARCHIVED' THEN 'OPEN' ELSE thread_status END,
          archived_at = CASE WHEN thread_status = 'ARCHIVED' THEN NULL ELSE archived_at END,
          metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object('resumedFromAgenda', true),
          updated_at = now()
        WHERE session_id = $1
      `,
        openRows[0].sessionId,
      );
      const existing = await this.getThreadRow(openRows[0].sessionId);
      if (existing) return existing;
    }

    const baseSessionId = `BAILEYS:WHATSAPP:${normalizedActor}`;
    const latestRows = await this.prisma.$queryRawUnsafe<Array<{ sessionId: string; threadStatus: string }>>(
      `
      SELECT session_id AS "sessionId", thread_status AS "threadStatus"
      FROM threads
      WHERE actor_external_id = $1
        AND object_type = 'WHATSAPP'
      ORDER BY updated_at DESC, last_message_at DESC NULLS LAST
      LIMIT 1
    `,
      normalizedActor,
    );
    const latest = latestRows[0];
    const sessionId = latest?.sessionId
      ? `${baseSessionId}:${Date.now()}_${Math.random().toString(16).slice(2, 8)}`.slice(0, 255)
      : baseSessionId;

    await this.prisma.$executeRawUnsafe(
      `
      INSERT INTO threads (
        session_id,
        actor_external_id,
        object_type,
        source_channel,
        thread_status,
        attention_mode,
        thread_stage,
        metadata,
        updated_at
      ) VALUES (
        $1, $2, 'WHATSAPP', 'baileys_whatsapp', 'OPEN', 'HUMAN', 'inicio',
        jsonb_build_object('openedFromAgenda', true, 'openedManually', true),
        now()
      )
      ON CONFLICT (session_id) DO NOTHING
    `,
      sessionId,
      normalizedActor,
    );

    const created = await this.getThreadRow(sessionId);
    if (!created) throw new Error(`whatsapp_thread_prepare_failed:${sessionId}`);

    await this.recordThreadEvent({
      sessionId: created.sessionId,
      threadId: created.threadId,
      actorExternalId: created.actorExternalId,
      objectType: created.objectType,
      eventType: 'THREAD_CREATED',
      eventSource: 'HUMAN',
      toValue: created.threadStatus,
      provider: 'BAILEYS',
      sourceChannel: created.sourceChannel,
      metadata: {
        openedFromAgenda: true,
        attentionMode: created.attentionMode,
        threadStage: created.threadStage,
      },
      dedupeKey: `THREAD_CREATED:${created.sessionId}`,
    });

    await this.websocketNotifier.notificarMetaInboxThreadUpsert({
      threadId: created.threadId,
      sessionId: created.sessionId,
      actorExternalId: created.actorExternalId,
      objectType: created.objectType,
      sourceChannel: created.sourceChannel,
      threadStatus: created.threadStatus,
      attentionMode: created.attentionMode,
      threadStage: created.threadStage,
      displayName: created.displayName,
      phone: created.phone || undefined,
      lastMessageText: created.lastMessageText || undefined,
      lastDirection: created.lastDirection || undefined,
      lastMessageAt: created.lastMessageAt ? new Date(created.lastMessageAt).toISOString() : undefined,
    });

    return created;
  }

  async listMessages(sessionId: string, includeSystem = false) {
    const rows = await this.prisma.$queryRawUnsafe<MessageRow[]>(`
      SELECT
        external_event_id AS "externalEventId",
        message_external_id AS "messageExternalId",
        session_id AS "sessionId",
        actor_external_id AS "actorExternalId",
        object_type AS "objectType",
        event_kind AS "eventKind",
        direction,
        content_text AS "contentText",
        content_json AS "contentJson",
        status,
        occurred_at AS "occurredAt"
      FROM thread_messages
      WHERE session_id = $1
        AND ($2::boolean = true OR direction <> 'SYSTEM' OR event_kind = 'bootstrap_greeting')
      ORDER BY occurred_at ASC
      LIMIT 1000
    `, sessionId, includeSystem);

    return rows.map((row) => ({
      ...row,
      contentJson: this.normalizeLegacyMessageContentJson(row.contentJson),
    }));
  }

  async getStageTemplatePaths(stageActual: string) {
    const normalizedStage = (stageActual || '').trim();
    if (!normalizedStage) {
      throw new BadRequestException('Debes enviar un stage actual valido');
    }

    const rows = await this.prisma.$queryRawUnsafe<StageTemplateRow[]>(
      `
      SELECT
        stage_actual AS "stageActual",
        posicion,
        posibles_match AS "posiblesMatch",
        es_fallback AS "esFallback",
        procesa_datos AS "procesaDatos",
        dato_esperado AS "datoEsperado",
        modo_default AS "modoDefault",
        factible,
        decision,
        accion,
        nuevo_stage AS "nuevoStage",
        tipo_respuesta AS "tipoRespuesta",
        stage_route AS "stageRoute"
      FROM stage_templates
      WHERE stage_actual = $1
        AND activo = true
      ORDER BY posicion ASC NULLS LAST, id ASC
    `,
      normalizedStage,
    );

    return {
      stage_actual: normalizedStage,
      caminos: rows.map((row) =>
        this.omitEmptyFields({
          posicion: row.posicion,
          posibles_match: row.posiblesMatch,
          es_fallback: row.esFallback,
          procesa_datos: row.procesaDatos,
          dato_esperado: row.datoEsperado,
          modo_default: row.modoDefault,
          factible: row.factible,
          decision: row.decision,
          accion: row.accion,
          nuevo_stage: row.nuevoStage,
          tipo_respuesta: row.tipoRespuesta,
          stage_route: row.stageRoute,
        }),
      ),
    };
  }

  async updateContact(
    sessionId: string,
    input: {
      displayName?: string;
      firstName?: string;
      lastName?: string;
      phone?: string;
      rut?: string;
      address?: string;
      email?: string;
      notes?: string;
      city?: string;
      region?: string;
    },
  ) {
    const thread = await this.getThreadIdentity(sessionId);
    if (!thread) throw new Error(`session_not_found:${sessionId}`);

    await this.prisma.$executeRawUnsafe(
      `
      INSERT INTO meta_inbox_contacts(
        actor_external_id, object_type, display_name, first_name, last_name, phone,
        rut, address, email, notes, city, region, updated_at
      )
      VALUES (
        $1, $2, COALESCE(NULLIF($3,''), 'Nuevo'), NULLIF($4,''), NULLIF($5,''),
        NULLIF($6,''), NULLIF($7,''), NULLIF($8,''), NULLIF($9,''), NULLIF($10,''),
        NULLIF($11,''), NULLIF($12,''), now()
      )
      ON CONFLICT (actor_external_id, object_type)
      DO UPDATE SET
        display_name = COALESCE(NULLIF(EXCLUDED.display_name,''), meta_inbox_contacts.display_name),
        first_name = COALESCE(EXCLUDED.first_name, meta_inbox_contacts.first_name),
        last_name = COALESCE(EXCLUDED.last_name, meta_inbox_contacts.last_name),
        phone = COALESCE(EXCLUDED.phone, meta_inbox_contacts.phone),
        rut = COALESCE(EXCLUDED.rut, meta_inbox_contacts.rut),
        address = COALESCE(EXCLUDED.address, meta_inbox_contacts.address),
        email = COALESCE(EXCLUDED.email, meta_inbox_contacts.email),
        notes = COALESCE(EXCLUDED.notes, meta_inbox_contacts.notes),
        city = COALESCE(EXCLUDED.city, meta_inbox_contacts.city),
        region = COALESCE(EXCLUDED.region, meta_inbox_contacts.region),
        updated_at = now()
    `,
      thread.actorExternalId,
      thread.objectType,
      input.displayName ?? null,
      input.firstName ?? null,
      input.lastName ?? null,
      input.phone ?? null,
      input.rut ?? null,
      input.address ?? null,
      input.email ?? null,
      input.notes ?? null,
      input.city ?? null,
      input.region ?? null,
    );

    const updated = await this.getThreadRow(sessionId);
    await this.websocketNotifier.notificarMetaInboxThreadUpsert({
      threadId: updated?.threadId,
      sessionId,
      actorExternalId: thread.actorExternalId,
      objectType: thread.objectType,
      displayName: input.displayName ?? updated?.displayName ?? undefined,
      phone: input.phone ?? updated?.phone ?? undefined,
      email: input.email ?? updated?.email ?? undefined,
      notes: input.notes ?? updated?.notes ?? undefined,
      city: input.city ?? updated?.city ?? undefined,
      threadStatus: updated?.threadStatus,
      attentionMode: updated?.attentionMode,
      threadStage: updated?.threadStage,
      lastMessageText: updated?.lastMessageText ?? undefined,
      lastDirection: updated?.lastDirection ?? undefined,
      lastMessageAt: updated?.lastMessageAt?.toISOString(),
    });

    return {
      ok: true,
      sessionId,
      actorExternalId: thread.actorExternalId,
      objectType: thread.objectType,
      contact: {
        displayName: input.displayName ?? updated?.displayName ?? 'Nuevo',
        firstName: input.firstName ?? null,
        lastName: input.lastName ?? null,
        phone: input.phone ?? updated?.phone ?? null,
        rut: input.rut ?? null,
        address: input.address ?? null,
        email: input.email ?? updated?.email ?? null,
        notes: input.notes ?? updated?.notes ?? null,
        city: input.city ?? updated?.city ?? null,
        region: input.region ?? null,
      },
    };
  }

  async updateThreadControl(
    sessionId: string,
    input: { threadStatus?: string; attentionMode?: string; threadStage?: string },
    eventSource: 'HUMAN' | 'N8N' | 'SYSTEM' | 'API' = 'HUMAN',
  ) {
    const thread = await this.getThreadSnapshot(sessionId);
    if (!thread) throw new Error(`session_not_found:${sessionId}`);

    await this.prisma.$executeRawUnsafe(
      `
      UPDATE threads
      SET
        thread_status = COALESCE($2, thread_status),
        attention_mode = COALESCE($3, attention_mode),
        thread_stage = COALESCE($4, thread_stage),
        paused_at = CASE
          WHEN COALESCE($2, thread_status) = 'PAUSED' THEN now()
          WHEN $2 IS NOT NULL AND $2 <> 'PAUSED' THEN NULL
          ELSE paused_at
        END,
        archived_at = CASE
          WHEN COALESCE($2, thread_status) = 'ARCHIVED' THEN now()
          WHEN $2 IS NOT NULL AND $2 <> 'ARCHIVED' THEN NULL
          ELSE archived_at
        END,
        closed_at = CASE
          WHEN COALESCE($2, thread_status) = 'CLOSED' THEN now()
          WHEN $2 IS NOT NULL AND $2 <> 'CLOSED' THEN NULL
          ELSE closed_at
        END,
        updated_at = now()
      WHERE session_id = $1
    `,
      sessionId,
      input.threadStatus ?? null,
      input.attentionMode ?? null,
      input.threadStage ?? null,
    );

    const updated = await this.getThreadSnapshot(sessionId);
    if (!updated) throw new Error(`session_not_found:${sessionId}`);

    if (input.threadStatus && input.threadStatus !== thread.threadStatus) {
      await this.recordThreadEvent({
        sessionId,
        threadId: updated.threadId,
        actorExternalId: updated.actorExternalId,
        objectType: updated.objectType,
        eventType: 'THREAD_STATUS_CHANGED',
        eventSource,
        fromValue: thread.threadStatus,
        toValue: updated.threadStatus,
        sourceChannel: updated.sourceChannel,
        metadata: {
          attentionMode: updated.attentionMode,
          threadStage: updated.threadStage,
        },
        dedupeKey: `THREAD_STATUS_CHANGED:${sessionId}:${thread.threadStatus}:${updated.threadStatus}:${Date.now()}`,
      });
    }

    if (input.attentionMode && input.attentionMode !== thread.attentionMode) {
      await this.recordThreadEvent({
        sessionId,
        threadId: updated.threadId,
        actorExternalId: updated.actorExternalId,
        objectType: updated.objectType,
        eventType: 'ATTENTION_MODE_CHANGED',
        eventSource,
        fromValue: thread.attentionMode,
        toValue: updated.attentionMode,
        sourceChannel: updated.sourceChannel,
        metadata: {
          threadStatus: updated.threadStatus,
          threadStage: updated.threadStage,
        },
        dedupeKey: `ATTENTION_MODE_CHANGED:${sessionId}:${thread.attentionMode}:${updated.attentionMode}:${Date.now()}`,
      });
    }

    if (input.threadStage && input.threadStage !== thread.threadStage) {
      await this.recordThreadEvent({
        sessionId,
        threadId: updated.threadId,
        actorExternalId: updated.actorExternalId,
        objectType: updated.objectType,
        eventType: 'THREAD_STAGE_CHANGED',
        eventSource,
        fromValue: thread.threadStage,
        toValue: updated.threadStage,
        sourceChannel: updated.sourceChannel,
        metadata: {
          threadStatus: updated.threadStatus,
          attentionMode: updated.attentionMode,
        },
        dedupeKey: `THREAD_STAGE_CHANGED:${sessionId}:${thread.threadStage}:${updated.threadStage}:${Date.now()}`,
      });
    }

    await this.notifyThreadUpsert(updated);

    return {
      ok: true,
      threadStatus: updated.threadStatus,
      attentionMode: updated.attentionMode,
      threadStage: updated.threadStage,
    };
  }

  async reopenThread(sessionId: string) {
    const current = await this.getThreadRow(sessionId);
    if (!current) throw new Error(`session_not_found:${sessionId}`);
    if (current.threadStatus !== 'ARCHIVED') {
      throw new BadRequestException('Solo se puede retomar un thread ARCHIVED. Un thread CLOSED no se reutiliza; se debe crear una nueva atencion.');
    }

    const openedAt = new Date();

    await this.prisma.$executeRawUnsafe(
      `
      UPDATE threads
      SET
        thread_status = 'OPEN',
        attention_mode = 'HUMAN',
        thread_stage = 'delegado_humano',
        opened_at = $2::timestamptz,
        paused_at = NULL,
        archived_at = NULL,
        closed_at = NULL,
        metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object('reopenedAt', $2::timestamptz, 'openedManually', true),
        updated_at = now()
      WHERE session_id = $1
    `,
      current.sessionId,
      openedAt,
    );

    const reopened = await this.getThreadRow(current.sessionId);
    if (!reopened) throw new Error(`thread_reopen_failed:${current.sessionId}`);

    await this.recordThreadEvent({
      sessionId: reopened.sessionId,
      threadId: reopened.threadId,
      actorExternalId: reopened.actorExternalId,
      objectType: reopened.objectType,
      eventType: 'THREAD_REOPENED',
      eventSource: 'HUMAN',
      fromValue: current.threadStatus,
      toValue: reopened.threadStatus,
      sourceChannel: reopened.sourceChannel,
      metadata: {
        attentionMode: reopened.attentionMode,
        threadStage: reopened.threadStage,
      },
      occurredAt: openedAt,
      dedupeKey: `THREAD_REOPENED:${reopened.sessionId}:${openedAt.toISOString()}`,
    });

    await this.notifyThreadUpsert({
      threadId: reopened.threadId,
      sessionId: reopened.sessionId,
      actorExternalId: reopened.actorExternalId,
      objectType: reopened.objectType,
      sourceChannel: reopened.sourceChannel,
      threadStatus: reopened.threadStatus,
      attentionMode: reopened.attentionMode,
      threadStage: reopened.threadStage,
      lastMessageText: reopened.lastMessageText,
      lastDirection: reopened.lastDirection,
      lastMessageAt: reopened.lastMessageAt ? new Date(reopened.lastMessageAt) : null,
    });

    return reopened;
  }

  async resolveThreadByActor(
    actorExternalId: string,
    objectType: string,
    includeClosed = false,
  ) {
    const thread = await this.getPreferredThreadByActor(actorExternalId, objectType, includeClosed);
    if (!thread) {
      throw new Error(`thread_not_found:${objectType}:${actorExternalId}`);
    }
    return thread;
  }

  async updateThreadControlForAutomation(input: {
    sessionId?: string;
    actorExternalId?: string;
    objectType?: string;
    threadStatus?: string;
    attentionMode?: string;
    threadStage?: string;
  }) {
    const sessionId = await this.resolveSessionIdForAutomation(input);
    const result = await this.updateThreadControl(sessionId, {
      threadStatus: input.threadStatus,
      attentionMode: input.attentionMode,
      threadStage: input.threadStage,
    }, 'N8N');
    const thread = await this.getThreadRow(sessionId);

    return {
      ...result,
      sessionId,
      thread,
    };
  }

  async updateContactForAutomation(input: {
    sessionId?: string;
    actorExternalId?: string;
    objectType?: string;
    displayName?: string;
    firstName?: string;
    lastName?: string;
    phone?: string;
    rut?: string;
    address?: string;
    email?: string;
    notes?: string;
    city?: string;
    region?: string;
  }) {
    const sessionId = await this.resolveSessionIdForAutomation(input);
    const result = await this.updateContact(sessionId, {
      displayName: input.displayName,
      firstName: input.firstName,
      lastName: input.lastName,
      phone: input.phone,
      rut: input.rut,
      address: input.address,
      email: input.email,
      notes: input.notes,
      city: input.city,
      region: input.region,
    });
    const thread = await this.getThreadRow(sessionId);

    return {
      ...result,
      thread,
    };
  }

  async sendSystemText(input: {
    sessionId?: string;
    actorExternalId?: string;
    objectType?: string;
    text: string;
  }) {
    const sessionId = await this.resolveSessionIdForAutomation(input);
    const result = await this.sendTextInternal(sessionId, input.text, 'SYSTEM');
    const thread = await this.getThreadRow(sessionId);

    return {
      ...result,
      thread,
    };
  }

  async sendThreadMessage(input: ThreadSelectorInput & {
    senderType?: ThreadMessageSenderType;
    text?: string;
    mediaUrl?: string;
    mediaType?: ThreadMessageMediaType;
    caption?: string;
    fileName?: string;
    mimeType?: string;
  }) {
    const sessionId = await this.resolveSessionIdForAutomation(input);
    const senderType = input.senderType || 'HUMAN';
    const text = input.text?.trim();
    const caption = input.caption?.trim();
    const mediaUrl = input.mediaUrl?.trim();
    const mediaType = input.mediaType;

    if (!mediaUrl) {
      if (!text) throw new Error('invalid_thread_message_payload');
      const result = await this.sendTextInternal(sessionId, text, senderType);
      const thread = await this.getThreadRow(sessionId);
      return { ...result, thread };
    }

    if (!mediaType) {
      throw new Error('media_type_required');
    }

    const result = await this.sendMediaByUrlInternal(
      sessionId,
      mediaUrl,
      mediaType,
      senderType,
      {
        caption: caption || text || undefined,
        mimeType: input.mimeType,
        fileName: input.fileName,
      },
    );
    const thread = await this.getThreadRow(sessionId);
    return { ...result, thread };
  }

  async createOfferEventForAutomation(input: {
    sessionId: string;
    stageActual: string;
    tipo: string;
    codigo: string;
    decision?: string;
  }) {
    const normalizedDecision = (input.decision || 'indefinido').trim().toLowerCase();
    const plan = await this.getOfferPlanByCode(input.codigo);

    const rows = await this.prisma.$queryRawUnsafe<OfferEventRow[]>(
      `
      INSERT INTO thread_offer_events (
        session_id,
        stage_actual,
        tipo,
        codigo,
        nombre_plan,
        precio_base,
        descripcion,
        precio_normal,
        url_archivo,
        decision
      )
      VALUES (
        $1, $2, $3, $4, $5, $6::numeric, $7, $8::numeric, $9, $10
      )
      RETURNING
        id,
        session_id AS "sessionId",
        stage_actual AS "stageActual",
        tipo,
        codigo,
        nombre_plan AS "nombrePlan",
        precio_base::text AS "precioBase",
        descripcion,
        precio_normal::text AS "precioNormal",
        url_archivo AS "urlArchivo",
        decision,
        created_at AS "createdAt"
    `,
      input.sessionId,
      input.stageActual,
      input.tipo,
      plan.codigo,
      plan.nombre,
      plan.precioBase,
      plan.descripcion,
      plan.precioNormal,
      plan.urlArchivo,
      normalizedDecision,
    );

    return rows[0];
  }

  async getOfferEventById(id: string) {
    const rows = await this.prisma.$queryRawUnsafe<OfferEventRow[]>(
      `
      SELECT
        id,
        session_id AS "sessionId",
        stage_actual AS "stageActual",
        tipo,
        codigo,
        nombre_plan AS "nombrePlan",
        precio_base::text AS "precioBase",
        descripcion,
        precio_normal::text AS "precioNormal",
        url_archivo AS "urlArchivo",
        decision,
        created_at AS "createdAt"
      FROM thread_offer_events
      WHERE id = $1
      LIMIT 1
    `,
      id,
    );

    if (!rows[0]) {
      throw new BadRequestException(`offer_event_not_found:${id}`);
    }

    return rows[0];
  }

  async listOfferEvents(input: {
    sessionId?: string;
    codigo?: string;
    decision?: string;
    stageActual?: string;
    tipo?: string;
  }) {
    return this.prisma.$queryRawUnsafe<OfferEventRow[]>(
      `
      SELECT
        id,
        session_id AS "sessionId",
        stage_actual AS "stageActual",
        tipo,
        codigo,
        nombre_plan AS "nombrePlan",
        precio_base::text AS "precioBase",
        descripcion,
        precio_normal::text AS "precioNormal",
        url_archivo AS "urlArchivo",
        decision,
        created_at AS "createdAt"
      FROM thread_offer_events
      WHERE ($1::text IS NULL OR session_id = $1)
        AND ($2::text IS NULL OR codigo = $2)
        AND ($3::text IS NULL OR decision = $3)
        AND ($4::text IS NULL OR stage_actual = $4)
        AND ($5::text IS NULL OR tipo = $5)
      ORDER BY created_at DESC, id DESC
      LIMIT 500
    `,
      input.sessionId ?? null,
      input.codigo ?? null,
      input.decision ?? null,
      input.stageActual ?? null,
      input.tipo ?? null,
    );
  }

  async sendText(sessionId: string, text: string) {
    return this.sendTextInternal(sessionId, text, 'HUMAN');
  }

  private async sendTextInternal(
    sessionId: string,
    text: string,
    senderType: ThreadMessageSenderType,
  ) {
    const thread = await this.getThreadIdentity(sessionId);
    if (!thread) throw new Error(`session_not_found:${sessionId}`);

    if (this.isWhatsAppThread(thread.objectType)) {
      const inReplyToExternalEventId = await this.getLastIncomingExternalEventId(sessionId);
      return this.sendTextViaBaileys(sessionId, thread, text, senderType, inReplyToExternalEventId);
    }

    const inReplyToExternalEventId = await this.getLastIncomingExternalEventId(sessionId);
    if (!inReplyToExternalEventId) {
      throw new Error(`missing_conversation_context:${sessionId}`);
    }

    const transport = await this.resolveSendTransport(thread.objectType, thread.sourceChannel);
    const response = await this.postToGraphWithFallback(
      thread,
      {
        recipient: { id: thread.actorExternalId },
        message: { text },
      },
      transport,
    );

    const messageExternalId = response?.data?.message_id || null;
    const externalEventId = messageExternalId || `out_${Date.now()}_${Math.random().toString(16).slice(2, 10)}`;
    const occurredAt = new Date();
    const contentJson = {
      senderType,
      messageType: 'text',
      sourceChannel: thread.sourceChannel,
      structuredPayload: null,
      graphResponse: response.data,
    };

    await this.prisma.$executeRawUnsafe(
      `
      INSERT INTO thread_messages (
        session_id, external_event_id, message_external_id, actor_external_id,
        provider, object_type, source_channel, event_kind, direction,
        content_text, content_json, in_reply_to_external_event_id, status, occurred_at, received_at, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4,
        'META', $5, $6, 'message', 'OUTGOING',
        $7, $8::jsonb, $9, 'sent', $10, now(), now(), now()
      )
      ON CONFLICT (external_event_id) DO NOTHING
    `,
      sessionId,
      externalEventId,
      messageExternalId,
      thread.actorExternalId,
      thread.objectType,
      thread.sourceChannel,
      text,
      JSON.stringify(contentJson),
      inReplyToExternalEventId,
      occurredAt,
    );
    await this.upsertThreadRecord({
      sessionId,
      actorExternalId: thread.actorExternalId,
      objectType: thread.objectType,
      sourceChannel: thread.sourceChannel,
      lastMessageText: text,
      lastDirection: 'OUTGOING',
      lastMessageAt: occurredAt,
    });
    const snapshotForEvent = await this.getThreadSnapshot(sessionId);
    await this.recordThreadEvent({
      sessionId,
      threadId: snapshotForEvent?.threadId ?? null,
      actorExternalId: thread.actorExternalId,
      objectType: thread.objectType,
      eventType: 'MESSAGE_OUTGOING',
      eventSource: senderType,
      externalEventId,
      messageExternalId,
      direction: 'OUTGOING',
      provider: 'META',
      sourceChannel: thread.sourceChannel,
      metadata: {
        messageType: 'text',
        status: 'sent',
        inReplyToExternalEventId,
      },
      occurredAt,
      dedupeKey: `MESSAGE_OUTGOING:${externalEventId}`,
    });

    await this.websocketNotifier.notificarMetaInboxMessageNew({
      sessionId,
      actorExternalId: thread.actorExternalId,
      objectType: thread.objectType,
      externalEventId,
      messageExternalId,
      senderType,
      messageType: 'text',
      sourceChannel: thread.sourceChannel,
      direction: 'OUTGOING',
      eventKind: 'message',
      contentText: text,
      contentJson,
      status: 'sent',
      occurredAt: occurredAt.toISOString(),
      inReplyToExternalEventId,
    });

    const snapshot = snapshotForEvent || await this.getThreadSnapshot(sessionId);
    if (snapshot) {
      await this.notifyThreadUpsert(snapshot);
    }

    return {
      ok: true,
      externalEventId,
      messageExternalId,
      occurredAt: occurredAt.toISOString(),
      inReplyToExternalEventId,
    };
  }

  async sendMedia(sessionId: string, file: Express.Multer.File, caption?: string) {
    const thread = await this.getThreadIdentity(sessionId);
    if (!thread) throw new Error(`session_not_found:${sessionId}`);

    const isInstagram = this.isInstagramThread(thread.objectType, thread.sourceChannel);
    const mediaType = this.resolveOutgoingMediaType(file.mimetype);
    const preparedMedia = await this.prepareOutgoingMediaForThread(file, {
      isInstagram,
      mediaType,
    });
    const publicBase = (process.env.MEDIA_BASE_URL || '').replace(/\/+$/, '');
    const mediaUrl = `${publicBase}/uploads/${preparedMedia.fileName}`;

    return this.sendMediaByUrlInternal(
      sessionId,
      mediaUrl,
      mediaType,
      'HUMAN',
      {
        mimeType: preparedMedia.mimeType,
        fileName: preparedMedia.fileName,
        caption,
      },
    );
  }

  private async sendMediaByUrlInternal(
    sessionId: string,
    mediaUrl: string,
    mediaType: ThreadMessageMediaType,
    senderType: ThreadMessageSenderType,
    extra?: { mimeType?: string; fileName?: string; caption?: string },
  ) {
    const thread = await this.getThreadIdentity(sessionId);
    if (!thread) throw new Error(`session_not_found:${sessionId}`);

    if (this.isWhatsAppThread(thread.objectType)) {
      const inReplyToExternalEventId = await this.getLastIncomingExternalEventId(sessionId);
      return this.sendMediaByUrlViaBaileys(
        sessionId,
        thread,
        mediaUrl,
        mediaType,
        senderType,
        inReplyToExternalEventId,
        extra,
      );
    }

    const inReplyToExternalEventId = await this.getLastIncomingExternalEventId(sessionId);
    if (!inReplyToExternalEventId) {
      throw new Error(`missing_conversation_context:${sessionId}`);
    }
    if (extra?.caption) {
      throw new BadRequestException(
        `caption_not_supported_for_meta:${mediaType}. Meta Graph no permite enviar texto y adjunto en una sola burbuja para este canal.`,
      );
    }

    const transport = await this.resolveSendTransport(thread.objectType, thread.sourceChannel);
    const graphAttachmentType = this.resolveGraphAttachmentType(mediaType, thread);
    const response = await this.postToGraphWithFallback(
      thread,
      {
        recipient: { id: thread.actorExternalId },
        message: {
          attachment: {
            type: graphAttachmentType,
            payload: {
              url: mediaUrl,
              is_reusable: true,
            },
          },
        },
      },
      transport,
    );

    const messageExternalId = response?.data?.message_id || null;
    const externalEventId = messageExternalId || `out_${Date.now()}_${Math.random().toString(16).slice(2, 10)}`;
    const occurredAt = new Date();
    const placeholderText = this.resolveMediaPlaceholder(mediaType);
    const contentJson = {
      senderType,
      messageType: mediaType,
      sourceChannel: thread.sourceChannel,
      structuredPayload: null,
      mediaType,
      mediaUrl,
      mimeType: extra?.mimeType || null,
      fileName: extra?.fileName || null,
      caption: null,
      graphResponse: response.data,
    };

    await this.prisma.$executeRawUnsafe(
      `
      INSERT INTO thread_messages (
        session_id, external_event_id, message_external_id, actor_external_id,
        provider, object_type, source_channel, event_kind, direction,
        content_text, content_json, in_reply_to_external_event_id, status, occurred_at, received_at, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4,
        'META', $5, $6, 'message', 'OUTGOING',
        $7, $8::jsonb, $9, 'sent', $10, now(), now(), now()
      )
      ON CONFLICT (external_event_id) DO NOTHING
    `,
      sessionId,
      externalEventId,
      messageExternalId,
      thread.actorExternalId,
      thread.objectType,
      thread.sourceChannel,
      placeholderText,
      JSON.stringify(contentJson),
      inReplyToExternalEventId,
      occurredAt,
    );
    await this.upsertThreadRecord({
      sessionId,
      actorExternalId: thread.actorExternalId,
      objectType: thread.objectType,
      sourceChannel: thread.sourceChannel,
      lastMessageText: placeholderText,
      lastDirection: 'OUTGOING',
      lastMessageAt: occurredAt,
    });
    const snapshotForEvent = await this.getThreadSnapshot(sessionId);
    await this.recordThreadEvent({
      sessionId,
      threadId: snapshotForEvent?.threadId ?? null,
      actorExternalId: thread.actorExternalId,
      objectType: thread.objectType,
      eventType: 'MESSAGE_OUTGOING',
      eventSource: senderType,
      externalEventId,
      messageExternalId,
      direction: 'OUTGOING',
      provider: 'META',
      sourceChannel: thread.sourceChannel,
      metadata: {
        messageType: mediaType,
        mediaType,
        mediaUrl,
        graphAttachmentType,
        status: 'sent',
        inReplyToExternalEventId,
      },
      occurredAt,
      dedupeKey: `MESSAGE_OUTGOING:${externalEventId}`,
    });

    await this.websocketNotifier.notificarMetaInboxMessageNew({
      sessionId,
      actorExternalId: thread.actorExternalId,
      objectType: thread.objectType,
      externalEventId,
      messageExternalId,
      senderType,
      messageType: mediaType,
      sourceChannel: thread.sourceChannel,
      direction: 'OUTGOING',
      eventKind: 'message',
      contentText: placeholderText,
      contentJson,
      status: 'sent',
      occurredAt: occurredAt.toISOString(),
      inReplyToExternalEventId,
    });

    const snapshot = snapshotForEvent || await this.getThreadSnapshot(sessionId);
    if (snapshot) {
      await this.notifyThreadUpsert(snapshot);
    }

    return {
      ok: true,
      externalEventId,
      messageExternalId,
      occurredAt: occurredAt.toISOString(),
      inReplyToExternalEventId,
      mediaType,
      mediaUrl,
    };
  }

  private async sendTextViaBaileys(
    sessionId: string,
    thread: {
      actorExternalId: string;
      objectType: string;
      sourceChannel: string | null;
    },
    text: string,
    senderType: ThreadMessageSenderType,
    inReplyToExternalEventId: string | null,
  ) {
    const response = await this.baileysSender.enviarMensajeWhatsApp(
      thread.actorExternalId,
      'text',
      text,
    );
    const messageExternalId = this.extractBaileysMessageId(response);
    const externalEventId = messageExternalId || this.buildOutgoingBaileysEventId(thread.actorExternalId);
    const occurredAt = new Date();
    const contentJson = {
      senderType,
      messageType: 'text',
      sourceChannel: thread.sourceChannel,
      structuredPayload: null,
      baileysResponse: response || null,
    };

    await this.persistOutgoingThreadMessage({
      sessionId,
      externalEventId,
      messageExternalId,
      actorExternalId: thread.actorExternalId,
      provider: 'BAILEYS',
      objectType: thread.objectType,
      sourceChannel: thread.sourceChannel,
      contentText: text,
      contentJson,
      inReplyToExternalEventId,
      occurredAt,
      senderType,
      messageType: 'text',
    });

    return {
      ok: true,
      externalEventId,
      messageExternalId,
      occurredAt: occurredAt.toISOString(),
      inReplyToExternalEventId,
      provider: 'BAILEYS',
    };
  }

  private async sendMediaByUrlViaBaileys(
    sessionId: string,
    thread: {
      actorExternalId: string;
      objectType: string;
      sourceChannel: string | null;
    },
    mediaUrl: string,
    mediaType: ThreadMessageMediaType,
    senderType: ThreadMessageSenderType,
    inReplyToExternalEventId: string | null,
    extra?: { mimeType?: string; fileName?: string; caption?: string },
  ) {
    const baileysType = this.resolveBaileysMessageType(mediaType);
    const caption = mediaType === 'audio' ? '' : extra?.caption || '';
    const response = await this.baileysSender.enviarMensajeWhatsApp(
      thread.actorExternalId,
      baileysType,
      caption,
      undefined,
      mediaUrl,
      {
        fileName: extra?.fileName,
        mimeType: extra?.mimeType,
      },
    );
    const messageExternalId = this.extractBaileysMessageId(response);
    const externalEventId = messageExternalId || this.buildOutgoingBaileysEventId(thread.actorExternalId);
    const occurredAt = new Date();
    const placeholderText = this.resolveMediaPlaceholder(mediaType);
    const contentJson = {
      senderType,
      messageType: mediaType,
      sourceChannel: thread.sourceChannel,
      structuredPayload: null,
      mediaType,
      mediaUrl,
      mimeType: extra?.mimeType || null,
      fileName: extra?.fileName || null,
      caption: caption || null,
      baileysResponse: response || null,
    };

    await this.persistOutgoingThreadMessage({
      sessionId,
      externalEventId,
      messageExternalId,
      actorExternalId: thread.actorExternalId,
      provider: 'BAILEYS',
      objectType: thread.objectType,
      sourceChannel: thread.sourceChannel,
      contentText: caption || placeholderText,
      contentJson,
      inReplyToExternalEventId,
      occurredAt,
      senderType,
      messageType: mediaType,
    });

    return {
      ok: true,
      externalEventId,
      messageExternalId,
      occurredAt: occurredAt.toISOString(),
      inReplyToExternalEventId,
      mediaType,
      mediaUrl,
      provider: 'BAILEYS',
    };
  }

  private async persistOutgoingThreadMessage(input: {
    sessionId: string;
    externalEventId: string;
    messageExternalId: string | null;
    actorExternalId: string;
    provider: 'META' | 'BAILEYS';
    objectType: string;
    sourceChannel: string | null;
    contentText: string;
    contentJson: any;
    inReplyToExternalEventId: string | null;
    occurredAt: Date;
    senderType: ThreadMessageSenderType;
    messageType: string;
  }) {
    await this.prisma.$executeRawUnsafe(
      `
      INSERT INTO thread_messages (
        session_id, external_event_id, message_external_id, actor_external_id,
        provider, object_type, source_channel, event_kind, direction,
        content_text, content_json, in_reply_to_external_event_id, status, occurred_at, received_at, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4,
        $5, $6, $7, 'message', 'OUTGOING',
        $8, $9::jsonb, $10, 'sent', $11, now(), now(), now()
      )
      ON CONFLICT (external_event_id) DO NOTHING
    `,
      input.sessionId,
      input.externalEventId,
      input.messageExternalId,
      input.actorExternalId,
      input.provider,
      input.objectType,
      input.sourceChannel,
      input.contentText,
      JSON.stringify(input.contentJson),
      input.inReplyToExternalEventId,
      input.occurredAt,
    );

    await this.upsertThreadRecord({
      sessionId: input.sessionId,
      actorExternalId: input.actorExternalId,
      objectType: input.objectType,
      sourceChannel: input.sourceChannel,
      lastMessageText: input.contentText,
      lastDirection: 'OUTGOING',
      lastMessageAt: input.occurredAt,
    });
    const snapshotForEvent = await this.getThreadSnapshot(input.sessionId);
    await this.recordThreadEvent({
      sessionId: input.sessionId,
      threadId: snapshotForEvent?.threadId ?? null,
      actorExternalId: input.actorExternalId,
      objectType: input.objectType,
      eventType: 'MESSAGE_OUTGOING',
      eventSource: input.senderType,
      externalEventId: input.externalEventId,
      messageExternalId: input.messageExternalId,
      direction: 'OUTGOING',
      provider: input.provider,
      sourceChannel: input.sourceChannel,
      metadata: {
        messageType: input.messageType,
        status: 'sent',
        inReplyToExternalEventId: input.inReplyToExternalEventId,
      },
      occurredAt: input.occurredAt,
      dedupeKey: `MESSAGE_OUTGOING:${input.externalEventId}`,
    });

    await this.websocketNotifier.notificarMetaInboxMessageNew({
      sessionId: input.sessionId,
      actorExternalId: input.actorExternalId,
      objectType: input.objectType,
      externalEventId: input.externalEventId,
      messageExternalId: input.messageExternalId,
      senderType: input.senderType,
      messageType: input.messageType,
      sourceChannel: input.sourceChannel,
      direction: 'OUTGOING',
      eventKind: 'message',
      contentText: input.contentText,
      contentJson: input.contentJson,
      status: 'sent',
      occurredAt: input.occurredAt.toISOString(),
      inReplyToExternalEventId: input.inReplyToExternalEventId,
    });

    const snapshot = snapshotForEvent || await this.getThreadSnapshot(input.sessionId);
    if (snapshot) {
      await this.notifyThreadUpsert(snapshot);
    }
  }

  private extractBaileysMessageId(response: any): string | null {
    const candidates = [
      response?.messageId,
      response?.message_id,
      response?.id,
      response?.key?.id,
      response?.data?.messageId,
      response?.data?.message_id,
      response?.data?.key?.id,
    ];
    for (const candidate of candidates) {
      if (typeof candidate === 'string' && candidate.trim()) return candidate.trim();
    }
    return null;
  }

  private buildOutgoingBaileysEventId(actorExternalId: string): string {
    const actor = String(actorExternalId || 'unknown').replace(/[^a-zA-Z0-9@._:-]/g, '_');
    return `baileys:out:${actor}:${Date.now()}:${Math.random().toString(16).slice(2, 10)}`;
  }

  private normalizeWhatsappPhone(value: string): string {
    const digits = String(value || '').replace(/\D/g, '');
    if (!digits) throw new BadRequestException('phone_required');
    if (digits.length < 8 || digits.length > 15) {
      throw new BadRequestException('invalid_whatsapp_phone');
    }
    return digits;
  }

  private async getThreadIdentity(sessionId: string) {
    const rows = await this.prisma.$queryRawUnsafe<Array<{
      sessionId: string;
      actorExternalId: string;
      objectType: string;
      sourceChannel: string | null;
    }>>(
      `
      SELECT
        session_id AS "sessionId",
        actor_external_id AS "actorExternalId",
        object_type AS "objectType",
        source_channel AS "sourceChannel"
      FROM threads
      WHERE session_id = $1
      LIMIT 1
    `,
      sessionId,
    );

    if (rows[0]) return rows[0];

    const fallbackRows = await this.prisma.$queryRawUnsafe<Array<{
      sessionId: string;
      actorExternalId: string;
      objectType: string;
      sourceChannel: string | null;
    }>>(
      `
      SELECT
        session_id AS "sessionId",
        actor_external_id AS "actorExternalId",
        object_type AS "objectType",
        source_channel AS "sourceChannel"
      FROM thread_messages
      WHERE session_id = $1
      ORDER BY occurred_at DESC
      LIMIT 1
    `,
      sessionId,
    );

    return fallbackRows[0] || null;
  }

  private async getThreadSnapshot(sessionId: string): Promise<ThreadControlSnapshot | null> {
    const rows = await this.prisma.$queryRawUnsafe<ThreadControlSnapshot[]>(
      `
      SELECT
        id AS "threadId",
        session_id AS "sessionId",
        actor_external_id AS "actorExternalId",
        object_type AS "objectType",
        source_channel AS "sourceChannel",
        thread_status AS "threadStatus",
        attention_mode AS "attentionMode",
        thread_stage AS "threadStage",
        last_message_text AS "lastMessageText",
        last_direction AS "lastDirection",
        last_message_at AS "lastMessageAt"
      FROM threads
      WHERE session_id = $1
      LIMIT 1
    `,
      sessionId,
    );
    return rows[0] || null;
  }

  private async getPreferredThreadByActor(
    actorExternalId: string,
    objectType: string,
    includeClosed = false,
  ): Promise<ThreadRow | null> {
    const rows = await this.prisma.$queryRawUnsafe<ThreadRow[]>(
      `
      SELECT
        t.id AS "threadId",
        t.session_id AS "sessionId",
        t.actor_external_id AS "actorExternalId",
        t.object_type AS "objectType",
        t.source_channel AS "sourceChannel",
        t.thread_status AS "threadStatus",
        t.attention_mode AS "attentionMode",
        t.thread_stage AS "threadStage",
        COALESCE(c.display_name, 'Nuevo') AS "displayName",
        c.phone AS "phone",
        c.email AS "email",
        c.notes AS "notes",
        c.city AS "city",
        sc.score::text AS "actorScore",
        lc.state::text AS "actorLifecycleState",
        lc.occurred_at AS "actorLifecycleUpdatedAt",
        t.last_message_text AS "lastMessageText",
        COALESCE(t.last_direction, 'INCOMING') AS "lastDirection",
        t.last_message_at AS "lastMessageAt"
      FROM threads t
      LEFT JOIN meta_inbox_contacts c
        ON c.actor_external_id = t.actor_external_id
       AND c.object_type = t.object_type
      LEFT JOIN actor_score sc
        ON sc.actor_external_id = t.actor_external_id
      LEFT JOIN LATERAL (
        SELECT al.state, al.occurred_at
        FROM actor_lifecycle al
        WHERE al.actor_external_id = t.actor_external_id
        ORDER BY al.occurred_at DESC
        LIMIT 1
      ) lc ON true
      WHERE t.actor_external_id = $1
        AND t.object_type = $2
        AND ($3::boolean = true OR t.thread_status <> 'CLOSED')
      ORDER BY
        CASE t.thread_status
          WHEN 'OPEN' THEN 0
          WHEN 'PAUSED' THEN 1
          WHEN 'ARCHIVED' THEN 2
          WHEN 'CLOSED' THEN 3
          ELSE 4
        END,
        t.updated_at DESC,
        t.last_message_at DESC NULLS LAST
      LIMIT 1
    `,
      actorExternalId,
      objectType,
      includeClosed,
    );

    return rows[0] || null;
  }

  private async getThreadRow(sessionId: string): Promise<ThreadRow | null> {
    const rows = await this.prisma.$queryRawUnsafe<ThreadRow[]>(
      `
      SELECT
        t.id AS "threadId",
        t.session_id AS "sessionId",
        t.actor_external_id AS "actorExternalId",
        t.object_type AS "objectType",
        t.source_channel AS "sourceChannel",
        t.thread_status AS "threadStatus",
        t.attention_mode AS "attentionMode",
        t.thread_stage AS "threadStage",
        COALESCE(c.display_name, 'Nuevo') AS "displayName",
        c.phone AS "phone",
        c.email AS "email",
        c.notes AS "notes",
        c.city AS "city",
        sc.score::text AS "actorScore",
        lc.state::text AS "actorLifecycleState",
        lc.occurred_at AS "actorLifecycleUpdatedAt",
        t.last_message_text AS "lastMessageText",
        COALESCE(t.last_direction, 'INCOMING') AS "lastDirection",
        t.last_message_at AS "lastMessageAt"
      FROM threads t
      LEFT JOIN meta_inbox_contacts c
        ON c.actor_external_id = t.actor_external_id
       AND c.object_type = t.object_type
      LEFT JOIN actor_score sc
        ON sc.actor_external_id = t.actor_external_id
      LEFT JOIN LATERAL (
        SELECT al.state, al.occurred_at
        FROM actor_lifecycle al
        WHERE al.actor_external_id = t.actor_external_id
        ORDER BY al.occurred_at DESC
        LIMIT 1
      ) lc ON true
      WHERE t.session_id = $1
      LIMIT 1
    `,
      sessionId,
    );

    return rows[0] || null;
  }

  private async resolveSessionIdForAutomation(input: ThreadSelectorInput): Promise<string> {
    if (input.sessionId) {
      const exists = await this.getThreadIdentity(input.sessionId);
      if (!exists) throw new Error(`session_not_found:${input.sessionId}`);
      return input.sessionId;
    }

    if (!input.actorExternalId || !input.objectType) {
      throw new BadRequestException('Debes enviar sessionId o actorExternalId + objectType');
    }

    const thread = await this.getPreferredThreadByActor(input.actorExternalId, input.objectType, true);
    if (!thread) {
      throw new Error(`thread_not_found:${input.objectType}:${input.actorExternalId}`);
    }

    return thread.sessionId;
  }

  private async notifyThreadUpsert(thread: ThreadControlSnapshot) {
    await this.websocketNotifier.notificarMetaInboxThreadUpsert({
      threadId: thread.threadId,
      sessionId: thread.sessionId,
      actorExternalId: thread.actorExternalId,
      objectType: thread.objectType,
      sourceChannel: thread.sourceChannel,
      threadStatus: thread.threadStatus,
      attentionMode: thread.attentionMode,
      threadStage: thread.threadStage,
      lastMessageText: thread.lastMessageText,
      lastDirection: thread.lastDirection,
      lastMessageAt: thread.lastMessageAt?.toISOString(),
    });
  }

  private async upsertThreadRecord(input: {
    sessionId: string;
    actorExternalId: string;
    objectType: string;
    sourceChannel: string | null;
    lastMessageText: string | null;
    lastDirection: 'INCOMING' | 'OUTGOING' | 'SYSTEM';
    lastMessageAt: Date;
  }) {
    await this.prisma.$executeRawUnsafe(
      `
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
        updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6::varchar(16), $7::timestamptz,
        CASE WHEN $6::varchar(16) = 'INCOMING' THEN $7::timestamptz ELSE NULL::timestamptz END,
        CASE WHEN $6::varchar(16) = 'OUTGOING' THEN $7::timestamptz ELSE NULL::timestamptz END,
        now()
      )
      ON CONFLICT (session_id)
      DO UPDATE SET
        actor_external_id = EXCLUDED.actor_external_id,
        object_type = EXCLUDED.object_type,
        source_channel = COALESCE(EXCLUDED.source_channel, threads.source_channel),
        last_message_text = CASE
          WHEN EXCLUDED.last_direction IN ('INCOMING', 'OUTGOING') THEN EXCLUDED.last_message_text
          ELSE threads.last_message_text
        END,
        last_direction = CASE
          WHEN EXCLUDED.last_direction IN ('INCOMING', 'OUTGOING') THEN EXCLUDED.last_direction
          ELSE threads.last_direction
        END,
        last_message_at = CASE
          WHEN EXCLUDED.last_direction IN ('INCOMING', 'OUTGOING') THEN EXCLUDED.last_message_at
          ELSE threads.last_message_at
        END,
        last_incoming_at = CASE
          WHEN EXCLUDED.last_direction = 'INCOMING' THEN EXCLUDED.last_message_at
          ELSE threads.last_incoming_at
        END,
        last_outgoing_at = CASE
          WHEN EXCLUDED.last_direction = 'OUTGOING' THEN EXCLUDED.last_message_at
          ELSE threads.last_outgoing_at
        END,
        updated_at = now()
    `,
      input.sessionId,
      input.actorExternalId,
      input.objectType,
      input.sourceChannel,
      input.lastMessageText,
      input.lastDirection,
      input.lastMessageAt,
    );
  }

  private async resolveSendTransport(
    objectType: string,
    sourceChannel: string | null,
  ): Promise<{ graphUrl: string; accessToken: string }> {
    if ((objectType || '').toUpperCase() === 'WHATSAPP') {
      throw new BadRequestException('whatsapp_sender_not_configured');
    }

    const isInstagram = this.isInstagramThread(objectType, sourceChannel);
    const accessToken = await this.resolveAccessToken(objectType, sourceChannel);
    return {
      graphUrl: isInstagram
        ? 'https://graph.instagram.com/v21.0/me/messages'
        : 'https://graph.facebook.com/v21.0/me/messages',
      accessToken,
    };
  }

  private async resolveAccessToken(objectType: string, sourceChannel: string | null): Promise<string> {
    const normalizedObjectType = (objectType || '').toUpperCase();
    const normalizedSource = (sourceChannel || '').toLowerCase();

    const isInstagram =
      normalizedObjectType.includes('INSTAGRAM') ||
      normalizedObjectType.includes('IG') ||
      normalizedSource.includes('instagram') ||
      normalizedSource.includes('ig');

    if (isInstagram) {
      const igToken = await getRuntimeSecret('META_INSTAGRAM_ACCESS_TOKEN');
      if (!igToken) throw new Error('missing_env:META_INSTAGRAM_ACCESS_TOKEN');
      return igToken;
    }

    const pageToken = await getRuntimeSecret('META_PAGE_ACCESS_TOKEN');
    if (!pageToken) throw new Error('missing_env:META_PAGE_ACCESS_TOKEN');
    return pageToken;
  }

  private async postToGraphWithFallback(
    thread: { objectType: string; sourceChannel: string | null },
    body: any,
    primary: { graphUrl: string; accessToken: string },
  ) {
    try {
      return await axios.post(primary.graphUrl, body, {
        headers: {
          Authorization: `Bearer ${primary.accessToken}`,
          'Content-Type': 'application/json',
        },
        timeout: 15000,
      });
    } catch (err: any) {
      const code = err?.response?.data?.error?.code;
      const subcode = err?.response?.data?.error?.error_subcode;
      const graphMessage = err?.response?.data?.error?.message;
      this.logger.warn(
        `sendGraph failed host=${primary.graphUrl} objectType=${thread.objectType} sourceChannel=${thread.sourceChannel ?? '-'} code=${code ?? 'unknown'} subcode=${subcode ?? 'unknown'}`,
      );
      if (code === 100 && subcode === 2534080) {
        throw new BadRequestException(
          `Formato de audio no soportado por Instagram API. ${graphMessage ?? ''}`.trim(),
        );
      }
      throw err;
    }
  }

  private async prepareOutgoingMediaForThread(
    file: Express.Multer.File,
    input: { isInstagram: boolean; mediaType: ThreadMessageMediaType },
  ): Promise<{ fileName: string; mimeType: string }> {
    if (!input.isInstagram || input.mediaType !== 'audio') {
      return { fileName: file.filename, mimeType: file.mimetype };
    }

    const inputPath = file.path;
    const outputPath = inputPath.replace(/\.[^/.]+$/, '_ig.m4a');
    const outputName = path.basename(outputPath);

    try {
      const cmd = `ffmpeg -i "${inputPath}" -c:a aac -b:a 64k -ar 44100 -ac 1 "${outputPath}" -y`;
      await this.execPromise(cmd);
      if (!fs.existsSync(outputPath)) {
        throw new Error('ffmpeg_output_missing');
      }
      fs.unlinkSync(inputPath);
      return { fileName: outputName, mimeType: 'audio/mp4' };
    } catch (error: any) {
      this.logger.warn(`audio conversion failed for IG: ${error?.message ?? 'unknown_error'}`);
      throw new BadRequestException(
        'No se pudo convertir el audio a formato compatible para Instagram (m4a).',
      );
    }
  }

  private isInstagramThread(objectType: string, sourceChannel: string | null): boolean {
    const normalizedObjectType = (objectType || '').toUpperCase();
    const normalizedSource = (sourceChannel || '').toLowerCase();
    return (
      normalizedObjectType.includes('INSTAGRAM') ||
      normalizedObjectType.includes('IG') ||
      normalizedSource.includes('instagram') ||
      normalizedSource.includes('ig')
    );
  }

  private isWhatsAppThread(objectType: string): boolean {
    return (objectType || '').toUpperCase() === 'WHATSAPP';
  }

  private resolveOutgoingMediaType(mimeType: string): ThreadMessageMediaType {
    const normalized = String(mimeType || '').toLowerCase();
    if (normalized.startsWith('audio/')) return 'audio';
    if (normalized.startsWith('image/')) return 'image';
    if (normalized.startsWith('video/')) return 'video';
    if (normalized === 'application/pdf' || normalized.startsWith('application/') || normalized.startsWith('text/')) {
      return 'document';
    }
    throw new Error(`unsupported_media_type:${mimeType}`);
  }

  private resolveMediaPlaceholder(mediaType: ThreadMessageMediaType): string {
    if (mediaType === 'audio') return '[audio]';
    if (mediaType === 'image') return '[imagen]';
    if (mediaType === 'video') return '[video]';
    return '[documento]';
  }

  private resolveBaileysMessageType(mediaType: ThreadMessageMediaType): BaileysMessageType {
    return mediaType;
  }

  private resolveGraphAttachmentType(
    mediaType: ThreadMessageMediaType,
    thread: { objectType: string; sourceChannel: string | null },
  ): 'image' | 'audio' | 'video' | 'file' {
    if (mediaType === 'document' && this.isInstagramThread(thread.objectType, thread.sourceChannel)) {
      throw new BadRequestException('document_not_supported_for_instagram');
    }
    if (mediaType === 'document') return 'file';
    return mediaType;
  }

  private normalizeLegacyMessageContentJson(contentJson: any) {
    if (!contentJson || typeof contentJson !== 'object' || Array.isArray(contentJson)) {
      return contentJson;
    }

    const cloned = { ...contentJson };
    const currentMediaType = String(cloned.mediaType || '').toLowerCase();
    const currentMediaUrl = cloned.mediaUrl ? String(cloned.mediaUrl) : '';
    if (currentMediaUrl && (currentMediaType === 'audio' || currentMediaType === 'image')) {
      return cloned;
    }

    const message = cloned.message && typeof cloned.message === 'object' ? cloned.message : null;
    const attachments = Array.isArray(message?.attachments) ? message.attachments : [];
    const first = attachments[0];
    const attachmentType = String(first?.type || '').toLowerCase();
    const attachmentUrl = first?.payload?.url ? String(first.payload.url) : '';
    if (attachmentUrl && (attachmentType === 'audio' || attachmentType === 'image')) {
      return {
        ...cloned,
        mediaType: attachmentType,
        mediaUrl: attachmentUrl,
      };
    }

    const topLevelType = String((cloned as any).type || '').toLowerCase();
    const topLevelUrl =
      (cloned as any).url ? String((cloned as any).url) :
      (cloned as any).mediaUrl ? String((cloned as any).mediaUrl) :
      '';
    if (topLevelUrl && (topLevelType === 'audio' || topLevelType === 'image')) {
      return {
        ...cloned,
        mediaType: topLevelType,
        mediaUrl: topLevelUrl,
      };
    }

    const graphAttachment = cloned.attachment && typeof cloned.attachment === 'object' ? cloned.attachment : null;
    const graphType = String(graphAttachment?.type || '').toLowerCase();
    const graphUrl = graphAttachment?.payload?.url ? String(graphAttachment.payload.url) : '';
    if (graphUrl && (graphType === 'audio' || graphType === 'image')) {
      return {
        ...cloned,
        mediaType: graphType,
        mediaUrl: graphUrl,
      };
    }

    return cloned;
  }

  private async getLastIncomingExternalEventId(sessionId: string): Promise<string | null> {
    const rows = await this.prisma.$queryRawUnsafe<Array<{ externalEventId: string }>>(
      `
      SELECT external_event_id AS "externalEventId"
      FROM thread_messages
      WHERE session_id = $1
        AND direction = 'INCOMING'
      ORDER BY occurred_at DESC
      LIMIT 1
    `,
      sessionId,
    );
    return rows[0]?.externalEventId || null;
  }

  private async getOfferPlanByCode(codigo: string): Promise<OfferPlanRow> {
    const normalizedCode = (codigo || '').trim();
    if (!normalizedCode) {
      throw new BadRequestException('Debes enviar un codigo valido');
    }

    const rows = await this.prisma.$queryRawUnsafe<OfferPlanRow[]>(
      `
      SELECT
        codigo,
        nombre,
        precio_base AS "precioBase",
        descripcion,
        precio_normal AS "precioNormal",
        url_archivo AS "urlArchivo"
      FROM precios_planes
      WHERE codigo = $1
      LIMIT 1
    `,
      normalizedCode,
    );

    if (!rows[0]) {
      throw new BadRequestException(`codigo_no_encontrado:${normalizedCode}`);
    }

    return rows[0];
  }

  private omitEmptyFields<T extends Record<string, unknown>>(input: T): Partial<T> {
    return Object.fromEntries(
      Object.entries(input).filter(([, value]) => value !== null && value !== undefined && value !== ''),
    ) as Partial<T>;
  }
}
