import { BadRequestException, Inject, Injectable, Logger, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma/prisma.service';
import { WebsocketNotifierService } from '../../websocket-notifier/websocket-notifier.service';
import { IMessageGateway, MESSAGE_GATEWAY } from '../../baileys/interfaces/message-gateway.interface';
import {
  assertTrustedMediaUrl,
  ensureCanonicalExtension,
  removeFileQuietly,
  validateStoredMediaFile,
} from '../../media/media-security';
import { IMinioGateway, MINIO_GATEWAY } from '../../minio/interfaces/minio-gateway.interface';
import { ThreadService, ThreadIdentity, ThreadSelectorInput } from './thread.service';
import { ThreadEventService } from './thread-event.service';
import { IMetaGraphApiGateway, META_GRAPH_GATEWAY, ThreadMessageMediaType } from '../interfaces/meta-graph-api-gateway.interface';
import { AudioConversionService } from './audio-conversion.service';

type ThreadMessageSenderType = 'HUMAN' | 'N8N' | 'SYSTEM';
type BaileysMessageType = 'text' | 'image' | 'audio' | 'document' | 'video';

@Injectable()
export class MessageSendService {
  private readonly logger = new Logger(MessageSendService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly websocketNotifier: WebsocketNotifierService,
    @Inject(MESSAGE_GATEWAY) private readonly baileysSender: IMessageGateway,
    @Inject(MINIO_GATEWAY) private readonly minio: IMinioGateway,
    private readonly thread: ThreadService,
    private readonly threadEvent: ThreadEventService,
    @Inject(META_GRAPH_GATEWAY) private readonly metaGraph: IMetaGraphApiGateway,
    private readonly audioConversion: AudioConversionService,
  ) {}

  async sendText(sessionId: string, text: string): Promise<{ ok: boolean; externalEventId: string; messageExternalId: string | null; occurredAt: string; inReplyToExternalEventId: string | null }> {
    return this.sendTextInternal(sessionId, text, 'HUMAN');
  }

  async sendSystemText(input: ThreadSelectorInput & { text: string }): Promise<{ ok: boolean; externalEventId: string; messageExternalId: string | null; occurredAt: string; inReplyToExternalEventId: string | null; thread: import('./thread.service').ThreadRow | null }> {
    const sessionId = await this.thread.resolveSessionIdForAutomation(input);
    const result = await this.sendTextInternal(sessionId, input.text, 'SYSTEM');
    const threadRow = await this.thread.getThreadRow(sessionId);
    return { ...result, thread: threadRow };
  }

  async sendThreadMessage(
    input: ThreadSelectorInput & {
      senderType?: ThreadMessageSenderType;
      text?: string;
      mediaUrl?: string;
      mediaType?: ThreadMessageMediaType;
      caption?: string;
      fileName?: string;
      mimeType?: string;
    },
  ): Promise<Record<string, unknown>> {
    const sessionId = await this.thread.resolveSessionIdForAutomation(input);
    const senderType = input.senderType || 'HUMAN';
    const text = input.text?.trim();
    const caption = input.caption?.trim();
    const mediaUrl = input.mediaUrl?.trim();
    const mediaType = input.mediaType;

    if (!mediaUrl) {
      if (!text) throw new BadRequestException('invalid_thread_message_payload');
      const result = await this.sendTextInternal(sessionId, text, senderType);
      const threadRow = await this.thread.getThreadRow(sessionId);
      return { ...result, thread: threadRow };
    }

    if (!mediaType) throw new BadRequestException('media_type_required');

    const trustedMediaUrl = assertTrustedMediaUrl(mediaUrl);
    const result = await this.sendMediaByUrlInternal(sessionId, trustedMediaUrl, mediaType, senderType, {
      caption: caption || text || undefined,
      mimeType: input.mimeType,
      fileName: input.fileName,
    });
    const threadRow = await this.thread.getThreadRow(sessionId);
    return { ...result, thread: threadRow };
  }

  async sendMedia(
    sessionId: string,
    file: Express.Multer.File,
    caption?: string,
  ): Promise<Record<string, unknown>> {
    const threadIdentity = await this.thread.getThreadIdentity(sessionId);
    if (!threadIdentity) throw new NotFoundException(`session_not_found:${sessionId}`);

    const isInstagram = this.metaGraph.isInstagramThread(threadIdentity.objectType, threadIdentity.sourceChannel);
    const detected = await validateStoredMediaFile(file, ['image', 'audio', 'video', 'document']);
    const mediaType = detected.family;
    ensureCanonicalExtension(file, detected);
    const preparedMedia = await this.prepareOutgoingMediaForThread(file, {
      isInstagram,
      mediaType,
      mimeType: detected.mimeType,
    });

    return this.sendMediaByUrlInternal(sessionId, preparedMedia.url, mediaType, 'HUMAN', {
      mimeType: preparedMedia.mimeType,
      fileName: file.filename,
      caption,
    });
  }

  private async sendTextInternal(
    sessionId: string,
    text: string,
    senderType: ThreadMessageSenderType,
  ): Promise<{ ok: boolean; externalEventId: string; messageExternalId: string | null; occurredAt: string; inReplyToExternalEventId: string | null }> {
    const threadIdentity = await this.thread.getThreadIdentity(sessionId);
    if (!threadIdentity) throw new NotFoundException(`session_not_found:${sessionId}`);

    if (this.isWhatsAppThread(threadIdentity.objectType)) {
      const inReplyToExternalEventId = await this.getLastIncomingExternalEventId(sessionId);
      return this.sendTextViaBaileys(sessionId, threadIdentity, text, senderType, inReplyToExternalEventId);
    }

    const inReplyToExternalEventId = await this.getLastIncomingExternalEventId(sessionId);
    if (!inReplyToExternalEventId) {
      throw new UnprocessableEntityException(`missing_conversation_context:${sessionId}`);
    }

    const transport = await this.metaGraph.resolveSendTransport(threadIdentity.objectType, threadIdentity.sourceChannel);
    const response = await this.metaGraph.postToGraphWithFallback(
      threadIdentity,
      { recipient: { id: threadIdentity.actorExternalId }, message: { text } },
      transport,
    );

    const messageExternalId = response?.data?.message_id || null;
    const externalEventId = messageExternalId || `out_${Date.now()}_${Math.random().toString(16).slice(2, 10)}`;
    const occurredAt = new Date();
    const contentJson = {
      senderType,
      messageType: 'text',
      sourceChannel: threadIdentity.sourceChannel,
      structuredPayload: null,
      graphResponse: response.data,
    };

    await this.prisma.$executeRawUnsafe(
      `INSERT INTO thread_messages (
        session_id, external_event_id, message_external_id, actor_external_id,
        provider, object_type, source_channel, event_kind, direction,
        content_text, content_json, in_reply_to_external_event_id, status, occurred_at, received_at, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4,
        'META', $5, $6, 'message', 'OUTGOING',
        $7, $8::jsonb, $9, 'sent', $10, now(), now(), now()
      )
      ON CONFLICT (external_event_id) DO NOTHING`,
      sessionId, externalEventId, messageExternalId, threadIdentity.actorExternalId,
      threadIdentity.objectType, threadIdentity.sourceChannel,
      text, JSON.stringify(contentJson), inReplyToExternalEventId, occurredAt,
    );

    await this.thread.upsertThreadRecord({
      sessionId,
      actorExternalId: threadIdentity.actorExternalId,
      objectType: threadIdentity.objectType,
      sourceChannel: threadIdentity.sourceChannel,
      lastMessageText: text,
      lastDirection: 'OUTGOING',
      lastMessageAt: occurredAt,
    });

    const snapshotForEvent = await this.thread.getThreadSnapshot(sessionId);
    await this.threadEvent.recordThreadEvent({
      sessionId,
      threadId: snapshotForEvent?.threadId ?? null,
      actorExternalId: threadIdentity.actorExternalId,
      objectType: threadIdentity.objectType,
      eventType: 'MESSAGE_OUTGOING',
      eventSource: senderType,
      externalEventId,
      messageExternalId,
      direction: 'OUTGOING',
      provider: 'META',
      sourceChannel: threadIdentity.sourceChannel,
      metadata: { messageType: 'text', status: 'sent', inReplyToExternalEventId },
      occurredAt,
      dedupeKey: `MESSAGE_OUTGOING:${externalEventId}`,
    });

    await this.websocketNotifier.notificarMetaInboxMessageNew({
      sessionId,
      actorExternalId: threadIdentity.actorExternalId,
      objectType: threadIdentity.objectType,
      externalEventId,
      messageExternalId,
      senderType,
      messageType: 'text',
      sourceChannel: threadIdentity.sourceChannel,
      direction: 'OUTGOING',
      eventKind: 'message',
      contentText: text,
      contentJson,
      status: 'sent',
      occurredAt: occurredAt.toISOString(),
      inReplyToExternalEventId,
    });

    const snapshot = snapshotForEvent || (await this.thread.getThreadSnapshot(sessionId));
    if (snapshot) await this.thread.notifyThreadUpsert(snapshot);

    return { ok: true, externalEventId, messageExternalId, occurredAt: occurredAt.toISOString(), inReplyToExternalEventId };
  }

  private async sendMediaByUrlInternal(
    sessionId: string,
    mediaUrl: string,
    mediaType: ThreadMessageMediaType,
    senderType: ThreadMessageSenderType,
    extra?: { mimeType?: string; fileName?: string; caption?: string },
  ): Promise<Record<string, unknown>> {
    const threadIdentity = await this.thread.getThreadIdentity(sessionId);
    if (!threadIdentity) throw new NotFoundException(`session_not_found:${sessionId}`);

    if (this.isWhatsAppThread(threadIdentity.objectType)) {
      const inReplyToExternalEventId = await this.getLastIncomingExternalEventId(sessionId);
      return this.sendMediaByUrlViaBaileys(sessionId, threadIdentity, mediaUrl, mediaType, senderType, inReplyToExternalEventId, extra);
    }

    const inReplyToExternalEventId = await this.getLastIncomingExternalEventId(sessionId);
    if (!inReplyToExternalEventId) throw new Error(`missing_conversation_context:${sessionId}`);
    if (extra?.caption) {
      throw new BadRequestException(
        `caption_not_supported_for_meta:${mediaType}. Meta Graph no permite enviar texto y adjunto en una sola burbuja para este canal.`,
      );
    }

    const transport = await this.metaGraph.resolveSendTransport(threadIdentity.objectType, threadIdentity.sourceChannel);
    const graphAttachmentType = this.metaGraph.resolveGraphAttachmentType(mediaType, threadIdentity);
    const response = await this.metaGraph.postToGraphWithFallback(
      threadIdentity,
      {
        recipient: { id: threadIdentity.actorExternalId },
        message: { attachment: { type: graphAttachmentType, payload: { url: mediaUrl, is_reusable: true } } },
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
      sourceChannel: threadIdentity.sourceChannel,
      structuredPayload: null,
      mediaType,
      mediaUrl,
      mimeType: extra?.mimeType || null,
      fileName: extra?.fileName || null,
      caption: null,
      graphResponse: response.data,
    };

    await this.persistOutgoingThreadMessage({
      sessionId,
      externalEventId,
      messageExternalId,
      actorExternalId: threadIdentity.actorExternalId,
      provider: 'META',
      objectType: threadIdentity.objectType,
      sourceChannel: threadIdentity.sourceChannel,
      contentText: placeholderText,
      contentJson,
      inReplyToExternalEventId,
      occurredAt,
      senderType,
      messageType: mediaType,
    });

    return { ok: true, externalEventId, messageExternalId, occurredAt: occurredAt.toISOString(), inReplyToExternalEventId, mediaType, mediaUrl };
  }

  private async sendTextViaBaileys(
    sessionId: string,
    threadIdentity: ThreadIdentity,
    text: string,
    senderType: ThreadMessageSenderType,
    inReplyToExternalEventId: string | null,
  ): Promise<{ ok: boolean; externalEventId: string; messageExternalId: string | null; occurredAt: string; inReplyToExternalEventId: string | null; provider: string }> {
    const response = await this.baileysSender.enviarMensajeWhatsApp(threadIdentity.actorExternalId, 'text', text);
    const messageExternalId = this.extractBaileysMessageId(response);
    const externalEventId = messageExternalId || this.buildOutgoingBaileysEventId(threadIdentity.actorExternalId);
    const occurredAt = new Date();
    const contentJson = {
      senderType,
      messageType: 'text',
      sourceChannel: threadIdentity.sourceChannel,
      structuredPayload: null,
      baileysResponse: response || null,
    };

    await this.persistOutgoingThreadMessage({
      sessionId,
      externalEventId,
      messageExternalId,
      actorExternalId: threadIdentity.actorExternalId,
      provider: 'BAILEYS',
      objectType: threadIdentity.objectType,
      sourceChannel: threadIdentity.sourceChannel,
      contentText: text,
      contentJson,
      inReplyToExternalEventId,
      occurredAt,
      senderType,
      messageType: 'text',
    });

    return { ok: true, externalEventId, messageExternalId, occurredAt: occurredAt.toISOString(), inReplyToExternalEventId, provider: 'BAILEYS' };
  }

  private async sendMediaByUrlViaBaileys(
    sessionId: string,
    threadIdentity: ThreadIdentity,
    mediaUrl: string,
    mediaType: ThreadMessageMediaType,
    senderType: ThreadMessageSenderType,
    inReplyToExternalEventId: string | null,
    extra?: { mimeType?: string; fileName?: string; caption?: string },
  ): Promise<Record<string, unknown>> {
    const baileysType = this.resolveBaileysMessageType(mediaType);
    const caption = mediaType === 'audio' ? '' : extra?.caption || '';
    const response = await this.baileysSender.enviarMensajeWhatsApp(
      threadIdentity.actorExternalId,
      baileysType,
      caption,
      undefined,
      mediaUrl,
      { fileName: extra?.fileName, mimeType: extra?.mimeType },
    );
    const messageExternalId = this.extractBaileysMessageId(response);
    const externalEventId = messageExternalId || this.buildOutgoingBaileysEventId(threadIdentity.actorExternalId);
    const occurredAt = new Date();
    const placeholderText = this.resolveMediaPlaceholder(mediaType);
    const contentJson = {
      senderType,
      messageType: mediaType,
      sourceChannel: threadIdentity.sourceChannel,
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
      actorExternalId: threadIdentity.actorExternalId,
      provider: 'BAILEYS',
      objectType: threadIdentity.objectType,
      sourceChannel: threadIdentity.sourceChannel,
      contentText: caption || placeholderText,
      contentJson,
      inReplyToExternalEventId,
      occurredAt,
      senderType,
      messageType: mediaType,
    });

    return { ok: true, externalEventId, messageExternalId, occurredAt: occurredAt.toISOString(), inReplyToExternalEventId, mediaType, mediaUrl, provider: 'BAILEYS' };
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
    contentJson: Record<string, unknown>;
    inReplyToExternalEventId: string | null;
    occurredAt: Date;
    senderType: ThreadMessageSenderType;
    messageType: string;
  }): Promise<void> {
    await this.prisma.$executeRawUnsafe(
      `INSERT INTO thread_messages (
        session_id, external_event_id, message_external_id, actor_external_id,
        provider, object_type, source_channel, event_kind, direction,
        content_text, content_json, in_reply_to_external_event_id, status, occurred_at, received_at, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4,
        $5, $6, $7, 'message', 'OUTGOING',
        $8, $9::jsonb, $10, 'sent', $11, now(), now(), now()
      )
      ON CONFLICT (external_event_id) DO NOTHING`,
      input.sessionId, input.externalEventId, input.messageExternalId, input.actorExternalId,
      input.provider, input.objectType, input.sourceChannel,
      input.contentText, JSON.stringify(input.contentJson), input.inReplyToExternalEventId, input.occurredAt,
    );

    await this.thread.upsertThreadRecord({
      sessionId: input.sessionId,
      actorExternalId: input.actorExternalId,
      objectType: input.objectType,
      sourceChannel: input.sourceChannel,
      lastMessageText: input.contentText,
      lastDirection: 'OUTGOING',
      lastMessageAt: input.occurredAt,
    });

    const snapshotForEvent = await this.thread.getThreadSnapshot(input.sessionId);
    await this.threadEvent.recordThreadEvent({
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
      metadata: { messageType: input.messageType, status: 'sent', inReplyToExternalEventId: input.inReplyToExternalEventId },
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

    const snapshot = snapshotForEvent || (await this.thread.getThreadSnapshot(input.sessionId));
    if (snapshot) await this.thread.notifyThreadUpsert(snapshot);
  }

  private async prepareOutgoingMediaForThread(
    file: Express.Multer.File,
    input: { isInstagram: boolean; mediaType: ThreadMessageMediaType; mimeType: string },
  ): Promise<{ url: string; mimeType: string }> {
    if (!input.isInstagram || input.mediaType !== 'audio') {
      const url = await this.minio.uploadFile(file.path, file.filename, input.mimeType);
      removeFileQuietly(file.path);
      return { url, mimeType: input.mimeType };
    }

    const converted = await this.audioConversion.convertToM4a(file.path);
    try {
      const url = await this.minio.uploadFile(converted.outputPath, converted.outputName, converted.mimeType);
      removeFileQuietly(converted.outputPath);
      return { url, mimeType: converted.mimeType };
    } catch (error) {
      removeFileQuietly(converted.outputPath);
      throw error;
    }
  }

  private async getLastIncomingExternalEventId(sessionId: string): Promise<string | null> {
    const rows = await this.prisma.$queryRawUnsafe<Array<{ externalEventId: string }>>(
      `SELECT external_event_id AS "externalEventId"
       FROM thread_messages
       WHERE session_id = $1 AND direction = 'INCOMING'
       ORDER BY occurred_at DESC
       LIMIT 1`,
      sessionId,
    );
    return rows[0]?.externalEventId || null;
  }

  private extractBaileysMessageId(response: any): string | null {
    const candidates = [
      response?.messageId, response?.message_id, response?.id, response?.key?.id,
      response?.data?.messageId, response?.data?.message_id, response?.data?.key?.id,
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

  private isWhatsAppThread(objectType: string): boolean {
    return (objectType || '').toUpperCase() === 'WHATSAPP';
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
}
