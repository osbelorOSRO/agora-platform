import { Request, Response, NextFunction } from 'express';
import { VaultService } from './vaultService.js';

const vaultService = new VaultService();
let cachedApiKey: string | null = null;

const getExpectedApiKey = async (): Promise<string> => {
  if (cachedApiKey) return cachedApiKey;

  const fromEnv = process.env.API_KEY_WS;
  if (fromEnv && fromEnv.trim()) {
    cachedApiKey = fromEnv.trim();
    return cachedApiKey;
  }

  const path = process.env.VAULT_WEBSOCKET_SECRETS_PATH || 'agora/websocket';
  cachedApiKey = await vaultService.getSecretKey(path, 'API_KEY_WS');
  return cachedApiKey;
};

export const apiKeyAuthMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const apiKey = req.headers['x-api-key'];
    const expected = await getExpectedApiKey();
    if (typeof apiKey !== 'string' || apiKey !== expected) {
      res.status(403).json({ error: 'No autorizado' });
      return;
    }
    next();
  } catch (error) {
    console.error('❌ Error validando API key websocket:', error);
    res.status(500).json({ error: 'Error interno validando API key' });
  }
};
