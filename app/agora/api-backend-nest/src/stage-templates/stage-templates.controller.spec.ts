import { Test, TestingModule } from '@nestjs/testing';
import {
  INestApplication,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import request from 'supertest';
import { StageTemplatesController } from './stage-templates.controller';
import { StageTemplatesService } from './stage-templates.service';
import { PanelJwtAuthGuard } from '../auth/panel-jwt-auth.guard';
import { RequirePermissionGuard } from '../accesos/guards/require-permission.guard';
import { Reflector } from '@nestjs/core';

const superadminGuard = {
  canActivate: (ctx: any) => {
    ctx.switchToHttp().getRequest().userPayload = {
      id: 12,
      rol: 'superadmin',
      permisos: ['gestion_integraciones'],
    };
    return true;
  },
};

const mockService = {
  findAll: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  remove: jest.fn(),
};

async function buildApp(authGuard: object): Promise<INestApplication> {
  const module: TestingModule = await Test.createTestingModule({
    controllers: [StageTemplatesController],
    providers: [
      RequirePermissionGuard,
      Reflector,
      { provide: StageTemplatesService, useValue: mockService },
    ],
  })
    .overrideGuard(PanelJwtAuthGuard)
    .useValue(authGuard)
    .compile();

  const app = module.createNestApplication();
  await app.init();
  return app;
}

describe('StageTemplatesController', () => {
  let app: INestApplication;

  beforeEach(() => jest.clearAllMocks());
  afterEach(() => app?.close());

  // --- GET /stage-templates ---

  describe('GET /stage-templates', () => {
    it('returns 200 with all templates', async () => {
      app = await buildApp(superadminGuard);
      mockService.findAll.mockResolvedValue([
        { id: 1, stage_actual: 'inicio' },
      ]);
      const res = await request(app.getHttpServer())
        .get('/stage-templates')
        .expect(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(mockService.findAll).toHaveBeenCalledWith(undefined);
    });

    it('passes stageActual query param to service', async () => {
      app = await buildApp(superadminGuard);
      mockService.findAll.mockResolvedValue([]);
      await request(app.getHttpServer())
        .get('/stage-templates?stageActual=inicio')
        .expect(200);
      expect(mockService.findAll).toHaveBeenCalledWith('inicio');
    });

    it('returns 401 when token is absent', async () => {
      app = await buildApp({
        canActivate: () => {
          throw new UnauthorizedException();
        },
      });
      await request(app.getHttpServer()).get('/stage-templates').expect(401);
    });
  });

  // --- GET /stage-templates/:id ---

  describe('GET /stage-templates/:id', () => {
    it('returns 200 with the template', async () => {
      app = await buildApp(superadminGuard);
      mockService.findOne.mockResolvedValue({ id: 1, stage_actual: 'inicio' });
      const res = await request(app.getHttpServer())
        .get('/stage-templates/1')
        .expect(200);
      expect(res.body.data).toHaveProperty('id', 1);
      expect(mockService.findOne).toHaveBeenCalledWith(1);
    });

    it('returns 404 when template does not exist', async () => {
      app = await buildApp(superadminGuard);
      mockService.findOne.mockRejectedValue(new NotFoundException());
      await request(app.getHttpServer())
        .get('/stage-templates/999')
        .expect(404);
    });

    it('returns 400 when id is not a number', async () => {
      app = await buildApp(superadminGuard);
      await request(app.getHttpServer())
        .get('/stage-templates/abc')
        .expect(400);
    });
  });

  // --- POST /stage-templates ---

  describe('POST /stage-templates', () => {
    const validBody = {
      stage_actual: 'inicio',
      posibles_match: 'hola|hi',
      nuevo_stage: 'menu',
      tipo_respuesta: 'texto',
    };

    it('returns 201 on valid creation', async () => {
      app = await buildApp(superadminGuard);
      mockService.create.mockResolvedValue({ id: 10, ...validBody });
      const res = await request(app.getHttpServer())
        .post('/stage-templates')
        .send(validBody)
        .expect(201);
      expect(res.body.data).toHaveProperty('id', 10);
    });

    it('returns 400 when stage_actual is missing', async () => {
      app = await buildApp(superadminGuard);
      await request(app.getHttpServer())
        .post('/stage-templates')
        .send({
          posibles_match: 'hola',
          nuevo_stage: 'menu',
          tipo_respuesta: 'texto',
        })
        .expect(400);
    });

    it('returns 400 when decision has invalid value', async () => {
      app = await buildApp(superadminGuard);
      await request(app.getHttpServer())
        .post('/stage-templates')
        .send({ ...validBody, decision: 'invalid_decision' })
        .expect(400);
    });

    it('returns 401 when token is absent', async () => {
      app = await buildApp({
        canActivate: () => {
          throw new UnauthorizedException();
        },
      });
      await request(app.getHttpServer())
        .post('/stage-templates')
        .send(validBody)
        .expect(401);
    });
  });

  // --- PATCH /stage-templates/:id ---

  describe('PATCH /stage-templates/:id', () => {
    it('returns 200 on partial update', async () => {
      app = await buildApp(superadminGuard);
      mockService.update.mockResolvedValue({
        id: 1,
        stage_actual: 'inicio-v2',
      });
      const res = await request(app.getHttpServer())
        .patch('/stage-templates/1')
        .send({ stage_actual: 'inicio-v2' })
        .expect(200);
      expect(res.body.data).toHaveProperty('stage_actual', 'inicio-v2');
      expect(mockService.update).toHaveBeenCalledWith(1, {
        stage_actual: 'inicio-v2',
      });
    });

    it('returns 400 when id is not a number', async () => {
      app = await buildApp(superadminGuard);
      await request(app.getHttpServer())
        .patch('/stage-templates/abc')
        .send({ activo: false })
        .expect(400);
    });
  });

  // --- DELETE /stage-templates/:id ---

  describe('DELETE /stage-templates/:id', () => {
    it('returns 200 on successful delete', async () => {
      app = await buildApp(superadminGuard);
      mockService.remove.mockResolvedValue({ message: 'eliminado' });
      await request(app.getHttpServer())
        .delete('/stage-templates/1')
        .expect(200);
      expect(mockService.remove).toHaveBeenCalledWith(1);
    });

    it('returns 404 when template does not exist', async () => {
      app = await buildApp(superadminGuard);
      mockService.remove.mockRejectedValue(new NotFoundException());
      await request(app.getHttpServer())
        .delete('/stage-templates/999')
        .expect(404);
    });

    it('returns 401 when token is absent', async () => {
      app = await buildApp({
        canActivate: () => {
          throw new UnauthorizedException();
        },
      });
      await request(app.getHttpServer())
        .delete('/stage-templates/1')
        .expect(401);
    });
  });
});
