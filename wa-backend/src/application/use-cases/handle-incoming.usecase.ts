import { downloadMediaMessage } from '@whiskeysockets/baileys';
import { CoreIncomingMessage } from '../../core/whatsapp/index.js';
import { backendApiClient } from '../../infrastructure/backend-api.client.js';
import { WhatsAppGateway } from '../whatsapp.gateway.js';

type TipoId = 'jid' | 'lid';
type MsgTipo = 'texto' | 'imagen' | 'audio' | 'video' | 'documento';
type ParsedIncomingMessage = {
  tipo: MsgTipo;
  contenido: string;
  url_archivo?: string;
  isReaction?: boolean;
  reaction?: {
    emoji: string;
    targetMessageId?: string;
  };
};
type BaileysIncomingEnvelope = {
  externalEventId: string;
  actorExternalId: string;
  provider: 'BAILEYS';
  objectType: 'WHATSAPP';
  pipeline: 'MESSAGES';
  eventType: 'messaging.message' | 'messaging.reaction' | 'messaging.unsupported';
  occurredAt: string;
  receivedAt: string;
  payload: {
    platform: 'whatsapp';
    eventKind: 'message' | 'reaction' | 'unsupported';
    senderId: string;
    recipientId: string | null;
    timestamp: number;
    message: {
      mid: string | null;
      text: string;
      isEcho: boolean;
      hasAttachments: boolean;
      attachmentTypes: string[];
      attachmentUrls: string[];
      messageSource: 'baileys_whatsapp';
      rawMessage: unknown;
    };
    media: {
      mediaType: 'audio' | 'image' | 'video' | 'document';
      mediaUrl: string;
    } | null;
    reaction?: {
      emoji: string;
      targetMessageId?: string;
    };
    wa: {
      tipoId: TipoId;
      phone: boolean;
      remoteJid: string | null;
      remoteJidAlt: string | null;
      senderPn: string | null;
      senderKey: string | null;
      resolvedJid: string;
      recipientRawId: string | null;
      recipientPhone: string | null;
      pushName: string | null;
    };
    rawEvent: unknown;
  };
};
type ClienteIdentity = {
  actorId: string;
  tipo_id: TipoId;
  actorExternalId: string;
  phone: boolean;
};

export class HandleIncomingMessageUseCase {
  constructor(private readonly gateway: WhatsAppGateway) {}

  async execute(event: CoreIncomingMessage): Promise<void> {
    const upsert = event.raw as any;
    const msg = upsert?.messages?.[0];
    if (!msg?.message) return;

    if (this.isIgnorableMessage(msg)) return;

    const rawRemote = String(msg?.key?.remoteJid || '');
    if (
      rawRemote.endsWith('@g.us') ||
      rawRemote === 'status@broadcast' ||
      rawRemote.endsWith('@broadcast') ||
      rawRemote.includes('@newsletter')
    ) {
      return;
    }

    const remoteJid = this.obtenerIdClienteDefinitivo(msg.key);
    const extracted = this.extraerClienteYTipo(remoteJid);
    if (!extracted) return;

    const { actorId, tipo_id, actorExternalId } = extracted;
    const externalEventId = this.buildExternalEventId(msg, actorExternalId);

    const parsed = await this.parseMessage(msg, actorId, tipo_id);
    if (!parsed) return;

    const timestamp = new Date(
      (Number(msg.messageTimestamp) || Math.floor(Date.now() / 1000)) * 1000
    );

    const recipientRawId = this.getRecipientRawId();
    const normalizedEvent = this.normalizeBaileysIncomingEvent(
      upsert,
      msg,
      parsed,
      extracted,
      externalEventId,
      timestamp,
      recipientRawId,
    );
    this.logNormalizedEnvelope(normalizedEvent);

    await this.emitirEnvelopeBaileysAlBackend(normalizedEvent);
    console.log(`👤 Evento Baileys entregado a Threads: ${actorExternalId}`);
  }

  private isIgnorableMessage(msg: any): boolean {
    const fromMe = !!msg?.key?.fromMe;
    const tipo = Object.keys(msg?.message || {})[0];

    return (
      fromMe ||
      !msg?.message ||
      tipo === 'protocolMessage' ||
      tipo === 'senderKeyDistributionMessage' ||
      tipo === 'messageContextInfo' ||
      tipo === 'call'
    );
  }

