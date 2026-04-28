import { Processor, WorkerHost, InjectQueue } from '@nestjs/bullmq';
import { Job, Queue } from 'bullmq';
import { Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma/prisma.service';
import { ActorBootstrapService } from '../bootstrap/actor-bootstrap.service';
import { ConversationBootstrapService } from '../bootstrap/conversation-bootstrap.service';
import { ActorScoringService } from '../scoring/actor-scoring.service';
import { ActorEventsService } from '../../actor-events/actor-events.service';
import { Q_META_MESSAGES, Q_MSG_DELEGATION, Q_THREAD_MSG_DELEGATION } from '../../queues/queues.constants';
import { WebsocketNotifierService } from '../../websocket-notifier/websocket-notifier.service';
import { MetaInboxService } from '../../meta-inbox/meta-inbox.service';

type IncomingMedia = {
  mediaType: 'audio' | 'image' | 'video' | 'document';
  mediaUrl: string;
};

@Processor(Q_META_MESSAGES, { concurrency: 1 })
export class MessagesProcessor extends WorkerHost {
  private readonly logger = new Logger(MessagesProcessor.name);

  private static readonly DELEGATION_BLOCKING_ATTENTION_MODES = new Set(['HUMAN', 'SYSTEM', 'PAUSED']);
  private static readonly DELEGATION_BLOCKING_THREAD_STATUSES = new Set(['PAUSED', 'CLOSED']);

  constructor(
    private readonly prisma: PrismaService,
    private readonly actorEvents: ActorEventsService,
    private readonly bootstrap: ActorBootstrapService,
    private readonly conversationBootstrap: ConversationBootstrapService,
    private readonly scoring: ActorScoringService,
    private readonly websocketNotifier: WebsocketNotifierService,
    private readonly metaInbox: MetaInboxService,
    @InjectQueue(Q_MSG_DELEGATION) private readonly delegationQueue: Queue,
    @InjectQueue(Q_THREAD_MSG_DELEGATION) private readonly threadDelegationQueue: Queue,
  ) {
    super();
  }

  async process(job: Job<any>) {
    if (job.name !== 'meta.message' && job.name !== 'baileys.message') {
      this.logger.warn(`Job ignorado en ${Q_META_MESSAGES}: name=${job.name}, id=${job.id}`);
      return;
    }

    const env = job.data;
    this.logger.log(`FLOW[MESSAGE] start externalEventId=${env.externalEventId}`);
    const eventKind = String(env?.eventType || '').replace(/^messaging\./, '') || 'unknown';
    const messageDirection = this.resolveDirection(env?.payload || {}, eventKind);

    await this.prisma.$transaction(async (tx) => {
      await this.actorEvents
        .registerEvent({
          externalEventId: env.externalEventId,
          actorExternalId: env.actorExternalId,
          provider: env.provider,
          objectType: env.objectType,
          pipeline: env.pipeline,
          eventType: env.eventType,
          payload: env.payload,
          occurredAt: new Date(env.occurredAt),
        })
        .catch(() => {});
      this.logger.log(`FLOW[MESSAGE] event_history ok externalEventId=${env.externalEventId}`);

      await this.bootstrap.ensureActorExists(tx as any, env.actorExternalId);
      this.logger.log(`FLOW[MESSAGE] bootstrap ok actorExternalId=${env.actorExternalId}`);
    });

    let inboxPersistResult: { inserted: boolean; primedFirstDelegate: boolean } | null = null;
    if (this.isInboxMessageEvent(env?.eventType)) {
      inboxPersistResult = await this.persistMessageSession(env);
      this.logger.log(`FLOW[MESSAGE] inbox persisted actor=${env.actorExternalId}`);
      if (!inboxPersistResult.inserted) {
        this.logger.warn(`FLOW[MESSAGE] duplicate inbox event stop externalEventId=${env.externalEventId}`);
        return;
      }
    } else {
      this.logger.log(`FLOW[MESSAGE] inbox skip non-message eventType=${env?.eventType}`);
    }

    if (!this.isDelegableIncomingEvent(env?.provider, env?.eventType, messageDirection)) {
      this.logger.log(
        `FLOW[MESSAGE] delegation skipped actor=${env.actorExternalId} reason=non_delegable_event ` +
        `eventType=${env?.eventType || 'unknown'} direction=${messageDirection}`,
      );
      this.logger.log(`FLOW[MESSAGE] done externalEventId=${env.externalEventId}`);
      return;
    }

    await this.prisma.$transaction(async (tx) => {
      const delegationControl = await this.getDelegationControlState(
        tx as any,
        env.actorExternalId,
        String(env.objectType || 'PAGE'),
      );

      if (delegationControl?.blocked) {
        this.logger.log(
          `FLOW[MESSAGE] delegation skipped actor=${env.actorExternalId} reason=${delegationControl.reason} ` +
          `threadStatus=${delegationControl.threadStatus || 'null'} attentionMode=${delegationControl.attentionMode || 'null'}`,
        );
        if (delegationControl.reason === 'awaiting_first_incoming_delegate' && delegationControl.sessionId) {
          await this.clearAwaitingFirstIncomingDelegate(tx as any, delegationControl.sessionId);
        }
        return;
      }

      if (delegationControl?.sessionId && (delegationControl.attentionMode ?? 'N8N') === 'N8N') {
        const threadDelegationPayload = await this.buildThreadDelegationPayload(
          tx as any,
          env,
          delegationControl,
        );
        await this.threadDelegationQueue.add(
          'thread.msg.delegation',
          threadDelegationPayload,
          {
            jobId: `thread_${env.externalEventId}`,
            attempts: 5,
            backoff: { type: 'exponential', delay: 5000 },
            removeOnComplete: 5000,
            removeOnFail: 5000,
          },
        );
        this.logger.log(
          `FLOW[MESSAGE] thread delegated externalEventId=${env.externalEventId} sessionId=${delegationControl.sessionId}`,
        );
      }

      const state = await this.getLatestLifecycleState(tx as any, env.actorExternalId);

      if (state === 'QUALIFIED') {
        // Flujo inbox separado: no pasa por scoring/delegacion.
        this.logger.log(`FLOW[MESSAGE] inbox branch actor=${env.actorExternalId} state=QUALIFIED`);
        return;
      }

      if (state === 'BLOCKED') {
        this.logger.log(`FLOW[MESSAGE] blocked branch stop actor=${env.actorExternalId}`);
        return;
      }

      // Flujo original scoring/delegacion.
      const { isTerminal } = await this.scoring.getLifecycleState(tx as any, env.actorExternalId);

      if (isTerminal) {
        this.logger.log(`FLOW[MESSAGE] terminal gate stop actorExternalId=${env.actorExternalId}`);
        return;
      }

      await this.delegationQueue.add(
        'msg.delegation',
        {
          externalEventId: env.externalEventId,
          actorExternalId: env.actorExternalId,
          occurredAt: env.occurredAt,
          payload: env.payload,
          provider: env.provider,
          objectType: env.objectType,
        },
        {
          jobId: env.externalEventId,
          attempts: 5,
          backoff: { type: 'exponential', delay: 5000 },
          removeOnComplete: 5000,
          removeOnFail: 5000,
        },
      );
      this.logger.log(`FLOW[MESSAGE] delegated externalEventId=${env.externalEventId}`);
    });
    this.logger.log(`FLOW[MESSAGE] done externalEventId=${env.externalEventId}`);
  }

  private async getLatestLifecycleState(
    tx: any,
    actorExternalId: string,
  ): Promise<'NEW' | 'CHURNED' | 'QUALIFIED' | 'BLOCKED' | null> {
    const rows = (await tx.$queryRawUnsafe(
      `
      SELECT state
      FROM actor_lifecycle
      WHERE actor_external_id = $1
      ORDER BY occurred_at DESC
      LIMIT 1
    `,
      actorExternalId,
    )) as Array<{ state: 'NEW' | 'CHURNED' | 'QUALIFIED' | 'BLOCKED' | null }>;
    return rows[0]?.state ?? null;
  }

  private async getDelegationControlState(
    tx: any,
    actorExternalId: string,
    objectType: string,
  ): Promise<{
    blocked: boolean;
    reason: string | null;
    sessionId: string | null;
    threadStatus: string | null;
    attentionMode: string | null;
    threadStage: string | null;
    awaitingFirstIncomingDelegate: boolean;
  }> {
    const rows = (await tx.$queryRawUnsafe(
      `
      SELECT
        session_id AS "sessionId",
        thread_status AS "threadStatus",
        attention_mode AS "attentionMode",
        thread_stage AS "threadStage",
        awaiting_first_incoming_delegate AS "awaitingFirstIncomingDelegate"
      FROM threads
      WHERE actor_external_id = $1
        AND object_type = $2
      ORDER BY updated_at DESC
      LIMIT 1
    `,
      actorExternalId,
      objectType,
    )) as Array<{ sessionId: string | null; threadStatus: string | null; attentionMode: string | null; threadStage: string | null; awaitingFirstIncomingDelegate: boolean | null }>;

    const sessionId = rows[0]?.sessionId ?? null;
    const threadStatus = rows[0]?.threadStatus ?? null;
    const attentionMode = rows[0]?.attentionMode ?? null;
    const threadStage = rows[0]?.threadStage ?? null;
    const awaitingFirstIncomingDelegate = rows[0]?.awaitingFirstIncomingDelegate === true;

    if (awaitingFirstIncomingDelegate) {
      return {
        blocked: true,
        reason: 'awaiting_first_incoming_delegate',
        sessionId,
        threadStatus,
        attentionMode,
        threadStage,
        awaitingFirstIncomingDelegate,
      };
    }

    if (threadStatus && MessagesProcessor.DELEGATION_BLOCKING_THREAD_STATUSES.has(threadStatus)) {
      return {
        blocked: true,
        reason: `thread_status_${threadStatus.toLowerCase()}`,
        sessionId,
        threadStatus,
        attentionMode,
        threadStage,
        awaitingFirstIncomingDelegate,
      };
    }

    if (attentionMode && MessagesProcessor.DELEGATION_BLOCKING_ATTENTION_MODES.has(attentionMode)) {
      return {
        blocked: true,
        reason: `attention_mode_${attentionMode.toLowerCase()}`,
        sessionId,
        threadStatus,
        attentionMode,
        threadStage,
        awaitingFirstIncomingDelegate,
      };
    }

    return {
      blocked: false,
      reason: null,
      sessionId,
      threadStatus,
      attentionMode,
      threadStage,
      awaitingFirstIncomingDelegate,
    };
  }

  private async buildThreadDelegationPayload(
    tx: any,
    env: any,
    delegationControl: {
      sessionId: string | null;
      threadStatus: string | null;
      attentionMode: string | null;
      threadStage: string | null;
    },
  ) {
    const payload = env?.payload || {};
    const eventKind = String(env?.eventType || '').replace(/^messaging\./, '') || 'unknown';
    const direction = this.resolveDirection(payload, eventKind);
    const media = this.extractIncomingMedia(payload);
    const contentText = this.resolveVisibleContentText(payload, eventKind, media);
    const mediaCaption = this.resolveIncomingMediaCaption(payload, media, contentText);
    const sourceChannel = this.resolveSourceChannel(payload, eventKind);
    const messageType = this.resolveMessageType(eventKind, media);
    const senderType = this.resolveSenderType(direction);
    const structuredPayload = this.resolveStructuredPayload(payload, eventKind);
    const sessionId = String(delegationControl.sessionId || '');

    const threadRows = (await tx.$queryRawUnsafe(
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
        lc.occurred_at AS "actorLifecycleUpdatedAt"
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
    )) as Array<{
      threadId: string;
      sessionId: string;
      actorExternalId: string;
      objectType: string;
      sourceChannel: string | null;
      threadStatus: string | null;
      attentionMode: string | null;
      threadStage: string | null;
      displayName: string | null;
      phone: string | null;
      email: string | null;
      notes: string | null;
      city: string | null;
      actorScore: string | null;
      actorLifecycleState: string | null;
      actorLifecycleUpdatedAt: Date | null;
    }>;

    const thread = threadRows[0] || null;

    return {
      externalEventId: env.externalEventId,
      actorExternalId: env.actorExternalId,
      sessionId,
      occurredAt: env.occurredAt,
      provider: env.provider,
      objectType: env.objectType,
      threadStatus: delegationControl.threadStatus,
      attentionMode: delegationControl.attentionMode,
      threadStage: delegationControl.threadStage,
      payload,
      thread: thread
        ? {
            ...thread,
            actorLifecycleUpdatedAt: thread.actorLifecycleUpdatedAt?.toISOString?.() || null,
          }
        : null,
      contact: thread
        ? {
            displayName: thread.displayName,
            phone: thread.phone,
            email: thread.email,
            city: thread.city,
            notes: thread.notes,
          }
        : null,
      actor: {
        actorExternalId: env.actorExternalId,
        objectType: env.objectType,
        score: thread?.actorScore ?? null,
        lifecycleState: thread?.actorLifecycleState ?? null,
        lifecycleUpdatedAt: thread?.actorLifecycleUpdatedAt?.toISOString?.() || null,
      },
      message: {
        externalEventId: env.externalEventId,
        messageExternalId: payload?.message?.mid || null,
        eventKind,
        direction,
        senderType,
        messageType,
        sourceChannel,
        contentText,
        structuredPayload,
        media: media
          ? {
              mediaType: media.mediaType,
              mediaUrl: media.mediaUrl,
              caption: mediaCaption,
            }
          : null,
      },
    };
  }

  private isInboxMessageEvent(eventType: string | undefined): boolean {
    const eventKind = String(eventType || '').replace(/^messaging\./, '');
    return (
      eventKind === 'message' ||
      eventKind === 'message_echo' ||
      eventKind === 'postback' ||
      eventKind === 'reaction' ||
      eventKind === 'unsupported'
    );
  }

  private isDelegableIncomingEvent(
    provider: string | undefined,
    eventType: string | undefined,
    direction: 'INCOMING' | 'OUTGOING' | 'SYSTEM',
  ): boolean {
    const normalizedProvider = String(provider || 'META').toUpperCase();
    if (normalizedProvider !== 'META' && normalizedProvider !== 'BAILEYS') return false;
    const eventKind = String(eventType || '').replace(/^messaging\./, '');
    return eventKind === 'message' && direction === 'INCOMING';
  }

  private resolveDirection(payload: any, eventKind: string): 'INCOMING' | 'OUTGOING' | 'SYSTEM' {
    if (['delivery', 'read', 'reaction', 'unknown'].includes(eventKind)) return 'SYSTEM';
    if (eventKind === 'postback') return 'INCOMING';
    const isEcho = payload?.message?.isEcho;
    if (isEcho === true) return 'OUTGOING';
    if (isEcho === false) return 'INCOMING';
    return 'SYSTEM';
  }

  private async persistMessageSession(env: any): Promise<{ inserted: boolean; primedFirstDelegate: boolean }> {
    const payload = env?.payload || {};
    const eventKind = String(env?.eventType || '').replace(/^messaging\./, '') || 'unknown';
    const direction = this.resolveDirection(payload, eventKind);
    const sessionResolution = await this.resolveSessionIdForIncomingMessage(
      env,
      direction,
    );
    const sessionId = sessionResolution.sessionId;
    const media = this.extractIncomingMedia(payload);
    const contentText = this.resolveVisibleContentText(payload, eventKind, media);
    const mediaCaption = this.resolveIncomingMediaCaption(payload, media, contentText);
    const sourceChannel = this.resolveSourceChannel(payload, eventKind);
    const messageType = this.resolveMessageType(eventKind, media);
    const senderType = this.resolveSenderType(direction);
    const structuredPayload = this.resolveStructuredPayload(payload, eventKind);
    const contentJson = {
      ...(payload || {}),
      senderType,
      messageType,
      sourceChannel,
      structuredPayload,
      ...(media
        ? {
            mediaType: media.mediaType,
            mediaUrl: media.mediaUrl,
            caption: mediaCaption,
          }
        : {}),
    };

    if (direction === 'INCOMING' && String(env.objectType || '').toUpperCase() === 'WHATSAPP') {
      await this.upsertWhatsappContactFromIncoming(env, payload);
    }

    const insertedRows = await this.prisma.$queryRawUnsafe<Array<{ externalEventId: string }>>(
      `
      INSERT INTO thread_messages (
        session_id, external_event_id, message_external_id, actor_external_id,
        provider, object_type, source_channel, event_kind, direction,
        content_text, content_json, status, occurred_at, received_at, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4,
        $5, $6, $7, $8, $9,
        $10, $11::jsonb, 'received', $12, now(), now(), now()
      )
      ON CONFLICT (external_event_id) DO NOTHING
      RETURNING external_event_id AS "externalEventId"
    `,
      sessionId,
      env.externalEventId,
      payload?.message?.mid || null,
      env.actorExternalId,
      env.provider || 'META',
      String(env.objectType || 'PAGE'),
      sourceChannel,
      eventKind,
      direction,
      contentText,
      JSON.stringify(contentJson),
      new Date(env.occurredAt),
    );

    if (insertedRows.length === 0) {
      this.logger.warn(`FLOW[MESSAGE] duplicate session skip notify externalEventId=${env.externalEventId}`);
      return { inserted: false, primedFirstDelegate: false };
    }

    await this.websocketNotifier.notificarMetaInboxMessageNew({
      sessionId,
      actorExternalId: env.actorExternalId,
      objectType: String(env.objectType || 'PAGE'),
      externalEventId: env.externalEventId,
      messageExternalId: payload?.message?.mid || null,
      senderType,
      messageType,
      sourceChannel,
      direction,
      eventKind,
      contentText,
      contentJson,
      status: 'received',
      occurredAt: env.occurredAt,
    });

    await this.websocketNotifier.notificarMetaInboxThreadUpsert({
      sessionId,
      actorExternalId: env.actorExternalId,
      objectType: String(env.objectType || 'PAGE'),
      sourceChannel,
      lastMessageText: contentText,
      lastDirection: direction,
      lastMessageAt: env.occurredAt,
    });
    await this.upsertThreadRecord({
      sessionId,
      actorExternalId: env.actorExternalId,
      objectType: String(env.objectType || 'PAGE'),
      sourceChannel,
      lastMessageText: contentText,
      lastDirection: direction,
      lastMessageAt: new Date(env.occurredAt),
      legacyMetadata: payload?.legacy || null,
    });

    await this.metaInbox.recordThreadEvent({
      sessionId,
      actorExternalId: env.actorExternalId,
      objectType: String(env.objectType || 'PAGE'),
      eventType: direction === 'OUTGOING' ? 'MESSAGE_OUTGOING' : 'MESSAGE_INCOMING',
      eventSource: env.provider || 'META',
      externalEventId: env.externalEventId,
      messageExternalId: payload?.message?.mid || null,
      direction,
      provider: env.provider || 'META',
      sourceChannel,
      metadata: {
        eventKind,
        messageType,
        senderType,
        status: 'received',
      },
      occurredAt: new Date(env.occurredAt),
      dedupeKey: `${direction === 'OUTGOING' ? 'MESSAGE_OUTGOING' : 'MESSAGE_INCOMING'}:${env.externalEventId}`,
    });

    if (direction === 'INCOMING' && sessionResolution.primeFirstIncomingDelegate) {
      await this.primeFirstIncomingDelegate(sessionId, env, sourceChannel);
    }
    return {
      inserted: true,
      primedFirstDelegate: direction === 'INCOMING' && sessionResolution.primeFirstIncomingDelegate,
    };
  }

  private resolveVisibleContentText(
    payload: any,
    eventKind: string,
    media: IncomingMedia | null,
  ): string | null {
    if (eventKind === 'postback') {
      const title = payload?.postback?.title;
      const selectedPayload = payload?.postback?.payload;
      return title || selectedPayload || '[postback]';
    }

    if (eventKind === 'reaction') {
      const emoji = payload?.reaction?.emoji;
      return emoji ? `Reaccionó ${emoji}` : 'Reaccionó a un mensaje';
    }

    if (eventKind === 'unsupported') {
      return payload?.message?.text || '[mensaje no soportado]';
    }

    return payload?.message?.text ||
      (media?.mediaType === 'audio'
        ? '[audio]'
        : media?.mediaType === 'image'
          ? '[imagen]'
          : media?.mediaType === 'video'
            ? '[video]'
            : media?.mediaType === 'document'
              ? '[documento]'
          : null);
  }

  private resolveIncomingMediaCaption(
    payload: any,
    media: IncomingMedia | null,
    contentText: string | null,
  ): string | null {
    if (!media || !contentText) return null;
    const directText = typeof payload?.message?.text === 'string' ? payload.message.text.trim() : '';
    if (!directText) return null;
    return directText === contentText ? directText : contentText;
  }

  private resolveMessageType(
    eventKind: string,
    media: IncomingMedia | null,
  ): string {
    if (eventKind === 'postback') return 'interactive_postback';
    if (eventKind === 'reaction') return 'reaction';
    if (eventKind === 'unsupported') return 'unsupported';
    if (media?.mediaType === 'audio') return 'audio';
    if (media?.mediaType === 'image') return 'image';
    if (media?.mediaType === 'video') return 'video';
    if (media?.mediaType === 'document') return 'document';
    return 'text';
  }

  private resolveSenderType(direction: 'INCOMING' | 'OUTGOING' | 'SYSTEM'): string {
    if (direction === 'OUTGOING') return 'META_PAGE';
    if (direction === 'INCOMING') return 'ACTOR';
    return 'SYSTEM';
  }

  private resolveSourceChannel(payload: any, eventKind: string): string | null {
    if (payload?.message?.messageSource) {
      return payload.message.messageSource;
    }

    if (eventKind === 'postback') {
      const referralSource = String(
        payload?.postback?.referral?.source ||
        payload?.referral?.source ||
        '',
      ).toLowerCase();
      if (referralSource.includes('comment')) return 'post_comment_ref';
      return 'inbox_dm';
    }

    return null;
  }

  private resolveStructuredPayload(payload: any, eventKind: string): any {
    if (eventKind === 'postback') {
      return {
        kind: 'postback',
        title: payload?.postback?.title || null,
        value: payload?.postback?.payload || null,
        referral: payload?.postback?.referral || payload?.referral || null,
      };
    }

    return null;
  }

  private async upsertThreadRecord(input: {
    sessionId: string;
    actorExternalId: string;
    objectType: string;
    sourceChannel: string | null;
    lastMessageText: string | null;
    lastDirection: 'INCOMING' | 'OUTGOING' | 'SYSTEM';
    lastMessageAt: Date;
    legacyMetadata?: any;
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
        metadata,
        updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6::varchar(16), $7::timestamptz,
        CASE WHEN $6::varchar(16) = 'INCOMING' THEN $7::timestamptz ELSE NULL::timestamptz END,
        CASE WHEN $6::varchar(16) = 'OUTGOING' THEN $7::timestamptz ELSE NULL::timestamptz END,
        CASE
          WHEN $8::jsonb IS NULL THEN '{}'::jsonb
          ELSE jsonb_build_object('legacy', $8::jsonb)
        END,
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
        thread_status = CASE
          WHEN threads.thread_status = 'ARCHIVED' AND EXCLUDED.last_direction = 'INCOMING' THEN 'OPEN'
          ELSE threads.thread_status
        END,
        archived_at = CASE
          WHEN threads.thread_status = 'ARCHIVED' AND EXCLUDED.last_direction = 'INCOMING' THEN NULL
          ELSE threads.archived_at
        END,
        metadata = CASE
          WHEN $8::jsonb IS NULL THEN threads.metadata
          ELSE COALESCE(threads.metadata, '{}'::jsonb) || jsonb_build_object('legacy', $8::jsonb)
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
      input.legacyMetadata ? JSON.stringify(input.legacyMetadata) : null,
    );
  }

  private async upsertWhatsappContactFromIncoming(env: any, payload: any) {
    const actorExternalId = String(
      payload?.wa?.resolvedJid ||
      payload?.wa?.remoteJidAlt ||
      env.actorExternalId ||
      '',
    ).trim();
    if (!actorExternalId) return;

    const pushName = this.cleanContactDisplayName(
      payload?.wa?.pushName ||
      payload?.rawEvent?.messages?.[0]?.pushName ||
      payload?.pushName,
    );
    const phone = this.extractWhatsappPhone(actorExternalId) ||
      this.extractWhatsappPhone(payload?.wa?.remoteJidAlt) ||
      this.extractWhatsappPhone(env.actorExternalId);

    await this.prisma.$executeRawUnsafe(
      `
      INSERT INTO meta_inbox_contacts(
        actor_external_id, object_type, display_name, phone, metadata, updated_at
      )
      VALUES (
        $1::varchar, 'WHATSAPP', COALESCE(NULLIF($2::text,''), COALESCE($3::varchar, 'Nuevo')), $3::varchar,
        jsonb_build_object(
          'source', 'baileys_incoming',
          'transport', 'baileys',
          'wa', jsonb_build_object(
            'pushName', $2::text,
            'resolvedJid', $1::varchar,
            'remoteJid', $4::varchar,
            'remoteJidAlt', $5::varchar,
            'tipoId', $6::varchar
          )
        ),
        now()
      )
      ON CONFLICT (actor_external_id, object_type)
      DO UPDATE SET
        display_name = CASE
          WHEN NULLIF($2::text, '') IS NULL THEN meta_inbox_contacts.display_name
          WHEN meta_inbox_contacts.display_name IS NULL
            OR meta_inbox_contacts.display_name = ''
            OR meta_inbox_contacts.display_name = 'Nuevo'
            OR meta_inbox_contacts.display_name = meta_inbox_contacts.phone
            OR meta_inbox_contacts.display_name = meta_inbox_contacts.actor_external_id
          THEN $2::text
          ELSE meta_inbox_contacts.display_name
        END,
        phone = COALESCE(meta_inbox_contacts.phone, EXCLUDED.phone),
        metadata = COALESCE(meta_inbox_contacts.metadata, '{}'::jsonb) || EXCLUDED.metadata,
        updated_at = now()
    `,
      actorExternalId,
      pushName,
      phone,
      payload?.wa?.remoteJid ? String(payload.wa.remoteJid) : null,
      payload?.wa?.remoteJidAlt ? String(payload.wa.remoteJidAlt) : null,
      payload?.wa?.tipoId ? String(payload.wa.tipoId) : null,
    );
  }

  private cleanContactDisplayName(value: any): string | null {
    if (typeof value !== 'string') return null;
    const cleaned = value.trim();
    if (!cleaned || cleaned.toLowerCase() === 'undefined' || cleaned.toLowerCase() === 'null') return null;
    return cleaned.slice(0, 120);
  }

  private extractWhatsappPhone(value: any): string | null {
    if (typeof value !== 'string') return null;
    const match = value.match(/^(\d{8,15})@/) || value.match(/^(\d{8,15})$/);
    return match?.[1] || null;
  }

  private async resolveSessionIdForIncomingMessage(
    env: any,
    direction: 'INCOMING' | 'OUTGOING' | 'SYSTEM',
  ): Promise<{ sessionId: string; primeFirstIncomingDelegate: boolean }> {
    const provider = String(env.provider || 'META');
    const objectType = String(env.objectType || 'PAGE');
    const actorExternalId = String(env.actorExternalId);
    const baseSessionId = `${provider}:${objectType}:${actorExternalId}`;

    const latestThreadRows = await this.prisma.$queryRawUnsafe<Array<{
      sessionId: string;
      threadStatus: string | null;
    }>>(
      `
      SELECT
        session_id AS "sessionId",
        thread_status AS "threadStatus"
      FROM threads
      WHERE actor_external_id = $1
        AND object_type = $2
      ORDER BY updated_at DESC, last_message_at DESC NULLS LAST
      LIMIT 1
    `,
      actorExternalId,
      objectType,
    );

    const latestThread = latestThreadRows[0];

    if (!latestThread?.sessionId) {
      const existingSession = await this.prisma.$queryRawUnsafe<Array<{ session_id: string }>>(
        `
        SELECT session_id
        FROM thread_messages
        WHERE actor_external_id = $1
          AND object_type = $2
        ORDER BY occurred_at DESC
        LIMIT 1
      `,
        actorExternalId,
        objectType,
      );

      const resolvedSessionId = existingSession[0]?.session_id || baseSessionId;
      const isNewActorThread = direction === 'INCOMING' && !existingSession[0]?.session_id;
      return {
        sessionId: resolvedSessionId,
        primeFirstIncomingDelegate: isNewActorThread,
      };
    }

    if (
      direction === 'INCOMING' &&
      String(latestThread.threadStatus || '') === 'CLOSED'
    ) {
      const suffix = `${new Date(env.occurredAt).getTime()}_${String(env.externalEventId || '')
        .replace(/[^a-zA-Z0-9_-]/g, '')
        .slice(-12) || Math.random().toString(16).slice(2, 10)}`;
      return {
        sessionId: `${baseSessionId}:${suffix}`.slice(0, 255),
        primeFirstIncomingDelegate: true,
      };
    }

    return {
      sessionId: latestThread.sessionId,
      primeFirstIncomingDelegate: false,
    };
  }

  private async primeFirstIncomingDelegate(
    sessionId: string,
    env: any,
    _sourceChannel: string | null,
  ) {
    await this.prisma.$executeRawUnsafe(
      `
      UPDATE threads
      SET awaiting_first_incoming_delegate = true,
          updated_at = now()
      WHERE session_id = $1
    `,
      sessionId,
    );

    const decision = this.conversationBootstrap.decideForFirstIncoming({
      provider: String(env?.provider || 'META'),
      objectType: String(env?.objectType || 'PAGE'),
    });

    if (!decision.shouldWelcome || !decision.welcomeText) {
      this.logger.log(
        `FLOW[MESSAGE] bootstrap greeting skipped sessionId=${sessionId} reason=${decision.reason}`,
      );
      return;
    }

    try {
      await this.metaInbox.sendSystemText({
        sessionId,
        text: decision.welcomeText,
      });
      this.logger.log(`FLOW[MESSAGE] bootstrap greeting sent sessionId=${sessionId}`);
    } catch (error) {
      this.logger.error(
        `FLOW[MESSAGE] bootstrap greeting failed sessionId=${sessionId}: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw error;
    }
  }

  private async clearAwaitingFirstIncomingDelegate(tx: any, sessionId: string) {
    await tx.$executeRawUnsafe(
      `
      UPDATE threads
      SET awaiting_first_incoming_delegate = false,
          updated_at = now()
      WHERE session_id = $1
    `,
      sessionId,
    );
  }

  private extractIncomingMedia(payload: any): IncomingMedia | null {
    if (payload?.media?.mediaUrl) {
      const rawType = String(payload.media.mediaType || '').toLowerCase();
      const mediaType = this.normalizeMediaType(rawType);
      if (mediaType) {
        return {
          mediaType,
          mediaUrl: String(payload.media.mediaUrl),
        };
      }
    }

    const attachments = Array.isArray(payload?.message?.attachments) ? payload.message.attachments : [];
    const first = attachments[0];
    const type = String(first?.type || '').toLowerCase();
    const mediaUrl =
      first?.payload?.url
        ? String(first.payload.url)
        : Array.isArray(payload?.message?.attachmentUrls) && payload.message.attachmentUrls[0]
          ? String(payload.message.attachmentUrls[0])
          : null;
    if (!mediaUrl) return null;
    const mediaType = this.normalizeMediaType(type || String(payload?.message?.attachmentTypes?.[0] || ''));
    if (mediaType) return { mediaType, mediaUrl };
    return null;
  }

  private normalizeMediaType(rawType: string): IncomingMedia['mediaType'] | null {
    if (rawType === 'audio') return 'audio';
    if (rawType === 'image' || rawType === 'imagen') return 'image';
    if (rawType === 'video') return 'video';
    if (rawType === 'document' || rawType === 'documento' || rawType === 'file') return 'document';
    return null;
  }
}
