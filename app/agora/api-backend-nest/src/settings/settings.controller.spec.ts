import { Test, TestingModule } from '@nestjs/testing';
import {
  INestApplication,
  UnauthorizedException,
  ValidationPipe,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import request from 'supertest';
import { SettingsController } from './settings.controller';
import { SettingsService } from './settings.service';
import { PanelJwtAuthGuard } from '../auth/panel-jwt-auth.guard';
import { RequirePermissionGuard } from '../accesos/guards/require-permission.guard';

const WITH_PERM = {
  id: 12,
  username: 'obeltran',
  rol: 'superadmin',
  permisos: ['editar_configuracion'],
};
const WITHOUT_PERM = {
  id: 19,
  username: 'fmartinez',
  rol: 'agente',
  permisos: [],
};

const makeAuthGuard = (payload: object) => ({
  canActivate: (ctx: any) => {
    ctx.switchToHttp().getRequest().userPayload = payload;
    return true;
  },
});

const mockService = {
  listTransitionRules: jest.fn(),
  updateTransitionThreshold: jest.fn(),
  listSignalScoringRules: jest.fn(),
  updateSignalDelta: jest.fn(),
};

async function buildApp(authGuard: object): Promise<INestApplication> {
  const module: TestingModule = await Test.createTestingModule({
    controllers: [SettingsController],
    providers: [
      { provide: SettingsService, useValue: mockService },
      Reflector,
      RequirePermissionGuard,
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
    }),
  );
  await app.init();
  return app;
}

describe('SettingsController', () => {
  let app: INestApplication;

  beforeEach(() => jest.clearAllMocks());
  afterEach(() => app?.close());

  // --- GET /settings/transition-rules ---

  describe('GET /settings/transition-rules', () => {
    it('returns 200 with transition rules list', async () => {
      app = await buildApp(makeAuthGuard(WITH_PERM));
      mockService.listTransitionRules.mockResolvedValue([{ id: 'rule-1' }]);
      const res = await request(app.getHttpServer())
        .get('/settings/transition-rules')
        .expect(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it('returns 403 when permission is missing', async () => {
      app = await buildApp(makeAuthGuard(WITHOUT_PERM));
      await request(app.getHttpServer())
        .get('/settings/transition-rules')
        .expect(403);
    });

    it('returns 401 when token is absent', async () => {
      app = await buildApp({
        canActivate: () => {
          throw new UnauthorizedException();
        },
      });
      await request(app.getHttpServer())
        .get('/settings/transition-rules')
        .expect(401);
    });
  });

  // --- PATCH /settings/transition-rules/:id ---

  describe('PATCH /settings/transition-rules/:id', () => {
    it('returns 200 on valid threshold update', async () => {
      app = await buildApp(makeAuthGuard(WITH_PERM));
      mockService.updateTransitionThreshold.mockResolvedValue({
        id: 'rule-1',
        score_threshold: 75,
      });
      const res = await request(app.getHttpServer())
        .patch('/settings/transition-rules/rule-1')
        .send({ score_threshold: 75 })
        .expect(200);
      expect(res.body).toHaveProperty('score_threshold', 75);
      expect(mockService.updateTransitionThreshold).toHaveBeenCalledWith(
        'rule-1',
        75,
      );
    });

    it('returns 400 when score_threshold is missing', async () => {
      app = await buildApp(makeAuthGuard(WITH_PERM));
      await request(app.getHttpServer())
        .patch('/settings/transition-rules/rule-1')
        .send({})
        .expect(400);
    });

    it('returns 400 when score_threshold is not a number', async () => {
      app = await buildApp(makeAuthGuard(WITH_PERM));
      await request(app.getHttpServer())
        .patch('/settings/transition-rules/rule-1')
        .send({ score_threshold: 'alto' })
        .expect(400);
    });

    it('returns 403 when permission is missing', async () => {
      app = await buildApp(makeAuthGuard(WITHOUT_PERM));
      await request(app.getHttpServer())
        .patch('/settings/transition-rules/rule-1')
        .send({ score_threshold: 75 })
        .expect(403);
    });
  });

  // --- GET /settings/signal-scoring-rules ---

  describe('GET /settings/signal-scoring-rules', () => {
    it('returns 200 with scoring rules list', async () => {
      app = await buildApp(makeAuthGuard(WITH_PERM));
      mockService.listSignalScoringRules.mockResolvedValue([{ id: 'sig-1' }]);
      const res = await request(app.getHttpServer())
        .get('/settings/signal-scoring-rules')
        .expect(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it('returns 403 when permission is missing', async () => {
      app = await buildApp(makeAuthGuard(WITHOUT_PERM));
      await request(app.getHttpServer())
        .get('/settings/signal-scoring-rules')
        .expect(403);
    });
  });

  // --- PATCH /settings/signal-scoring-rules/:id ---

  describe('PATCH /settings/signal-scoring-rules/:id', () => {
    it('returns 200 on valid delta update', async () => {
      app = await buildApp(makeAuthGuard(WITH_PERM));
      mockService.updateSignalDelta.mockResolvedValue({
        id: 'sig-1',
        delta: 10,
      });
      const res = await request(app.getHttpServer())
        .patch('/settings/signal-scoring-rules/sig-1')
        .send({ delta: 10 })
        .expect(200);
      expect(res.body).toHaveProperty('delta', 10);
      expect(mockService.updateSignalDelta).toHaveBeenCalledWith('sig-1', 10);
    });

    it('returns 400 when delta is missing', async () => {
      app = await buildApp(makeAuthGuard(WITH_PERM));
      await request(app.getHttpServer())
        .patch('/settings/signal-scoring-rules/sig-1')
        .send({})
        .expect(400);
    });

    it('returns 400 when delta is not a number', async () => {
      app = await buildApp(makeAuthGuard(WITH_PERM));
      await request(app.getHttpServer())
        .patch('/settings/signal-scoring-rules/sig-1')
        .send({ delta: 'mucho' })
        .expect(400);
    });

    it('returns 403 when permission is missing', async () => {
      app = await buildApp(makeAuthGuard(WITHOUT_PERM));
      await request(app.getHttpServer())
        .patch('/settings/signal-scoring-rules/sig-1')
        .send({ delta: 10 })
        .expect(403);
    });
  });
});
