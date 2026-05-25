import {
  BadRequestException,
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma/prisma.service';
import {
  IWebsocketNotifierGateway,
  WEBSOCKET_NOTIFIER_GATEWAY,
} from '../../websocket-notifier/interfaces/websocket-notifier-gateway.interface';
import { ThreadEventService, ThreadEventInput } from './thread-event.service';
import { CacheService } from '../../cache/cache.service';
import type { IThreadGateway } from '../interfaces/thread-gateway.interface';

const CACHE_TTL_THREAD_IDENTITY = 120;
const CACHE_TTL_STAGE_TEMPLATES = 300;
const CACHE_TTL_THREAD_ROW = 60;
const CACHE_TTL_THREAD_SNAPSHOT = 60;

export type ThreadRow = {
  threadId: string;
  sessionId: string;
  actorExternalId: string;
  objectType: string;
  sourceChannel: string | null;
  threadStatus: string;
  attentionMode: string;
  threadStage: string;
  metadata: unknown;
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
  whatsappBlockStatus: string | null;
  whatsappBlockUpdatedAt: Date | string | null;
  whatsappBlockJidUsed: string | null;
  actorScore: string | null;
  actorLifecycleState: string | null;
  actorLifecycleUpdatedAt: Date | null;
  lastMessageText: string | null;
  lastDirection: string;
  lastMessageAt: Date;
};

export type ThreadIdentity = {
  sessionId: string;
  actorExternalId: string;
  objectType: string;
  sourceChannel: string | null;
};

export type ThreadControlSnapshot = ThreadIdentity & {
  threadId: string;
  threadStatus: string;
  attentionMode: string;
  threadStage: string;
  stageControl: Record<string, unknown> | null;
  lastMessageText: string | null;
  lastDirection: string | null;
  lastMessageAt: Date | null;
};

export type ThreadSelectorInput = {
  sessionId?: string;
  actorExternalId?: string;
  objectType?: string;
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

@Injectable()
export class ThreadService implements IThreadGateway {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(WEBSOCKET_NOTIFIER_GATEWAY)
    private readonly websocketNotifier: IWebsocketNotifierGateway,
    private readonly threadEvent: ThreadEventService,
    private readonly cache: CacheService,
  ) {}

  async listThreads(input: {
    limit?: number;
    offset?: number;
    includeClosed?: boolean;
  }): Promise<ThreadRow[]> {
    const limit = Math.min(Math.max(input.limit ?? 50, 1), 200);
    const offset = Math.max(input.offset ?? 0, 0);
    const includeClosed = input.includeClosed === true;

    // raw: LATERAL JOIN para latest actor_lifecycle + JSONB operator para filtro openedFromAgenda
    return this.prisma.$queryRawUnsafe<ThreadRow[]>(`
      SELECT
        t.id AS "threadId",
        t.session_id AS "sessionId",
        t.actor_external_id AS "actorExternalId",
        t.object_type AS "objectType",
        t.source_channel AS "sourceChannel",
        t.thread_status AS "threadStatus",
        t.attention_mode AS "attentionMode",
        t.thread_stage AS "threadStage",
        t.metadata AS "metadata",
        COALESCE(c.display_name, 'Nuevo') AS "displayName",
        c.phone AS "phone",
        c.email AS "email",
        c.notes AS "notes",
        c.city AS "city",
        c.metadata->'wa'->>'blockStatus' AS "whatsappBlockStatus",
        c.metadata->'wa'->>'blockUpdatedAt' AS "whatsappBlockUpdatedAt",
        c.metadata->'wa'->>'blockJidUsed' AS "whatsappBlockJidUsed",
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
  }

  async ensureWhatsappThreadForContact(
    actorExternalId: string,
  ): Promise<ThreadRow> {
    const normalizedActor = String(actorExternalId || '').trim();
    if (!normalizedActor.endsWith('@s.whatsapp.net')) {
      throw new BadRequestException(
        'Solo se puede preparar thread para contactos WhatsApp/Baileys con JID telefonico',
      );
    }

    const contact = await this.prisma.meta_inbox_contacts.findUnique({
      where: {
        actor_external_id_object_type: {
          actor_external_id: normalizedActor,
          object_type: 'WHATSAPP',
        },
      },
      select: { actor_external_id: true },
    });
    if (!contact) {
      throw new BadRequestException('whatsapp_contact_not_found');
    }

    const openThread = await this.prisma.threads.findFirst({
      where: {
        actor_external_id: normalizedActor,
        object_type: 'WHATSAPP',
        thread_status: { in: ['OPEN', 'PAUSED', 'ARCHIVED'] },
      },
      orderBy: [
        { updated_at: 'desc' },
        { last_message_at: { sort: 'desc', nulls: 'last' } },
      ],
      select: { session_id: true },
    });

    if (openThread?.session_id) {
      // raw: JSONB || merge para agregar 'resumedFromAgenda' + CASE condicional en archived_at
      await this.prisma.$executeRawUnsafe(
        `UPDATE threads
         SET
           thread_status = CASE WHEN thread_status = 'ARCHIVED' THEN 'OPEN' ELSE thread_status END,
           archived_at = CASE WHEN thread_status = 'ARCHIVED' THEN NULL ELSE archived_at END,
           metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object('resumedFromAgenda', true),
           updated_at = now()
         WHERE session_id = $1`,
        openThread.session_id,
      );
      const existing = await this.getThreadRow(openThread.session_id);
      if (existing) return existing;
    }

    const baseSessionId = `BAILEYS:WHATSAPP:${normalizedActor}`;
    const latestThread = await this.prisma.threads.findFirst({
      where: { actor_external_id: normalizedActor, object_type: 'WHATSAPP' },
      orderBy: [
        { updated_at: 'desc' },
        { last_message_at: { sort: 'desc', nulls: 'last' } },
      ],
      select: { session_id: true },
    });
    const sessionId = latestThread?.session_id
      ? `${baseSessionId}:${Date.now()}_${Math.random().toString(16).slice(2, 8)}`.slice(
          0,
          255,
        )
      : baseSessionId;

    await this.prisma.threads.upsert({
      where: { session_id: sessionId },
      create: {
        session_id: sessionId,
        actor_external_id: normalizedActor,
        object_type: 'WHATSAPP',
        source_channel: 'baileys_whatsapp',
        thread_status: 'OPEN',
        attention_mode: 'HUMAN',
        thread_stage: 'inicio',
        metadata: { openedFromAgenda: true, openedManually: true },
        updated_at: new Date(),
      },
      update: {},
    });

    const created = await this.getThreadRow(sessionId);
    if (!created)
      throw new InternalServerErrorException(
        `whatsapp_thread_prepare_failed:${sessionId}`,
      );

    await this.threadEvent.recordThreadEvent({
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
      lastMessageAt: created.lastMessageAt
        ? new Date(created.lastMessageAt).toISOString()
        : undefined,
    });

    return created;
  }

  async getStageTemplatePaths(stageActual: string): Promise<{
    stage_actual: string;
    caminos: Partial<Record<string, unknown>>[];
  }> {
    const normalizedStage = (stageActual || '').trim();
    if (!normalizedStage) {
      throw new BadRequestException('Debes enviar un stage actual valido');
    }

    const cacheKey = `stage_templates:${normalizedStage}`;
    const cached = await this.cache.get<{
      stage_actual: string;
      caminos: Partial<Record<string, unknown>>[];
    }>(cacheKey);
    if (cached) return cached;

    const rows = await this.prisma.$queryRawUnsafe<StageTemplateRow[]>(
      `SELECT
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
       WHERE stage_actual = $1 AND activo = true
       ORDER BY posicion ASC NULLS LAST, id ASC`,
      normalizedStage,
    );

    const result = {
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
    await this.cache.set(cacheKey, result, CACHE_TTL_STAGE_TEMPLATES);
    return result;
  }

  async updateThreadControl(
    sessionId: string,
    input: {
      threadStatus?: string;
      attentionMode?: string;
      threadStage?: string;
      stageControl?: Record<string, unknown>;
    },
    eventSource: 'HUMAN' | 'N8N' | 'SYSTEM' | 'API' = 'HUMAN',
  ): Promise<{
    ok: boolean;
    threadStatus: string;
    attentionMode: string;
    threadStage: string;
    stageControl: Record<string, unknown> | null;
  }> {
    const thread = await this.getThreadSnapshot(sessionId);
    if (!thread) throw new NotFoundException(`session_not_found:${sessionId}`);

    // raw: jsonb_set para merge parcial de stage_control + CASE para paused_at/archived_at/closed_at condicionales
    await this.prisma.$executeRawUnsafe(
      `UPDATE threads
       SET
         thread_status = COALESCE($2, thread_status),
         attention_mode = COALESCE($3, attention_mode),
         thread_stage = COALESCE($4, thread_stage),
         metadata = CASE
           WHEN $5::jsonb IS NULL THEN metadata
           ELSE jsonb_set(
             COALESCE(metadata, '{}'::jsonb),
             '{stage_control}',
             COALESCE(metadata->'stage_control', '{}'::jsonb) || $5::jsonb,
             true
           )
         END,
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
       WHERE session_id = $1`,
      sessionId,
      input.threadStatus ?? null,
      input.attentionMode ?? null,
      input.threadStage ?? null,
      input.stageControl ? JSON.stringify(input.stageControl) : null,
    );

    await Promise.all([
      this.cache.del(`thread:snapshot:${sessionId}`),
      this.cache.del(`thread:row:${sessionId}`),
    ]);

    const updated = await this.getThreadSnapshot(sessionId);
    if (!updated) throw new NotFoundException(`session_not_found:${sessionId}`);

    const baseEvent: Pick<
      ThreadEventInput,
      | 'sessionId'
      | 'threadId'
      | 'actorExternalId'
      | 'objectType'
      | 'eventSource'
      | 'sourceChannel'
    > = {
      sessionId,
      threadId: updated.threadId,
      actorExternalId: updated.actorExternalId,
      objectType: updated.objectType,
      eventSource,
      sourceChannel: updated.sourceChannel,
    };

    if (input.threadStatus && input.threadStatus !== thread.threadStatus) {
      await this.threadEvent.recordThreadEvent({
        ...baseEvent,
        eventType: 'THREAD_STATUS_CHANGED',
        fromValue: thread.threadStatus,
        toValue: updated.threadStatus,
        metadata: {
          attentionMode: updated.attentionMode,
          threadStage: updated.threadStage,
          stageControl: updated.stageControl,
        },
        dedupeKey: `THREAD_STATUS_CHANGED:${sessionId}:${thread.threadStatus}:${updated.threadStatus}:${Date.now()}`,
      });
    }

    if (input.attentionMode && input.attentionMode !== thread.attentionMode) {
      await this.threadEvent.recordThreadEvent({
        ...baseEvent,
        eventType: 'ATTENTION_MODE_CHANGED',
        fromValue: thread.attentionMode,
        toValue: updated.attentionMode,
        metadata: {
          threadStatus: updated.threadStatus,
          threadStage: updated.threadStage,
          stageControl: updated.stageControl,
        },
        dedupeKey: `ATTENTION_MODE_CHANGED:${sessionId}:${thread.attentionMode}:${updated.attentionMode}:${Date.now()}`,
      });
    }

    if (input.threadStage && input.threadStage !== thread.threadStage) {
      await this.threadEvent.recordThreadEvent({
        ...baseEvent,
        eventType: 'THREAD_STAGE_CHANGED',
        fromValue: thread.threadStage,
        toValue: updated.threadStage,
        metadata: {
          threadStatus: updated.threadStatus,
          attentionMode: updated.attentionMode,
          stageControl: updated.stageControl,
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
      stageControl: updated.stageControl,
    };
  }

  async reopenThread(sessionId: string): Promise<ThreadRow> {
    const current = await this.getThreadRow(sessionId);
    if (!current) throw new NotFoundException(`session_not_found:${sessionId}`);
    if (current.threadStatus !== 'ARCHIVED') {
      throw new BadRequestException(
        'Solo se puede retomar un thread ARCHIVED. Un thread CLOSED no se reutiliza; se debe crear una nueva atencion.',
      );
    }

    const openedAt = new Date();

    await this.prisma.$executeRawUnsafe(
      `UPDATE threads
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
       WHERE session_id = $1`,
      current.sessionId,
      openedAt,
    );

    await Promise.all([
      this.cache.del(`thread:row:${current.sessionId}`),
      this.cache.del(`thread:snapshot:${current.sessionId}`),
    ]);

    const reopened = await this.getThreadRow(current.sessionId);
    if (!reopened)
      throw new InternalServerErrorException(
        `thread_reopen_failed:${current.sessionId}`,
      );

    await this.threadEvent.recordThreadEvent({
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
      stageControl:
        ((reopened.metadata as Record<string, unknown> | null)
          ?.stage_control as Record<string, unknown> | null) ?? null,
      lastMessageText: reopened.lastMessageText,
      lastDirection: reopened.lastDirection,
      lastMessageAt: reopened.lastMessageAt
        ? new Date(reopened.lastMessageAt)
        : null,
    });

    return reopened;
  }

  async resolveThreadByActor(
    actorExternalId: string,
    objectType: string,
    includeClosed = false,
  ): Promise<ThreadRow> {
    const thread = await this.getPreferredThreadByActor(
      actorExternalId,
      objectType,
      includeClosed,
    );
    if (!thread) {
      throw new NotFoundException(
        `thread_not_found:${objectType}:${actorExternalId}`,
      );
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
    stageControl?: Record<string, unknown>;
  }): Promise<{
    ok: boolean;
    threadStatus: string;
    attentionMode: string;
    threadStage: string;
    stageControl: Record<string, unknown> | null;
    sessionId: string;
    thread: ThreadRow | null;
  }> {
    const sessionId = await this.resolveSessionIdForAutomation(input);
    const result = await this.updateThreadControl(
      sessionId,
      {
        threadStatus: input.threadStatus,
        attentionMode: input.attentionMode,
        threadStage: input.threadStage,
        stageControl: input.stageControl,
      },
      'N8N',
    );
    const thread = await this.getThreadRow(sessionId);

    return { ...result, sessionId, thread };
  }

  async getThreadRow(sessionId: string): Promise<ThreadRow | null> {
    const cacheKey = `thread:row:${sessionId}`;
    const cached = await this.cache.get<ThreadRow>(cacheKey);
    if (cached) return cached;

    // raw: multi-table JOIN con LATERAL para actor_lifecycle + actor_score en un query
    const rows = await this.prisma.$queryRawUnsafe<ThreadRow[]>(
      `SELECT
        t.id AS "threadId",
        t.session_id AS "sessionId",
        t.actor_external_id AS "actorExternalId",
        t.object_type AS "objectType",
        t.source_channel AS "sourceChannel",
        t.thread_status AS "threadStatus",
        t.attention_mode AS "attentionMode",
        t.thread_stage AS "threadStage",
        t.metadata AS "metadata",
        COALESCE(c.display_name, 'Nuevo') AS "displayName",
        c.first_name AS "firstName",
        c.last_name AS "lastName",
        c.phone AS "phone",
        c.rut AS "rut",
        c.address AS "address",
        c.email AS "email",
        c.notes AS "notes",
        c.city AS "city",
        c.region AS "region",
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
       LEFT JOIN actor_score sc ON sc.actor_external_id = t.actor_external_id
       LEFT JOIN LATERAL (
         SELECT al.state, al.occurred_at
         FROM actor_lifecycle al
         WHERE al.actor_external_id = t.actor_external_id
         ORDER BY al.occurred_at DESC
         LIMIT 1
       ) lc ON true
       WHERE t.session_id = $1
       LIMIT 1`,
      sessionId,
    );
    const row = rows[0] || null;
    if (row) await this.cache.set(cacheKey, row, CACHE_TTL_THREAD_ROW);
    return row;
  }

  async getThreadIdentity(sessionId: string): Promise<ThreadIdentity | null> {
    const cacheKey = `thread:identity:${sessionId}`;
    const cached = await this.cache.get<ThreadIdentity>(cacheKey);
    if (cached) return cached;

    const rows = await this.prisma.$queryRawUnsafe<ThreadIdentity[]>(
      `SELECT
        session_id AS "sessionId",
        actor_external_id AS "actorExternalId",
        object_type AS "objectType",
        source_channel AS "sourceChannel"
       FROM threads
       WHERE session_id = $1
       LIMIT 1`,
      sessionId,
    );

    if (rows[0]) {
      await this.cache.set(cacheKey, rows[0], CACHE_TTL_THREAD_IDENTITY);
      return rows[0];
    }

    const fallback = await this.prisma.$queryRawUnsafe<ThreadIdentity[]>(
      `SELECT
        session_id AS "sessionId",
        actor_external_id AS "actorExternalId",
        object_type AS "objectType",
        source_channel AS "sourceChannel"
       FROM thread_messages
       WHERE session_id = $1
       ORDER BY occurred_at DESC
       LIMIT 1`,
      sessionId,
    );

    if (fallback[0]) {
      await this.cache.set(cacheKey, fallback[0], CACHE_TTL_THREAD_IDENTITY);
    }
    return fallback[0] || null;
  }

  async getThreadSnapshot(
    sessionId: string,
  ): Promise<ThreadControlSnapshot | null> {
    const cacheKey = `thread:snapshot:${sessionId}`;
    const cached = await this.cache.get<ThreadControlSnapshot>(cacheKey);
    if (cached) return cached;

    const rows = await this.prisma.$queryRawUnsafe<ThreadControlSnapshot[]>(
      `SELECT
        id AS "threadId",
        session_id AS "sessionId",
        actor_external_id AS "actorExternalId",
        object_type AS "objectType",
        source_channel AS "sourceChannel",
        thread_status AS "threadStatus",
        attention_mode AS "attentionMode",
        thread_stage AS "threadStage",
        metadata->'stage_control' AS "stageControl",
        last_message_text AS "lastMessageText",
        last_direction AS "lastDirection",
        last_message_at AS "lastMessageAt"
       FROM threads
       WHERE session_id = $1
       LIMIT 1`,
      sessionId,
    );
    const snapshot = rows[0] || null;
    if (snapshot)
      await this.cache.set(cacheKey, snapshot, CACHE_TTL_THREAD_SNAPSHOT);
    return snapshot;
  }

  async resolveSessionIdForAutomation(
    input: ThreadSelectorInput,
  ): Promise<string> {
    if (input.sessionId) {
      const exists = await this.getThreadIdentity(input.sessionId);
      if (!exists)
        throw new NotFoundException(`session_not_found:${input.sessionId}`);
      return input.sessionId;
    }

    if (!input.actorExternalId || !input.objectType) {
      throw new BadRequestException(
        'Debes enviar sessionId o actorExternalId + objectType',
      );
    }

    const thread = await this.getPreferredThreadByActor(
      input.actorExternalId,
      input.objectType,
      true,
    );
    if (!thread) {
      throw new NotFoundException(
        `thread_not_found:${input.objectType}:${input.actorExternalId}`,
      );
    }

    return thread.sessionId;
  }

  async upsertThreadRecord(input: {
    sessionId: string;
    actorExternalId: string;
    objectType: string;
    sourceChannel: string | null;
    lastMessageText: string | null;
    lastDirection: 'INCOMING' | 'OUTGOING' | 'SYSTEM';
    lastMessageAt: Date;
  }): Promise<void> {
    await this.prisma.$executeRawUnsafe(
      `INSERT INTO threads (
        session_id, actor_external_id, object_type, source_channel,
        last_message_text, last_direction, last_message_at,
        last_incoming_at, last_outgoing_at, updated_at
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
        updated_at = now()`,
      input.sessionId,
      input.actorExternalId,
      input.objectType,
      input.sourceChannel,
      input.lastMessageText,
      input.lastDirection,
      input.lastMessageAt,
    );

    await Promise.all([
      this.cache.del(`thread:row:${input.sessionId}`),
      this.cache.del(`thread:snapshot:${input.sessionId}`),
    ]);
  }

  async notifyThreadUpsert(thread: ThreadControlSnapshot): Promise<void> {
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

  private async getPreferredThreadByActor(
    actorExternalId: string,
    objectType: string,
    includeClosed = false,
  ): Promise<ThreadRow | null> {
    const rows = await this.prisma.$queryRawUnsafe<ThreadRow[]>(
      `SELECT
        t.id AS "threadId",
        t.session_id AS "sessionId",
        t.actor_external_id AS "actorExternalId",
        t.object_type AS "objectType",
        t.source_channel AS "sourceChannel",
        t.thread_status AS "threadStatus",
        t.attention_mode AS "attentionMode",
        t.thread_stage AS "threadStage",
        t.metadata AS "metadata",
        COALESCE(c.display_name, 'Nuevo') AS "displayName",
        c.phone AS "phone",
        c.email AS "email",
        c.notes AS "notes",
        c.city AS "city",
        c.metadata->'wa'->>'blockStatus' AS "whatsappBlockStatus",
        c.metadata->'wa'->>'blockUpdatedAt' AS "whatsappBlockUpdatedAt",
        c.metadata->'wa'->>'blockJidUsed' AS "whatsappBlockJidUsed",
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
       LEFT JOIN actor_score sc ON sc.actor_external_id = t.actor_external_id
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
       LIMIT 1`,
      actorExternalId,
      objectType,
      includeClosed,
    );
    return rows[0] || null;
  }

  private omitEmptyFields<T extends Record<string, unknown>>(
    input: T,
  ): Partial<T> {
    return Object.fromEntries(
      Object.entries(input).filter(
        ([, value]) => value !== null && value !== undefined && value !== '',
      ),
    ) as Partial<T>;
  }
}
