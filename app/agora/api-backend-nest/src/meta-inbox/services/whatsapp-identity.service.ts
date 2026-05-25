import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma/prisma.service';
import {
  IMessageGateway,
  MESSAGE_GATEWAY,
} from '../../baileys/interfaces/message-gateway.interface';
import { ThreadEventService } from './thread-event.service';

@Injectable()
export class WhatsappIdentityService {
  private readonly logger = new Logger(WhatsappIdentityService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(MESSAGE_GATEWAY) private readonly baileysSender: IMessageGateway,
    private readonly threadEvent: ThreadEventService,
  ) {}

  async resolveWhatsappIdentity(input: {
    sessionId?: string;
    actorExternalId?: string;
    phone?: string;
  }) {
    const sessionId = String(input.sessionId || '').trim();
    let actorExternalId = String(input.actorExternalId || '').trim();
    const phone = this.tryNormalizeWhatsappPhone(input.phone);
    const phoneJid = phone ? `${phone}@s.whatsapp.net` : '';

    let threadRow: any = null;
    if (sessionId) {
      const threadRows = await this.prisma.$queryRawUnsafe<Array<any>>(
        `
        SELECT session_id AS "sessionId", actor_external_id AS "actorExternalId", metadata
        FROM threads
        WHERE session_id = $1
          AND object_type = 'WHATSAPP'
        LIMIT 1
      `,
        sessionId,
      );
      threadRow = threadRows[0] || null;
      actorExternalId = actorExternalId || threadRow?.actorExternalId || '';
    }

    const contactRows = await this.prisma.$queryRawUnsafe<Array<any>>(
      `
      SELECT
        actor_external_id AS "actorExternalId",
        phone,
        display_name AS "displayName",
        metadata
      FROM meta_inbox_contacts
      WHERE object_type = 'WHATSAPP'
        AND (
          ($1::text <> '' AND actor_external_id = $1)
          OR ($2::text <> '' AND actor_external_id = $2)
          OR ($3::text <> '' AND phone = $3)
        )
      ORDER BY updated_at DESC
      LIMIT 1
    `,
      actorExternalId,
      phoneJid,
      phone || '',
    );
    const contactRow = contactRows[0] || null;

    const messageRows = await this.prisma.$queryRawUnsafe<Array<any>>(
      `
      SELECT content_json AS "contentJson"
      FROM thread_messages
      WHERE object_type = 'WHATSAPP'
        AND (
          ($1::text <> '' AND session_id = $1)
          OR ($2::text <> '' AND actor_external_id = $2)
        )
        AND content_json ? 'wa'
      ORDER BY occurred_at DESC
      LIMIT 1
    `,
      sessionId,
      actorExternalId || contactRow?.actorExternalId || '',
    );
    const messageWa = messageRows[0]?.contentJson?.wa || {};
    const contactWa = contactRow?.metadata?.wa || {};

    const pnJid = this.firstNonEmptyString(
      [
        messageWa.pnJid,
        contactWa.pnJid,
        messageWa.remoteJidAlt,
        contactWa.remoteJidAlt,
        contactRow?.actorExternalId,
        actorExternalId,
        phoneJid,
      ],
      (value) => this.isWhatsappPnJid(value),
    );

    const lidJid = this.firstNonEmptyString(
      [
        messageWa.lidJid,
        contactWa.lidJid,
        messageWa.remoteJid,
        contactWa.remoteJid,
        contactRow?.actorExternalId,
        actorExternalId,
      ],
      (value) => this.isWhatsappLidJid(value),
    );

    const resolvedActor =
      pnJid || contactRow?.actorExternalId || actorExternalId || lidJid || null;
    const resolvedPhone =
      phone ||
      this.extractPhoneFromWhatsappJid(pnJid) ||
      contactRow?.phone ||
      this.extractPhoneFromWhatsappJid(resolvedActor);

    return {
      sessionId: sessionId || threadRow?.sessionId || null,
      actorExternalId: resolvedActor,
      phone: resolvedPhone || null,
      pnJid,
      lidJid,
      preferredBlockJid: lidJid || pnJid || resolvedActor,
      hasLidMapping: Boolean(pnJid && lidJid),
      displayName: contactRow?.displayName || null,
      source: {
        thread: Boolean(threadRow),
        contact: Boolean(contactRow),
        message: Boolean(messageRows[0]),
      },
    };
  }

