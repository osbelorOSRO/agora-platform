import { BadRequestException, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../database/prisma/prisma.service';
import axios from 'axios';
import { WebsocketNotifierService } from '../websocket-notifier/websocket-notifier.service';
import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';
import util from 'util';
import { getRuntimeSecret } from '../shared/runtime-secrets';

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

type ThreadSelectorInput = {
  sessionId?: string;
  actorExternalId?: string;
  objectType?: string;
};

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
        phone varchar(50) NULL,
        email varchar(200) NULL,
        notes text NULL,
        city varchar(120) NULL,
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

  async listThreads(input: { limit?: number; offset?: number }) {
    const limit = Math.min(Math.max(input.limit ?? 50, 1), 200);
    const offset = Math.max(input.offset ?? 0, 0);

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
      WHERE t.thread_status <> 'CLOSED'
        AND (
          t.last_direction IN ('INCOMING', 'OUTGOING')
          OR EXISTS (
            SELECT 1
            FROM thread_messages s
            WHERE s.session_id = t.session_id
              AND s.direction IN ('INCOMING', 'OUTGOING')
          )
          OR (t.last_message_at IS NOT NULL AND t.thread_status IN ('OPEN', 'PAUSED'))
        )
      ORDER BY t.last_message_at DESC NULLS LAST
      LIMIT ${limit}
      OFFSET ${offset}
    `);

    return rows;
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
          nuevo_stage: row.nuevoStage,
          tipo_respuesta: row.tipoRespuesta,
          stage_route: row.stageRoute,
        }),
      ),
    };
  }

  async updateContact(
    sessionId: string,
    input: { displayName?: string; phone?: string; email?: string; notes?: string; city?: string },
  ) {
    const thread = await this.getThreadIdentity(sessionId);
    if (!thread) throw new Error(`session_not_found:${sessionId}`);

    await this.prisma.$executeRawUnsafe(
      `
      INSERT INTO meta_inbox_contacts(actor_external_id, object_type, display_name, phone, email, notes, city, updated_at)
      VALUES ($1, $2, COALESCE(NULLIF($3,''), 'Nuevo'), NULLIF($4,''), NULLIF($5,''), NULLIF($6,''), NULLIF($7,''), now())
      ON CONFLICT (actor_external_id, object_type)
      DO UPDATE SET
        display_name = COALESCE(NULLIF(EXCLUDED.display_name,''), meta_inbox_contacts.display_name),
        phone = EXCLUDED.phone,
        email = EXCLUDED.email,
        notes = EXCLUDED.notes,
        city = EXCLUDED.city,
        updated_at = now()
    `,
      thread.actorExternalId,
      thread.objectType,
      input.displayName ?? null,
      input.phone ?? null,
      input.email ?? null,
      input.notes ?? null,
      input.city ?? null,
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
        phone: input.phone ?? updated?.phone ?? null,
        email: input.email ?? updated?.email ?? null,
        notes: input.notes ?? updated?.notes ?? null,
        city: input.city ?? updated?.city ?? null,
      },
    };
  }

  async updateThreadControl(
    sessionId: string,
    input: { threadStatus?: string; attentionMode?: string; threadStage?: string },
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
    if (!['ARCHIVED', 'CLOSED'].includes(current.threadStatus)) {
      throw new BadRequestException('Solo se puede abrir una nueva atencion desde un thread ARCHIVED o CLOSED');
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
    });
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
    phone?: string;
    email?: string;
    notes?: string;
    city?: string;
  }) {
    const sessionId = await this.resolveSessionIdForAutomation(input);
    const result = await this.updateContact(sessionId, {
      displayName: input.displayName,
      phone: input.phone,
      email: input.email,
      notes: input.notes,
      city: input.city,
    });
    const thread = await this.getThreadRow(sessionId);

    return {
      ...result,
      thread,
    };
  }

  async sendTextForAutomation(input: {
    sessionId?: string;
    actorExternalId?: string;
    objectType?: string;
    text: string;
  }) {
    const sessionId = await this.resolveSessionIdForAutomation(input);
    const result = await this.sendTextInternal(sessionId, input.text, 'N8N');
    const thread = await this.getThreadRow(sessionId);

    return {
      ...result,
      thread,
    };
  }

  async sendMessageForAutomation(input: {
    sessionId?: string;
    actorExternalId?: string;
    objectType?: string;
    text?: string;
    mediaUrl?: string;
    mediaType?: 'audio' | 'image';
  }) {
    const sessionId = await this.resolveSessionIdForAutomation(input);

    if (input.text) {
      const result = await this.sendTextInternal(sessionId, input.text, 'N8N');
      const thread = await this.getThreadRow(sessionId);
      return { ...result, thread };
    }

    if (input.mediaUrl && input.mediaType) {
      const result = await this.sendMediaByUrlInternal(sessionId, input.mediaUrl, input.mediaType, 'N8N');
      const thread = await this.getThreadRow(sessionId);
      return { ...result, thread };
    }

    throw new Error('invalid_automation_message_payload');
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
    senderType: 'HUMAN' | 'N8N',
  ) {
    const thread = await this.getThreadIdentity(sessionId);
    if (!thread) throw new Error(`session_not_found:${sessionId}`);

    const transport = await this.resolveSendTransport(thread.objectType, thread.sourceChannel);
    const inReplyToExternalEventId = await this.getLastIncomingExternalEventId(sessionId);
    if (!inReplyToExternalEventId) {
      throw new Error(`missing_conversation_context:${sessionId}`);
    }

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

    const snapshot = await this.getThreadSnapshot(sessionId);
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

  async sendMedia(sessionId: string, file: Express.Multer.File) {
    const thread = await this.getThreadIdentity(sessionId);
    if (!thread) throw new Error(`session_not_found:${sessionId}`);

    const transport = await this.resolveSendTransport(thread.objectType, thread.sourceChannel);
    const inReplyToExternalEventId = await this.getLastIncomingExternalEventId(sessionId);
    if (!inReplyToExternalEventId) {
      throw new Error(`missing_conversation_context:${sessionId}`);
    }

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
      },
    );
  }

  private async sendMediaByUrlInternal(
    sessionId: string,
    mediaUrl: string,
    mediaType: 'audio' | 'image',
    senderType: 'HUMAN' | 'N8N',
    extra?: { mimeType?: string; fileName?: string },
  ) {
    const thread = await this.getThreadIdentity(sessionId);
    if (!thread) throw new Error(`session_not_found:${sessionId}`);

    const transport = await this.resolveSendTransport(thread.objectType, thread.sourceChannel);
    const inReplyToExternalEventId = await this.getLastIncomingExternalEventId(sessionId);
    if (!inReplyToExternalEventId) {
      throw new Error(`missing_conversation_context:${sessionId}`);
    }

    const response = await this.postToGraphWithFallback(
      thread,
      {
        recipient: { id: thread.actorExternalId },
        message: {
          attachment: {
            type: mediaType,
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

    const snapshot = await this.getThreadSnapshot(sessionId);
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
    input: { isInstagram: boolean; mediaType: 'audio' | 'image' },
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

  private resolveOutgoingMediaType(mimeType: string): 'audio' | 'image' {
    const normalized = String(mimeType || '').toLowerCase();
    if (normalized.startsWith('audio/')) return 'audio';
    if (normalized.startsWith('image/')) return 'image';
    throw new Error(`unsupported_media_type:${mimeType}`);
  }

  private resolveMediaPlaceholder(mediaType: 'audio' | 'image'): string {
    return mediaType === 'audio' ? '[audio]' : '[imagen]';
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
