import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { Logger } from 'nestjs-pino';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

import { MetaConfigService } from './meta-config/meta-config.service';
import {
  setMetaConfigService,
  setVaultService,
} from './shared/runtime-secrets';
import { VaultService } from './auth/vault.service';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ValidationPipe } from '@nestjs/common';
import { crearLimitadores } from './shared/rate-limiter';
import { Request, Response, NextFunction } from 'express';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    rawBody: true,
    bufferLogs: true,
  });

  app.useLogger(app.get(Logger));

  app.set('trust proxy', 1);
  app.enableShutdownHooks();

  setMetaConfigService(app.get(MetaConfigService));
  setVaultService(app.get(VaultService));

  const config = app.get(ConfigService);
  const port = config.get<number>('PORT') ?? 4001;
  const corsAllowedOrigins = (
    config.get<string>('CORS_ALLOWED_ORIGINS') ??
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
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  if (config.get<string>('SWAGGER_ENABLED') === 'true') {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('Agora Platform API')
      .setDescription('API interna del panel humano y automatizaciones N8N')
      .setVersion('1.0')
      .addBearerAuth(
        { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
        'panel-jwt',
      )
      .build();
    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api-docs', app, document);
  }

  const rl = crearLimitadores(
    config.get<string>('REDIS_HOST')!,
    config.get<number>('REDIS_PORT') ?? 6379,
    config.get<string>('REDIS_PASSWORD'),
  );

  app.use('/media/guardar', rl.limitadorMediaGuardar);
  app.use('/media/upload-tts', rl.limitadorMediaUploadTts);
  app.use(/^\/meta-inbox\/threads\/[^/]+\/send-media$/, rl.limitadorMediaSend);
  app.use('/internal/baileys/events', rl.limitadorBaileysEvents);
  app.use('/actor/msg-delegation', rl.limitadorMsgDelegation);
  app.use('/meta-inbox/n8n', rl.limitadorN8n);
  app.use(
    /^\/meta-inbox\/threads\/[^/]+\/send-(text|message)$/,
    rl.limitadorPanelEnvio,
  );
  app.use('/meta-inbox', rl.limitadorPanelGeneral);
  app.use('/shortcut', rl.limitadorRespuestasRapidas);
  app.use('/ping', rl.limitadorPing);
  app.use(
    '/webhooks/meta',
    (req: Request, res: Response, next: NextFunction) =>
      req.method === 'POST'
        ? rl.limitadorWebhookMetaPost(req, res, next)
        : rl.limitadorWebhookMetaGet(req, res, next),
  );
  app.use('/legal', rl.limitadorLegal);
  app.use('/api/auth/login', rl.limitadorLogin);
  app.use('/api/auth/registrar-usuario', rl.limitadorRegistro);
  app.use('/api/auth/reset-password', rl.limitadorRecuperacion);
  app.use('/api/auth/setup-2fa', rl.limitadorRecuperacion);
  app.use('/api/auth/sesiones-activas-admin', rl.limitadorSesionesAdmin);
  app.use('/api/auth/sesiones', rl.limitadorSesionesAdmin);
  app.use('/settings', rl.limitadorSettings);
  app.use('/sales-record', rl.limitadorSalesRecord);
  app.use('/', rl.limitadorRaiz);

  await app.listen(port);
}
bootstrap();
