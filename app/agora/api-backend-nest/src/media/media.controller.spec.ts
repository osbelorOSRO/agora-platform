import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import request from 'supertest';
import { MediaController } from './media.controller';
import { MediaService } from './media.service';

const INTERNAL_TOKEN = 'test-baileys-token';
const N8N_TOKEN = 'test-n8n-token';

// Minimal 1×1 PNG
const TINY_PNG = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
  0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
  0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
  0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53,
  0xde, 0x00, 0x00, 0x00, 0x0c, 0x49, 0x44, 0x41,
  0x54, 0x08, 0xd7, 0x63, 0xf8, 0xcf, 0xc0, 0x00,
  0x00, 0x00, 0x02, 0x00, 0x01, 0xe2, 0x21, 0xbc,
  0x33, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e,
  0x44, 0xae, 0x42, 0x60, 0x82,
]);

const mockConfig = {
  get: jest.fn((key: string) => {
    if (key === 'BAILEYS_INTERNAL_TOKEN') return INTERNAL_TOKEN;
    if (key === 'N8N_SECRET_TOKEN') return N8N_TOKEN;
    return null;
  }),
};

const mockService = {
  procesarArchivo: jest.fn(),
  procesarTts: jest.fn(),
};

async function buildApp(): Promise<INestApplication> {
  const module: TestingModule = await Test.createTestingModule({
    controllers: [MediaController],
    providers: [
      { provide: MediaService, useValue: mockService },
      { provide: ConfigService, useValue: mockConfig },
    ],
  }).compile();

  const app = module.createNestApplication();
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true, transformOptions: { enableImplicitConversion: true } }));
  await app.init();
  return app;
}

describe('MediaController', () => {
  let app: INestApplication;

  beforeEach(async () => {
    jest.clearAllMocks();
    app = await buildApp();
  });
  afterEach(() => app?.close());

  // --- POST /media/guardar ---

  describe('POST /media/guardar', () => {
    it('devuelve 201 con archivo PNG válido y token interno correcto', async () => {
      mockService.procesarArchivo.mockResolvedValue({ url: 'https://minio.example.com/img.png' });
      const res = await request(app.getHttpServer())
        .post('/media/guardar')
        .set('x-internal-token', INTERNAL_TOKEN)
        .field('actorId', 'actor-001')
        .field('tipo', 'imagen')
        .attach('archivo', TINY_PNG, { filename: 'foto.png', contentType: 'image/png' })
        .expect(201);
      expect(res.body).toHaveProperty('url');
      expect(mockService.procesarArchivo).toHaveBeenCalledTimes(1);
    });

    it('devuelve 400 cuando no se envía archivo', async () => {
      await request(app.getHttpServer())
        .post('/media/guardar')
        .set('x-internal-token', INTERNAL_TOKEN)
        .field('actorId', 'actor-001')
        .field('tipo', 'imagen')
        .expect(400);
    });

    it('devuelve 400 cuando actorId está ausente', async () => {
      await request(app.getHttpServer())
        .post('/media/guardar')
        .set('x-internal-token', INTERNAL_TOKEN)
        .field('tipo', 'imagen')
        .attach('archivo', TINY_PNG, { filename: 'foto.png', contentType: 'image/png' })
        .expect(400);
    });

    it('devuelve 400 cuando tipo es inválido', async () => {
      await request(app.getHttpServer())
        .post('/media/guardar')
        .set('x-internal-token', INTERNAL_TOKEN)
        .field('actorId', 'actor-001')
        .field('tipo', 'sticker')
        .attach('archivo', TINY_PNG, { filename: 'foto.png', contentType: 'image/png' })
        .expect(400);
    });

    it('devuelve 403 con token interno incorrecto', async () => {
      await request(app.getHttpServer())
        .post('/media/guardar')
        .set('x-internal-token', 'token-equivocado')
        .field('actorId', 'actor-001')
        .field('tipo', 'imagen')
        .attach('archivo', TINY_PNG, { filename: 'foto.png', contentType: 'image/png' })
        .expect(403);
    });

    it('devuelve 403 sin header de token interno', async () => {
      await request(app.getHttpServer())
        .post('/media/guardar')
        .field('actorId', 'actor-001')
        .field('tipo', 'imagen')
        .attach('archivo', TINY_PNG, { filename: 'foto.png', contentType: 'image/png' })
        .expect(403);
    });
  });

  // --- POST /media/upload-tts ---

  describe('POST /media/upload-tts', () => {
    it('devuelve 201 con archivo y token N8N correcto', async () => {
      mockService.procesarTts.mockResolvedValue({ url: 'https://minio.example.com/tts.ogg' });
      const res = await request(app.getHttpServer())
        .post('/media/upload-tts')
        .set('authorization', `Bearer ${N8N_TOKEN}`)
        .attach('file', TINY_PNG, { filename: 'audio.png', contentType: 'image/png' })
        .expect(201);
      expect(res.body).toHaveProperty('url');
      expect(mockService.procesarTts).toHaveBeenCalledTimes(1);
    });

    it('devuelve 400 cuando no se envía archivo', async () => {
      await request(app.getHttpServer())
        .post('/media/upload-tts')
        .set('authorization', `Bearer ${N8N_TOKEN}`)
        .expect(400);
    });

    it('devuelve 401 con token N8N incorrecto', async () => {
      await request(app.getHttpServer())
        .post('/media/upload-tts')
        .set('authorization', 'Bearer token-equivocado')
        .attach('file', TINY_PNG, { filename: 'audio.png', contentType: 'image/png' })
        .expect(401);
    });

    it('devuelve 401 sin header de autorización', async () => {
      await request(app.getHttpServer())
        .post('/media/upload-tts')
        .attach('file', TINY_PNG, { filename: 'audio.png', contentType: 'image/png' })
        .expect(401);
    });
  });
});
