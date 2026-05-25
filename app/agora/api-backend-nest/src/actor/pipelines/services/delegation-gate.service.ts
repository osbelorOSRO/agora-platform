import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { MessageNormalizerService } from './message-normalizer.service';

export type LifecycleState = 'NEW' | 'CHURNED' | 'QUALIFIED' | 'BLOCKED' | null;

export type DelegationControlState = {
  blocked: boolean;
  reason: string | null;
  sessionId: string | null;
  threadStatus: string | null;
  attentionMode: string | null;
  threadStage: string | null;
  awaitingFirstIncomingDelegate: boolean;
};

type ThreadDelegationRow = {
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
};

@Injectable()
export class DelegationGateService {
  static readonly DELEGATION_BLOCKING_ATTENTION_MODES = new Set([
    'HUMAN',
    'SYSTEM',
    'PAUSED',
  ]);
  static readonly DELEGATION_BLOCKING_THREAD_STATUSES = new Set([
    'PAUSED',
    'CLOSED',
  ]);

  constructor(private readonly normalizer: MessageNormalizerService) {}

  isInboxMessageEvent(eventType: string | undefined): boolean {
    const eventKind = String(eventType || '').replace(/^messaging\./, '');
    return (
      eventKind === 'message' ||
      eventKind === 'message_echo' ||
      eventKind === 'postback' ||
      eventKind === 'reaction' ||
      eventKind === 'unsupported'
    );
  }

  isDelegableIncomingEvent(
    provider: string | undefined,
    eventType: string | undefined,
    direction: 'INCOMING' | 'OUTGOING' | 'SYSTEM',
  ): boolean {
    const normalizedProvider = String(provider || 'META').toUpperCase();
    if (normalizedProvider !== 'META' && normalizedProvider !== 'BAILEYS')
      return false;
    const eventKind = String(eventType || '').replace(/^messaging\./, '');
    return eventKind === 'message' && direction === 'INCOMING';
  }

  async getLatestLifecycleState(
    tx: Prisma.TransactionClient,
    actorExternalId: string,
  ): Promise<LifecycleState> {
    const row = await tx.actor_lifecycle.findFirst({
      where: { actor_external_id: actorExternalId },
      orderBy: { occurred_at: 'desc' },
      select: { state: true },
    });
    return (row?.state as LifecycleState) ?? null;
  }

  async getDelegationControlState(
    tx: Prisma.TransactionClient,
    actorExternalId: string,
    objectType: string,
  ): Promise<DelegationControlState> {
    const row = await tx.threads.findFirst({
      where: { actor_external_id: actorExternalId, object_type: objectType },
      orderBy: { updated_at: 'desc' },
      select: {
        session_id: true,
        thread_status: true,
        attention_mode: true,
        thread_stage: true,
        awaiting_first_incoming_delegate: true,
      },
    });

    const sessionId = row?.session_id ?? null;
    const threadStatus = row?.thread_status ?? null;
    const attentionMode = row?.attention_mode ?? null;
    const threadStage = row?.thread_stage ?? null;
    const awaitingFirstIncomingDelegate =
      row?.awaiting_first_incoming_delegate === true;

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

    if (
      threadStatus &&
      DelegationGateService.DELEGATION_BLOCKING_THREAD_STATUSES.has(
        threadStatus,
      )
    ) {
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

    if (
      attentionMode &&
      DelegationGateService.DELEGATION_BLOCKING_ATTENTION_MODES.has(
        attentionMode,
      )
    ) {
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

  async clearAwaitingFirstIncomingDelegate(
    tx: Prisma.TransactionClient,
    sessionId: string,
  ): Promise<void> {
    await tx.threads.update({
      where: { session_id: sessionId },
      data: { awaiting_first_incoming_delegate: false, updated_at: new Date() },
    });
  }

  async buildThreadDelegationPayload(
    tx: Prisma.TransactionClient,
    env: Record<string, unknown>,
    delegationControl: {
      sessionId: string | null;
      threadStatus: string | null;
      attentionMode: string | null;
      threadStage: string | null;
    },
  ): Promise<Record<string, unknown>> {
    const payload = (env?.['payload'] as Record<string, unknown>) || {};
    const eventKind =
      String(env?.['eventType'] || '').replace(/^messaging\./, '') || 'unknown';
    const direction = this.normalizer.resolveDirection(payload, eventKind);
    const media = this.normalizer.extractIncomingMedia(payload);
    const contentText = this.normalizer.resolveVisibleContentText(
      payload,
      eventKind,
      media,
    );
    const mediaCaption = this.normalizer.resolveIncomingMediaCaption(
      payload,
      media,
      contentText,
    );
    const sourceChannel = this.normalizer.resolveSourceChannel(
      payload,
      eventKind,
    );
    const messageType = this.normalizer.resolveMessageType(eventKind, media);
    const senderType = this.normalizer.resolveSenderType(direction);
    const structuredPayload = this.normalizer.resolveStructuredPayload(
      payload,
      eventKind,
    );
    const sessionId = String(delegationControl.sessionId || '');

    // raw: LATERAL JOIN para actor_lifecycle más reciente + actor_score en un solo query
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
    )) as ThreadDelegationRow[];

    const thread = threadRows[0] || null;

    return {
      externalEventId: env['externalEventId'],
      actorExternalId: env['actorExternalId'],
      sessionId,
      occurredAt: env['occurredAt'],
      provider: env['provider'],
      objectType: env['objectType'],
      threadStatus: delegationControl.threadStatus,
      attentionMode: delegationControl.attentionMode,
      threadStage: delegationControl.threadStage,
      payload,
      thread: thread
        ? {
            ...thread,
            actorLifecycleUpdatedAt:
              thread.actorLifecycleUpdatedAt?.toISOString?.() || null,
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
        actorExternalId: env['actorExternalId'],
        objectType: env['objectType'],
        score: thread?.actorScore ?? null,
        lifecycleState: thread?.actorLifecycleState ?? null,
        lifecycleUpdatedAt:
          thread?.actorLifecycleUpdatedAt?.toISOString?.() || null,
      },
      message: {
        externalEventId: env['externalEventId'],
        messageExternalId:
          (payload?.['message'] as Record<string, unknown>)?.['mid'] || null,
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
}
