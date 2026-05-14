import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import {
  Q_META_MESSAGES,
  Q_META_CHANGES,
} from '../../queues/queues.constants';

@Injectable()
export class MetaService {
  private readonly logger = new Logger(MetaService.name);

  constructor(
    @InjectQueue(Q_META_MESSAGES)
    private readonly messagesQueue: Queue,

    @InjectQueue(Q_META_CHANGES)
    private readonly changesQueue: Queue,
  ) {}

  async handleEvent(body: any) {
    this.logger.log('Evento recibido desde Meta');

    if (!body?.entry) {
      this.logger.warn('Payload inválido');
      return;
    }

    const objectType = this.resolveObjectType(body?.object);

    for (const entry of body.entry) {
      const messagingEvents = entry.messaging || [];
      for (const event of messagingEvents) {
        this.logger.log(
          `FLOW[INGRESS] messaging event sender=${event?.sender?.id || 'unknown'} ts=${event?.timestamp || 'n/a'}`,
        );
        this.logger.log(`FLOW[RAW][MESSAGING] ${JSON.stringify(event)}`);
        await this.processMessagingEvent(event, objectType);
      }

      const changeEvents = entry.changes || [];
      for (const change of changeEvents) {
        this.logger.log(`FLOW[INGRESS] change event field=${change?.field || 'unknown'}`);
        this.logger.log(`FLOW[RAW][CHANGE] ${JSON.stringify(change)}`);
        await this.processChangeEvent(change, objectType);
      }

      if (messagingEvents.length === 0 && changeEvents.length === 0) {
        this.logger.warn(`FLOW[RAW][UNHANDLED_ENTRY] ${JSON.stringify(entry)}`);
      }
    }
  }

  /**
   * ==================================
   * MESSAGING EVENTS
   * ==================================
   */
  private async processMessagingEvent(event: any, objectType: 'PAGE' | 'INSTAGRAM') {
    const senderId = event?.sender?.id || 'unknown';
    const recipientId = event?.recipient?.id || 'unknown';
    const eventKind = this.detectMessagingKind(event);
    const timestamp = event?.timestamp || Date.now();
    const occurredAt = new Date(timestamp).toISOString();
    const knownKeys = new Set([
      'sender',
      'recipient',
      'timestamp',
      'message',
      'delivery',
      'read',
      'postback',
      'reaction',
      'referral',
      'optin',
      'pass_thread_control',
      'take_thread_control',
      'request_thread_control',
    ]);
    const unknownKeys = Object.keys(event || {}).filter((key) => !knownKeys.has(key));

    if (eventKind === 'unknown' || unknownKeys.length > 0) {
      this.logger.warn(
        `FLOW[MESSAGING][UNMAPPED] eventKind=${eventKind} unknownKeys=${unknownKeys.join(',') || 'none'}`,
      );
      this.logger.warn(`FLOW[MESSAGING][UNMAPPED_RAW] ${JSON.stringify(event)}`);
    }

    const message = event?.message || {};
    const attachments = Array.isArray(message.attachments)
      ? message.attachments
      : [];
    const attachmentUrls = attachments
      .map((item: any) => item?.payload?.url)
      .filter((url: any) => typeof url === 'string');
    const isCommentLinked = attachmentUrls.some((url: string) =>
      /story_fbid|permalink\.php|\/posts\//i.test(url),
    );
    const messageSource = isCommentLinked ? 'post_comment_ref' : 'inbox_dm';

    const primaryMid =
      message?.mid ||
      event?.reaction?.mid ||
      (Array.isArray(event?.delivery?.mids) ? event.delivery.mids[0] : undefined);

    const externalEventId = this.buildMessagingExternalEventId({
      event,
      eventKind,
      senderId,
      recipientId,
      timestamp,
      primaryMid,
    });

    const normalizedMessage = {
      platform: 'messenger',
      eventKind,
      senderId,
      recipientId,
      timestamp,
      message: event.message
        ? {
            mid: message.mid,
            text: message.text,
            isEcho: Boolean(message.is_echo),
            appId: message.app_id,
            hasAttachments: attachments.length > 0,
            attachmentTypes: attachments.map((item: any) => item?.type).filter(Boolean),
            attachmentUrls,
            isCommentLinked,
            messageSource,
            attachments,
            rawMessage: message,
          }
        : undefined,
      delivery: event.delivery ?? undefined,
      read: event.read ?? undefined,
      postback: event.postback ?? undefined,
      reaction: event.reaction ?? undefined,
      referral: event.referral ?? undefined,
      optin: event.optin ?? undefined,
      passThreadControl: event.pass_thread_control ?? undefined,
      takeThreadControl: event.take_thread_control ?? undefined,
      requestThreadControl: event.request_thread_control ?? undefined,
      rawEvent: event,
    };

    await this.messagesQueue.add(
      'meta.message',
      {
        externalEventId,
        actorExternalId: senderId,
        provider: 'META',
        objectType,
        pipeline: 'MESSAGES',
        eventType: `messaging.${eventKind}`,
        occurredAt,
        receivedAt: new Date().toISOString(),
        payload: normalizedMessage,
      },
      {
        jobId: externalEventId,
      },
    );

    this.logger.log(
      `FLOW[QUEUE] meta.message enqueued externalEventId=${externalEventId}, eventKind=${eventKind}`,
    );
  }

