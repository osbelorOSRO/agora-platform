import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';

import { MetaConfigService } from './meta-config/meta-config.service';
import { setMetaConfigService } from './shared/runtime-secrets';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ValidationPipe } from '@nestjs/common';
import {
  limitadorMediaGuardar,
  limitadorMediaUploadTts,
  limitadorMediaSend,
  limitadorBaileysEvents,
  limitadorMsgDelegation,
  limitadorN8n,
  limitadorPanelEnvio,
  limitadorPanelGeneral,
  limitadorRespuestasRapidas,
  limitadorPing,
  limitadorWebhookMetaPost,
  limitadorWebhookMetaGet,
  limitadorLegal,
  limitadorLogin,
  limitadorRecuperacion,
  limitadorRegistro,
  limitadorSesionesAdmin,
  limitadorSettings,
  limitadorRaiz,
} from './shared/rate-limiter';
import { Request, Response, NextFunction } from 'express';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    rawBody: true,
  });

  app.set('trust proxy', 1);
  app.enableShutdownHooks();

  setMetaConfigService(app.get(MetaConfigService));

  const config = app.get(ConfigService);
  const port = config.get<number>('PORT') || 4001;
  const corsAllowedOrigins = (
    config.get<string>('CORS_ALLOWED_ORIGINS') ||
    'http://localhost:5173,http://127.0.0.1:5173'
  )
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  app.enableCors({
    origin: corsAllowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  app.use('/media/guardar', limitadorMediaGuardar);
  app.use('/media/upload-tts', limitadorMediaUploadTts);
  app.use(/^\/meta-inbox\/threads\/[^/]+\/send-media$/, limitadorMediaSend);
  app.use('/internal/baileys/events', limitadorBaileysEvents);
  app.use('/actor/msg-delegation', limitadorMsgDelegation);
  app.use('/meta-inbox/n8n', limitadorN8n);
  app.use(
    /^\/meta-inbox\/threads\/[^/]+\/send-(text|message)$/,
    limitadorPanelEnvio,
  );
  app.use('/meta-inbox', limitadorPanelGeneral);
  app.use('/shortcut', limitadorRespuestasRapidas);
  app.use('/ping', limitadorPing);
  app.use(
    '/webhooks/meta',
    (req: Request, res: Response, next: NextFunction) =>
      req.method === 'POST'
        ? limitadorWebhookMetaPost(req, res, next)
        : limitadorWebhookMetaGet(req, res, next),
  );
  app.use('/legal', limitadorLegal);
  app.use('/api/auth/login', limitadorLogin);
  app.use('/api/auth/registrar-usuario', limitadorRegistro);
  app.use('/api/auth/reset-password', limitadorRecuperacion);
  app.use('/api/auth/setup-2fa', limitadorRecuperacion);
  app.use('/api/auth/sesiones-activas-admin', limitadorSesionesAdmin);
  app.use('/api/auth/sesiones', limitadorSesionesAdmin);
  app.use('/settings', limitadorSettings);
  app.use('/', limitadorRaiz);

  await app.listen(port);
}
bootstrap();