  private obtenerIdClienteDefinitivo(msgKey: any): string {
    const posiblesIds = [
      msgKey?.remoteJid,
      msgKey?.remoteJidAlt,
      msgKey?.senderPn,
      msgKey?.senderKey,
    ].filter((id) => typeof id === 'string');

    const phoneId = posiblesIds.find((id) => this.esPhoneJid(id));
    if (phoneId) return phoneId;

    return posiblesIds[0] || '';
  }

  private extraerClienteYTipo(remoteJid: string): ClienteIdentity | null {
    if (typeof remoteJid !== 'string') return null;
    const normalized = remoteJid.trim();
    const lower = normalized.toLowerCase();

    if (this.esPhoneJid(normalized)) {
      return {
        actorId: normalized.split('@')[0],
        tipo_id: 'jid',
        actorExternalId: normalized,
        phone: true,
      };
    }

    if (lower.endsWith('@lid')) {
      return {
        actorId: normalized.slice(0, -'@lid'.length),
        tipo_id: 'lid',
        actorExternalId: normalized,
        phone: false,
      };
    }

    if (lower.endsWith('@lid.c.us')) {
      return {
        actorId: normalized.slice(0, -'@lid.c.us'.length),
        tipo_id: 'lid',
        actorExternalId: normalized,
        phone: false,
      };
    }

    return null;
  }

  private esPhoneJid(id: string): boolean {
    const normalized = String(id || '').trim().toLowerCase();
    return normalized.endsWith('@s.whatsapp.net') || normalized.endsWith('@whatsapp.net');
  }

  private buildExternalEventId(msg: any, actorExternalId: string): string {
    const baileysMessageId = typeof msg?.key?.id === 'string' ? msg.key.id.trim() : '';
    const safeActor = this.sanitizeEventIdPart(actorExternalId || 'unknown');

    if (baileysMessageId) {
      return `baileys:${safeActor}:${this.sanitizeEventIdPart(baileysMessageId)}`.slice(0, 250);
    }

    const timestamp = Number(msg?.messageTimestamp) || Math.floor(Date.now() / 1000);
    const messageType = Object.keys(msg?.message || {})[0] || 'unknown';
    return `baileys:fallback:${safeActor}:${timestamp}:${this.sanitizeEventIdPart(messageType)}`.slice(0, 250);
  }

  private sanitizeEventIdPart(value: string): string {
    return String(value || 'unknown').replace(/[^a-zA-Z0-9._@:-]/g, '_');
  }

  private getRecipientRawId(): string | null {
    const raw = this.gateway.getSocket().user?.id;
    return typeof raw === 'string' && raw.trim() ? raw.trim() : null;
  }

  private getRecipientPhone(recipientRawId: string | null): string | null {
    if (!recipientRawId) return null;
    return recipientRawId.split(':')[0]?.split('@')[0] || null;
  }

  private normalizeBaileysIncomingEvent(
    upsert: any,
    msg: any,
    parsed: ParsedIncomingMessage,
    identity: ClienteIdentity,
    externalEventId: string,
    occurredAt: Date,
    recipientRawId: string | null,
  ): BaileysIncomingEnvelope {
    const messageExternalId = typeof msg?.key?.id === 'string' ? msg.key.id : null;
    const timestamp = Number(msg?.messageTimestamp) || Math.floor(occurredAt.getTime() / 1000);
    const eventKind: 'message' | 'reaction' | 'unsupported' = parsed.isReaction
      ? 'reaction'
      : parsed.contenido === '[mensaje no soportado]'
        ? 'unsupported'
        : 'message';
    const media = parsed.url_archivo
      ? {
          mediaType: this.resolveCanonicalMediaType(parsed.tipo),
          mediaUrl: parsed.url_archivo,
        }
      : null;

    return {
      externalEventId,
      actorExternalId: identity.actorExternalId,
      provider: 'BAILEYS',
      objectType: 'WHATSAPP',
      pipeline: 'MESSAGES',
      eventType:
        eventKind === 'reaction'
          ? 'messaging.reaction'
          : eventKind === 'unsupported'
            ? 'messaging.unsupported'
            : 'messaging.message',
      occurredAt: occurredAt.toISOString(),
      receivedAt: new Date().toISOString(),
      payload: {
        platform: 'whatsapp',
        eventKind,
        senderId: identity.actorExternalId,
        recipientId: recipientRawId,
        timestamp,
        message: {
          mid: messageExternalId,
          text: parsed.contenido,
          isEcho: Boolean(msg?.key?.fromMe),
          hasAttachments: Boolean(parsed.url_archivo),
          attachmentTypes: media ? [media.mediaType] : [],
          attachmentUrls: parsed.url_archivo ? [parsed.url_archivo] : [],
          messageSource: 'baileys_whatsapp',
          rawMessage: msg?.message || null,
        },
        media,
        ...(parsed.reaction ? { reaction: parsed.reaction } : {}),
        wa: {
          tipoId: identity.tipo_id,
          phone: identity.phone,
          remoteJid: this.nullableString(msg?.key?.remoteJid),
          remoteJidAlt: this.nullableString(msg?.key?.remoteJidAlt),
          senderPn: this.nullableString(msg?.key?.senderPn),
          senderKey: this.nullableString(msg?.key?.senderKey),
          resolvedJid: identity.actorExternalId,
          recipientRawId,
          recipientPhone: this.getRecipientPhone(recipientRawId),
          pushName: this.nullableString(msg?.pushName),
        },
        rawEvent: upsert,
      },
    };
  }

