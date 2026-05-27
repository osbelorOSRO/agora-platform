import { Inject, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma/prisma.service';
import {
  IWebsocketNotifierGateway,
  WEBSOCKET_NOTIFIER_GATEWAY,
} from '../../../websocket-notifier/interfaces/websocket-notifier-gateway.interface';
import {
  IMetaInboxGateway,
  META_INBOX_GATEWAY,
} from '../../../meta-inbox/interfaces/meta-inbox-gateway.interface';
import { ConversationBootstrapService } from '../../bootstrap/conversation-bootstrap.service';
import { MessageNormalizerService } from './message-normalizer.service';
import { IncomingMessageEnvelope } from '../incoming-message-envelope';

@Injectable()
export class IncomingMessagePersistenceService {
  private readonly logger = new Logger(IncomingMessagePersistenceService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(WEBSOCKET_NOTIFIER_GATEWAY)
    private readonly websocketNotifier: IWebsocketNotifierGateway,
    @Inject(META_INBOX_GATEWAY) private readonly metaInbox: IMetaInboxGateway,
    private readonly conversationBootstrap: ConversationBootstrapService,
    private readonly normalizer: MessageNormalizerService,
  ) {}

  async persistMessageSession(
    env: IncomingMessageEnvelope,
  ): Promise<{ inserted: boolean; primedFirstDelegate: boolean }> {
    const payload = env?.payload || {};
    const eventKind =
      String(env?.eventType || '').replace(/^messaging\./, '') || 'unknown';
    const direction = this.normalizer.resolveDirection(payload, eventKind);
    const sessionResolution = await this.resolveSessionIdForIncomingMessage(
      env,
      direction,
    );
    const sessionId = sessionResolution.sessionId;
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
    const isWhatsappIncoming =
      direction === 'INCOMING' &&
      String(env.objectType || '').toUpperCase() === 'WHATSAPP';
    const whatsappIdentity = isWhatsappIncoming
      ? this.normalizer.normalizeWhatsappIdentity(env, payload)
      : null;
    const adContext = isWhatsappIncoming
      ? this.normalizer.normalizeExternalAdContext(payload)
      : null;
    const contentJson = {
      ...(payload || {}),
      ...(whatsappIdentity || adContext
        ? {
            wa: {
              ...(payload?.wa || {}),
              ...(whatsappIdentity || {}),
              ...(adContext ? { adContext } : {}),
            },
            ...(adContext ? { adContext } : {}),
          }
        : {}),
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

    if (isWhatsappIncoming) {
      await this.upsertWhatsappContactFromIncoming(env, contentJson);
    }

    // raw: ON CONFLICT DO NOTHING + RETURNING — Prisma create no soporta RETURNING con skip de duplicados
    const insertedRows = await this.prisma.$queryRawUnsafe<
      Array<{ externalEventId: string }>
    >(
      `INSERT INTO thread_messages (
        session_id, external_event_id, message_external_id, actor_external_id,
        provider, object_type, source_channel, event_kind, direction,
        content_text, content_json, status, occurred_at, received_at, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4,
        $5, $6, $7, $8, $9,
        $10, $11::jsonb, 'received', $12, now(), now(), now()
      )
      ON CONFLICT (external_event_id) DO NOTHING
      RETURNING external_event_id AS "externalEventId"`,
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
      this.logger.warn(
        `FLOW[MESSAGE] duplicate session skip notify externalEventId=${env.externalEventId}`,
      );
      return { inserted: false, primedFirstDelegate: false };
    }

    if (isWhatsappIncoming && adContext?.sourceId) {
      await this.upsertWhatsappAdLead({
        sourceId: adContext.sourceId,
        sessionId,
        actorExternalId: env.actorExternalId,
        pnJid: whatsappIdentity?.pnJid || null,
        lidJid: whatsappIdentity?.lidJid || null,
        sourceUrl: adContext.sourceUrl || null,
        title: adContext.title || null,
        thumbnailUrl: adContext.thumbnailUrl || null,
        originalImageUrl: adContext.originalImageUrl || null,
        firstMessageText: contentText,
        metadata: {
          adContext,
          externalEventId: env.externalEventId,
          occurredAt: env.occurredAt,
        },
      });
    }

    const isFcaIncoming =
      String(env.provider || '').toUpperCase() === 'FCA' &&
      direction === 'INCOMING';
    const marketplace = (payload as Record<string, unknown>)?.[
      'marketplace'
    ] as Record<string, unknown> | undefined;
    if (isFcaIncoming && marketplace?.sourceId) {
      await this.upsertFcaMarketplaceLead({
        sourceId: String(marketplace.sourceId),
        sessionId,
        actorExternalId: env.actorExternalId,
        sourceUrl: marketplace.itemUrl ? String(marketplace.itemUrl) : null,
        title: marketplace.title ? String(marketplace.title) : null,
        description: marketplace.description
          ? String(marketplace.description)
          : null,
        imageUrl: marketplace.imageUrl ? String(marketplace.imageUrl) : null,
        firstMessageText: contentText,
        metadata: {
          externalEventId: env.externalEventId,
          occurredAt: env.occurredAt,
        },
      });
      await this.setThreadMarketplaceMetadata(sessionId, {
        sourceId: String(marketplace.sourceId),
        itemUrl: marketplace.itemUrl ? String(marketplace.itemUrl) : null,
        title: marketplace.title ? String(marketplace.title) : null,
        description: marketplace.description
          ? String(marketplace.description)
          : null,
        imageUrl: marketplace.imageUrl ? String(marketplace.imageUrl) : null,
      });
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

    if (direction === 'INCOMING') {
      await this.websocketNotifier.notificarGlobito({
        actorExternalId: env.actorExternalId,
        contenido: contentText || undefined,
        fecha_envio: env.occurredAt,
        phone:
          this.normalizer.extractWhatsappPhone(env.actorExternalId) ||
          undefined,
      });
    }

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
      eventType:
        direction === 'OUTGOING' ? 'MESSAGE_OUTGOING' : 'MESSAGE_INCOMING',
      eventSource: env.provider || 'META',
      externalEventId: env.externalEventId,
      messageExternalId: payload?.message?.mid || null,
      direction,
      provider: env.provider || 'META',
      sourceChannel,
      metadata: { eventKind, messageType, senderType, status: 'received' },
      occurredAt: new Date(env.occurredAt),
      dedupeKey: `${direction === 'OUTGOING' ? 'MESSAGE_OUTGOING' : 'MESSAGE_INCOMING'}:${env.externalEventId}`,
    });

    if (
      direction === 'INCOMING' &&
      sessionResolution.primeFirstIncomingDelegate
    ) {
      await this.primeFirstIncomingDelegate(sessionId, env, sourceChannel);
    }

    return {
      inserted: true,
      primedFirstDelegate:
        direction === 'INCOMING' &&
        sessionResolution.primeFirstIncomingDelegate,
    };
  }

  async handlePageEcho(env: IncomingMessageEnvelope): Promise<void> {
    const payload = env?.payload || {};
    const recipientId = String(
      payload?.recipientId || payload?.recipient?.id || '',
    ).trim();
    const objectType = String(env.objectType || 'PAGE');

    if (!recipientId) {
      this.logger.log(
        `FLOW[MESSAGE] page_echo skip no_recipient externalEventId=${env.externalEventId}`,
      );
      return;
    }

    const threadRow = await this.prisma.threads.findFirst({
      where: { actor_external_id: recipientId, object_type: objectType },
      orderBy: [
        { updated_at: 'desc' },
        { last_message_at: { sort: 'desc', nulls: 'last' } },
      ],
      select: { session_id: true },
    });

    const sessionId = threadRow?.session_id;
    if (!sessionId) {
      this.logger.log(
        `FLOW[MESSAGE] page_echo skip no_thread recipient=${recipientId} externalEventId=${env.externalEventId}`,
      );
      return;
    }

    const eventKind = 'message_echo';
    const direction = 'OUTGOING' as const;
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
    const senderType = 'META_PAGE';
    const structuredPayload = this.normalizer.resolveStructuredPayload(
      payload,
      eventKind,
    );
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
      _sourceApp:
        payload?.message?.appId || payload?.message?.app_id || 'external',
    };

    const insertedRows = await this.prisma.$queryRawUnsafe<
      Array<{ externalEventId: string }>
    >(
      `INSERT INTO thread_messages (
        session_id, external_event_id, message_external_id, actor_external_id,
        provider, object_type, source_channel, event_kind, direction,
        content_text, content_json, status, occurred_at, received_at, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4,
        $5, $6, $7, $8, $9,
        $10, $11::jsonb, 'received', $12, now(), now(), now()
      )
      ON CONFLICT (external_event_id) DO NOTHING
      RETURNING external_event_id AS "externalEventId"`,
      sessionId,
      env.externalEventId,
      payload?.message?.mid || null,
      recipientId,
      env.provider || 'META',
      objectType,
      sourceChannel,
      eventKind,
      direction,
      contentText,
      JSON.stringify(contentJson),
      new Date(env.occurredAt),
    );

    if (insertedRows.length === 0) {
      this.logger.log(
        `FLOW[MESSAGE] page_echo duplicate skip externalEventId=${env.externalEventId}`,
      );
      return;
    }

    this.logger.log(
      `FLOW[MESSAGE] page_echo persisted recipient=${recipientId} sessionId=${sessionId} externalEventId=${env.externalEventId}`,
    );

    await this.upsertThreadRecord({
      sessionId,
      actorExternalId: recipientId,
      objectType,
      sourceChannel,
      lastMessageText: contentText,
      lastDirection: direction,
      lastMessageAt: new Date(env.occurredAt),
    });

    await this.metaInbox.recordThreadEvent({
      sessionId,
      actorExternalId: recipientId,
      objectType,
      eventType: 'MESSAGE_OUTGOING',
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
        externalEcho: true,
      },
      occurredAt: new Date(env.occurredAt),
      dedupeKey: `MESSAGE_OUTGOING:${env.externalEventId}`,
    });

    await this.websocketNotifier.notificarMetaInboxMessageNew({
      sessionId,
      actorExternalId: recipientId,
      objectType,
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
      actorExternalId: recipientId,
      objectType,
      sourceChannel,
      lastMessageText: contentText,
      lastDirection: direction,
      lastMessageAt: env.occurredAt,
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
    legacyMetadata?: Record<string, unknown>;
  }): Promise<void> {
    await this.prisma.$executeRawUnsafe(
      `INSERT INTO threads (
        session_id, actor_external_id, object_type, source_channel,
        last_message_text, last_direction, last_message_at,
        last_incoming_at, last_outgoing_at, metadata, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6::varchar(16), $7::timestamptz,
        CASE WHEN $6::varchar(16) = 'INCOMING' THEN $7::timestamptz ELSE NULL::timestamptz END,
        CASE WHEN $6::varchar(16) = 'OUTGOING' THEN $7::timestamptz ELSE NULL::timestamptz END,
        CASE WHEN $8::jsonb IS NULL THEN '{}'::jsonb ELSE jsonb_build_object('legacy', $8::jsonb) END,
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
        updated_at = now()`,
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

  private async upsertWhatsappContactFromIncoming(
    env: IncomingMessageEnvelope,
    payload: Record<string, any>,
  ): Promise<void> {
    const identity = this.normalizer.normalizeWhatsappIdentity(env, payload);
    const adContext = this.normalizer.normalizeExternalAdContext(payload);
    const actorExternalId = String(
      identity.pnJid ||
        payload?.wa?.resolvedJid ||
        identity.lidJid ||
        env.actorExternalId ||
        '',
    ).trim();
    if (!actorExternalId) return;

    const pushName = this.normalizer.cleanContactDisplayName(
      payload?.wa?.pushName ||
        payload?.rawEvent?.messages?.[0]?.pushName ||
        payload?.pushName,
    );
    const phone =
      this.normalizer.extractWhatsappPhone(actorExternalId) ||
      this.normalizer.extractWhatsappPhone(identity.pnJid) ||
      this.normalizer.extractWhatsappPhone(payload?.wa?.remoteJidAlt) ||
      this.normalizer.extractWhatsappPhone(env.actorExternalId);

    await this.prisma.$executeRawUnsafe(
      `INSERT INTO meta_inbox_contacts(
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
            'tipoId', $6::varchar,
            'pnJid', $7::varchar,
            'lidJid', $8::varchar,
            'senderPn', $9::varchar,
            'senderKey', $10::varchar,
            'addressingMode', $11::varchar,
            'preferredBlockJid', $12::varchar,
            'adContext', $13::jsonb
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
        updated_at = now()`,
      actorExternalId,
      pushName,
      phone,
      payload?.wa?.remoteJid ? String(payload.wa.remoteJid) : null,
      payload?.wa?.remoteJidAlt ? String(payload.wa.remoteJidAlt) : null,
      payload?.wa?.tipoId ? String(payload.wa.tipoId) : null,
      identity.pnJid,
      identity.lidJid,
      payload?.wa?.senderPn ? String(payload.wa.senderPn) : null,
      payload?.wa?.senderKey ? String(payload.wa.senderKey) : null,
      payload?.wa?.addressingMode ? String(payload.wa.addressingMode) : null,
      identity.preferredBlockJid,
      adContext ? JSON.stringify(adContext) : null,
    );
  }

  private async upsertFcaMarketplaceLead(input: {
    sourceId: string;
    sessionId: string;
    actorExternalId: string;
    sourceUrl: string | null;
    title: string | null;
    description: string | null;
    imageUrl: string | null;
    firstMessageText: string | null;
    metadata: Record<string, unknown>;
  }): Promise<void> {
    await this.prisma.$executeRawUnsafe(
      `INSERT INTO fca_marketplace_leads (
        source_id, session_id, actor_external_id,
        source_url, title, description, image_url,
        first_message_text, metadata, first_seen_at, last_seen_at, seen_count
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, now(), now(), 1)
      ON CONFLICT (source_id, session_id)
      DO UPDATE SET
        source_url  = COALESCE(fca_marketplace_leads.source_url, EXCLUDED.source_url),
        title       = COALESCE(fca_marketplace_leads.title, EXCLUDED.title),
        description = COALESCE(fca_marketplace_leads.description, EXCLUDED.description),
        image_url   = COALESCE(fca_marketplace_leads.image_url, EXCLUDED.image_url),
        last_seen_at = now(),
        seen_count  = fca_marketplace_leads.seen_count + 1,
        metadata    = COALESCE(fca_marketplace_leads.metadata, '{}'::jsonb) || EXCLUDED.metadata`,
      input.sourceId,
      input.sessionId,
      input.actorExternalId,
      input.sourceUrl,
      input.title,
      input.description,
      input.imageUrl,
      input.firstMessageText,
      JSON.stringify(input.metadata),
    );
  }

  private async setThreadMarketplaceMetadata(
    sessionId: string,
    marketplace: {
      sourceId: string | null;
      itemUrl: string | null;
      title: string | null;
      description: string | null;
      imageUrl: string | null;
    },
  ): Promise<void> {
    // Solo escribe si aún no hay contexto de marketplace en el thread
    await this.prisma.$executeRawUnsafe(
      `UPDATE threads
       SET metadata = metadata || $1::jsonb, updated_at = now()
       WHERE session_id = $2
         AND (metadata->>'marketplace') IS NULL`,
      JSON.stringify({ marketplace }),
      sessionId,
    );
  }

  private async upsertWhatsappAdLead(input: {
    sourceId: string;
    sessionId: string;
    actorExternalId: string;
    pnJid: string | null;
    lidJid: string | null;
    sourceUrl: string | null;
    title: string | null;
    thumbnailUrl: string | null;
    originalImageUrl: string | null;
    firstMessageText: string | null;
    metadata: Record<string, unknown> | undefined;
  }): Promise<void> {
    await this.prisma.$executeRawUnsafe(
      `INSERT INTO wa_ad_leads (
        source_id, session_id, actor_external_id, pn_jid, lid_jid,
        source_url, title, thumbnail_url, original_image_url,
        first_message_text, metadata, first_seen_at, last_seen_at, seen_count
      )
      VALUES (
        $1, $2, $3, $4, $5,
        $6, $7, $8, $9,
        $10, $11::jsonb, now(), now(), 1
      )
      ON CONFLICT (source_id, session_id)
      DO UPDATE SET
        actor_external_id = COALESCE(wa_ad_leads.actor_external_id, EXCLUDED.actor_external_id),
        pn_jid = COALESCE(wa_ad_leads.pn_jid, EXCLUDED.pn_jid),
        lid_jid = COALESCE(wa_ad_leads.lid_jid, EXCLUDED.lid_jid),
        source_url = COALESCE(wa_ad_leads.source_url, EXCLUDED.source_url),
        title = COALESCE(wa_ad_leads.title, EXCLUDED.title),
        thumbnail_url = COALESCE(wa_ad_leads.thumbnail_url, EXCLUDED.thumbnail_url),
        original_image_url = COALESCE(wa_ad_leads.original_image_url, EXCLUDED.original_image_url),
        last_seen_at = now(),
        seen_count = wa_ad_leads.seen_count + 1,
        metadata = COALESCE(wa_ad_leads.metadata, '{}'::jsonb) || EXCLUDED.metadata`,
      input.sourceId,
      input.sessionId,
      input.actorExternalId,
      input.pnJid,
      input.lidJid,
      input.sourceUrl,
      input.title,
      input.thumbnailUrl,
      input.originalImageUrl,
      input.firstMessageText,
      JSON.stringify(input.metadata || {}),
    );
  }

  private async resolveSessionIdForIncomingMessage(
    env: IncomingMessageEnvelope,
    direction: 'INCOMING' | 'OUTGOING' | 'SYSTEM',
  ): Promise<{ sessionId: string; primeFirstIncomingDelegate: boolean }> {
    const provider = String(env.provider || 'META');
    const objectType = String(env.objectType || 'PAGE');
    const actorExternalId = String(env.actorExternalId);
    const baseSessionId = `${provider}:${objectType}:${actorExternalId}`;

    const latestThread = await this.prisma.threads.findFirst({
      where: { actor_external_id: actorExternalId, object_type: objectType },
      orderBy: [
        { updated_at: 'desc' },
        { last_message_at: { sort: 'desc', nulls: 'last' } },
      ],
      select: { session_id: true, thread_status: true },
    });

    if (!latestThread?.session_id) {
      const existingMessage = await this.prisma.thread_messages.findFirst({
        where: { actor_external_id: actorExternalId, object_type: objectType },
        orderBy: { occurred_at: 'desc' },
        select: { session_id: true },
      });

      const resolvedSessionId = existingMessage?.session_id || baseSessionId;
      const isNewActorThread =
        direction === 'INCOMING' && !existingMessage?.session_id;
      return {
        sessionId: resolvedSessionId,
        primeFirstIncomingDelegate: isNewActorThread,
      };
    }

    if (
      direction === 'INCOMING' &&
      String(latestThread.thread_status || '') === 'CLOSED'
    ) {
      const suffix = `${new Date(env.occurredAt).getTime()}_${
        String(env.externalEventId || '')
          .replace(/[^a-zA-Z0-9_-]/g, '')
          .slice(-12) || Math.random().toString(16).slice(2, 10)
      }`;
      return {
        sessionId: `${baseSessionId}:${suffix}`.slice(0, 255),
        primeFirstIncomingDelegate: true,
      };
    }

    return {
      sessionId: latestThread.session_id,
      primeFirstIncomingDelegate: false,
    };
  }

  private async primeFirstIncomingDelegate(
    sessionId: string,
    env: IncomingMessageEnvelope,
    _sourceChannel: string | null,
  ): Promise<void> {
    await this.prisma.threads.update({
      where: { session_id: sessionId },
      data: { awaiting_first_incoming_delegate: true, updated_at: new Date() },
    });

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
      this.logger.log(
        `FLOW[MESSAGE] bootstrap greeting sent sessionId=${sessionId}`,
      );
    } catch (error) {
      this.logger.error(
        `FLOW[MESSAGE] bootstrap greeting failed sessionId=${sessionId}: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw error;
    }
  }
}
