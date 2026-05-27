import { postIncomingEvent } from '../../infrastructure/backend-api.client';

interface FcaAttachment {
  type?: string;
  url?: string;
  previewUrl?: string;
  filename?: string;
  fileSize?: number;
  duration?: number;
  width?: number;
  height?: number;
  [key: string]: unknown;
}

interface FcaMessageEvent {
  type: string;
  threadID: string;
  senderID: string;
  messageID: string;
  body?: string;
  attachments?: FcaAttachment[];
  isGroup?: boolean;
  timestamp?: unknown;
  [key: string]: unknown;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type FcaApi = any;

export class HandleIncomingUseCase {
  private readonly myUserID: string;
  private readonly api: FcaApi | null;

  constructor(myUserID: string, api?: FcaApi) {
    this.myUserID = myUserID;
    this.api = api ?? null;
  }

  async execute(event: FcaMessageEvent): Promise<void> {
    if (event.type !== 'message' && event.type !== 'message_reply') return;
    if (event.senderID === this.myUserID) return;
    if (!event.body && (!event.attachments || event.attachments.length === 0)) return;

    const now = new Date().toISOString();
    const occurredAt = this.safeISOString(event.timestamp, now);
    const timestampMs = this.safeMs(event.timestamp);

    const rawAttachments = event.attachments || [];
    const attachmentTypes = rawAttachments.map((a) => a.type || 'unknown').filter(Boolean);

    // Intentar obtener contexto de Marketplace desde el share attachment del mensaje
    const shareAttachment = rawAttachments.find(
      (a) => a.type === 'share' && a.url && String(a.url).includes('marketplace'),
    );
    let marketplaceContext = shareAttachment
      ? {
          sourceId: this.extractMarketplaceId(String(shareAttachment.url || '')),
          itemUrl: shareAttachment.url as string,
          title: (shareAttachment.title as string | undefined) || null,
          description: (shareAttachment.description as string | undefined) || null,
          imageUrl: (shareAttachment.image as string | undefined) || null,
        }
      : null;

    // Si no hay share attachment, intentar detectar Marketplace via getThreadInfo
    if (!marketplaceContext && this.api) {
      try {
        const threadInfo = await this.getThreadInfoCached(event.threadID);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        marketplaceContext = this.extractMarketplaceFromThreadInfo(threadInfo) as any;
        if (marketplaceContext) {
          console.log(`[FCA] Marketplace detectado vía threadInfo threadID=${event.threadID} sourceId=${marketplaceContext.sourceId}`);
        }
      } catch (err) {
        console.warn(`[FCA] No se pudo obtener threadInfo threadID=${event.threadID}:`, err);
      }
    }

    // Extraer URLs de adjuntos — el normalizer de NestJS los lee de attachmentUrls[]
    const FCA_MEDIA_TYPES = new Set(['photo', 'animated_image', 'audio', 'video', 'file', 'sticker']);
    const attachmentUrls: string[] = rawAttachments
      .filter((a) => a.type && FCA_MEDIA_TYPES.has(a.type) && a.url)
      .map((a) => a.url as string);

    // Adjunto principal para que el normalizer pueda extraer tipo + URL
    const firstMediaAttachment = rawAttachments.find(
      (a) => a.type && FCA_MEDIA_TYPES.has(a.type) && a.url,
    );
    const metaStyleAttachments = firstMediaAttachment
      ? [{
          type: this.normalizeFcaType(firstMediaAttachment.type!),
          payload: { url: firstMediaAttachment.url },
        }]
      : [];

    const envelope = {
      externalEventId: event.messageID,
      actorExternalId: event.senderID,
      provider: 'FCA',
      objectType: 'FACEBOOK',
      pipeline: 'MESSAGES',
      eventType: 'messaging.message',
      occurredAt,
      receivedAt: now,
      payload: {
        platform: 'facebook_personal',
        eventKind: 'message',
        senderId: event.senderID,
        threadID: event.threadID,
        timestamp: timestampMs,
        isMarketplace: false,
        message: {
          mid: event.messageID,
          text: event.body || '',
          isEcho: false,
          hasAttachments: attachmentTypes.length > 0,
          attachmentTypes,
          attachmentUrls,
          attachments: metaStyleAttachments,
          rawMessage: event,
        },
        rawEvent: event,
        ...(marketplaceContext ? { marketplace: marketplaceContext } : {}),
      },
    };

    await postIncomingEvent(envelope);
    console.log(
      `[FCA] message forwarded messageID=${event.messageID} senderID=${event.senderID} threadID=${event.threadID}`,
    );
  }

  // Caché estático: threadID → threadInfo (se comparte entre instancias del use case)
  private static readonly threadInfoCache = new Map<string, Record<string, unknown>>();

  private async getThreadInfoCached(threadID: string): Promise<Record<string, unknown>> {
    if (HandleIncomingUseCase.threadInfoCache.has(threadID)) {
      return HandleIncomingUseCase.threadInfoCache.get(threadID)!;
    }
    const info: Record<string, unknown> = await new Promise((resolve, reject) => {
      this.api.getThreadInfo(threadID, (err: unknown, data: unknown) => {
        if (err) reject(err);
        else resolve(data as Record<string, unknown>);
      });
    });
    HandleIncomingUseCase.threadInfoCache.set(threadID, info);
    console.log(`[FCA] threadInfo obtenido threadID=${threadID}: imageSrc=${info.imageSrc ?? 'null'} name=${String(info.name || info.threadName || '').slice(0, 80)}`);
    return info;
  }

  private extractMarketplaceFromThreadInfo(info: Record<string, unknown>): {
    sourceId: string | null;
    itemUrl: string | null;
    title: string | null;
    description: string | null;
    imageUrl: string | null;
  } | null {
    // Facebook nombra los hilos de Marketplace como "PrimerNombre · TítuloDeLaPublicación"
    // usando el punto medio Unicode U+00B7 (·) con espacios
    const threadName = String(info?.name || info?.threadName || '');
    const MIDDLE_DOT = '·';
    const dotIdx = threadName.indexOf(` ${MIDDLE_DOT} `);
    if (dotIdx === -1) return null;

    const listingTitle = threadName.slice(dotIdx + 3).trim(); // skip " · "
    if (!listingTitle || listingTitle.length < 3) return null;

    return {
      sourceId: null,
      itemUrl: null,
      title: listingTitle,
      description: null,
      imageUrl: (info.imageSrc as string | undefined | null) || null,
    };
  }

  private extractMarketplaceId(url: string): string | null {
    const match = url.match(/marketplace\/item\/(\d+)/);
    return match?.[1] || null;
  }

  private normalizeFcaType(fcaType: string): string {
    if (fcaType === 'photo' || fcaType === 'animated_image' || fcaType === 'sticker') return 'image';
    if (fcaType === 'audio') return 'audio';
    if (fcaType === 'video') return 'video';
    if (fcaType === 'file') return 'file';
    return fcaType;
  }

  private safeMs(timestamp: unknown): number {
    const ts = Number(timestamp);
    if (!isFinite(ts) || ts <= 0) return Date.now();
    // fca-unofficial puede entregar segundos o milisegundos
    return ts > 1e12 ? ts : ts * 1000;
  }

  private safeISOString(timestamp: unknown, fallback: string): string {
    try {
      const d = new Date(this.safeMs(timestamp));
      return isNaN(d.getTime()) ? fallback : d.toISOString();
    } catch {
      return fallback;
    }
  }
}
