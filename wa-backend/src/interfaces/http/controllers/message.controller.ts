// src/interfaces/http/controllers/message.controller.ts

import { Request, Response, NextFunction } from 'express';
import { SendMessageUseCase } from '../../../application/use-cases/send-message.usecase.js';
import { SendMediaUseCase } from '../../../application/use-cases/send-media.usecase.js';

type MediaTipo = 'imagen' | 'audio' | 'video' | 'documento';
function normalizeMediaTipo(tipo: unknown): MediaTipo | null {
  if (tipo === 'imagen' || tipo === 'audio' || tipo === 'video' || tipo === 'documento') {
    return tipo;
  }
  return null;
}

export class MessageController {
  constructor(
    private readonly sendMessageUseCase: SendMessageUseCase,
    private readonly sendMediaUseCase: SendMediaUseCase
  ) {}

  async enviarMensaje(req: Request, res: Response, next: NextFunction) {
    try {
      const { destino, tipo, contenido, tipoId } = req.body;

      if (!destino || !tipo || !contenido || !tipoId) {
        return res.status(400).json({
          error: 'Faltan campos requeridos: destino, tipo, contenido o tipoId',
        });
      }

      if (tipoId !== 'jid' && tipoId !== 'lid') {
        return res.status(400).json({
          error: 'tipoId inválido. Debe ser "jid" o "lid".',
        });
      }

      if (tipo !== 'texto') {
        const mediaTipo = normalizeMediaTipo(tipo);
        if (!mediaTipo) {
          return res.status(400).json({
            error: `Tipo de mensaje no soportado: ${tipo}`,
          });
        }

        const url_archivo =
          contenido?.url_archivo ||
          contenido?.audio?.url ||
          contenido?.image?.url ||
          contenido?.video?.url ||
          contenido?.document?.url;

        if (!url_archivo || typeof url_archivo !== 'string') {
          return res.status(400).json({
            error: 'Falta o es inválido el campo url_archivo',
          });
        }

        await this.sendMediaUseCase.execute({
          cliente_id: destino.includes('@') ? destino.split('@')[0] : destino,
          tipoId,
          tipo: mediaTipo,
          url_archivo,
          contenido,
        });
      } else {
      await this.sendMessageUseCase.execute({
        destino,
        tipo,
        contenido,
        tipoId,
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

  async enviarDesdeN8n(req: Request, res: Response, next: NextFunction) {
    try {
      const { cliente_id, tipoId, contenido, tipo, url_archivo } = req.body;

      if (!cliente_id || !tipoId) {
        return res.status(400).json({
          error: 'cliente_id y tipoId son obligatorios',
        });
      }

      if (tipoId !== 'jid' && tipoId !== 'lid') {
        return res.status(400).json({
          error: 'tipoId inválido. Debe ser "jid" o "lid".',
        });
      }

      if (url_archivo) {
        const mediaTipo = normalizeMediaTipo(tipo) || 'imagen';
        await this.sendMediaUseCase.execute({
          cliente_id,
          tipoId,
          tipo: mediaTipo,
          url_archivo,
          contenido,
        });
      } else {
        await this.sendMessageUseCase.execute({
          destino: cliente_id,
          tipo: 'texto',
          contenido,
          tipoId,
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
