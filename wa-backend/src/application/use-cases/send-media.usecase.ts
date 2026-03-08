import { WhatsAppGateway } from '../whatsapp.gateway.js';
import axios from 'axios';
import { conectarSocketBot, getSocketBot } from '../../infrastructure/socket/socket.client.js';
import { runtimeState } from '../../shared/runtime-state.js';
import { env } from '../../config/env.js';

export interface SendMediaInput {
  cliente_id: string;
  tipoId: 'jid' | 'lid';
  tipo: 'imagen' | 'audio' | 'video' | 'documento';
  url_archivo: string;
  contenido?: unknown;
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
    const to = `${input.cliente_id}@${input.tipoId === 'jid' ? 's.whatsapp.net' : 'lid'}`;

    const caption =
      typeof input.contenido === 'string'
        ? input.contenido
        : (input.contenido as { text?: string; caption?: string } | undefined)?.text ||
          (input.contenido as { text?: string; caption?: string } | undefined)?.caption ||
          '';

    const downloadUrl = this.resolveInternalDownloadUrl(input.url_archivo);
    const { data } = await axios.get(downloadUrl, { responseType: 'arraybuffer' });
    const buffer = Buffer.from(data);

    if (!buffer.length) {
      throw new Error('No se pudo descargar archivo multimedia');
    }

    let content: any;

    switch (input.tipo) {
      case 'imagen':
        content = {
          image: buffer,
          ...(caption && { caption }),
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
          ...(caption && { caption }),
        };
        break;

      case 'documento':
        content = {
          document: buffer,
          fileName: input.url_archivo.split('/').pop() || 'documento.pdf',
          mimetype: 'application/pdf',
          ...(caption && { caption }),
        };
        break;

      default:
        throw new Error(`Tipo no soportado: ${input.tipo}`);
    }

    await this.gateway.sendMessage(to, content);
    
    runtimeState.markOutgoing();

    const textoMostrado = caption || input.url_archivo.split('/').pop() || `[${input.tipo}]`;

    try {
      await conectarSocketBot();
      const socketHumano = getSocketBot();

      socketHumano.emit('joinRoom', input.cliente_id);

      socketHumano.emit('mensajeOutput', {
        cliente_id: input.cliente_id,
        contenido: textoMostrado,
        tipo: input.tipo,
        direccion_mensaje: 'output',
        fecha_envio: new Date().toISOString(),
        usuario: 'baileysbot',
        url_archivo: input.url_archivo,
      });

      socketHumano.emit('nuevoMensaje', {
        clienteId: input.cliente_id,
        contenido: textoMostrado,
        tipo: input.tipo,
        direccion_mensaje: 'output',
        fecha_envio: new Date().toISOString(),
        url_archivo: input.url_archivo,
      });
    } catch {
      // noop
    }
  }
}
