import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import { Redis } from 'ioredis';

function crearRedisClient(): Redis | null {
  const host = process.env.REDIS_HOST;
  const port = parseInt(process.env.REDIS_PORT || '6379', 10);
  const password = process.env.REDIS_PASSWORD;
  if (!host) return null;

  try {
    const client = new Redis({
      host,
      port,
      password: password || undefined,
      maxRetriesPerRequest: null,
    });
    client.on('connect', () => console.log('✅ Rate limiter conectado a Redis'));
    client.on('error', (err: Error) => console.error('⚠️ Rate limiter Redis error:', err.message));
    return client;
  } catch {
    return null;
  }
}

const redisClient = crearRedisClient();

function crearStore(prefijo: string) {
  if (!redisClient) return undefined;
  return new RedisStore({
    sendCommand: (...args: string[]) => redisClient.call(...args as [string, ...string[]]) as Promise<number>,
    prefix: `rl:${prefijo}:`,
  });
}

function respuestaLimite(res: any) {
  res.status(429).json({ error: 'Demasiados intentos. Intenta más tarde.' });
}

export const limitadorLogin = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  store: crearStore('login'),
  handler: (_req, res) => respuestaLimite(res),
  skip: () => !redisClient,
});

export const limitadorRecuperacion = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  store: crearStore('recuperacion'),
  handler: (_req, res) => respuestaLimite(res),
  skip: () => !redisClient,
});

export const limitadorRegistro = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  store: crearStore('registro'),
  handler: (_req, res) => respuestaLimite(res),
  skip: () => !redisClient,
});
