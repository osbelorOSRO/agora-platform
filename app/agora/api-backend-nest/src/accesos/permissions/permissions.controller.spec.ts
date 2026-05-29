import { Test, TestingModule } from '@nestjs/testing';
import {
  INestApplication,
  UnauthorizedException,
  ValidationPipe,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import request from 'supertest';
import { PermissionsController } from './permissions.controller';
import { PermissionsService } from './permissions.service';
import { PanelJwtAuthGuard } from '../../auth/panel-jwt-auth.guard';
import { RequirePermissionGuard } from '../guards/require-permission.guard';

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

const mockService = { obtenerPermisos: jest.fn() };

async function buildApp(authGuard: object): Promise<INestApplication> {
  const module: TestingModule = await Test.createTestingModule({
    controllers: [PermissionsController],
    providers: [
      { provide: PermissionsService, useValue: mockService },
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

describe('PermissionsController', () => {
  let app: INestApplication;

  beforeEach(() => jest.clearAllMocks());
  afterEach(() => app?.close());

  describe('GET /api/permisos', () => {
    it('returns 200 with permissions list', async () => {
      app = await buildApp(makeAuthGuard(WITH_PERM));
      mockService.obtenerPermisos.mockResolvedValue([
        { id: 1, nombre: 'ver_reportes' },
      ]);
      const res = await request(app.getHttpServer())
        .get('/api/permisos')
        .expect(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(mockService.obtenerPermisos).toHaveBeenCalledTimes(1);
    });

    it('returns 403 when permission editar_configuracion is missing', async () => {
      app = await buildApp(makeAuthGuard(WITHOUT_PERM));
      await request(app.getHttpServer()).get('/api/permisos').expect(403);
    });

    it('returns 401 when token is absent', async () => {
      app = await buildApp({
        canActivate: () => {
          throw new UnauthorizedException();
        },
      });
      await request(app.getHttpServer()).get('/api/permisos').expect(401);
    });
  });
});
