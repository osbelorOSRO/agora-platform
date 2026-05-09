import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { NestExpressApplication } from '@nestjs/platform-express';
import { basename, extname, join } from 'path';
import { ValidationPipe } from '@nestjs/common';

const activeUploadExtensions = new Set([
  '.html',
  '.htm',
  '.svg',
  '.js',
  '.mjs',
  '.css',
  '.xml',
  '.xhtml',
]);

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    rawBody: true,
  });

  const config = app.get(ConfigService);
  const port = config.get<number>('PORT') || 4001;
  const corsAllowedOrigins = (config.get<string>('CORS_ALLOWED_ORIGINS') || 'http://localhost:5173,http://127.0.0.1:5173')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  app.enableCors({
    origin: corsAllowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  app.useStaticAssets(join(__dirname, '..', 'uploads'), {
    prefix: '/uploads/',
    setHeaders: (res, filePath) => {
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('Content-Security-Policy', "default-src 'none'; img-src 'self'; media-src 'self'; sandbox");
      res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
      if (activeUploadExtensions.has(extname(filePath).toLowerCase())) {
        res.setHeader(
          'Content-Disposition',
          `attachment; filename="${basename(filePath).replace(/["\\]/g, '')}"`,
        );
      }
    },
  });

  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    transformOptions: { enableImplicitConversion: true },
  }));

  await app.listen(port);
}
bootstrap();
