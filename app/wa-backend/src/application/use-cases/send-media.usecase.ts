import { WhatsAppGateway } from '../whatsapp.gateway.js';
import axios from 'axios';
import { runtimeState } from '../../shared/runtime-state.js';
import { env } from '../../config/env.js';
import { toBaileysOutgoingCommand } from './baileys-outgoing-command.js';

export interface SendMediaInput {
  destino?: string;
  actorExternalId?: string;
  recipientId?: string;
  tipoId?: 'jid' | 'lid';
  tipo: 'image' | 'audio' | 'video' | 'document';
  url_archivo?: string;
  contenido?: unknown;
  payload?: unknown;
  message?: unknown;
  media?: unknown;
}

export class SendMediaUseCase {
  constructor(private readonly gateway: WhatsAppGateway) {}

  private assertTrustedMediaUrl(rawUrl: string): URL {
    let parsed: URL;
    try {
      parsed = new URL(rawUrl);
    } catch {
      throw new Error('URL de archivo multimedia invalida');
    }

    const mediaBase = new URL(env.mediaBaseUrl);
    if (
      !['http:', 'https:'].includes(parsed.protocol) ||
      parsed.host !== mediaBase.host ||
      !this.isSafeUploadsPath(parsed.pathname)
    ) {
      throw new Error('URL de archivo multimedia no confiable');
    }

    return parsed;
  }

  private isSafeUploadsPath(pathname: string): boolean {
    if (pathname.includes('\\') || /%2f|%5c/i.test(pathname)) return false;

    let prefix: string;
    if (pathname.startsWith('/uploads/')) {
      prefix = '/uploads/';
    } else if (pathname.startsWith('/agora-media/')) {
      prefix = '/agora-media/';
    } else {
      return false;
    }

    const relative = pathname.slice(prefix.length);
    if (!relative || relative.includes('/')) return false;

    let decoded: string;
    try {
      decoded = decodeURIComponent(relative);
    } catch {
      return false;
    }
    if (decoded !== relative || decoded.includes('..') || decoded.startsWith('.')) {
      return false;
    }

    return /^[a-f0-9-]{36}(?:_(?:wa|ig))?\.(?:jpg|png|gif|webp|ogg|mp3|wav|m4a|mp4|webm|pdf)$/i.test(decoded);
  }

  private resolveInternalDownloadUrl(rawUrl: string): string {
    const parsed = this.assertTrustedMediaUrl(rawUrl);
    // Archivos en MinIO son públicos — usar URL directa
    if (parsed.pathname.startsWith('/agora-media/')) {
      return rawUrl;
    }
    // Legacy disco local — bajar del API backend
    return `${env.apiBackendUrl.replace(/\/+$/, '')}${parsed.pathname}${parsed.search}`;
  }

  async execute(input: SendMediaInput): Promise<void> {
    const command = toBaileysOutgoingCommand(input);

    const downloadUrl = this.resolveInternalDownloadUrl(command.url_archivo!);
    const { data } = await axios.get(downloadUrl, {
      responseType: 'arraybuffer',
      maxContentLength: 50 * 1024 * 1024,
      maxBodyLength: 50 * 1024 * 1024,
      timeout: env.proxyTimeoutMs,
    });
    const buffer = Buffer.from(data);

    if (!buffer.length) {
      throw new Error('No se pudo descargar archivo multimedia');
    }

    let content: any;

    switch (command.tipo) {
      case 'image':
        content = {
          image: buffer,
          ...(command.text && { caption: command.text }),
        };
        break;

      case 'audio':
        content = {
          audio: buffer,
          mimetype: 'audio/ogg; codecs=opus',
          ptt: true,
        };
        break;

      case 'video':
        content = {
          video: buffer,
          ...(command.text && { caption: command.text }),
        };
        break;

      case 'document':
        content = {
          document: buffer,
          fileName: command.fileName || command.url_archivo!.split('/').pop() || 'document.pdf',
          mimetype: command.mimeType || 'application/pdf',
          ...(command.text && { caption: command.text }),
        };
        break;

      default:
        throw new Error(`Tipo no soportado: ${command.tipo}`);
    }

    await this.gateway.sendMessage(command.to, content);
    
    runtimeState.markOutgoing();
  }
}
