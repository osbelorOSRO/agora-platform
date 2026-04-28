import { Injectable, InternalServerErrorException } from '@nestjs/common';
import axios from 'axios';

type BaileysMessageType = 'text' | 'image' | 'audio' | 'document' | 'video';

@Injectable()
export class BaileysSenderService {
  private getGatewayUrl(): string {
    const url = process.env.BOT_BASE_URL;
    if (!url) {
      throw new Error('Missing required env BOT_BASE_URL');
    }
    return url;
  }

  private resolveDestino(clienteId: string): string {
    const value = String(clienteId || '').trim();
    if (!value) throw new Error('Falta destino WhatsApp.');
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
  ): Promise<any> {
    const waId = this.resolveDestino(clienteId);

    const payload: any = {
      destino: waId,
      tipo,
      tipoId: this.resolveTipoId(waId, tipoId),
    };

    switch (tipo) {
      case 'text':
        if (!contenido) throw new Error('Falta contenido para mensaje de texto.');
        payload.contenido = { text: contenido };
        break;

      case 'image':
        if (!urlArchivo) throw new Error('Falta URL de imagen.');
        payload.contenido = { image: { url: urlArchivo }, caption: contenido || '' };
        break;

      case 'audio':
        if (!urlArchivo) throw new Error('Falta URL de audio.');
        payload.contenido = {
          audio: { url: urlArchivo },
          mimetype: 'audio/ogg; codecs=opus',
          ptt: true,
        };
        break;

      case 'document':
        if (!urlArchivo) throw new Error('Falta URL de documento.');
        payload.contenido = {
          document: { url: urlArchivo },
          mimetype: options?.mimeType || 'application/pdf',
          fileName: options?.fileName,
          caption: contenido || '',
        };
        break;

      case 'video':
        if (!urlArchivo) throw new Error('Falta URL de video.');
        payload.contenido = { video: { url: urlArchivo }, caption: contenido || '' };
        break;

      default:
        throw new Error(`Tipo de mensaje no soportado: ${tipo}`);
    }

    const gatewayUrl = this.getGatewayUrl();
    const endpoint = `${gatewayUrl}/api/enviar-mensaje`;

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      const internalToken = process.env.BAILEYS_INTERNAL_TOKEN;
      if (!internalToken) {
        throw new Error('Missing required env BAILEYS_INTERNAL_TOKEN');
      }
      headers['x-internal-token'] = internalToken;

      console.log(`📤 Enviando mensaje a Gateway: ${endpoint}`);
      console.log(`📦 Payload: destino=${waId}, tipo=${tipo}, tipoId=${tipoId}`);

      const response = await axios.post(endpoint, payload, {
        headers,
        timeout: 10000
      });

      console.log(`✅ Mensaje enviado vía Gateway a ${clienteId} (${tipo})`);
      return response.data;
    } catch (error: any) {
      console.error(`❌ Error al enviar mensaje vía Gateway:`, {
        endpoint,
        error: error.message,
        status: error.response?.status,
        data: error.response?.data
      });
      throw new InternalServerErrorException(
        `No se pudo enviar mensaje vía Gateway: ${error.message}`
      );
    }
  }
}
