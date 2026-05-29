import { Test, TestingModule } from '@nestjs/testing';
import {
  INestApplication,
  UnauthorizedException,
  ValidationPipe,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import request from 'supertest';
import { MetaInboxN8nController } from './meta-inbox-n8n.controller';
import { MetaInboxService } from './meta-inbox.service';
import { N8nAuthGuard } from '../shared/guards/n8n-auth.guard';

const n8nGuard = { canActivate: () => true };

const unauthorizedGuard = {
  canActivate: () => {
    throw new UnauthorizedException('Token N8N ausente o inválido');
  },
};

const mockService = {
  getStageTemplatePaths: jest.fn(),
  resolveThreadByActor: jest.fn(),
  updateThreadControlForAutomation: jest.fn(),
  updateContactForAutomation: jest.fn(),
  sendThreadMessage: jest.fn(),
  createOfferEventForAutomation: jest.fn(),
  updateOfferEventForAutomation: jest.fn(),
  getOfferContextForAutomation: jest.fn(),
  getOfferEventById: jest.fn(),
  listOfferEvents: jest.fn(),
};

async function buildApp(guard: object): Promise<INestApplication> {
  const module: TestingModule = await Test.createTestingModule({
    controllers: [MetaInboxN8nController],
    providers: [
      { provide: MetaInboxService, useValue: mockService },
      {
        provide: ConfigService,
        useValue: { get: jest.fn().mockReturnValue('test-n8n-token') },
      },
    ],
  })
    .overrideGuard(N8nAuthGuard)
    .useValue(guard)
    .compile();

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

describe('MetaInboxN8nController', () => {
  let app: INestApplication;

  beforeEach(() => jest.clearAllMocks());
  afterEach(() => app?.close());

  // --- GET /meta-inbox/n8n/stage-templates/:stageActual ---

  describe('GET /meta-inbox/n8n/stage-templates/:stageActual', () => {
    it('returns 200 with stage templates', async () => {
      app = await buildApp(n8nGuard);
      mockService.getStageTemplatePaths.mockResolvedValue({
        stageActual: 'inicio',
        paths: [],
      });
      const res = await request(app.getHttpServer())
        .get('/meta-inbox/n8n/stage-templates/inicio')
        .expect(200);
      expect(res.body).toHaveProperty('stageActual', 'inicio');
      expect(mockService.getStageTemplatePaths).toHaveBeenCalledWith('inicio');
    });

    it('returns 401 without N8N token', async () => {
      app = await buildApp(unauthorizedGuard);
      await request(app.getHttpServer())
        .get('/meta-inbox/n8n/stage-templates/inicio')
        .expect(401);
    });
  });

  // --- POST /meta-inbox/n8n/resolve-thread ---

  describe('POST /meta-inbox/n8n/resolve-thread', () => {
    const validBody = {
      actorExternalId: '569@s.whatsapp.net',
      objectType: 'WHATSAPP',
    };

    it('returns 201 with thread data', async () => {
      app = await buildApp(n8nGuard);
      mockService.resolveThreadByActor.mockResolvedValue({
        sessionId: 'sess-1',
      });
      const res = await request(app.getHttpServer())
        .post('/meta-inbox/n8n/resolve-thread')
        .send(validBody)
        .expect(201);
      expect(res.body).toHaveProperty('sessionId');
      expect(mockService.resolveThreadByActor).toHaveBeenCalledWith(
        validBody.actorExternalId,
        validBody.objectType,
        false,
      );
    });

    it('forwards includeClosed=true when provided', async () => {
      app = await buildApp(n8nGuard);
      mockService.resolveThreadByActor.mockResolvedValue({
        sessionId: 'sess-1',
      });
      await request(app.getHttpServer())
        .post('/meta-inbox/n8n/resolve-thread')
        .send({ ...validBody, includeClosed: true })
        .expect(201);
      expect(mockService.resolveThreadByActor).toHaveBeenCalledWith(
        validBody.actorExternalId,
        validBody.objectType,
        true,
      );
    });

    it('returns 400 when actorExternalId is missing', async () => {
      app = await buildApp(n8nGuard);
      await request(app.getHttpServer())
        .post('/meta-inbox/n8n/resolve-thread')
        .send({ objectType: 'WHATSAPP' })
        .expect(400);
    });

    it('returns 401 without N8N token', async () => {
      app = await buildApp(unauthorizedGuard);
      await request(app.getHttpServer())
        .post('/meta-inbox/n8n/resolve-thread')
        .send(validBody)
        .expect(401);
    });
  });

  // --- POST /meta-inbox/n8n/send-thread-message ---

  describe('POST /meta-inbox/n8n/send-thread-message', () => {
    it('returns 201 and sets senderType N8N by default', async () => {
      app = await buildApp(n8nGuard);
      mockService.sendThreadMessage.mockResolvedValue({ id: 'msg-1' });
      await request(app.getHttpServer())
        .post('/meta-inbox/n8n/send-thread-message')
        .send({ sessionId: 'sess-1', text: 'Hola' })
        .expect(201);
      expect(mockService.sendThreadMessage).toHaveBeenCalledWith(
        expect.objectContaining({ senderType: 'N8N', text: 'Hola' }),
      );
    });

    it('returns 401 without N8N token', async () => {
      app = await buildApp(unauthorizedGuard);
      await request(app.getHttpServer())
        .post('/meta-inbox/n8n/send-thread-message')
        .send({ sessionId: 'sess-1', text: 'Hola' })
        .expect(401);
    });
  });

  // --- POST /meta-inbox/n8n/offer-events ---

  describe('POST /meta-inbox/n8n/offer-events', () => {
    const validOfferBody = {
      sessionId: 'sess-1',
      stageActual: 'oferta',
      tipo: 'alta',
      codigo: 'COD-001',
    };

    it('returns 201 on valid offer event creation', async () => {
      app = await buildApp(n8nGuard);
      mockService.createOfferEventForAutomation.mockResolvedValue({
        id: 'ev-1',
      });
      const res = await request(app.getHttpServer())
        .post('/meta-inbox/n8n/offer-events')
        .send(validOfferBody)
        .expect(201);
      expect(res.body).toHaveProperty('id');
    });

    it('returns 400 when required fields are missing', async () => {
      app = await buildApp(n8nGuard);
      await request(app.getHttpServer())
        .post('/meta-inbox/n8n/offer-events')
        .send({ sessionId: 'sess-1' })
        .expect(400);
    });

    it('returns 401 without N8N token', async () => {
      app = await buildApp(unauthorizedGuard);
      await request(app.getHttpServer())
        .post('/meta-inbox/n8n/offer-events')
        .send(validOfferBody)
        .expect(401);
    });
  });

  // --- GET /meta-inbox/n8n/offer-events ---

  describe('GET /meta-inbox/n8n/offer-events', () => {
    it('returns 200 with offer events list', async () => {
      app = await buildApp(n8nGuard);
      mockService.listOfferEvents.mockResolvedValue([{ id: 'ev-1' }]);
      const res = await request(app.getHttpServer())
        .get('/meta-inbox/n8n/offer-events')
        .expect(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it('returns 401 without N8N token', async () => {
      app = await buildApp(unauthorizedGuard);
      await request(app.getHttpServer())
        .get('/meta-inbox/n8n/offer-events')
        .expect(401);
    });
  });

  // --- GET /meta-inbox/n8n/offer-events/:id ---

  describe('GET /meta-inbox/n8n/offer-events/:id', () => {
    it('returns 200 with offer event', async () => {
      app = await buildApp(n8nGuard);
      mockService.getOfferEventById.mockResolvedValue({
        id: 'c3d4e5f6-a1b2-4901-a234-cdef01234567',
      });
      const res = await request(app.getHttpServer())
        .get(
          '/meta-inbox/n8n/offer-events/c3d4e5f6-a1b2-4901-a234-cdef01234567',
        )
        .expect(200);
      expect(res.body).toHaveProperty(
        'id',
        'c3d4e5f6-a1b2-4901-a234-cdef01234567',
      );
    });
  });
});
