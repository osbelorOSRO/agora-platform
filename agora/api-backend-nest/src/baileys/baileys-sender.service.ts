// api-backend-nest/src/baileys/baileys-sender.service.ts

import { Injectable, InternalServerErrorException, Inject, Scope } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { Request } from 'express';
import axios from 'axios';

@Injectable({ scope: Scope.REQUEST }) // ✅ Importante para inyectar REQUEST
export class BaileysSenderService {
  constructor(
    @Inject(REQUEST) private readonly request: Request,
  ) {}

  private getGatewayUrl(): string {
    return process.env.BOT_BASE_URL || 'http://wa_backend:3000';
  }

  async enviarMensajeWhatsApp(
    clienteId: string,
    tipo: 'texto' | 'imagen' | 'audio' | 'documento' | 'video',
    contenido: string,
    tipoId: string,
    urlArchivo?: string
  ): Promise<void> {
    const waId = `${clienteId}@s.whatsapp.net`;

    const payload: any = {
      destino: waId,
      tipo,
      tipoId
    };

    switch (tipo) {
      case 'texto':
        if (!contenido) throw new Error('Falta contenido para mensaje de texto.');
        payload.contenido = { text: contenido };
        break;

      case 'imagen':
        if (!urlArchivo) throw new Error('Falta URL de imagen.');
        payload.contenido = { image: { url: urlArchivo }, caption: '' };
        break;

      case 'audio':
        if (!urlArchivo) throw new Error('Falta URL de audio.');
        payload.contenido = {
          audio: { url: urlArchivo },
          mimetype: 'audio/ogg; codecs=opus',
          ptt: true,
        };
        break;

      case 'documento':
        if (!urlArchivo) throw new Error('Falta URL de documento.');
        payload.contenido = {
          document: { url: urlArchivo },
          mimetype: 'application/pdf',
          caption: '',
        };
        break;

      case 'video':
        if (!urlArchivo) throw new Error('Falta URL de video.');
        payload.contenido = { video: { url: urlArchivo }, caption: '' };
        break;

      default:
        throw new Error(`Tipo de mensaje no soportado: ${tipo}`);
    }

    const gatewayUrl = this.getGatewayUrl();
    const endpoint = `${gatewayUrl}/api/enviar-mensaje`;

    try {
      // ✅ Obtener el token del request actual
      const authHeader = this.request.headers.authorization;
      if (!authHeader) {
        throw new Error('No se encontró token de autorización en la petición');
      }

      console.log(`📤 Enviando mensaje a Gateway: ${endpoint}`);
      console.log(`📦 Payload: destino=${waId}, tipo=${tipo}, tipoId=${tipoId}`);

      await axios.post(endpoint, payload, {
        headers: { 
          Authorization: authHeader, // ✅ Reenviar el mismo Bearer token del frontend
          'Content-Type': 'application/json'
        },
        timeout: 10000
      });

      console.log(`✅ Mensaje enviado vía Gateway a ${clienteId} (${tipo})`);
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
