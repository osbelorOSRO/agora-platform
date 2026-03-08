import { Request, Response, NextFunction } from 'express';
import { jwtService } from '../../auth/jwt.service.js';
import { logger } from '../../../shared/logger.js';

export interface AuthenticatedRequest extends Request {
  user?: any;
}

export const authMiddleware = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers['authorization'];

    if (!authHeader) {
      res.status(401).json({
        error: 'Falta header Authorization',
      });
      return;
    }

    const parts = authHeader.split(' ');

    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      res.status(401).json({
        error: 'Formato Authorization inválido',
      });
      return;
    }

    const token = parts[1];

    const payload = await jwtService.verifyBackendToken(token);

    req.user = payload;

    next();
  } catch (error: any) {
    logger.warn('Token inválido o expirado', {
      error: error.message,
    });

    res.status(403).json({
      error: 'Token inválido o expirado',
    });
  }
};
