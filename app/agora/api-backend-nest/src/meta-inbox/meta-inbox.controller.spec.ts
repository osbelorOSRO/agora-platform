import { Test, TestingModule } from '@nestjs/testing';
import {
  INestApplication,
  UnauthorizedException,
  ValidationPipe,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import request from 'supertest';
import { MetaInboxController } from './meta-inbox.controller';
import { MetaInboxService } from './meta-inbox.service';
import { PanelJwtAuthGuard } from '../auth/panel-jwt-auth.guard';

// Minimal valid 1x1 PNG buffer (passes fileFilter extension + header check)
const TINY_PNG = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49,
  0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x08, 0x02,
  0x00, 0x00, 0x00, 0x90, 0x77, 0x53, 0xde, 0x00, 0x00, 0x00, 0x0c, 0x49, 0x44,
  0x41, 0x54, 0x08, 0xd7, 0x63, 0xf8, 0xcf, 0xc0, 0x00, 0x00, 0x00, 0x02, 0x00,
  0x01, 0xe2, 0x21, 0xbc, 0x33, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44,
  0xae, 0x42, 0x60, 0x82,
]);

const panelGuard = {
  canActivate: (ctx: any) => {
    ctx.switchToHttp().getRequest().userPayload = {
      id: 12,
      rol: 'superadmin',
      permisos: [],
    };
    return true;
  },
};

const mockService = {
  listThreads: jest.fn(),
  listContacts: jest.fn(),
  createWhatsappContact: jest.fn(),
  ensureWhatsappThreadForContact: jest.fn(),
  resolveWhatsappIdentity: jest.fn(),
  updateWhatsappBlockStatus: jest.fn(),
  listWhatsappAdLeadStats: jest.fn(),
  listMessages: jest.fn(),
  getStageTemplatePaths: jest.fn(),
  sendText: jest.fn(),
  sendThreadMessage: jest.fn(),
  sendMedia: jest.fn(),
  updateContact: jest.fn(),
  updateThreadControl: jest.fn(),
  reopenThread: jest.fn(),
};

