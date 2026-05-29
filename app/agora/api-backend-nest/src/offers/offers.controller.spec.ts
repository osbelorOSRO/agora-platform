import { Test, TestingModule } from '@nestjs/testing';
import {
  INestApplication,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import request from 'supertest';
import { OffersController } from './offers.controller';
import { OffersService } from './offers.service';
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
    controllers: [OffersController],
    providers: [
      RequirePermissionGuard,
      Reflector,
      { provide: OffersService, useValue: mockService },
    ],
  })
    .overrideGuard(PanelJwtAuthGuard)
    .useValue(authGuard)
    .compile();

  const app = module.createNestApplication();
  await app.init();
  return app;
}

describe('OffersController', () => {
  let app: INestApplication;

  beforeEach(() => jest.clearAllMocks());
  afterEach(() => app?.close());

  // --- GET /offers ---

  describe('GET /offers', () => {
    it('returns 200 with all offers', async () => {
      app = await buildApp(superadminGuard);
      mockService.findAll.mockResolvedValue([{ codigo: 'PLN-50' }]);
      const res = await request(app.getHttpServer()).get('/offers').expect(200);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('returns 401 when token is absent', async () => {
      app = await buildApp({
        canActivate: () => {
          throw new UnauthorizedException();
        },
      });
      await request(app.getHttpServer()).get('/offers').expect(401);
    });
  });

  // --- GET /offers/:codigo ---

  describe('GET /offers/:codigo', () => {
    it('returns 200 with the offer', async () => {
      app = await buildApp(superadminGuard);
      mockService.findOne.mockResolvedValue({
        codigo: 'PLN-50',
        nombre: 'Plan 50GB',
      });
      const res = await request(app.getHttpServer())
        .get('/offers/PLN-50')
        .expect(200);
      expect(res.body.data).toHaveProperty('codigo', 'PLN-50');
      expect(mockService.findOne).toHaveBeenCalledWith('PLN-50');
    });

    it('returns 404 when offer does not exist', async () => {
      app = await buildApp(superadminGuard);
      mockService.findOne.mockRejectedValue(new NotFoundException());
      await request(app.getHttpServer()).get('/offers/INEXISTENTE').expect(404);
    });
  });

  // --- POST /offers ---

  describe('POST /offers', () => {
    const validBody = {
      codigo: 'PLN-100',
      nombre: 'Plan 100GB',
      tipo: 'individual',
    };

    it('returns 201 on successful creation', async () => {
      app = await buildApp(superadminGuard);
      mockService.create.mockResolvedValue({ ...validBody, id: 1 });
      const res = await request(app.getHttpServer())
        .post('/offers')
        .send(validBody)
        .expect(201);
      expect(res.body.data).toHaveProperty('codigo', 'PLN-100');
    });

    it('returns 400 when codigo is missing', async () => {
      app = await buildApp(superadminGuard);
      await request(app.getHttpServer())
        .post('/offers')
        .send({ nombre: 'Plan X' })
        .expect(400);
    });

    it('returns 400 when tipo has invalid value', async () => {
      app = await buildApp(superadminGuard);
      await request(app.getHttpServer())
        .post('/offers')
        .send({ ...validBody, tipo: 'invalido' })
        .expect(400);
    });

    it('returns 401 when token is absent', async () => {
      app = await buildApp({
        canActivate: () => {
          throw new UnauthorizedException();
        },
      });
      await request(app.getHttpServer())
        .post('/offers')
        .send(validBody)
        .expect(401);
    });
  });

  // --- PATCH /offers/:codigo ---

  describe('PATCH /offers/:codigo', () => {
    it('returns 200 on partial update', async () => {
      app = await buildApp(superadminGuard);
      mockService.update.mockResolvedValue({
        codigo: 'PLN-50',
        nombre: 'Plan 50GB v2',
      });
      const res = await request(app.getHttpServer())
        .patch('/offers/PLN-50')
        .send({ nombre: 'Plan 50GB v2' })
        .expect(200);
      expect(res.body.data).toHaveProperty('nombre', 'Plan 50GB v2');
      expect(mockService.update).toHaveBeenCalledWith('PLN-50', {
        nombre: 'Plan 50GB v2',
      });
    });

    it('returns 400 when body has invalid field value', async () => {
      app = await buildApp(superadminGuard);
      await request(app.getHttpServer())
        .patch('/offers/PLN-50')
        .send({ tipo: 'invalido' })
        .expect(400);
    });
  });

  // --- DELETE /offers/:codigo ---

  describe('DELETE /offers/:codigo', () => {
    it('returns 200 on successful delete', async () => {
      app = await buildApp(superadminGuard);
      mockService.remove.mockResolvedValue({ message: 'eliminado' });
      await request(app.getHttpServer()).delete('/offers/PLN-50').expect(200);
      expect(mockService.remove).toHaveBeenCalledWith('PLN-50');
    });

    it('returns 404 when offer does not exist', async () => {
      app = await buildApp(superadminGuard);
      mockService.remove.mockRejectedValue(new NotFoundException());
      await request(app.getHttpServer())
        .delete('/offers/INEXISTENTE')
        .expect(404);
    });

    it('returns 401 when token is absent', async () => {
      app = await buildApp({
        canActivate: () => {
          throw new UnauthorizedException();
        },
      });
      await request(app.getHttpServer()).delete('/offers/PLN-50').expect(401);
    });
  });
});
