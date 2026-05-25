import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma/prisma.service';

export type ThreadEventInput = {
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
  metadata?: unknown;
  occurredAt?: Date;
  dedupeKey?: string | null;
};

export type MessageRow = {
  externalEventId: string;
  messageExternalId: string | null;
  sessionId: string;
  actorExternalId: string;
  objectType: string;
  eventKind: string;
  direction: string;
  contentText: string | null;
  contentJson: unknown;
  status: string;
  occurredAt: Date;
};

@Injectable()
export class ThreadEventService {
  constructor(private readonly prisma: PrismaService) {}

  async recordThreadEvent(input: ThreadEventInput): Promise<void> {
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
        session_id, thread_id, actor_external_id, object_type, event_type,
        event_source, from_value, to_value, user_id, username,
        external_event_id, message_external_id, direction, provider,
        source_channel, metadata, occurred_at, dedupe_key
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

  async listMessages(sessionId: string, includeSystem = false) {
    const rows = await this.prisma.$queryRawUnsafe<MessageRow[]>(
      `
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
    `,
      sessionId,
      includeSystem,
    );

    return rows.map((row) => ({
      ...row,
      contentJson: this.normalizeLegacyMessageContentJson(row.contentJson),
    }));
  }

  private normalizeLegacyMessageContentJson(contentJson: unknown): unknown {
    if (
      !contentJson ||
      typeof contentJson !== 'object' ||
      Array.isArray(contentJson)
    ) {
      return contentJson;
    }

    const cloned = { ...(contentJson as Record<string, unknown>) };
    const currentMediaType = String(cloned['mediaType'] || '').toLowerCase();
    const currentMediaUrl = cloned['mediaUrl']
      ? String(cloned['mediaUrl'])
      : '';
    if (
      currentMediaUrl &&
      (currentMediaType === 'audio' || currentMediaType === 'image')
    ) {
      return cloned;
    }

    const message =
      cloned['message'] && typeof cloned['message'] === 'object'
        ? (cloned['message'] as Record<string, unknown>)
        : null;
    const attachments = Array.isArray(message?.['attachments'])
      ? (message!['attachments'] as unknown[])
      : [];
    const first = attachments[0] as Record<string, unknown> | undefined;
    const attachmentType = String(first?.['type'] || '').toLowerCase();
    const attachmentUrl = (first?.['payload'] as Record<string, unknown>)?.[
      'url'
    ]
      ? String((first!['payload'] as Record<string, unknown>)['url'])
      : '';
    if (
      attachmentUrl &&
      (attachmentType === 'audio' || attachmentType === 'image')
    ) {
      return { ...cloned, mediaType: attachmentType, mediaUrl: attachmentUrl };
    }

    const topLevelType = String(cloned['type'] || '').toLowerCase();
    const topLevelUrl = cloned['url']
      ? String(cloned['url'])
      : cloned['mediaUrl']
        ? String(cloned['mediaUrl'])
        : '';
    if (topLevelUrl && (topLevelType === 'audio' || topLevelType === 'image')) {
      return { ...cloned, mediaType: topLevelType, mediaUrl: topLevelUrl };
    }

    const graphAttachment =
      cloned['attachment'] && typeof cloned['attachment'] === 'object'
        ? (cloned['attachment'] as Record<string, unknown>)
        : null;
    const graphType = String(graphAttachment?.['type'] || '').toLowerCase();
    const graphUrl = (
      graphAttachment?.['payload'] as Record<string, unknown>
    )?.['url']
      ? String((graphAttachment!['payload'] as Record<string, unknown>)['url'])
      : '';
    if (graphUrl && (graphType === 'audio' || graphType === 'image')) {
      return { ...cloned, mediaType: graphType, mediaUrl: graphUrl };
    }

    return cloned;
  }
}
