import { Processor, WorkerHost, InjectQueue } from '@nestjs/bullmq';
import { Job, Queue } from 'bullmq';
import { Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma/prisma.service';
import { ActorBootstrapService } from '../bootstrap/actor-bootstrap.service';
import { ActorScoringService } from '../scoring/actor-scoring.service';
import { ActorEventsService } from '../../actor-events/actor-events.service';
import { Q_META_MESSAGES, Q_MSG_DELEGATION } from '../../queues/queues.constants';
import { WebsocketNotifierService } from '../../websocket-notifier/websocket-notifier.service';

@Processor(Q_META_MESSAGES, { concurrency: 1 })
export class MessagesProcessor extends WorkerHost {
  private readonly logger = new Logger(MessagesProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly actorEvents: ActorEventsService,
    private readonly bootstrap: ActorBootstrapService,
    private readonly scoring: ActorScoringService,
    private readonly websocketNotifier: WebsocketNotifierService,
    @InjectQueue(Q_MSG_DELEGATION) private readonly delegationQueue: Queue,
  ) {
    super();
  }

  async process(job: Job<any>) {
    if (job.name !== 'meta.message') {
      this.logger.warn(`Job ignorado en ${Q_META_MESSAGES}: name=${job.name}, id=${job.id}`);
      return;
    }

    const env = job.data;
    this.logger.log(`FLOW[MESSAGE] start externalEventId=${env.externalEventId}`);

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

      const state = await this.getLatestLifecycleState(tx as any, env.actorExternalId);

      if (state === 'QUALIFIED') {
        // Flujo inbox separado: no pasa por scoring/delegacion.
        if (this.isInboxMessageEvent(env?.eventType)) {
          await this.persistMessageSession(env);
          this.logger.log(`FLOW[MESSAGE] inbox branch actor=${env.actorExternalId} state=QUALIFIED`);
        } else {
          this.logger.log(`FLOW[MESSAGE] inbox branch skip non-message eventType=${env?.eventType}`);
        }
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

  private isInboxMessageEvent(eventType: string | undefined): boolean {
    const eventKind = String(eventType || '').replace(/^messaging\./, '');
    return eventKind === 'message' || eventKind === 'message_echo';
  }

  private resolveDirection(payload: any, eventKind: string): 'INCOMING' | 'OUTGOING' | 'SYSTEM' {
    if (['delivery', 'read', 'reaction', 'postback', 'unknown'].includes(eventKind)) return 'SYSTEM';
    const isEcho = payload?.message?.isEcho;
    if (isEcho === true) return 'OUTGOING';
    if (isEcho === false) return 'INCOMING';
    return 'SYSTEM';
  }

  private async persistMessageSession(env: any) {
    const payload = env?.payload || {};
    const eventKind = String(env?.eventType || '').replace(/^messaging\./, '') || 'unknown';
    const direction = this.resolveDirection(payload, eventKind);

    const existingSession = await this.prisma.$queryRawUnsafe<Array<{ session_id: string }>>(
      `
      SELECT session_id
      FROM n8n_message_sessions
      WHERE actor_external_id = $1
        AND object_type = $2
      ORDER BY occurred_at DESC
      LIMIT 1
    `,
      env.actorExternalId,
      String(env.objectType || 'PAGE'),
    );

    const sessionId = existingSession[0]?.session_id || `${env.provider || 'META'}:${env.objectType || 'PAGE'}:${env.actorExternalId}`;
    const media = this.extractIncomingMedia(payload);
    const contentText = payload?.message?.text || (media?.mediaType === 'audio' ? '[audio]' : media?.mediaType === 'image' ? '[imagen]' : null);
    const sourceChannel = payload?.message?.messageSource || null;
    const contentJson = {
      ...(payload || {}),
      ...(media
        ? {
            mediaType: media.mediaType,
            mediaUrl: media.mediaUrl,
          }
        : {}),
    };

    await this.prisma.$executeRawUnsafe(
      `
      INSERT INTO n8n_message_sessions (
        session_id, external_event_id, message_external_id, actor_external_id,
        provider, object_type, source_channel, event_kind, direction,
        content_text, content_json, status, occurred_at, received_at, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4,
        $5, $6, $7, $8, $9,
        $10, $11::jsonb, 'received', $12, now(), now(), now()
      )
      ON CONFLICT (external_event_id) DO NOTHING
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

    await this.websocketNotifier.notificarMetaInboxMessageNew({
      sessionId,
      actorExternalId: env.actorExternalId,
      objectType: String(env.objectType || 'PAGE'),
      externalEventId: env.externalEventId,
      messageExternalId: payload?.message?.mid || null,
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
  }

  private extractIncomingMedia(payload: any): { mediaType: 'audio' | 'image'; mediaUrl: string } | null {
    const attachments = Array.isArray(payload?.message?.attachments) ? payload.message.attachments : [];
    const first = attachments[0];
    const type = String(first?.type || '').toLowerCase();
    const mediaUrl = first?.payload?.url ? String(first.payload.url) : null;
    if (!mediaUrl) return null;
    if (type === 'audio') return { mediaType: 'audio', mediaUrl };
    if (type === 'image') return { mediaType: 'image', mediaUrl };
    return null;
  }
}
