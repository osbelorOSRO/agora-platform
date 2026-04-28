import { Request, Response, NextFunction } from 'express';
import { logger } from '../../../shared/logger.js';
import { env } from '../../../config/env.js';

export interface AuthenticatedRequest extends Request {
  user?: any;
}

export const authMiddleware = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const internalToken = req.headers['x-internal-token'];
  if (typeof internalToken === 'string' && internalToken === env.baileysInternalToken) {
    next();
    return;
  }

  logger.warn('Solicitud interna rechazada: token Baileys inválido o ausente');
  res.status(403).json({
    error: 'Token interno inválido',
  });
};