  async updateBlockStatus(input: {
    action: 'block' | 'unblock';
    sessionId?: string;
    actorExternalId?: string;
    phone?: string;
  }) {
    if (input.action !== 'block' && input.action !== 'unblock') {
      throw new BadRequestException('invalid_block_action');
    }

    const identity = await this.resolveWhatsappIdentity(input);
    if (!identity.preferredBlockJid && !identity.phone) {
      throw new BadRequestException('whatsapp_identity_not_resolved');
    }

    const gatewayResult = await this.baileysSender.updateBlockStatus({
      action: input.action,
      phone: identity.phone,
      pnJid: identity.pnJid,
      lidJid: identity.lidJid,
      jid: identity.preferredBlockJid,
    });

    this.logger.log(
      `WHATSAPP[BLOCK_STATUS] action=${input.action} sessionId=${identity.sessionId || 'n/a'} ` +
        `actor=${identity.actorExternalId || 'n/a'} jidUsed=${gatewayResult?.jidUsed || 'n/a'}`,
    );

    const blockStatus = input.action === 'block' ? 'blocked' : 'unblocked';
    const metadataPatch = {
      blockStatus,
      blockUpdatedAt: new Date().toISOString(),
      blockJidUsed: gatewayResult?.jidUsed || null,
      blockCandidates: gatewayResult?.candidates || [],
    };

    if (identity.actorExternalId) {
      await this.prisma.$executeRawUnsafe(
        `UPDATE meta_inbox_contacts
         SET metadata = COALESCE(metadata, '{}'::jsonb) ||
           jsonb_build_object(
             'wa',
             COALESCE(metadata->'wa', '{}'::jsonb) || $2::jsonb
           ),
           updated_at = now()
         WHERE actor_external_id = $1 AND object_type = 'WHATSAPP'`,
        identity.actorExternalId,
        JSON.stringify(metadataPatch),
      );
    }

    if (identity.sessionId && identity.actorExternalId) {
      await this.threadEvent.recordThreadEvent({
        sessionId: identity.sessionId,
        actorExternalId: identity.actorExternalId,
        objectType: 'WHATSAPP',
        eventType:
          input.action === 'block' ? 'WHATSAPP_BLOCKED' : 'WHATSAPP_UNBLOCKED',
        eventSource: 'HUMAN',
        provider: 'BAILEYS',
        metadata: { identity, gatewayResult },
        dedupeKey: `WHATSAPP_BLOCK:${input.action}:${identity.sessionId}:${Date.now()}`,
      });
    }

    return {
      success: true,
      action: input.action,
      blockStatus,
      identity,
      gatewayResult,
    };
  }

  async listWhatsappAdLeadStats(input: { sourceId?: string; limit?: number }) {
    const sourceId = String(input.sourceId || '').trim();
    const limit = Math.max(1, Math.min(Number(input.limit) || 500, 1000));

    const items = await this.prisma.$queryRawUnsafe<Array<any>>(
      `
      SELECT
        source_id AS "sourceId",
        COUNT(*)::int AS "uniqueSessions",
        COALESCE(SUM(seen_count), 0)::int AS "seenCount",
        MIN(first_seen_at) AS "firstSeenAt",
        MAX(last_seen_at) AS "lastSeenAt",
        (ARRAY_AGG(title ORDER BY last_seen_at DESC))[1] AS title,
        (ARRAY_AGG(source_url ORDER BY last_seen_at DESC))[1] AS "sourceUrl",
        (ARRAY_AGG(thumbnail_url ORDER BY last_seen_at DESC))[1] AS "thumbnailUrl",
        (ARRAY_AGG(original_image_url ORDER BY last_seen_at DESC))[1] AS "originalImageUrl"
      FROM wa_ad_leads
      WHERE ($1::text = '' OR source_id = $1)
      GROUP BY source_id
      ORDER BY MAX(last_seen_at) DESC
      LIMIT ${limit}
    `,
      sourceId,
    );

    const leads = await this.prisma.$queryRawUnsafe<Array<any>>(
      `
      SELECT
        source_id AS "sourceId",
        session_id AS "sessionId",
        actor_external_id AS "actorExternalId",
        pn_jid AS "pnJid",
        lid_jid AS "lidJid",
        first_message_text AS "firstMessageText",
        first_seen_at AS "firstSeenAt",
        last_seen_at AS "lastSeenAt",
        seen_count AS "seenCount"
      FROM wa_ad_leads
      WHERE ($1::text = '' OR source_id = $1)
      ORDER BY last_seen_at DESC
      LIMIT 5000
    `,
      sourceId,
    );

    return { items, leads, total: items.length };
  }

  normalizeWhatsappPhone(value: string): string {
    const digits = String(value || '').replace(/\D/g, '');
    if (!digits) throw new BadRequestException('phone_required');
    if (digits.length < 8 || digits.length > 15) {
      throw new BadRequestException('invalid_whatsapp_phone');
    }
    return digits;
  }

  tryNormalizeWhatsappPhone(value: unknown): string | null {
    const digits = String(value || '').replace(/\D/g, '');
    if (!digits || digits.length < 8 || digits.length > 15) return null;
    return digits;
  }

  extractPhoneFromWhatsappJid(value: unknown): string | null {
    if (typeof value !== 'string') return null;
    const match = value.match(/^(\d{8,15})@/) || value.match(/^(\d{8,15})$/);
    return match?.[1] || null;
  }

  firstNonEmptyString(
    values: unknown[],
    predicate?: (value: string) => boolean,
  ): string | null {
    for (const value of values) {
      if (typeof value !== 'string') continue;
      const cleaned = value.trim();
      if (!cleaned) continue;
      if (!predicate || predicate(cleaned)) return cleaned;
    }
    return null;
  }

  isWhatsappPnJid(value: string): boolean {
    const lower = String(value || '').toLowerCase();
    return lower.endsWith('@s.whatsapp.net') || lower.endsWith('@whatsapp.net');
  }

  isWhatsappLidJid(value: string): boolean {
    const lower = String(value || '').toLowerCase();
    return lower.endsWith('@lid') || lower.endsWith('@lid.c.us');
  }
}
