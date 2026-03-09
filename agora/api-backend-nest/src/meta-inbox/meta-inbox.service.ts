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
  sessionId: string;
  actorExternalId: string;
  objectType: string;
  sourceChannel: string | null;
  displayName: string;
  phone: string | null;
  email: string | null;
  notes: string | null;
  city: string | null;
  lastMessageText: string | null;
  lastDirection: string;
  lastMessageAt: Date;
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
  }

  async listThreads(input: { limit?: number; offset?: number }) {
    const limit = Math.min(Math.max(input.limit ?? 50, 1), 200);
    const offset = Math.max(input.offset ?? 0, 0);

    const rows = await this.prisma.$queryRawUnsafe<ThreadRow[]>(`
      SELECT *
      FROM (
        SELECT DISTINCT ON (s.actor_external_id, s.object_type)
          s.session_id AS "sessionId",
          s.actor_external_id AS "actorExternalId",
          s.object_type AS "objectType",
          s.source_channel AS "sourceChannel",
          COALESCE(c.display_name, 'Nuevo') AS "displayName",
          c.phone AS "phone",
          c.email AS "email",
          c.notes AS "notes",
          c.city AS "city",
          s.content_text AS "lastMessageText",
          s.direction AS "lastDirection",
          s.occurred_at AS "lastMessageAt"
        FROM n8n_message_sessions s
        LEFT JOIN meta_inbox_contacts c
          ON c.actor_external_id = s.actor_external_id
         AND c.object_type = s.object_type
        WHERE s.direction IN ('INCOMING', 'OUTGOING')
        ORDER BY s.actor_external_id, s.object_type, s.occurred_at DESC
      ) t
      JOIN LATERAL (
        SELECT al.state
        FROM actor_lifecycle al
        WHERE al.actor_external_id = t."actorExternalId"
        ORDER BY al.occurred_at DESC
        LIMIT 1
      ) last_state ON true
      WHERE last_state.state = 'QUALIFIED'
      ORDER BY t."lastMessageAt" DESC
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
      FROM n8n_message_sessions
      WHERE session_id = $1
        AND ($2::boolean = true OR direction <> 'SYSTEM')
        AND EXISTS (
          SELECT 1
          FROM actor_lifecycle al
          WHERE al.actor_external_id = n8n_message_sessions.actor_external_id
          ORDER BY al.occurred_at DESC
          LIMIT 1
        )
        AND (
          SELECT al2.state
          FROM actor_lifecycle al2
          WHERE al2.actor_external_id = n8n_message_sessions.actor_external_id
          ORDER BY al2.occurred_at DESC
          LIMIT 1
        ) = 'QUALIFIED'
      ORDER BY occurred_at ASC
      LIMIT 1000
    `, sessionId, includeSystem);

    return rows;
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

    await this.websocketNotifier.notificarMetaInboxThreadUpsert({
      sessionId,
      actorExternalId: thread.actorExternalId,
      objectType: thread.objectType,
      displayName: input.displayName ?? undefined,
      phone: input.phone ?? undefined,
      email: input.email ?? undefined,
      notes: input.notes ?? undefined,
      city: input.city ?? undefined,
    });

    return { ok: true };
  }

  async sendText(sessionId: string, text: string) {
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

    await this.prisma.$executeRawUnsafe(
      `
      INSERT INTO n8n_message_sessions (
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
      JSON.stringify({ graphResponse: response.data }),
      inReplyToExternalEventId,
      occurredAt,
    );

    await this.websocketNotifier.notificarMetaInboxMessageNew({
      sessionId,
      actorExternalId: thread.actorExternalId,
      objectType: thread.objectType,
      externalEventId,
      messageExternalId,
      direction: 'OUTGOING',
      eventKind: 'message',
      contentText: text,
      status: 'sent',
      occurredAt: occurredAt.toISOString(),
      inReplyToExternalEventId,
    });

    await this.websocketNotifier.notificarMetaInboxThreadUpsert({
      sessionId,
      actorExternalId: thread.actorExternalId,
      objectType: thread.objectType,
      sourceChannel: thread.sourceChannel,
      lastMessageText: text,
      lastDirection: 'OUTGOING',
      lastMessageAt: occurredAt.toISOString(),
    });

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
      mediaType,
      mediaUrl,
      mimeType: preparedMedia.mimeType,
      fileName: preparedMedia.fileName,
      graphResponse: response.data,
    };

    await this.prisma.$executeRawUnsafe(
      `
      INSERT INTO n8n_message_sessions (
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

    await this.websocketNotifier.notificarMetaInboxMessageNew({
      sessionId,
      actorExternalId: thread.actorExternalId,
      objectType: thread.objectType,
      externalEventId,
      messageExternalId,
      direction: 'OUTGOING',
      eventKind: 'message',
      contentText: placeholderText,
      contentJson,
      status: 'sent',
      occurredAt: occurredAt.toISOString(),
      inReplyToExternalEventId,
    });

    await this.websocketNotifier.notificarMetaInboxThreadUpsert({
      sessionId,
      actorExternalId: thread.actorExternalId,
      objectType: thread.objectType,
      sourceChannel: thread.sourceChannel,
      lastMessageText: placeholderText,
      lastDirection: 'OUTGOING',
      lastMessageAt: occurredAt.toISOString(),
    });

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
      FROM n8n_message_sessions
      WHERE session_id = $1
      ORDER BY occurred_at DESC
      LIMIT 1
    `,
      sessionId,
    );

    return rows[0] || null;
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

  private async getLastIncomingExternalEventId(sessionId: string): Promise<string | null> {
    const rows = await this.prisma.$queryRawUnsafe<Array<{ externalEventId: string }>>(
      `
      SELECT external_event_id AS "externalEventId"
      FROM n8n_message_sessions
      WHERE session_id = $1
        AND direction = 'INCOMING'
      ORDER BY occurred_at DESC
      LIMIT 1
    `,
      sessionId,
    );
    return rows[0]?.externalEventId || null;
  }
}
