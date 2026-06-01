import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { ConfigService } from '@nestjs/config';
import { FcaIngressController } from './fca-ingress.controller';
import { FcaIngressService } from './fca-ingress.service';

const INTERNAL_TOKEN = 'test-fca-internal-token';

const mockService = {
  ingestEnvelope: jest.fn(),
};

const validBody = {
  externalEventId: 'fca-evt-abc-123',
  actorExternalId: 'fb-actor-xyz',
  provider: 'FCA',
  objectType: 'FACEBOOK',
  pipeline: 'MESSAGES',
  eventType: 'messaging.message',
  occurredAt: '2024-01-15T10:00:00.000Z',
  payload: { from: '100000000000001', text: 'Hola' },
};

async function buildApp(): Promise<INestApplication> {
  const module: TestingModule = await Test.createTestingModule({
    controllers: [FcaIngressController],
    providers: [
      { provide: FcaIngressService, useValue: mockService },
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

describe('FcaIngressController', () => {
  let app: INestApplication;

  beforeAll(() => {
    process.env.FCA_INTERNAL_TOKEN = INTERNAL_TOKEN;
  });

  afterAll(() => {
    delete process.env.FCA_INTERNAL_TOKEN;
  });

  beforeEach(async () => {
    jest.clearAllMocks();
    app = await buildApp();
  });
  afterEach(() => app?.close());

  // --- POST /internal/fca/events ---

  describe('POST /internal/fca/events', () => {
    it('devuelve 201 con body válido y token correcto', async () => {
      mockService.ingestEnvelope.mockResolvedValue({ ok: true });
      const res = await request(app.getHttpServer())
        .post('/internal/fca/events')
        .set('x-internal-token', INTERNAL_TOKEN)
        .send(validBody)
        .expect(201);
      expect(res.body).toHaveProperty('ok', true);
      expect(mockService.ingestEnvelope).toHaveBeenCalledTimes(1);
      expect(mockService.ingestEnvelope).toHaveBeenCalledWith(
        expect.objectContaining({ externalEventId: 'fca-evt-abc-123' }),
      );
    });

    it('devuelve 403 cuando el token es incorrecto', async () => {
      await request(app.getHttpServer())
        .post('/internal/fca/events')
        .set('x-internal-token', 'token-equivocado')
        .send(validBody)
        .expect(403);
      expect(mockService.ingestEnvelope).not.toHaveBeenCalled();
    });

    it('devuelve 403 cuando no hay token', async () => {
      await request(app.getHttpServer())
        .post('/internal/fca/events')
        .send(validBody)
        .expect(403);
      expect(mockService.ingestEnvelope).not.toHaveBeenCalled();
    });

    it('devuelve 400 cuando falta externalEventId', async () => {
      const { externalEventId: _omit, ...noId } = validBody;
      await request(app.getHttpServer())
        .post('/internal/fca/events')
        .set('x-internal-token', INTERNAL_TOKEN)
        .send(noId)
        .expect(400);
      expect(mockService.ingestEnvelope).not.toHaveBeenCalled();
    });

    it('devuelve 400 cuando provider tiene valor inválido', async () => {
      await request(app.getHttpServer())
        .post('/internal/fca/events')
        .set('x-internal-token', INTERNAL_TOKEN)
        .send({ ...validBody, provider: 'WHATSAPP' })
        .expect(400);
    });

    it('devuelve 400 cuando eventType tiene valor inválido', async () => {
      await request(app.getHttpServer())
        .post('/internal/fca/events')
        .set('x-internal-token', INTERNAL_TOKEN)
        .send({ ...validBody, eventType: 'messaging.unknown' })
        .expect(400);
    });

    it('devuelve 400 cuando objectType no es FACEBOOK', async () => {
      await request(app.getHttpServer())
        .post('/internal/fca/events')
        .set('x-internal-token', INTERNAL_TOKEN)
        .send({ ...validBody, objectType: 'INSTAGRAM' })
        .expect(400);
    });

    it('devuelve 400 cuando falta payload', async () => {
      const { payload: _omit, ...noPayload } = validBody;
      await request(app.getHttpServer())
        .post('/internal/fca/events')
        .set('x-internal-token', INTERNAL_TOKEN)
        .send(noPayload)
        .expect(400);
    });

    it('rechaza propiedades no permitidas (forbidNonWhitelisted)', async () => {
      await request(app.getHttpServer())
        .post('/internal/fca/events')
        .set('x-internal-token', INTERNAL_TOKEN)
        .send({ ...validBody, campoExtra: 'no-permitido' })
        .expect(400);
    });
  });
});
