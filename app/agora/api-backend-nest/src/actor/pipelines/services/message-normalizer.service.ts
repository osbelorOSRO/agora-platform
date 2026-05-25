import { Injectable } from '@nestjs/common';

export type IncomingMedia = {
  mediaType: 'audio' | 'image' | 'video' | 'document';
  mediaUrl: string;
};

export type WhatsappIdentity = {
  pnJid: string | null;
  lidJid: string | null;
  preferredBlockJid: string | null;
};

export type ExternalAdContext = {
  title: string | null;
  body: string | null;
  sourceId: string | null;
  sourceType: string | null;
  sourceUrl: string | null;
  sourceApp: string | null;
  mediaType: string | null;
  thumbnailUrl: string | null;
  originalImageUrl: string | null;
  clickToWhatsappCall: boolean | null;
};

@Injectable()
export class MessageNormalizerService {
  resolveDirection(
    payload: unknown,
    eventKind: string,
  ): 'INCOMING' | 'OUTGOING' | 'SYSTEM' {
    if (['delivery', 'read', 'reaction', 'unknown'].includes(eventKind))
      return 'SYSTEM';
    if (eventKind === 'postback') return 'INCOMING';
    const p = payload as Record<string, unknown>;
    const isEcho = (p?.['message'] as Record<string, unknown>)?.['isEcho'];
    if (isEcho === true) return 'OUTGOING';
    if (isEcho === false) return 'INCOMING';
    return 'SYSTEM';
  }

  resolveVisibleContentText(
    payload: unknown,
    eventKind: string,
    media: IncomingMedia | null,
  ): string | null {
    const p = payload as Record<string, unknown>;
    if (eventKind === 'postback') {
      const title = (p?.['postback'] as Record<string, unknown>)?.['title'];
      const selectedPayload = (p?.['postback'] as Record<string, unknown>)?.[
        'payload'
      ];
      return String(title || selectedPayload || '[postback]');
    }

    if (eventKind === 'reaction') {
      const emoji = (p?.['reaction'] as Record<string, unknown>)?.['emoji'];
      return emoji ? `Reaccionó ${emoji}` : 'Reaccionó a un mensaje';
    }

    if (eventKind === 'unsupported') {
      const text = (p?.['message'] as Record<string, unknown>)?.['text'];
      return text ? String(text) : '[mensaje no soportado]';
    }

    const messageText = (p?.['message'] as Record<string, unknown>)?.['text'];
    return messageText
      ? String(messageText)
      : media?.mediaType === 'audio'
        ? '[audio]'
        : media?.mediaType === 'image'
          ? '[imagen]'
          : media?.mediaType === 'video'
            ? '[video]'
            : media?.mediaType === 'document'
              ? '[documento]'
              : null;
  }

  resolveIncomingMediaCaption(
    payload: unknown,
    media: IncomingMedia | null,
    contentText: string | null,
  ): string | null {
    if (!media || !contentText) return null;
    const p = payload as Record<string, unknown>;
    const messageText = (p?.['message'] as Record<string, unknown>)?.['text'];
    const directText =
      typeof messageText === 'string' ? messageText.trim() : '';
    if (!directText) return null;
    return directText === contentText ? directText : contentText;
  }

  resolveMessageType(eventKind: string, media: IncomingMedia | null): string {
    if (eventKind === 'postback') return 'interactive_postback';
    if (eventKind === 'reaction') return 'reaction';
    if (eventKind === 'unsupported') return 'unsupported';
    if (media?.mediaType === 'audio') return 'audio';
    if (media?.mediaType === 'image') return 'image';
    if (media?.mediaType === 'video') return 'video';
    if (media?.mediaType === 'document') return 'document';
    return 'text';
  }

  resolveSenderType(direction: 'INCOMING' | 'OUTGOING' | 'SYSTEM'): string {
    if (direction === 'OUTGOING') return 'META_PAGE';
    if (direction === 'INCOMING') return 'ACTOR';
    return 'SYSTEM';
  }

  resolveSourceChannel(payload: unknown, eventKind: string): string | null {
    const p = payload as Record<string, unknown>;
    const messageSource = (p?.['message'] as Record<string, unknown>)?.[
      'messageSource'
    ];
    if (messageSource) return String(messageSource);

    if (eventKind === 'postback') {
      const postbackReferralSource = (
        (p?.['postback'] as Record<string, unknown>)?.['referral'] as Record<
          string,
          unknown
        >
      )?.['source'];
      const referralSource = String(
        postbackReferralSource ||
          (p?.['referral'] as Record<string, unknown>)?.['source'] ||
          '',
      ).toLowerCase();
      if (referralSource.includes('comment')) return 'post_comment_ref';
      return 'inbox_dm';
    }

    return null;
  }

  resolveStructuredPayload(payload: unknown, eventKind: string): unknown {
    const p = payload as Record<string, unknown>;
    if (eventKind === 'postback') {
      return {
        kind: 'postback',
        title: (p?.['postback'] as Record<string, unknown>)?.['title'] || null,
        value:
          (p?.['postback'] as Record<string, unknown>)?.['payload'] || null,
        referral:
          (p?.['postback'] as Record<string, unknown>)?.['referral'] ||
          p?.['referral'] ||
          null,
      };
    }
    return null;
  }

