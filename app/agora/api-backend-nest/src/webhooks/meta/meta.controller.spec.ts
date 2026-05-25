import { createHmac } from 'crypto';

jest.mock('../../shared/runtime-secrets', () => ({
  getRuntimeSecret: jest.fn(),
}));

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { MetaController } from './meta.controller';
import { MetaService } from './meta.service';
import { getRuntimeSecret } from '../../shared/runtime-secrets';

const APP_SECRET = 'test-meta-app-secret';
const VERIFY_TOKEN = 'test-verify-token';

const mockService = {
  handleEvent: jest.fn(),
};

async function buildApp(): Promise<INestApplication> {
  const module: TestingModule = await Test.createTestingModule({
    controllers: [MetaController],
    providers: [{ provide: MetaService, useValue: mockService }],
  }).compile();

  const app = module.createNestApplication({ rawBody: true });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true, transformOptions: { enableImplicitConversion: true } }));
  await app.init();
  return app;
}

function hmacSig(secret: string, body: Buffer): string {
  return 'sha256=' + createHmac('sha256', secret).update(body).digest('hex');
}

describe('MetaController', () => {
  let app: INestApplication;

  beforeEach(async () => {
    jest.clearAllMocks();
    (getRuntimeSecret as jest.Mock).mockImplementation((key: string) => {
      if (key === 'META_VERIFY_TOKEN') return Promise.resolve(VERIFY_TOKEN);
      if (key === 'META_IG_VERIFY_TOKEN') return Promise.resolve('otro-verify-token');
      if (key === 'META_APP_SECRET') return Promise.resolve(APP_SECRET);
      return Promise.resolve(undefined);
    });
    app = await buildApp();
  });
  afterEach(() => app?.close());

  // --- GET /webhooks/meta (verificación de webhook) ---

  describe('GET /webhooks/meta', () => {
    const validQuery = {
      'hub.mode': 'subscribe',
      'hub.verify_token': VERIFY_TOKEN,
      'hub.challenge': 'challenge-xyz-789',
    };

    it('devuelve 200 con el challenge cuando token es correcto', async () => {
      const res = await request(app.getHttpServer())
        .get('/webhooks/meta')
        .query(validQuery)
        .expect(200);
      expect(res.text).toBe('challenge-xyz-789');
    });

    it('devuelve 200 también con el token de Instagram', async () => {
      const res = await request(app.getHttpServer())
        .get('/webhooks/meta')
        .query({ ...validQuery, 'hub.verify_token': 'otro-verify-token' })
        .expect(200);
      expect(res.text).toBe('challenge-xyz-789');
    });

    it('devuelve 403 cuando el token de verificación es incorrecto', async () => {
      await request(app.getHttpServer())
        .get('/webhooks/meta')
        .query({ ...validQuery, 'hub.verify_token': 'token-falso' })
        .expect(403);
    });

    it('devuelve 400 cuando faltan parámetros requeridos', async () => {
      await request(app.getHttpServer())
        .get('/webhooks/meta')
        .query({ 'hub.mode': 'subscribe' })
        .expect(400);
    });
  });

  // --- POST /webhooks/meta (recepción de eventos) ---

  describe('POST /webhooks/meta', () => {
    const webhookBody = {
      object: 'whatsapp_business_account',
      entry: [{ id: '123456', messaging: [] }],
    };

    it('devuelve 201 con firma HMAC válida', async () => {
      mockService.handleEvent.mockResolvedValue(undefined);
      const bodyStr = JSON.stringify(webhookBody);
      const sig = hmacSig(APP_SECRET, Buffer.from(bodyStr));
      const res = await request(app.getHttpServer())
        .post('/webhooks/meta')
        .set('content-type', 'application/json')
        .set('x-hub-signature-256', sig)
        .send(webhookBody)
        .expect(201);
      expect(res.text).toBe('EVENT_RECEIVED');
    });

    it('devuelve 401 cuando la firma HMAC es incorrecta', async () => {
      await request(app.getHttpServer())
        .post('/webhooks/meta')
        .set('content-type', 'application/json')
        .set('x-hub-signature-256', 'sha256=firma-invalida-000')
        .send(webhookBody)
        .expect(401);
    });

    it('devuelve 401 cuando no hay firma en el header', async () => {
      await request(app.getHttpServer())
        .post('/webhooks/meta')
        .send(webhookBody)
        .expect(401);
    });

    it('devuelve 401 cuando la firma no empieza por sha256=', async () => {
      await request(app.getHttpServer())
        .post('/webhooks/meta')
        .set('x-hub-signature-256', 'md5=abcdef1234567890')
        .send(webhookBody)
        .expect(401);
    });
  });
});
