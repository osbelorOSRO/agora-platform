import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { Reflector } from '@nestjs/core';
import { FcaConfigController } from './fca-config.controller';
import { FcaConfigService } from './fca-config.service';
import { PanelJwtAuthGuard } from '../auth/panel-jwt-auth.guard';
import { RequirePermissionGuard } from '../accesos/guards/require-permission.guard';

const guardWithPermisos = (permisos: string[]) => ({
  canActivate: (ctx: any) => {
    ctx.switchToHttp().getRequest().userPayload = {
      id: 1,
      rol: 'superadmin',
      permisos,
    };
    return true;
  },
});

const okGuard = guardWithPermisos(['gestion_integraciones']);
const sinPermisoGuard = guardWithPermisos([]);

const mockService = {
  get: jest.fn(),
  reveal: jest.fn(),
  getMqttStatus: jest.fn(),
  upsert: jest.fn(),
};

async function buildApp(authGuard: object): Promise<INestApplication> {
  const module: TestingModule = await Test.createTestingModule({
    controllers: [FcaConfigController],
    providers: [
      RequirePermissionGuard,
      Reflector,
      { provide: FcaConfigService, useValue: mockService },
    ],
  })
    .overrideGuard(PanelJwtAuthGuard)
    .useValue(authGuard)
    .compile();

  const app = module.createNestApplication();
  await app.init();
  return app;
}

describe('FcaConfigController', () => {
  let app: INestApplication;
  beforeEach(() => jest.clearAllMocks());
  afterEach(() => app?.close());

  describe('GET /fca-config', () => {
    it('devuelve 200 con la config (envelope)', async () => {
      app = await buildApp(okGuard);
      mockService.get.mockResolvedValue({ enabled: 'true' });
      const res = await request(app.getHttpServer())
        .get('/fca-config')
        .expect(200);
      expect(res.body.data).toEqual({ enabled: 'true' });
    });

    it('devuelve 403 sin permiso gestion_integraciones', async () => {
      app = await buildApp(sinPermisoGuard);
      await request(app.getHttpServer()).get('/fca-config').expect(403);
      expect(mockService.get).not.toHaveBeenCalled();
    });
  });

  describe('GET /fca-config/reveal/:field', () => {
    it('devuelve 200 con { value } del secreto revelado', async () => {
      app = await buildApp(okGuard);
      mockService.reveal.mockResolvedValue('valor-secreto');
      const res = await request(app.getHttpServer())
        .get('/fca-config/reveal/app_state')
        .expect(200);
      expect(res.body.data).toEqual({ value: 'valor-secreto' });
      expect(mockService.reveal).toHaveBeenCalledWith('app_state');
    });
  });

  describe('GET /fca-config/mqtt-status', () => {
    it('devuelve 200 con fallback cuando no hay estado', async () => {
      app = await buildApp(okGuard);
      mockService.getMqttStatus.mockReturnValue(null);
      const res = await request(app.getHttpServer())
        .get('/fca-config/mqtt-status')
        .expect(200);
      expect(res.body.data).toEqual({ mqtt_connected: null });
    });
  });

  describe('PATCH /fca-config', () => {
    it('devuelve 200 y hace upsert con el DTO', async () => {
      app = await buildApp(okGuard);
      mockService.upsert.mockResolvedValue({ enabled: 'false' });
      const res = await request(app.getHttpServer())
        .patch('/fca-config')
        .send({ enabled: 'false' })
        .expect(200);
      expect(res.body.data).toEqual({ enabled: 'false' });
      expect(mockService.upsert).toHaveBeenCalledWith({ enabled: 'false' });
    });

    it('devuelve 400 ante propiedad no permitida (forbidNonWhitelisted)', async () => {
      app = await buildApp(okGuard);
      await request(app.getHttpServer())
        .patch('/fca-config')
        .send({ campoExtra: 'x' })
        .expect(400);
      expect(mockService.upsert).not.toHaveBeenCalled();
    });
  });
});
