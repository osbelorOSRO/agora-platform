import rateLimit, { RateLimitRequestHandler } from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import { Redis } from 'ioredis';
import { Logger } from '@nestjs/common';
import { Response } from 'express';

const logger = new Logger('RateLimiter');

function crearRedisClient(
  host: string,
  port: number,
  password?: string,
): Redis | null {
  try {
    const client = new Redis({
      host,
      port,
      password: password || undefined,
      maxRetriesPerRequest: null,
    });
    client.on('connect', () => logger.log('Rate limiter conectado a Redis'));
    client.on('error', (err: Error) =>
      logger.error(`Rate limiter Redis error: ${err.message}`),
    );
    return client;
  } catch {
    return null;
  }
}

function respuestaLimite(res: Response) {
  res.status(429).json({ error: 'Demasiadas solicitudes. Intenta más tarde.' });
}

export interface Limitadores {
  limitadorMediaGuardar: RateLimitRequestHandler;
  limitadorMediaUploadTts: RateLimitRequestHandler;
  limitadorMediaSend: RateLimitRequestHandler;
  limitadorBaileysEvents: RateLimitRequestHandler;
  limitadorMsgDelegation: RateLimitRequestHandler;
  limitadorN8n: RateLimitRequestHandler;
  limitadorPanelEnvio: RateLimitRequestHandler;
  limitadorPanelGeneral: RateLimitRequestHandler;
  limitadorRespuestasRapidas: RateLimitRequestHandler;
  limitadorPing: RateLimitRequestHandler;
  limitadorWebhookMetaPost: RateLimitRequestHandler;
  limitadorWebhookMetaGet: RateLimitRequestHandler;
  limitadorLegal: RateLimitRequestHandler;
  limitadorLogin: RateLimitRequestHandler;
  limitadorRecuperacion: RateLimitRequestHandler;
  limitadorRegistro: RateLimitRequestHandler;
  limitadorSesionesAdmin: RateLimitRequestHandler;
  limitadorSettings: RateLimitRequestHandler;
  limitadorSalesRecord: RateLimitRequestHandler;
  limitadorRaiz: RateLimitRequestHandler;
}

