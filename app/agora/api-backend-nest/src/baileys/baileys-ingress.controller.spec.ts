import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { ConfigService } from '@nestjs/config';
import { BaileysIngressController } from './baileys-ingress.controller';
import { BaileysIngressService } from './baileys-ingress.service';

const INTERNAL_TOKEN = 'test-baileys-internal-token';

const mockService = {
  ingestEnvelope: jest.fn(),
};

const validBody = {
  externalEventId: 'evt-abc-123',
  actorExternalId: 'actor-xyz',
  provider: 'BAILEYS',
  objectType: 'WHATSAPP',
  pipeline: 'MESSAGES',
  eventType: 'messaging.message',
  occurredAt: '2024-01-15T10:00:00.000Z',
  payload: { from: '56912345678', text: 'Hola' },
};

async function buildApp(): Promise<INestApplication> {
  const module: TestingModule = await Test.createTestingModule({
    controllers: [BaileysIngressController],
    providers: [
      { provide: BaileysIngressService, useValue: mockService },
      { provide: ConfigService, useValue: { get: () => INTERNAL_TOKEN } },
    ],
  }).compile();

  const app = module.createNestApplication();
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );
  await app.init();
  return app;
}

describe('BaileysIngressController', () => {
  let app: INestApplication;

  beforeAll(() => {
    process.env.BAILEYS_INTERNAL_TOKEN = INTERNAL_TOKEN;
  });

  afterAll(() => {
    delete process.env.BAILEYS_INTERNAL_TOKEN;
  });

  beforeEach(async () => {
    jest.clearAllMocks();
    app = await buildApp();
  });
  afterEach(() => app?.close());

  // --- POST /internal/baileys/events ---

  describe('POST /internal/baileys/events', () => {
    it('devuelve 201 con body válido y token correcto', async () => {
      mockService.ingestEnvelope.mockResolvedValue({ ok: true });
      const res = await request(app.getHttpServer())
        .post('/internal/baileys/events')
        .set('x-internal-token', INTERNAL_TOKEN)
        .send(validBody)
        .expect(201);
      expect(res.body).toHaveProperty('ok', true);
      expect(mockService.ingestEnvelope).toHaveBeenCalledTimes(1);
    });

    it('devuelve 403 cuando el token es incorrecto', async () => {
      await request(app.getHttpServer())
        .post('/internal/baileys/events')
        .set('x-internal-token', 'token-equivocado')
        .send(validBody)
        .expect(403);
    });

    it('devuelve 403 cuando no hay token', async () => {
      await request(app.getHttpServer())
        .post('/internal/baileys/events')
        .send(validBody)
        .expect(403);
    });

    it('devuelve 400 cuando falta externalEventId', async () => {
      const { externalEventId: _, ...noId } = validBody;
      await request(app.getHttpServer())
        .post('/internal/baileys/events')
        .set('x-internal-token', INTERNAL_TOKEN)
        .send(noId)
        .expect(400);
    });

    it('devuelve 400 cuando provider tiene valor inválido', async () => {
      await request(app.getHttpServer())
        .post('/internal/baileys/events')
        .set('x-internal-token', INTERNAL_TOKEN)
        .send({ ...validBody, provider: 'WHATSAPP_CLOUD' })
        .expect(400);
    });

    it('devuelve 400 cuando eventType tiene valor inválido', async () => {
      await request(app.getHttpServer())
        .post('/internal/baileys/events')
        .set('x-internal-token', INTERNAL_TOKEN)
        .send({ ...validBody, eventType: 'messaging.unknown' })
        .expect(400);
    });

    it('devuelve 400 cuando falta payload', async () => {
      const { payload: _, ...noPayload } = validBody;
      await request(app.getHttpServer())
        .post('/internal/baileys/events')
        .set('x-internal-token', INTERNAL_TOKEN)
        .send(noPayload)
        .expect(400);
    });
  });
});
