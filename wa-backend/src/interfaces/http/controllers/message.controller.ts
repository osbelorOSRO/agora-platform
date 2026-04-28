// src/interfaces/http/controllers/message.controller.ts

import { Request, Response, NextFunction } from 'express';
import { SendMessageUseCase } from '../../../application/use-cases/send-message.usecase.js';
import { SendMediaUseCase } from '../../../application/use-cases/send-media.usecase.js';

type MediaType = 'image' | 'audio' | 'video' | 'document';
function normalizeMediaType(tipo: unknown): MediaType | null {
  if (tipo === 'image' || tipo === 'audio' || tipo === 'video' || tipo === 'document') {
    return tipo;
  }
  if (tipo === 'imagen') return 'image';
  if (tipo === 'documento') return 'document';
  return null;
}

function asRecord(value: unknown): Record<string, any> | undefined {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, any>;
  }
  return undefined;
}

function hasOutgoingDestination(body: Record<string, any>): boolean {
  return Boolean(body.destino || body.actorExternalId || body.recipientId);
}

function getOutgoingTipo(body: Record<string, any>): unknown {
  return body.tipo || asRecord(body.payload)?.tipo || asRecord(body.media)?.mediaType;
}

function getOutgoingMediaUrl(body: Record<string, any>): string | undefined {
  const contenido = asRecord(body.contenido);
  const payload = asRecord(body.payload);
  const message = asRecord(body.message) || asRecord(payload?.message);
  const media = asRecord(body.media) || asRecord(payload?.media);
  const attachmentUrls = Array.isArray(message?.attachmentUrls) ? message.attachmentUrls : [];
  const candidates = [
    body.url_archivo,
    contenido?.url_archivo,
    asRecord(contenido?.audio)?.url,
    asRecord(contenido?.image)?.url,
    asRecord(contenido?.video)?.url,
    asRecord(contenido?.document)?.url,
    media?.mediaUrl,
    media?.url,
    attachmentUrls[0],
    payload?.url_archivo,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.trim()) return candidate.trim();
  }

  return undefined;
}

export class MessageController {
  constructor(
    private readonly sendMessageUseCase: SendMessageUseCase,
    private readonly sendMediaUseCase: SendMediaUseCase
  ) {}

  async enviarMensaje(req: Request, res: Response, next: NextFunction) {
    try {
      const body = req.body as Record<string, any>;
      const { destino, tipo, contenido, tipoId, actorExternalId, recipientId, payload, message } = body;

      if (!hasOutgoingDestination(body)) {
        return res.status(400).json({
          error: 'Falta destino: actorExternalId, destino o recipientId',
        });
      }

      if (tipoId && tipoId !== 'jid' && tipoId !== 'lid') {
        return res.status(400).json({
          error: 'tipoId inválido. Debe ser "jid" o "lid".',
        });
      }

      const outgoingTipo = getOutgoingTipo(body) || 'text';
      const url_archivo = getOutgoingMediaUrl(body);

      if (outgoingTipo !== 'text' && outgoingTipo !== 'texto' || url_archivo) {
        const mediaType = normalizeMediaType(outgoingTipo) || 'image';
        if (!mediaType) {
          return res.status(400).json({
            error: `Tipo de mensaje no soportado: ${outgoingTipo}`,
          });
        }

        if (!url_archivo) {
          return res.status(400).json({
            error: 'Falta o es inválido el campo url_archivo',
          });
        }

        await this.sendMediaUseCase.execute({
          destino,
          actorExternalId,
          recipientId,
          tipoId,
          tipo: mediaType,
          url_archivo,
          contenido,
          payload,
          message,
          media: body.media,
        });
      } else {
        await this.sendMessageUseCase.execute({
          destino,
          actorExternalId,
          recipientId,
          tipo: 'text',
          contenido,
          tipoId,
          payload,
          message,
        });
      }

      return res.status(200).json({
        success: true,
        ejecutadoPor: 'api-gateway',
      });
    } catch (error) {
      next(error);
    }
  }

}
