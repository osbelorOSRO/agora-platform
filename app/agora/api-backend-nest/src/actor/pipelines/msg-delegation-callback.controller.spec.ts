import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import request from 'supertest';
import { MsgDelegationCallbackController } from './msg-delegation-callback.controller';
import { MsgDelegationCompletionService } from './msg-delegation-completion.service';

const CALLBACK_TOKEN = 'test-callback-token';

const mockConfig = {
  get: jest.fn((key: string) => {
    if (key === 'N8N_CALLBACK_SECRET_TOKEN') return CALLBACK_TOKEN;
    if (key === 'N8N_SECRET_TOKEN') return null;
    return null;
  }),
};

const mockCompletion = {
  complete: jest.fn(),
  fail: jest.fn(),
};

async function buildApp(): Promise<INestApplication> {
  const module: TestingModule = await Test.createTestingModule({
    controllers: [MsgDelegationCallbackController],
    providers: [
      { provide: ConfigService, useValue: mockConfig },
      { provide: MsgDelegationCompletionService, useValue: mockCompletion },
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

describe('MsgDelegationCallbackController', () => {
  let app: INestApplication;

  beforeEach(async () => {
    jest.clearAllMocks();
    app = await buildApp();
  });
  afterEach(() => app?.close());

  // --- POST /actor/msg-delegation/complete ---

  describe('POST /actor/msg-delegation/complete', () => {
    const validBody = {
      externalEventId: 'evt-complete-001',
      actorExternalId: 'actor-abc',
    };

    it('devuelve 201 con ok:true y token correcto', async () => {
      mockCompletion.complete.mockResolvedValue({ status: 'closed' });
      const res = await request(app.getHttpServer())
        .post('/actor/msg-delegation/complete')
        .set('authorization', `Bearer ${CALLBACK_TOKEN}`)
        .send(validBody)
        .expect(201);
      expect(res.body).toHaveProperty('ok', true);
      expect(res.body).toHaveProperty('externalEventId', 'evt-complete-001');
      expect(mockCompletion.complete).toHaveBeenCalledTimes(1);
    });

    it('devuelve 201 con campos opcionales hasSignal y signalType', async () => {
      mockCompletion.complete.mockResolvedValue({
        status: 'closed_with_signal',
      });
      const res = await request(app.getHttpServer())
        .post('/actor/msg-delegation/complete')
        .set('authorization', `Bearer ${CALLBACK_TOKEN}`)
        .send({ ...validBody, hasSignal: true, signalType: 'CERRAR' })
        .expect(201);
      expect(res.body).toHaveProperty('ok', true);
    });

    it('devuelve 401 con token incorrecto', async () => {
      await request(app.getHttpServer())
        .post('/actor/msg-delegation/complete')
        .set('authorization', 'Bearer token-equivocado')
        .send(validBody)
        .expect(401);
    });

    it('devuelve 401 sin header de autorización', async () => {
      await request(app.getHttpServer())
        .post('/actor/msg-delegation/complete')
        .send(validBody)
        .expect(401);
    });

    it('devuelve 400 cuando falta externalEventId', async () => {
      await request(app.getHttpServer())
        .post('/actor/msg-delegation/complete')
        .set('authorization', `Bearer ${CALLBACK_TOKEN}`)
        .send({ actorExternalId: 'actor-abc' })
        .expect(400);
    });

    it('devuelve 400 cuando falta actorExternalId', async () => {
      await request(app.getHttpServer())
        .post('/actor/msg-delegation/complete')
        .set('authorization', `Bearer ${CALLBACK_TOKEN}`)
        .send({ externalEventId: 'evt-001' })
        .expect(400);
    });
  });

  // --- POST /actor/msg-delegation/failed ---

  describe('POST /actor/msg-delegation/failed', () => {
    const validBody = {
      externalEventId: 'evt-failed-001',
      actorExternalId: 'actor-abc',
    };

    it('devuelve 201 con ok:true y token correcto', async () => {
      mockCompletion.fail.mockResolvedValue({ status: 'failed' });
      const res = await request(app.getHttpServer())
        .post('/actor/msg-delegation/failed')
        .set('authorization', `Bearer ${CALLBACK_TOKEN}`)
        .send(validBody)
        .expect(201);
      expect(res.body).toHaveProperty('ok', true);
      expect(res.body).toHaveProperty('externalEventId', 'evt-failed-001');
      expect(mockCompletion.fail).toHaveBeenCalledTimes(1);
    });

    it('devuelve 201 con campo reason opcional', async () => {
      mockCompletion.fail.mockResolvedValue({ status: 'failed' });
      const res = await request(app.getHttpServer())
        .post('/actor/msg-delegation/failed')
        .set('authorization', `Bearer ${CALLBACK_TOKEN}`)
        .send({ ...validBody, reason: 'timeout en el bot' })
        .expect(201);
      expect(res.body).toHaveProperty('ok', true);
    });

    it('devuelve 401 con token incorrecto', async () => {
      await request(app.getHttpServer())
        .post('/actor/msg-delegation/failed')
        .set('authorization', 'Bearer token-equivocado')
        .send(validBody)
        .expect(401);
    });

    it('devuelve 400 cuando falta externalEventId', async () => {
      await request(app.getHttpServer())
        .post('/actor/msg-delegation/failed')
        .set('authorization', `Bearer ${CALLBACK_TOKEN}`)
        .send({ actorExternalId: 'actor-abc' })
        .expect(400);
    });
  });
});