  extractIncomingMedia(payload: unknown): IncomingMedia | null {
    const p = payload as Record<string, unknown>;
    const media = p?.['media'] as Record<string, unknown> | undefined;
    if (media?.['mediaUrl']) {
      const rawType = String(media['mediaType'] || '').toLowerCase();
      const mediaType = this.normalizeMediaType(rawType);
      if (mediaType) return { mediaType, mediaUrl: String(media['mediaUrl']) };
    }

    const message = p?.['message'] as Record<string, unknown> | undefined;
    const attachments = Array.isArray(message?.['attachments'])
      ? message!['attachments']
      : [];
    const first = attachments[0] as Record<string, unknown> | undefined;
    const type = String(first?.['type'] || '').toLowerCase();
    const firstPayload = first?.['payload'] as
      | Record<string, unknown>
      | undefined;
    const attachmentUrls = Array.isArray(message?.['attachmentUrls'])
      ? message!['attachmentUrls']
      : [];
    const mediaUrl = firstPayload?.['url']
      ? String(firstPayload['url'])
      : attachmentUrls[0]
        ? String(attachmentUrls[0])
        : null;
    if (!mediaUrl) return null;
    const attachmentTypes = Array.isArray(message?.['attachmentTypes'])
      ? message!['attachmentTypes']
      : [];
    const mediaType = this.normalizeMediaType(
      type || String(attachmentTypes[0] || ''),
    );
    if (mediaType) return { mediaType, mediaUrl };
    return null;
  }

  normalizeMediaType(rawType: string): IncomingMedia['mediaType'] | null {
    if (rawType === 'audio') return 'audio';
    if (rawType === 'image' || rawType === 'imagen') return 'image';
    if (rawType === 'video') return 'video';
    if (rawType === 'document' || rawType === 'documento' || rawType === 'file')
      return 'document';
    return null;
  }

  normalizeWhatsappIdentity(env: unknown, payload: unknown): WhatsappIdentity {
    const p = payload as Record<string, unknown>;
    const e = env as Record<string, unknown>;
    const wa = p?.['wa'] as Record<string, unknown> | undefined;

    const pnJid = this.firstString(
      [
        wa?.['pnJid'],
        wa?.['remoteJidAlt'],
        wa?.['senderPn'],
        wa?.['resolvedJid'],
        e?.['actorExternalId'],
      ],
      (value) => this.isWhatsappPnJid(value),
    );

    const lidJid = this.firstString(
      [
        wa?.['lidJid'],
        wa?.['remoteJid'],
        wa?.['senderKey'],
        e?.['actorExternalId'],
      ],
      (value) => this.isWhatsappLidJid(value),
    );

    return { pnJid, lidJid, preferredBlockJid: lidJid || pnJid || null };
  }

  normalizeExternalAdContext(payload: unknown): ExternalAdContext | null {
    const p = payload as Record<string, unknown>;
    const wa = p?.['wa'] as Record<string, unknown> | undefined;
    const direct = wa?.['adContext'] || p?.['adContext'];
    const raw = direct || this.findExternalAdReply(payload);
    if (!raw || typeof raw !== 'object') return null;

    const r = raw as Record<string, unknown>;
    const context: ExternalAdContext = {
      title: this.cleanNullableString(r['title']),
      body: this.cleanNullableString(r['body']),
      sourceId: this.cleanNullableString(r['sourceId']),
      sourceType: this.cleanNullableString(r['sourceType']),
      sourceUrl: this.cleanNullableString(r['sourceUrl']),
      sourceApp: this.cleanNullableString(r['sourceApp']),
      mediaType: this.cleanNullableString(r['mediaType']),
      thumbnailUrl: this.cleanNullableString(r['thumbnailUrl']),
      originalImageUrl: this.cleanNullableString(r['originalImageUrl']),
      clickToWhatsappCall:
        typeof r['clickToWhatsappCall'] === 'boolean'
          ? r['clickToWhatsappCall']
          : null,
    };

    return Object.values(context).some((value) => value !== null)
      ? context
      : null;
  }

  findExternalAdReply(value: unknown, depth = 0): unknown {
    if (!value || typeof value !== 'object' || depth > 8) return null;
    const obj = value as Record<string, unknown>;
    if (obj['externalAdReply'] && typeof obj['externalAdReply'] === 'object') {
      return obj['externalAdReply'];
    }
    if (Array.isArray(value)) {
      for (const item of value) {
        const found = this.findExternalAdReply(item, depth + 1);
        if (found) return found;
      }
      return null;
    }
    for (const item of Object.values(obj)) {
      const found = this.findExternalAdReply(item, depth + 1);
      if (found) return found;
    }
    return null;
  }

  firstString(
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

  cleanNullableString(value: unknown): string | null {
    if (typeof value !== 'string') return null;
    const cleaned = value.trim();
    return cleaned ? cleaned : null;
  }

  cleanContactDisplayName(value: unknown): string | null {
    if (typeof value !== 'string') return null;
    const cleaned = value.trim();
    if (
      !cleaned ||
      cleaned.toLowerCase() === 'undefined' ||
      cleaned.toLowerCase() === 'null'
    )
      return null;
    return cleaned.slice(0, 120);
  }

  extractWhatsappPhone(value: unknown): string | null {
    if (typeof value !== 'string') return null;
    const match = value.match(/^(\d{8,15})@/) || value.match(/^(\d{8,15})$/);
    return match?.[1] || null;
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
