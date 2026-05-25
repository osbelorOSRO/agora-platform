import { BadRequestException, Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import axios from 'axios';
import { IMessageGateway } from './interfaces/message-gateway.interface';

type BaileysMessageType = 'text' | 'image' | 'audio' | 'document' | 'video';

@Injectable()
export class BaileysSenderService implements IMessageGateway {
  private readonly logger = new Logger(BaileysSenderService.name);
  private getGatewayUrl(): string {
    const url = process.env.BOT_BASE_URL;
    if (!url) {
      throw new Error('Missing required env BOT_BASE_URL');
    }
    return url;
  }

  private resolveDestino(clienteId: string): string {
    const value = String(clienteId || '').trim();
    if (!value) throw new BadRequestException('Falta destino WhatsApp.');
    if (value.includes('@')) return value;
    return `${value}@s.whatsapp.net`;
  }

  private resolveTipoId(destino: string, explicitTipoId?: string): string {
    if (explicitTipoId === 'jid' || explicitTipoId === 'lid') return explicitTipoId;
    return destino.includes('@lid') ? 'lid' : 'jid';
  }

  async enviarMensajeWhatsApp(
    clienteId: string,
    tipo: BaileysMessageType,
    contenido: string,
    tipoId?: string,
    urlArchivo?: string,
    options?: {
      fileName?: string;
      mimeType?: string;
    },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ): Promise<any> {
    const waId = this.resolveDestino(clienteId);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const payload: any = {
      destino: waId,
      tipo,
      tipoId: this.resolveTipoId(waId, tipoId),
    };

    switch (tipo) {
      case 'text':
        if (!contenido) throw new BadRequestException('Falta contenido para mensaje de texto.');
        payload.contenido = { text: contenido };
        break;

      case 'image':
        if (!urlArchivo) throw new BadRequestException('Falta URL de imagen.');
        payload.contenido = { image: { url: urlArchivo }, caption: contenido || '' };
        break;

      case 'audio':
        if (!urlArchivo) throw new BadRequestException('Falta URL de audio.');
        payload.contenido = {
          audio: { url: urlArchivo },
          mimetype: 'audio/ogg; codecs=opus',
          ptt: true,
        };
        break;

      case 'document':
        if (!urlArchivo) throw new BadRequestException('Falta URL de documento.');
        payload.contenido = {
          document: { url: urlArchivo },
          mimetype: options?.mimeType || 'application/pdf',
          fileName: options?.fileName,
          caption: contenido || '',
        };
        break;

      case 'video':
        if (!urlArchivo) throw new BadRequestException('Falta URL de video.');
        payload.contenido = { video: { url: urlArchivo }, caption: contenido || '' };
        break;

      default:
        throw new BadRequestException(`Tipo de mensaje no soportado: ${tipo}`);
    }

    const gatewayUrl = this.getGatewayUrl();
    const endpoint = `${gatewayUrl}/api/enviar-mensaje`;

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      const internalToken = process.env.BAILEYS_INTERNAL_TOKEN;
      if (!internalToken) {
        throw new InternalServerErrorException('Missing required env BAILEYS_INTERNAL_TOKEN');
      }
      headers['x-internal-token'] = internalToken;

      this.logger.debug(`Enviando mensaje a Gateway: ${endpoint} destino=${waId} tipo=${tipo} tipoId=${tipoId}`);

      const response = await axios.post(endpoint, payload, {
        headers,
        timeout: 10000
      });

      this.logger.log(`Mensaje enviado vía Gateway a ${clienteId} (${tipo})`);
      return response.data;
    } catch (error: any) {
      this.logger.error(`Error al enviar mensaje vía Gateway: ${error.message}`, { endpoint, status: error.response?.status });
      throw new InternalServerErrorException('No se pudo enviar el mensaje');
    }
  }

  async updateBlockStatus(input: {
    action: 'block' | 'unblock';
    phone?: string | null;
    jid?: string | null;
    pnJid?: string | null;
    lidJid?: string | null;
  }): Promise<any> {
    const gatewayUrl = this.getGatewayUrl();
    const endpoint = `${gatewayUrl}/api/block-status`;

    try {
      const internalToken = process.env.BAILEYS_INTERNAL_TOKEN;
      if (!internalToken) {
        throw new InternalServerErrorException('Missing required env BAILEYS_INTERNAL_TOKEN');
      }

      const response = await axios.post(endpoint, input, {
        headers: {
          'Content-Type': 'application/json',
          'x-internal-token': internalToken,
        },
        timeout: 15000,
      });

      return response.data;
    } catch (error: any) {
      this.logger.error(`Error al actualizar bloqueo vía Gateway: ${error.message}`, { endpoint, action: input.action, status: error.response?.status });
      throw new InternalServerErrorException('No se pudo actualizar el estado de bloqueo');
    }
  }
}