  private detectMessagingKind(event: any): string {
    if (event?.delivery) return 'delivery';
    if (event?.read) return 'read';
    if (event?.postback) return 'postback';
    if (event?.reaction) return 'reaction';
    if (event?.message?.is_echo) return 'message_echo';
    if (event?.message) return 'message';
    return 'unknown';
  }

  private buildMessagingExternalEventId(input: {
    event: any;
    eventKind: string;
    senderId: string;
    recipientId: string;
    timestamp: number;
    primaryMid?: string;
  }): string {
    if (typeof input.primaryMid === 'string' && input.primaryMid.length > 0) {
      return input.primaryMid;
    }

    const deliveryWatermark = input.event?.delivery?.watermark;
    const readWatermark = input.event?.read?.watermark;
    const watermark = deliveryWatermark || readWatermark || input.timestamp;

    const rawId = `msg_${input.eventKind}_${input.senderId}_${input.recipientId}_${watermark}`;
    return rawId.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 250);
  }

  private resolveObjectType(rawObject: any): 'PAGE' | 'INSTAGRAM' {
    const normalized = String(rawObject || '').toLowerCase();
    return normalized === 'instagram' ? 'INSTAGRAM' : 'PAGE';
  }

  /**
   * ==================================
   * CHANGE EVENTS
   * ==================================
   */
  private async processChangeEvent(change: any, objectType: 'PAGE' | 'INSTAGRAM') {

    const field = change.field;
    const value = change.value;

    this.logger.log(`📡 Evento CHANGE recibido: ${field}`);

    const actorId =
      value?.sender_id ||
      value?.from?.id ||
      'unknown';

    const externalId =
      `${field}:${actorId}:${value?.created_time || Date.now()}`;

    await this.changesQueue.add(
      'meta.change',
      {
        externalEventId: externalId,
        actorExternalId: actorId,
        provider: 'META',
        objectType,
        pipeline: 'CHANGES',
        eventType: field,
        occurredAt: new Date().toISOString(),
        receivedAt: new Date().toISOString(),
        payload: value,
      },
      {
        jobId: externalId,
      },
    );
    this.logger.log(`FLOW[QUEUE] meta.change enqueued externalEventId=${externalId}`);

    switch (field) {
      case 'message_reactions':
        this.logger.log('❤️ Reacción detectada');
        break;
      case 'mentions':
        this.logger.log('📣 Mention detectada');
        break;
      case 'comments':
        this.logger.log('💬 Comentario detectado');
        break;
      case 'feed':
        this.logger.log('📰 Evento feed Facebook');
        break;
      case 'leadgen':
        this.logger.log('🧾 Lead generado');
        break;
      default:
        this.logger.warn(`⚠️ Field no manejado: ${field}`);
    }
  }

}