export function crearLimitadores(
  redisHost: string,
  redisPort: number,
  redisPassword?: string,
): Limitadores {
  const redisClient = crearRedisClient(redisHost, redisPort, redisPassword);

  function crearStore(prefijo: string) {
    if (!redisClient) return undefined;
    return new RedisStore({
      sendCommand: (...args: string[]) =>
        redisClient.call(...(args as [string, ...string[]])) as Promise<number>,
      prefix: `rl:${prefijo}:`,
    });
  }

  const skip = () => !redisClient;

  return {
    // POST /media/guardar — circuit breaker para wa-backend (IP única Docker)
    limitadorMediaGuardar: rateLimit({
      windowMs: 60 * 1000,
      max: 150,
      standardHeaders: true,
      legacyHeaders: false,
      store: crearStore('media:guardar'),
      handler: (_req, res) => respuestaLimite(res),
      skip,
    }),

    // POST /media/upload-tts — llamado por n8n para TTS
    limitadorMediaUploadTts: rateLimit({
      windowMs: 60 * 1000,
      max: 20,
      standardHeaders: true,
      legacyHeaders: false,
      store: crearStore('media:tts'),
      handler: (_req, res) => respuestaLimite(res),
      skip,
    }),

    // POST /meta-inbox/threads/:sessionId/send-media — panel humano
    limitadorMediaSend: rateLimit({
      windowMs: 60 * 1000,
      max: 10,
      standardHeaders: true,
      legacyHeaders: false,
      store: crearStore('media:send'),
      handler: (_req, res) => respuestaLimite(res),
      skip,
    }),

    // POST /internal/baileys/events — circuit breaker para wa-backend (IP única Docker)
    limitadorBaileysEvents: rateLimit({
      windowMs: 60 * 1000,
      max: 300,
      standardHeaders: true,
      legacyHeaders: false,
      store: crearStore('baileys:events'),
      handler: (_req, res) => respuestaLimite(res),
      skip,
    }),

    // POST /actor/msg-delegation/complete y /failed — callbacks de n8n por flujo
    limitadorMsgDelegation: rateLimit({
      windowMs: 60 * 1000,
      max: 60,
      standardHeaders: true,
      legacyHeaders: false,
      store: crearStore('msg:delegation'),
      handler: (_req, res) => respuestaLimite(res),
      skip,
    }),

    // /meta-inbox/n8n/* — todos los endpoints de automatización n8n
    limitadorN8n: rateLimit({
      windowMs: 60 * 1000,
      max: 60,
      standardHeaders: true,
      legacyHeaders: false,
      store: crearStore('n8n'),
      handler: (_req, res) => respuestaLimite(res),
      skip,
    }),

    // /meta-inbox/threads/*/send-text y send-message — envío de mensajes de texto panel humano
    limitadorPanelEnvio: rateLimit({
      windowMs: 60 * 1000,
      max: 30,
      standardHeaders: true,
      legacyHeaders: false,
      store: crearStore('panel:envio'),
      handler: (_req, res) => respuestaLimite(res),
      skip,
    }),

    // /meta-inbox/* lectura y acciones panel humano (excepto envíos)
    limitadorPanelGeneral: rateLimit({
      windowMs: 60 * 1000,
      max: 120,
      standardHeaders: true,
      legacyHeaders: false,
      store: crearStore('panel:general'),
      handler: (_req, res) => respuestaLimite(res),
      skip,
    }),

    // /shortcut/* — CRUD panel humano
    limitadorRespuestasRapidas: rateLimit({
      windowMs: 60 * 1000,
      max: 60,
      standardHeaders: true,
      legacyHeaders: false,
      store: crearStore('panel:rr'),
      handler: (_req, res) => respuestaLimite(res),
      skip,
    }),

    // GET /ping y GET /ping/db — healthcheck (Docker + Nginx)
    limitadorPing: rateLimit({
      windowMs: 60 * 1000,
      max: 60,
      standardHeaders: true,
      legacyHeaders: false,
      store: crearStore('ping'),
      handler: (_req, res) => respuestaLimite(res),
      skip,
    }),

    // POST /webhooks/meta — webhook entrante de Meta
    limitadorWebhookMetaPost: rateLimit({
      windowMs: 60 * 1000,
      max: 120,
      standardHeaders: true,
      legacyHeaders: false,
      store: crearStore('webhook:meta:post'),
      handler: (_req, res) => respuestaLimite(res),
      skip,
    }),

    // GET /webhooks/meta — verificación de webhook Meta (challenge)
    limitadorWebhookMetaGet: rateLimit({
      windowMs: 60 * 1000,
      max: 10,
      standardHeaders: true,
      legacyHeaders: false,
      store: crearStore('webhook:meta:get'),
      handler: (_req, res) => respuestaLimite(res),
      skip,
    }),

    // GET /legal/* — documentos legales públicos
    limitadorLegal: rateLimit({
      windowMs: 60 * 1000,
      max: 30,
      standardHeaders: true,
      legacyHeaders: false,
      store: crearStore('legal'),
      handler: (_req, res) => respuestaLimite(res),
      skip,
    }),

    // Accesos auth — fail-closed: si Redis cae, el in-memory store actúa como fallback
    // skip: () => false → nunca bypass; passOnStoreError: false → bloquea si Redis lanza error
    limitadorLogin: rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 10,
      standardHeaders: true,
      legacyHeaders: false,
      store: crearStore('login'),
      handler: (_req, res) => respuestaLimite(res),
      passOnStoreError: false,
      skip: () => false,
    }),

    limitadorRecuperacion: rateLimit({
      windowMs: 60 * 60 * 1000,
      max: 5,
      standardHeaders: true,
      legacyHeaders: false,
      store: crearStore('recuperacion'),
      handler: (_req, res) => respuestaLimite(res),
      passOnStoreError: false,
      skip: () => false,
    }),

    limitadorRegistro: rateLimit({
      windowMs: 60 * 60 * 1000,
      max: 5,
      standardHeaders: true,
      legacyHeaders: false,
      store: crearStore('registro'),
      handler: (_req, res) => respuestaLimite(res),
      passOnStoreError: false,
      skip: () => false,
    }),

    limitadorSesionesAdmin: rateLimit({
      windowMs: 60 * 1000,
      max: 30,
      standardHeaders: true,
      legacyHeaders: false,
      store: crearStore('sesiones:admin'),
      handler: (_req, res) => respuestaLimite(res),
      skip,
    }),

    // /settings/* — configuración admin (panel humano con permiso editar_configuracion)
    limitadorSettings: rateLimit({
      windowMs: 60 * 1000,
      max: 30,
      standardHeaders: true,
      legacyHeaders: false,
      store: crearStore('settings'),
      handler: (_req, res) => respuestaLimite(res),
      skip,
    }),

    // /sales-record/* — CRUD de ventas y tablas de configuración (panel humano)
    limitadorSalesRecord: rateLimit({
      windowMs: 60 * 1000,
      max: 60,
      standardHeaders: true,
      legacyHeaders: false,
      store: crearStore('sales:record'),
      handler: (_req, res) => respuestaLimite(res),
      skip,
    }),

    // GET / — ruta raíz pública
    limitadorRaiz: rateLimit({
      windowMs: 60 * 1000,
      max: 60,
      standardHeaders: true,
      legacyHeaders: false,
      store: crearStore('raiz'),
      handler: (_req, res) => respuestaLimite(res),
      skip,
    }),
  };
}
