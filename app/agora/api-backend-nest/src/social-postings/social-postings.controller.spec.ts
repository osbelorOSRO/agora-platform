import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { Reflector } from '@nestjs/core';
import { SocialPostingsController } from './social-postings.controller';
import { SocialPostingsService } from './social-postings.service';
import { PanelJwtAuthGuard } from '../auth/panel-jwt-auth.guard';
import { RequirePermissionGuard } from '../accesos/guards/require-permission.guard';

const guardWithPermisos = (permisos: string[]) => ({
  canActivate: (ctx: any) => {
    ctx.switchToHttp().getRequest().userPayload = {
      id: 12,
      rol: 'superadmin',
      permisos,
    };
    return true;
  },
});

const okGuard = guardWithPermisos(['gestion_integraciones']);
const sinPermisoGuard = guardWithPermisos(['ver_reportes']);

const mockService = {
  getCalendario: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  remove: jest.fn(),
};

async function buildApp(authGuard: object): Promise<INestApplication> {
  const module: TestingModule = await Test.createTestingModule({
    controllers: [SocialPostingsController],
    providers: [
      RequirePermissionGuard,
      Reflector,
      { provide: SocialPostingsService, useValue: mockService },
    ],
  })
    .overrideGuard(PanelJwtAuthGuard)
    .useValue(authGuard)
    .compile();

  const app = module.createNestApplication();
  await app.init();
  return app;
}

describe('SocialPostingsController', () => {
  let app: INestApplication;
  beforeEach(() => jest.clearAllMocks());
  afterEach(() => app?.close());

  describe('GET /social-postings/calendario', () => {
    it('devuelve 200 y delega el mes recibido', async () => {
      app = await buildApp(okGuard);
      mockService.getCalendario.mockResolvedValue([]);
      const res = await request(app.getHttpServer())
        .get('/social-postings/calendario?mes=2024-01')
        .expect(200);
      expect(res.body.data).toEqual([]);
      expect(mockService.getCalendario).toHaveBeenCalledWith('2024-01');
    });

    it('devuelve 403 cuando falta el permiso gestion_integraciones', async () => {
      app = await buildApp(sinPermisoGuard);
      await request(app.getHttpServer())
        .get('/social-postings/calendario?mes=2024-01')
        .expect(403);
      expect(mockService.getCalendario).not.toHaveBeenCalled();
    });
  });

  describe('POST /social-postings', () => {
    it('devuelve 201 con DTO válido', async () => {
      app = await buildApp(okGuard);
      mockService.create.mockResolvedValue({ id: 1 });
      const res = await request(app.getHttpServer())
        .post('/social-postings')
        .send({ fecha: '2024-01-15', caption: 'Hola' })
        .expect(201);
      expect(res.body.data).toEqual({ id: 1 });
      expect(mockService.create).toHaveBeenCalledTimes(1);
    });

    it('devuelve 400 cuando falta fecha (requerida)', async () => {
      app = await buildApp(okGuard);
      await request(app.getHttpServer())
        .post('/social-postings')
        .send({ caption: 'sin fecha' })
        .expect(400);
      expect(mockService.create).not.toHaveBeenCalled();
    });

    it('devuelve 400 cuando fecha no es fecha ISO', async () => {
      app = await buildApp(okGuard);
      await request(app.getHttpServer())
        .post('/social-postings')
        .send({ fecha: 'no-es-fecha' })
        .expect(400);
    });

    it('devuelve 400 ante propiedad no permitida (forbidNonWhitelisted)', async () => {
      app = await buildApp(okGuard);
      await request(app.getHttpServer())
        .post('/social-postings')
        .send({ fecha: '2024-01-15', campoExtra: 'x' })
        .expect(400);
    });
  });

  describe('PATCH/DELETE /social-postings/:id', () => {
    it('PATCH devuelve 200 con id numérico', async () => {
      app = await buildApp(okGuard);
      mockService.update.mockResolvedValue({ id: 3 });
      const res = await request(app.getHttpServer())
        .patch('/social-postings/3')
        .send({ caption: 'editado' })
        .expect(200);
      expect(res.body.data).toEqual({ id: 3 });
      expect(mockService.update).toHaveBeenCalledWith(3, {
        caption: 'editado',
      });
    });

    it('PATCH devuelve 400 con id no numérico', async () => {
      app = await buildApp(okGuard);
      await request(app.getHttpServer())
        .patch('/social-postings/abc')
        .send({ caption: 'x' })
        .expect(400);
      expect(mockService.update).not.toHaveBeenCalled();
    });

    it('DELETE devuelve 200 y delega', async () => {
      app = await buildApp(okGuard);
      mockService.remove.mockResolvedValue({ ok: true });
      const res = await request(app.getHttpServer())
        .delete('/social-postings/5')
        .expect(200);
      expect(res.body.data).toEqual({ ok: true });
      expect(mockService.remove).toHaveBeenCalledWith(5);
    });
  });
});