async function buildApp(authGuard: object): Promise<INestApplication> {
  const module: TestingModule = await Test.createTestingModule({
    controllers: [MetaInboxController],
    providers: [
      { provide: MetaInboxService, useValue: mockService },
      {
        provide: ConfigService,
        useValue: { get: jest.fn().mockReturnValue('test-n8n-token') },
      },
    ],
  })
    .overrideGuard(PanelJwtAuthGuard)
    .useValue(authGuard)
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

describe('MetaInboxController — panel endpoints', () => {
  let app: INestApplication;

  beforeEach(() => jest.clearAllMocks());
  afterEach(() => app?.close());

  // --- GET /meta-inbox/threads ---

  describe('GET /meta-inbox/threads', () => {
    it('returns 200 with threads list', async () => {
      app = await buildApp(panelGuard);
      mockService.listThreads.mockResolvedValue([{ sessionId: 'sess-1' }]);
      const res = await request(app.getHttpServer())
        .get('/meta-inbox/threads')
        .expect(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(mockService.listThreads).toHaveBeenCalledWith(
        expect.objectContaining({
          limit: 100,
          offset: 0,
          includeClosed: false,
        }),
      );
    });

    it('passes query params to service', async () => {
      app = await buildApp(panelGuard);
      mockService.listThreads.mockResolvedValue([]);
      await request(app.getHttpServer())
        .get('/meta-inbox/threads?limit=10&offset=20&includeClosed=true')
        .expect(200);
      expect(mockService.listThreads).toHaveBeenCalledWith(
        expect.objectContaining({ limit: 10, offset: 20, includeClosed: true }),
      );
    });

    it('returns 400 when limit is out of range', async () => {
      app = await buildApp(panelGuard);
      await request(app.getHttpServer())
        .get('/meta-inbox/threads?limit=500')
        .expect(400);
    });

    it('returns 401 when token is absent', async () => {
      app = await buildApp({
        canActivate: () => {
          throw new UnauthorizedException();
        },
      });
      await request(app.getHttpServer()).get('/meta-inbox/threads').expect(401);
    });
  });

  // --- GET /meta-inbox/contacts ---

  describe('GET /meta-inbox/contacts', () => {
    it('returns 200 with contacts list', async () => {
      app = await buildApp(panelGuard);
      mockService.listContacts.mockResolvedValue([
        { actorExternalId: 'actor-1' },
      ]);
      const res = await request(app.getHttpServer())
        .get('/meta-inbox/contacts')
        .expect(200);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('passes search query param', async () => {
      app = await buildApp(panelGuard);
      mockService.listContacts.mockResolvedValue([]);
      await request(app.getHttpServer())
        .get('/meta-inbox/contacts?search=juan&limit=20')
        .expect(200);
      expect(mockService.listContacts).toHaveBeenCalledWith(
        expect.objectContaining({ search: 'juan', limit: 20 }),
      );
    });

    it('returns 401 when token is absent', async () => {
      app = await buildApp({
        canActivate: () => {
          throw new UnauthorizedException();
        },
      });
      await request(app.getHttpServer())
        .get('/meta-inbox/contacts')
        .expect(401);
    });
  });

  // --- POST /meta-inbox/contacts/whatsapp ---

  describe('POST /meta-inbox/contacts/whatsapp', () => {
    const validBody = { phone: '+56911223344', displayName: 'Juan Test' };

    it('returns 201 on contact creation', async () => {
      app = await buildApp(panelGuard);
      mockService.createWhatsappContact.mockResolvedValue({
        actorExternalId: '56911223344',
      });
      const res = await request(app.getHttpServer())
        .post('/meta-inbox/contacts/whatsapp')
        .send(validBody)
        .expect(201);
      expect(res.body.data).toHaveProperty('actorExternalId');
    });

    it('returns 400 when phone is missing', async () => {
      app = await buildApp(panelGuard);
      await request(app.getHttpServer())
        .post('/meta-inbox/contacts/whatsapp')
        .send({ displayName: 'Juan' })
        .expect(400);
    });

    it('returns 401 when token is absent', async () => {
      app = await buildApp({
        canActivate: () => {
          throw new UnauthorizedException();
        },
      });
      await request(app.getHttpServer())
        .post('/meta-inbox/contacts/whatsapp')
        .send(validBody)
        .expect(401);
    });
  });

  // --- POST /meta-inbox/contacts/whatsapp/thread ---

  describe('POST /meta-inbox/contacts/whatsapp/thread', () => {
    it('returns 201 with thread data', async () => {
      app = await buildApp(panelGuard);
      mockService.ensureWhatsappThreadForContact.mockResolvedValue({
        sessionId: 'sess-new',
      });
      const res = await request(app.getHttpServer())
        .post('/meta-inbox/contacts/whatsapp/thread')
        .send({ actorExternalId: '56911223344@s.whatsapp.net' })
        .expect(201);
      expect(res.body.data).toHaveProperty('sessionId');
    });

    it('returns 400 when actorExternalId is missing', async () => {
      app = await buildApp(panelGuard);
      await request(app.getHttpServer())
        .post('/meta-inbox/contacts/whatsapp/thread')
        .send({})
        .expect(400);
    });
  });

  // --- POST /meta-inbox/whatsapp/identity/resolve ---

  describe('POST /meta-inbox/whatsapp/identity/resolve', () => {
    it('returns 201 with resolved identity', async () => {
      app = await buildApp(panelGuard);
      mockService.resolveWhatsappIdentity.mockResolvedValue({
        actorExternalId: '56911223344@s.whatsapp.net',
      });
      const res = await request(app.getHttpServer())
        .post('/meta-inbox/whatsapp/identity/resolve')
        .send({ phone: '+56911223344' })
        .expect(201);
      expect(res.body.data).toHaveProperty('actorExternalId');
    });

    it('returns 401 when token is absent', async () => {
      app = await buildApp({
        canActivate: () => {
          throw new UnauthorizedException();
        },
      });
      await request(app.getHttpServer())
        .post('/meta-inbox/whatsapp/identity/resolve')
        .send({ phone: '123' })
        .expect(401);
    });
  });

  // --- POST /meta-inbox/whatsapp/block-status ---

  describe('POST /meta-inbox/whatsapp/block-status', () => {
    it('returns 201 on valid block action', async () => {
      app = await buildApp(panelGuard);
      mockService.updateWhatsappBlockStatus.mockResolvedValue({ ok: true });
      await request(app.getHttpServer())
        .post('/meta-inbox/whatsapp/block-status')
        .send({ action: 'block', sessionId: 'sess-1' })
        .expect(201);
    });

    it('returns 400 when action has invalid value', async () => {
      app = await buildApp(panelGuard);
      await request(app.getHttpServer())
        .post('/meta-inbox/whatsapp/block-status')
        .send({ action: 'kick', sessionId: 'sess-1' })
        .expect(400);
    });

    it('returns 400 when action is missing', async () => {
      app = await buildApp(panelGuard);
      await request(app.getHttpServer())
        .post('/meta-inbox/whatsapp/block-status')
        .send({})
        .expect(400);
    });
  });

  // --- GET /meta-inbox/whatsapp/ad-leads/stats ---

  describe('GET /meta-inbox/whatsapp/ad-leads/stats', () => {
    it('returns 200 with stats list', async () => {
      app = await buildApp(panelGuard);
      mockService.listWhatsappAdLeadStats.mockResolvedValue([]);
      const res = await request(app.getHttpServer())
        .get('/meta-inbox/whatsapp/ad-leads/stats')
        .expect(200);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('returns 400 when limit exceeds max', async () => {
      app = await buildApp(panelGuard);
      await request(app.getHttpServer())
        .get('/meta-inbox/whatsapp/ad-leads/stats?limit=2000')
        .expect(400);
    });
  });

  // --- GET /meta-inbox/threads/:sessionId/messages ---

  describe('GET /meta-inbox/threads/:sessionId/messages', () => {
    it('returns 200 with messages list', async () => {
      app = await buildApp(panelGuard);
      mockService.listMessages.mockResolvedValue([{ id: 'msg-1' }]);
      const res = await request(app.getHttpServer())
        .get('/meta-inbox/threads/sess-abc/messages')
        .expect(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(mockService.listMessages).toHaveBeenCalledWith('sess-abc', false);
    });

    it('passes includeSystem=true when requested', async () => {
      app = await buildApp(panelGuard);
      mockService.listMessages.mockResolvedValue([]);
      await request(app.getHttpServer())
        .get('/meta-inbox/threads/sess-abc/messages?includeSystem=true')
        .expect(200);
      expect(mockService.listMessages).toHaveBeenCalledWith('sess-abc', true);
    });
  });

  // --- GET /meta-inbox/stage-templates/:stageActual ---

  describe('GET /meta-inbox/stage-templates/:stageActual', () => {
    it('returns 200 with stage template paths', async () => {
      app = await buildApp(panelGuard);
      mockService.getStageTemplatePaths.mockResolvedValue({
        stageActual: 'inicio',
        paths: [],
      });
      const res = await request(app.getHttpServer())
        .get('/meta-inbox/stage-templates/inicio')
        .expect(200);
      expect(res.body.data).toHaveProperty('stageActual', 'inicio');
      expect(mockService.getStageTemplatePaths).toHaveBeenCalledWith('inicio');
    });
  });

  // --- POST /meta-inbox/threads/:sessionId/send-text ---

  describe('POST /meta-inbox/threads/:sessionId/send-text', () => {
    it('returns 201 on valid text send', async () => {
      app = await buildApp(panelGuard);
      mockService.sendText.mockResolvedValue({ messageId: 'mid-1' });
      const res = await request(app.getHttpServer())
        .post('/meta-inbox/threads/sess-abc/send-text')
        .send({ text: 'Hola!' })
        .expect(201);
      expect(res.body.data).toHaveProperty('messageId');
      expect(mockService.sendText).toHaveBeenCalledWith('sess-abc', 'Hola!');
    });

    it('returns 400 when text is missing', async () => {
      app = await buildApp(panelGuard);
      await request(app.getHttpServer())
        .post('/meta-inbox/threads/sess-abc/send-text')
        .send({})
        .expect(400);
    });

    it('returns 400 when text is empty string', async () => {
      app = await buildApp(panelGuard);
      await request(app.getHttpServer())
        .post('/meta-inbox/threads/sess-abc/send-text')
        .send({ text: '' })
        .expect(400);
    });

    it('returns 401 when token is absent', async () => {
      app = await buildApp({
        canActivate: () => {
          throw new UnauthorizedException();
        },
      });
      await request(app.getHttpServer())
        .post('/meta-inbox/threads/sess-abc/send-text')
        .send({ text: 'Hola' })
        .expect(401);
    });
  });

  // --- POST /meta-inbox/threads/:sessionId/send-message ---

  describe('POST /meta-inbox/threads/:sessionId/send-message', () => {
    it('returns 201 with text message', async () => {
      app = await buildApp(panelGuard);
      mockService.sendThreadMessage.mockResolvedValue({ id: 'msg-2' });
      await request(app.getHttpServer())
        .post('/meta-inbox/threads/sess-abc/send-message')
        .send({ sessionId: 'sess-abc', text: 'Hola desde panel' })
        .expect(201);
      expect(mockService.sendThreadMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          text: 'Hola desde panel',
          senderType: 'HUMAN',
        }),
      );
    });

    it('returns 400 when senderType has invalid value', async () => {
      app = await buildApp(panelGuard);
      await request(app.getHttpServer())
        .post('/meta-inbox/threads/sess-abc/send-message')
        .send({ sessionId: 'sess-abc', text: 'Hola', senderType: 'ROBOT' })
        .expect(400);
    });
  });

  // --- POST /meta-inbox/threads/:sessionId/send-media ---

  describe('POST /meta-inbox/threads/:sessionId/send-media', () => {
    it('returns 201 on valid PNG upload', async () => {
      app = await buildApp(panelGuard);
      mockService.sendMedia.mockResolvedValue({
        mediaUrl: 'https://cdn/img.png',
      });
      const res = await request(app.getHttpServer())
        .post('/meta-inbox/threads/sess-abc/send-media')
        .attach('file', TINY_PNG, {
          filename: 'photo.png',
          contentType: 'image/png',
        })
        .expect(201);
      expect(res.body.data).toHaveProperty('mediaUrl');
    });

    it('returns 400 when no file is sent', async () => {
      app = await buildApp(panelGuard);
      await request(app.getHttpServer())
        .post('/meta-inbox/threads/sess-abc/send-media')
        .send({})
        .expect(400);
    });
  });

  // --- PATCH /meta-inbox/threads/:sessionId/contact ---

  describe('PATCH /meta-inbox/threads/:sessionId/contact', () => {
    it('returns 200 on valid contact update', async () => {
      app = await buildApp(panelGuard);
      mockService.updateContact.mockResolvedValue({
        displayName: 'Juan Actualizado',
      });
      const res = await request(app.getHttpServer())
        .patch('/meta-inbox/threads/sess-abc/contact')
        .send({ displayName: 'Juan Actualizado', phone: '+56911223344' })
        .expect(200);
      expect(res.body.data).toHaveProperty('displayName');
    });

    it('returns 400 when unknown field is sent', async () => {
      app = await buildApp(panelGuard);
      await request(app.getHttpServer())
        .patch('/meta-inbox/threads/sess-abc/contact')
        .send({ campoDesconocido: 'valor' })
        .expect(400);
    });
  });

  // --- PATCH /meta-inbox/threads/:sessionId/control ---

  describe('PATCH /meta-inbox/threads/:sessionId/control', () => {
    it('returns 200 on valid thread control update', async () => {
      app = await buildApp(panelGuard);
      mockService.updateThreadControl.mockResolvedValue({
        threadStatus: 'PAUSED',
      });
      const res = await request(app.getHttpServer())
        .patch('/meta-inbox/threads/sess-abc/control')
        .send({ threadStatus: 'PAUSED', attentionMode: 'HUMAN' })
        .expect(200);
      expect(res.body.data).toHaveProperty('threadStatus');
    });

    it('returns 400 when threadStatus has invalid value', async () => {
      app = await buildApp(panelGuard);
      await request(app.getHttpServer())
        .patch('/meta-inbox/threads/sess-abc/control')
        .send({ threadStatus: 'BORRADO' })
        .expect(400);
    });

    it('returns 400 when attentionMode has invalid value', async () => {
      app = await buildApp(panelGuard);
      await request(app.getHttpServer())
        .patch('/meta-inbox/threads/sess-abc/control')
        .send({ attentionMode: 'BOT' })
        .expect(400);
    });

    it('returns 200 with valid stageControl object', async () => {
      app = await buildApp(panelGuard);
      mockService.updateThreadControl.mockResolvedValue({
        threadStage: 'oferta',
      });
      await request(app.getHttpServer())
        .patch('/meta-inbox/threads/sess-abc/control')
        .send({ threadStage: 'oferta', stageControl: { step: 1, data: 'x' } })
        .expect(200);
    });
  });

  // --- POST /meta-inbox/threads/:sessionId/reopen ---

  describe('POST /meta-inbox/threads/:sessionId/reopen', () => {
    it('returns 201 on successful reopen', async () => {
      app = await buildApp(panelGuard);
      mockService.reopenThread.mockResolvedValue({
        sessionId: 'sess-abc',
        threadStatus: 'OPEN',
      });
      const res = await request(app.getHttpServer())
        .post('/meta-inbox/threads/sess-abc/reopen')
        .expect(201);
      expect(res.body.data).toHaveProperty('threadStatus', 'OPEN');
      expect(mockService.reopenThread).toHaveBeenCalledWith('sess-abc');
    });

    it('returns 401 when token is absent', async () => {
      app = await buildApp({
        canActivate: () => {
          throw new UnauthorizedException();
        },
      });
      await request(app.getHttpServer())
        .post('/meta-inbox/threads/sess-abc/reopen')
        .expect(401);
    });
  });
});