  private resolveCanonicalMediaType(tipo: MsgTipo): 'audio' | 'image' | 'video' | 'document' {
    if (tipo === 'imagen') return 'image';
    if (tipo === 'documento') return 'document';
    if (tipo === 'video') return 'video';
    if (tipo === 'audio') return 'audio';
    return 'document';
  }

  private nullableString(value: unknown): string | null {
    return typeof value === 'string' && value.trim() ? value.trim() : null;
  }

  private logNormalizedEnvelope(envelope: BaileysIncomingEnvelope): void {
    console.log(
      `🧭 BAILEYS_ENVELOPE shadow externalEventId=${envelope.externalEventId} ` +
      `eventKind=${envelope.payload.eventKind} actor=${envelope.actorExternalId} ` +
      `recipient=${envelope.payload.recipientId ?? 'unknown'}`,
    );
  }

  private async emitirEnvelopeBaileysAlBackend(envelope: BaileysIncomingEnvelope): Promise<void> {
    try {
      await backendApiClient.enviarEventoBaileys(envelope);
      console.log(`🧵 Baileys envelope enviado a thread bridge: ${envelope.externalEventId}`);
    } catch (error: any) {
      console.warn(
        `⚠️ Baileys thread bridge omitido externalEventId=${envelope.externalEventId}: ${error?.message || error}`,
      );
    }
  }

  private async parseMessage(
    msg: any,
    actorId: string,
    tipo_id: TipoId
  ): Promise<ParsedIncomingMessage | null> {
    const m = msg.message;

    if (m.reactionMessage) {
      const emoji = String(m.reactionMessage.text || '').trim();
      const targetMessageId =
        typeof m.reactionMessage.key?.id === 'string'
          ? m.reactionMessage.key.id
          : undefined;

      return {
        tipo: 'texto',
        contenido: emoji
          ? `Reaccionó ${emoji}`
          : 'Reaccionó a un mensaje',
        isReaction: true,
        reaction: {
          emoji,
          targetMessageId,
        },
      };
    }

    if (m.conversation || m.extendedTextMessage?.text) {
      return {
        tipo: 'texto',
        contenido: m.conversation || m.extendedTextMessage?.text || '',
      };
    }

    if (m.imageMessage || m.audioMessage || m.videoMessage || m.documentMessage) {
      let tipo: MsgTipo = 'imagen';
      let contenido = '';
      let ext = 'bin';

      if (m.imageMessage) {
        tipo = 'imagen';
        contenido = m.imageMessage.caption || '';
        ext = 'jpg';
      } else if (m.audioMessage) {
        tipo = 'audio';
        ext = 'ogg';
      } else if (m.videoMessage) {
        tipo = 'video';
        contenido = m.videoMessage.caption || '';
        ext = 'mp4';
      } else if (m.documentMessage) {
        tipo = 'documento';
        contenido = m.documentMessage.caption || '';
        ext = m.documentMessage.fileName?.split('.').pop() || 'pdf';
      }

      const buffer = (await downloadMediaMessage(msg, 'buffer', {} as any)) as Buffer;
      if (!buffer || !buffer.length) return null;

      const filename = `${actorId}-${Date.now()}.${ext}`;
      const url_archivo = await backendApiClient.guardarMedia(
        buffer,
        filename,
        actorId,
        tipo,
        tipo_id
      );

      return {
        tipo,
        contenido: contenido || `[${tipo}]`,
        url_archivo,
      };
    }

    return {
      tipo: 'texto',
      contenido: '[mensaje no soportado]',
    };
  }

}
