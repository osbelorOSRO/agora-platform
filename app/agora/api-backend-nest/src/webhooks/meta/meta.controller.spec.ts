jest.mock('../../shared/runtime-secrets', () => ({
  getRuntimeSecret: jest.fn(),
}));

import { Test, TestingModule } from '@nestjs/testing';
import {
  INestApplication,
  UnauthorizedException,
  ValidationPipe,
} from '@nestjs/common';
import request from 'supertest';
import { MetaController } from './meta.controller';
import { MetaService } from './meta.service';
import { MetaWebhookHmacGuard } from './meta-webhook-hmac.guard';
import { getRuntimeSecret } from '../../shared/runtime-secrets';

const VERIFY_TOKEN = 'test-verify-token';

const mockService = {
  handleEvent: jest.fn(),
};

const passThroughGuard = { canActivate: () => true };
const rejectGuard = {
  canActivate: () => {
    throw new UnauthorizedException('Firma Meta inválida');
  },
};

async function buildApp(
  guard: object = passThroughGuard,
): Promise<INestApplication> {
  const module: TestingModule = await Test.createTestingModule({
    controllers: [MetaController],
    providers: [{ provide: MetaService, useValue: mockService }],
  })
    .overrideGuard(MetaWebhookHmacGuard)
    .useValue(guard)
    .compile();

  const app = module.createNestApplication({ rawBody: true });
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

describe('MetaController', () => {
  let app: INestApplication;

  beforeEach(async () => {
    jest.clearAllMocks();
    (getRuntimeSecret as jest.Mock).mockImplementation((key: string) => {
      if (key === 'META_VERIFY_TOKEN') return Promise.resolve(VERIFY_TOKEN);
      if (key === 'META_IG_VERIFY_TOKEN')
        return Promise.resolve('otro-verify-token');
      return Promise.resolve(undefined);
    });
    app = await buildApp();
  });
  afterEach(() => app?.close());

  // --- GET /webhooks/meta ---

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

  // --- POST /webhooks/meta ---

  describe('POST /webhooks/meta', () => {
    const webhookBody = {
      object: 'whatsapp_business_account',
      entry: [{ id: '123456', messaging: [] }],
    };

    it('devuelve 201 y delega al servicio cuando el guard aprueba', async () => {
      mockService.handleEvent.mockResolvedValue(undefined);
      const res = await request(app.getHttpServer())
        .post('/webhooks/meta')
        .set('content-type', 'application/json')
        .send(webhookBody)
        .expect(201);
      expect(res.text).toBe('EVENT_RECEIVED');
      await new Promise((r) => setTimeout(r, 10));
      expect(mockService.handleEvent).toHaveBeenCalledWith(
        expect.objectContaining({ object: 'whatsapp_business_account' }),
      );
    });

    it('devuelve 401 cuando el guard rechaza la firma', async () => {
      app.close();
      app = await buildApp(rejectGuard);
      await request(app.getHttpServer())
        .post('/webhooks/meta')
        .send(webhookBody)
        .expect(401);
    });
  });
});
