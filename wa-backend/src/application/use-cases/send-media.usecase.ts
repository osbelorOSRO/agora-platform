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

  private resolveInternalDownloadUrl(rawUrl: string): string {
    try {
      const parsed = new URL(rawUrl);
      if (parsed.pathname.startsWith('/uploads/')) {
        return `${env.apiBackendUrl.replace(/\/+$/, '')}${parsed.pathname}${parsed.search}`;
      }
      return rawUrl;
    } catch {
      return rawUrl;
    }
  }

  async execute(input: SendMediaInput): Promise<void> {
    const command = toBaileysOutgoingCommand(input);

    const downloadUrl = this.resolveInternalDownloadUrl(command.url_archivo!);
    const { data } = await axios.get(downloadUrl, { responseType: 'arraybuffer' });
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
