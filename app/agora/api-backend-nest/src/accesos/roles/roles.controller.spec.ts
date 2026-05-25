import { Test, TestingModule } from '@nestjs/testing';
import {
  INestApplication,
  NotFoundException,
  UnauthorizedException,
  ValidationPipe,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import request from 'supertest';
import { RolesController } from './roles.controller';
import { RolesService } from './roles.service';
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

const mockService = {
  obtenerRoles: jest.fn(),
  obtenerRolPorId: jest.fn(),
  crearRol: jest.fn(),
  actualizarRol: jest.fn(),
};

async function buildApp(authGuard: object): Promise<INestApplication> {
  const module: TestingModule = await Test.createTestingModule({
    controllers: [RolesController],
    providers: [
      { provide: RolesService, useValue: mockService },
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

describe('RolesController', () => {
  let app: INestApplication;

  beforeEach(() => jest.clearAllMocks());
  afterEach(() => app?.close());

  // --- GET /api/roles ---

  describe('GET /api/roles', () => {
    it('returns 200 with roles list', async () => {
      app = await buildApp(makeAuthGuard(WITH_PERM));
      mockService.obtenerRoles.mockResolvedValue([
        { id: 1, nombre: 'superadmin' },
      ]);
      const res = await request(app.getHttpServer())
        .get('/api/roles')
        .expect(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it('returns 403 when permission is missing', async () => {
      app = await buildApp(makeAuthGuard(WITHOUT_PERM));
      await request(app.getHttpServer()).get('/api/roles').expect(403);
    });

    it('returns 401 when token is absent', async () => {
      app = await buildApp({
        canActivate: () => {
          throw new UnauthorizedException();
        },
      });
      await request(app.getHttpServer()).get('/api/roles').expect(401);
    });
  });

  // --- GET /api/roles/:id ---

  describe('GET /api/roles/:id', () => {
    it('returns 200 with the role', async () => {
      app = await buildApp(makeAuthGuard(WITH_PERM));
      mockService.obtenerRolPorId.mockResolvedValue({
        id: 4,
        nombre: 'agente',
      });
      const res = await request(app.getHttpServer())
        .get('/api/roles/4')
        .expect(200);
      expect(res.body).toHaveProperty('id', 4);
      expect(mockService.obtenerRolPorId).toHaveBeenCalledWith(4);
    });

    it('returns 404 when role does not exist', async () => {
      app = await buildApp(makeAuthGuard(WITH_PERM));
      mockService.obtenerRolPorId.mockRejectedValue(
        new NotFoundException('Rol no encontrado'),
      );
      await request(app.getHttpServer()).get('/api/roles/999').expect(404);
    });

    it('returns 400 when id is not a number', async () => {
      app = await buildApp(makeAuthGuard(WITH_PERM));
      await request(app.getHttpServer()).get('/api/roles/abc').expect(400);
    });

    it('returns 403 when permission is missing', async () => {
      app = await buildApp(makeAuthGuard(WITHOUT_PERM));
      await request(app.getHttpServer()).get('/api/roles/1').expect(403);
    });
  });

  // --- POST /api/roles ---

  describe('POST /api/roles', () => {
    const validBody = { nombre: 'supervisor', permisos: [1, 2, 3] };

    it('returns 201 on successful creation', async () => {
      app = await buildApp(makeAuthGuard(WITH_PERM));
      mockService.crearRol.mockResolvedValue({ id: 5, nombre: 'supervisor' });
      const res = await request(app.getHttpServer())
        .post('/api/roles')
        .send(validBody)
        .expect(201);
      expect(res.body).toHaveProperty('nombre', 'supervisor');
      expect(mockService.crearRol).toHaveBeenCalledWith(
        'supervisor',
        [1, 2, 3],
        12,
      );
    });

    it('returns 400 when nombre is missing', async () => {
      app = await buildApp(makeAuthGuard(WITH_PERM));
      await request(app.getHttpServer())
        .post('/api/roles')
        .send({ permisos: [1] })
        .expect(400);
    });

    it('returns 400 when permisos is not an array of integers', async () => {
      app = await buildApp(makeAuthGuard(WITH_PERM));
      await request(app.getHttpServer())
        .post('/api/roles')
        .send({ nombre: 'test', permisos: ['a', 'b'] })
        .expect(400);
    });

    it('returns 403 when permission is missing', async () => {
      app = await buildApp(makeAuthGuard(WITHOUT_PERM));
      await request(app.getHttpServer())
        .post('/api/roles')
        .send(validBody)
        .expect(403);
    });
  });

  // --- PUT /api/roles/:id ---

  describe('PUT /api/roles/:id', () => {
    const validBody = { nombre: 'supervisor-v2', permisos: [1, 4] };

    it('returns 200 on successful update', async () => {
      app = await buildApp(makeAuthGuard(WITH_PERM));
      mockService.actualizarRol.mockResolvedValue({
        id: 5,
        nombre: 'supervisor-v2',
      });
      const res = await request(app.getHttpServer())
        .put('/api/roles/5')
        .send(validBody)
        .expect(200);
      expect(res.body).toHaveProperty('nombre', 'supervisor-v2');
      expect(mockService.actualizarRol).toHaveBeenCalledWith(
        5,
        'supervisor-v2',
        [1, 4],
        12,
      );
    });

    it('returns 400 when body is missing required fields', async () => {
      app = await buildApp(makeAuthGuard(WITH_PERM));
      await request(app.getHttpServer())
        .put('/api/roles/5')
        .send({})
        .expect(400);
    });

    it('returns 400 when id is not a number', async () => {
      app = await buildApp(makeAuthGuard(WITH_PERM));
      await request(app.getHttpServer())
        .put('/api/roles/abc')
        .send(validBody)
        .expect(400);
    });

    it('returns 403 when permission is missing', async () => {
      app = await buildApp(makeAuthGuard(WITHOUT_PERM));
      await request(app.getHttpServer())
        .put('/api/roles/5')
        .send(validBody)
        .expect(403);
    });
  });
});
