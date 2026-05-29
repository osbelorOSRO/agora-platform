import { Test, TestingModule } from '@nestjs/testing';
import {
  INestApplication,
  UnauthorizedException,
  ValidationPipe,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import request from 'supertest';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
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

const unauthorizedGuard = {
  canActivate: () => {
    throw new UnauthorizedException('Token ausente');
  },
};

const mockService = {
  preregistrarUsuario: jest.fn(),
  obtenerUsuarios: jest.fn(),
  actualizarUsuario: jest.fn(),
  adminResetPassword: jest.fn(),
  reset2FA: jest.fn(),
  desbloquear: jest.fn(),
  regenerarInvitacion: jest.fn(),
  cancelarPreregistro: jest.fn(),
};

async function buildApp(authGuard: object): Promise<INestApplication> {
  const module: TestingModule = await Test.createTestingModule({
    controllers: [UsersController],
    providers: [
      { provide: UsersService, useValue: mockService },
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

describe('UsersController', () => {
  let app: INestApplication;

  beforeEach(() => jest.clearAllMocks());
  afterEach(() => app?.close());

  // --- POST /api/auth/preregistrar-usuario ---

  describe('POST /api/auth/preregistrar-usuario', () => {
    const validBody = { username: 'newuser', rolId: 4 };

    it('returns 201 on valid preregistro', async () => {
      app = await buildApp(makeAuthGuard(WITH_PERM));
      mockService.preregistrarUsuario.mockResolvedValue({
        message: 'ok',
        invitationToken: 'T123',
        expiresAt: new Date().toISOString(),
      });
      const res = await request(app.getHttpServer())
        .post('/api/auth/preregistrar-usuario')
        .send(validBody)
        .expect(201);
      expect(res.body.data).toHaveProperty('invitationToken');
      expect(mockService.preregistrarUsuario).toHaveBeenCalledWith(
        'newuser',
        4,
        12,
      );
    });

    it('returns 400 when username is missing', async () => {
      app = await buildApp(makeAuthGuard(WITH_PERM));
      await request(app.getHttpServer())
        .post('/api/auth/preregistrar-usuario')
        .send({ rolId: 4 })
        .expect(400);
    });

    it('returns 400 when username has invalid chars', async () => {
      app = await buildApp(makeAuthGuard(WITH_PERM));
      await request(app.getHttpServer())
        .post('/api/auth/preregistrar-usuario')
        .send({ username: 'bad user!', rolId: 4 })
        .expect(400);
    });

    it('returns 400 when rolId is missing', async () => {
      app = await buildApp(makeAuthGuard(WITH_PERM));
      await request(app.getHttpServer())
        .post('/api/auth/preregistrar-usuario')
        .send({ username: 'newuser' })
        .expect(400);
    });

    it('returns 403 when permission is missing', async () => {
      app = await buildApp(makeAuthGuard(WITHOUT_PERM));
      await request(app.getHttpServer())
        .post('/api/auth/preregistrar-usuario')
        .send(validBody)
        .expect(403);
    });

    it('returns 401 when token is absent', async () => {
      app = await buildApp(unauthorizedGuard);
      await request(app.getHttpServer())
        .post('/api/auth/preregistrar-usuario')
        .send(validBody)
        .expect(401);
    });
  });

  // --- GET /api/auth/usuarios ---

  describe('GET /api/auth/usuarios', () => {
    it('returns 200 with users list', async () => {
      app = await buildApp(makeAuthGuard(WITH_PERM));
      mockService.obtenerUsuarios.mockResolvedValue([{ id: 19 }]);
      const res = await request(app.getHttpServer())
        .get('/api/auth/usuarios')
        .expect(200);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('returns 403 when permission is missing', async () => {
      app = await buildApp(makeAuthGuard(WITHOUT_PERM));
      await request(app.getHttpServer()).get('/api/auth/usuarios').expect(403);
    });

    it('returns 401 when token is absent', async () => {
      app = await buildApp(unauthorizedGuard);
      await request(app.getHttpServer()).get('/api/auth/usuarios').expect(401);
    });
  });

  // --- PATCH /api/auth/usuarios/:id ---

  describe('PATCH /api/auth/usuarios/:id', () => {
    const validBody = {
      nombre: 'Felipe',
      apellido: 'Martínez',
      run: '',
      telefono: '',
      email: '',
      rol: { id: 4, nombre: 'agente' },
    };

    it('returns 200 on valid update', async () => {
      app = await buildApp(makeAuthGuard(WITH_PERM));
      mockService.actualizarUsuario.mockResolvedValue({
        id: 19,
        nombre: 'Felipe',
      });
      const res = await request(app.getHttpServer())
        .patch('/api/auth/usuarios/19')
        .send(validBody)
        .expect(200);
      expect(res.body.data).toHaveProperty('id', 19);
      expect(mockService.actualizarUsuario).toHaveBeenCalledWith(
        19,
        expect.objectContaining({ nombre: 'Felipe' }),
      );
    });

    it('returns 400 when email is invalid', async () => {
      app = await buildApp(makeAuthGuard(WITH_PERM));
      await request(app.getHttpServer())
        .patch('/api/auth/usuarios/19')
        .send({ ...validBody, email: 'not-an-email' })
        .expect(400);
    });

    it('returns 400 when id is not a number', async () => {
      app = await buildApp(makeAuthGuard(WITH_PERM));
      await request(app.getHttpServer())
        .patch('/api/auth/usuarios/abc')
        .send(validBody)
        .expect(400);
    });

    it('returns 403 when permission is missing', async () => {
      app = await buildApp(makeAuthGuard(WITHOUT_PERM));
      await request(app.getHttpServer())
        .patch('/api/auth/usuarios/19')
        .send(validBody)
        .expect(403);
    });
  });

  // --- POST /api/auth/usuarios/:id/reset-password ---

  describe('POST /api/auth/usuarios/:id/reset-password', () => {
    it('returns 200 with reset token', async () => {
      app = await buildApp(makeAuthGuard(WITH_PERM));
      mockService.adminResetPassword.mockResolvedValue({
        resetToken: 'T123',
        expiresAt: new Date().toISOString(),
      });
      const res = await request(app.getHttpServer())
        .post('/api/auth/usuarios/19/reset-password')
        .expect(200);
      expect(res.body.data).toHaveProperty('resetToken');
    });

    it('returns 403 when permission is missing', async () => {
      app = await buildApp(makeAuthGuard(WITHOUT_PERM));
      await request(app.getHttpServer())
        .post('/api/auth/usuarios/19/reset-password')
        .expect(403);
    });
  });

  // --- POST /api/auth/usuarios/:id/reset-2fa ---

  describe('POST /api/auth/usuarios/:id/reset-2fa', () => {
    it('returns 200 with bypass token', async () => {
      app = await buildApp(makeAuthGuard(WITH_PERM));
      mockService.reset2FA.mockResolvedValue({
        bypassToken: 'B123',
        expiresAt: new Date().toISOString(),
      });
      const res = await request(app.getHttpServer())
        .post('/api/auth/usuarios/19/reset-2fa')
        .expect(200);
      expect(res.body.data).toHaveProperty('bypassToken');
    });

    it('returns 403 when permission is missing', async () => {
      app = await buildApp(makeAuthGuard(WITHOUT_PERM));
      await request(app.getHttpServer())
        .post('/api/auth/usuarios/19/reset-2fa')
        .expect(403);
    });
  });

  // --- POST /api/auth/usuarios/:id/desbloquear ---

  describe('POST /api/auth/usuarios/:id/desbloquear', () => {
    it('returns 200 on unlock', async () => {
      app = await buildApp(makeAuthGuard(WITH_PERM));
      mockService.desbloquear.mockResolvedValue({
        message: 'Cuenta desbloqueada',
      });
      const res = await request(app.getHttpServer())
        .post('/api/auth/usuarios/19/desbloquear')
        .expect(200);
      expect(res.body.data).toHaveProperty('message');
    });

    it('returns 403 when permission is missing', async () => {
      app = await buildApp(makeAuthGuard(WITHOUT_PERM));
      await request(app.getHttpServer())
        .post('/api/auth/usuarios/19/desbloquear')
        .expect(403);
    });
  });

  // --- POST /api/auth/usuarios/:id/regenerar-invitacion ---

  describe('POST /api/auth/usuarios/:id/regenerar-invitacion', () => {
    it('returns 200 with new invitation token', async () => {
      app = await buildApp(makeAuthGuard(WITH_PERM));
      mockService.regenerarInvitacion.mockResolvedValue({
        invitationToken: 'I123',
        expiresAt: new Date().toISOString(),
      });
      const res = await request(app.getHttpServer())
        .post('/api/auth/usuarios/19/regenerar-invitacion')
        .expect(200);
      expect(res.body.data).toHaveProperty('invitationToken');
    });

    it('returns 403 when permission is missing', async () => {
      app = await buildApp(makeAuthGuard(WITHOUT_PERM));
      await request(app.getHttpServer())
        .post('/api/auth/usuarios/19/regenerar-invitacion')
        .expect(403);
    });
  });

  // --- DELETE /api/auth/usuarios/:id/preregistro ---

  describe('DELETE /api/auth/usuarios/:id/preregistro', () => {
    it('returns 200 on preregistro cancel', async () => {
      app = await buildApp(makeAuthGuard(WITH_PERM));
      mockService.cancelarPreregistro.mockResolvedValue({ message: 'ok' });
      await request(app.getHttpServer())
        .delete('/api/auth/usuarios/27/preregistro')
        .expect(200);
      expect(mockService.cancelarPreregistro).toHaveBeenCalledWith(27, 12);
    });

    it('returns 403 when permission is missing', async () => {
      app = await buildApp(makeAuthGuard(WITHOUT_PERM));
      await request(app.getHttpServer())
        .delete('/api/auth/usuarios/27/preregistro')
        .expect(403);
    });
  });
});
