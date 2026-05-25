import { Test, TestingModule } from '@nestjs/testing';
import {
  INestApplication,
  UnauthorizedException,
  ValidationPipe,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import request from 'supertest';
import { SessionsController } from './sessions.controller';
import { SessionsService } from './sessions.service';
import { PanelJwtAuthGuard } from '../../auth/panel-jwt-auth.guard';
import { RequireRolesGuard } from '../guards/require-roles.guard';

const SUPERADMIN_PAYLOAD = {
  id: 12,
  username: 'obeltran',
  rol: 'superadmin',
  permisos: [],
};
const AGENTE_PAYLOAD = {
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

const unauthorizedGuard = {
  canActivate: () => {
    throw new UnauthorizedException('Token ausente');
  },
};

const mockService = {
  me: jest.fn(),
  registrarSesion: jest.fn(),
  sesionesActivas: jest.fn(),
  logout: jest.fn(),
  listarTodasSesionesActivas: jest.fn(),
  cerrarSesionAdmin: jest.fn(),
};

async function buildApp(authGuard: object): Promise<INestApplication> {
  const module: TestingModule = await Test.createTestingModule({
    controllers: [SessionsController],
    providers: [
      { provide: SessionsService, useValue: mockService },
      Reflector,
      RequireRolesGuard,
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

describe('SessionsController', () => {
  let app: INestApplication;

  beforeEach(() => jest.clearAllMocks());
  afterEach(() => app?.close());

  // --- GET /api/auth/me ---

  describe('GET /api/auth/me', () => {
    it('returns 200 with user profile', async () => {
      app = await buildApp(makeAuthGuard(SUPERADMIN_PAYLOAD));
      mockService.me.mockResolvedValue({ id: 12, username: 'obeltran' });
      const res = await request(app.getHttpServer())
        .get('/api/auth/me')
        .expect(200);
      expect(res.body).toHaveProperty('id', 12);
      expect(mockService.me).toHaveBeenCalledWith(12);
    });

    it('returns 401 when token is absent', async () => {
      app = await buildApp(unauthorizedGuard);
      await request(app.getHttpServer()).get('/api/auth/me').expect(401);
    });
  });

  // --- POST /api/auth/registrar-sesion ---

  describe('POST /api/auth/registrar-sesion', () => {
    it('returns 200 on session registration', async () => {
      app = await buildApp(makeAuthGuard(SUPERADMIN_PAYLOAD));
      mockService.registrarSesion.mockResolvedValue({ sessionId: 'sess-1' });
      const res = await request(app.getHttpServer())
        .post('/api/auth/registrar-sesion')
        .expect(200);
      expect(res.body).toHaveProperty('sessionId');
      expect(mockService.registrarSesion).toHaveBeenCalledWith(
        12,
        expect.any(String),
        expect.any(String),
      );
    });

    it('returns 401 when token is absent', async () => {
      app = await buildApp(unauthorizedGuard);
      await request(app.getHttpServer())
        .post('/api/auth/registrar-sesion')
        .expect(401);
    });
  });

  // --- GET /api/auth/sesiones-activas ---

  describe('GET /api/auth/sesiones-activas', () => {
    it('returns 200 with active sessions list', async () => {
      app = await buildApp(makeAuthGuard(SUPERADMIN_PAYLOAD));
      mockService.sesionesActivas.mockResolvedValue([{ id: 1 }]);
      const res = await request(app.getHttpServer())
        .get('/api/auth/sesiones-activas')
        .expect(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it('returns 401 when token is absent', async () => {
      app = await buildApp(unauthorizedGuard);
      await request(app.getHttpServer())
        .get('/api/auth/sesiones-activas')
        .expect(401);
    });
  });

  // --- DELETE /api/auth/logout ---

  describe('DELETE /api/auth/logout', () => {
    it('returns 200 on logout', async () => {
      app = await buildApp(makeAuthGuard(SUPERADMIN_PAYLOAD));
      mockService.logout.mockResolvedValue({ message: 'ok' });
      await request(app.getHttpServer()).delete('/api/auth/logout').expect(200);
      expect(mockService.logout).toHaveBeenCalledWith(12);
    });

    it('returns 401 when token is absent', async () => {
      app = await buildApp(unauthorizedGuard);
      await request(app.getHttpServer()).delete('/api/auth/logout').expect(401);
    });
  });

  // --- GET /api/auth/sesiones-activas-admin ---

  describe('GET /api/auth/sesiones-activas-admin', () => {
    it('returns 200 for superadmin', async () => {
      app = await buildApp(makeAuthGuard(SUPERADMIN_PAYLOAD));
      mockService.listarTodasSesionesActivas.mockResolvedValue([]);
      await request(app.getHttpServer())
        .get('/api/auth/sesiones-activas-admin')
        .expect(200);
    });

    it('returns 403 for agente rol', async () => {
      app = await buildApp(makeAuthGuard(AGENTE_PAYLOAD));
      await request(app.getHttpServer())
        .get('/api/auth/sesiones-activas-admin')
        .expect(403);
    });

    it('returns 401 when token is absent', async () => {
      app = await buildApp(unauthorizedGuard);
      await request(app.getHttpServer())
        .get('/api/auth/sesiones-activas-admin')
        .expect(401);
    });
  });

  // --- DELETE /api/auth/sesiones/:id ---

  describe('DELETE /api/auth/sesiones/:id', () => {
    it('returns 200 for superadmin closing a session', async () => {
      app = await buildApp(makeAuthGuard(SUPERADMIN_PAYLOAD));
      mockService.cerrarSesionAdmin.mockResolvedValue({ message: 'ok' });
      await request(app.getHttpServer())
        .delete('/api/auth/sesiones/5')
        .expect(200);
      expect(mockService.cerrarSesionAdmin).toHaveBeenCalledWith(5);
    });

    it('returns 403 for agente rol', async () => {
      app = await buildApp(makeAuthGuard(AGENTE_PAYLOAD));
      await request(app.getHttpServer())
        .delete('/api/auth/sesiones/5')
        .expect(403);
    });

    it('returns 400 when id is not a number', async () => {
      app = await buildApp(makeAuthGuard(SUPERADMIN_PAYLOAD));
      await request(app.getHttpServer())
        .delete('/api/auth/sesiones/abc')
        .expect(400);
    });
  });
});
