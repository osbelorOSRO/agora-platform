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
    client.on('connect', () => console.log('✅ Rate limiter media conectado a Redis'));
    client.on('error', (err: Error) => console.error('⚠️ Rate limiter media Redis error:', err.message));
    return client;
  } catch {
    return null;
  }
}

const redisClient = crearRedisClient();

function crearStore(prefijo: string) {
  if (!redisClient) return undefined;
  return new RedisStore({
    sendCommand: (...args: string[]) =>
      redisClient.call(...(args as [string, ...string[]])) as Promise<number>,
    prefix: `rl:${prefijo}:`,
  });
}

function respuestaLimite(res: any) {
  res.status(429).json({ error: 'Demasiadas solicitudes. Intenta más tarde.' });
}

// POST /media/guardar — llamado por wa-backend al recibir media entrante
export const limitadorMediaGuardar = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  store: crearStore('media:guardar'),
  handler: (_req, res) => respuestaLimite(res),
  skip: () => !redisClient,
});

// POST /media/upload-tts — llamado por n8n para TTS
export const limitadorMediaUploadTts = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  store: crearStore('media:tts'),
  handler: (_req, res) => respuestaLimite(res),
  skip: () => !redisClient,
});

// POST /meta-inbox/threads/:sessionId/send-media — panel humano
export const limitadorMediaSend = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  store: crearStore('media:send'),
  handler: (_req, res) => respuestaLimite(res),
  skip: () => !redisClient,
});

// POST /internal/baileys/events — wa-backend envía evento por cada mensaje WA
export const limitadorBaileysEvents = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  store: crearStore('baileys:events'),
  handler: (_req, res) => respuestaLimite(res),
  skip: () => !redisClient,
});

// POST /actor/msg-delegation/complete y /failed — callbacks de n8n por flujo
export const limitadorMsgDelegation = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  store: crearStore('msg:delegation'),
  handler: (_req, res) => respuestaLimite(res),
  skip: () => !redisClient,
});

// /meta-inbox/n8n/* — todos los endpoints de automatización n8n
export const limitadorN8n = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  store: crearStore('n8n'),
  handler: (_req, res) => respuestaLimite(res),
  skip: () => !redisClient,
});

// /meta-inbox/threads/*/send-text y send-message — envío de mensajes de texto panel humano
export const limitadorPanelEnvio = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  store: crearStore('panel:envio'),
  handler: (_req, res) => respuestaLimite(res),
  skip: () => !redisClient,
});

// /meta-inbox/* lectura y acciones panel humano (excepto envíos)
export const limitadorPanelGeneral = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  store: crearStore('panel:general'),
  handler: (_req, res) => respuestaLimite(res),
  skip: () => !redisClient,
});

// /respuestas-rapidas/* — CRUD panel humano
export const limitadorRespuestasRapidas = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  store: crearStore('panel:rr'),
  handler: (_req, res) => respuestaLimite(res),
  skip: () => !redisClient,
});

// GET /ping y GET /ping/db — healthcheck (Docker + Nginx)
export const limitadorPing = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  store: crearStore('ping'),
  handler: (_req, res) => respuestaLimite(res),
  skip: () => !redisClient,
});

// POST /webhooks/meta — webhook entrante de Meta
export const limitadorWebhookMetaPost = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  store: crearStore('webhook:meta:post'),
  handler: (_req, res) => respuestaLimite(res),
  skip: () => !redisClient,
});

// GET /webhooks/meta — verificación de webhook Meta (challenge)
export const limitadorWebhookMetaGet = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  store: crearStore('webhook:meta:get'),
  handler: (_req, res) => respuestaLimite(res),
  skip: () => !redisClient,
});

// GET /legal/* — documentos legales públicos
export const limitadorLegal = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  store: crearStore('legal'),
  handler: (_req, res) => respuestaLimite(res),
  skip: () => !redisClient,
});

