import { Test, TestingModule } from '@nestjs/testing';
import {
  INestApplication,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import request from 'supertest';
import { ShortcutController } from './shortcut.controller';
import { ShortcutService } from './shortcut.service';
import { PanelJwtAuthGuard } from '../auth/panel-jwt-auth.guard';

const panelGuard = {
  canActivate: (ctx: any) => {
    ctx.switchToHttp().getRequest().userPayload = {
      id: 12,
      rol: 'agente',
      permisos: [],
    };
    return true;
  },
};

const mockService = {
  create: jest.fn(),
  findAll: jest.fn(),
  findOne: jest.fn(),
  update: jest.fn(),
  remove: jest.fn(),
};

async function buildApp(authGuard: object): Promise<INestApplication> {
  const module: TestingModule = await Test.createTestingModule({
    controllers: [ShortcutController],
    providers: [{ provide: ShortcutService, useValue: mockService }],
  })
    .overrideGuard(PanelJwtAuthGuard)
    .useValue(authGuard)
    .compile();

  const app = module.createNestApplication();
  await app.init();
  return app;
}

describe('ShortcutController', () => {
  let app: INestApplication;

  beforeEach(() => jest.clearAllMocks());
  afterEach(() => app?.close());

  // --- POST /shortcut ---

  describe('POST /shortcut', () => {
    const validBody = {
      atajo: '/saludo',
      texto: 'Hola, ¿en qué te puedo ayudar?',
    };

    it('returns 201 on successful creation', async () => {
      app = await buildApp(panelGuard);
      mockService.create.mockResolvedValue({
        uuid: 'a1b2c3d4-e5f6-4789-8012-abcdef012345',
        ...validBody,
      });
      const res = await request(app.getHttpServer())
        .post('/shortcut')
        .send(validBody)
        .expect(201);
      expect(res.body.data).toHaveProperty('uuid');
    });

    it('returns 400 when atajo is missing', async () => {
      app = await buildApp(panelGuard);
      await request(app.getHttpServer())
        .post('/shortcut')
        .send({ texto: 'Hola' })
        .expect(400);
    });

    it('returns 400 when texto is missing', async () => {
      app = await buildApp(panelGuard);
      await request(app.getHttpServer())
        .post('/shortcut')
        .send({ atajo: '/saludo' })
        .expect(400);
    });

    it('returns 400 when atajo exceeds 50 chars', async () => {
      app = await buildApp(panelGuard);
      await request(app.getHttpServer())
        .post('/shortcut')
        .send({ atajo: 'a'.repeat(51), texto: 'Hola' })
        .expect(400);
    });

    it('returns 401 when token is absent', async () => {
      app = await buildApp({
        canActivate: () => {
          throw new UnauthorizedException();
        },
      });
      await request(app.getHttpServer())
        .post('/shortcut')
        .send(validBody)
        .expect(401);
    });
  });

  // --- GET /shortcut ---

  describe('GET /shortcut', () => {
    it('returns 200 with all respuestas', async () => {
      app = await buildApp(panelGuard);
      mockService.findAll.mockResolvedValue([
        { uuid: 'a1b2c3d4-e5f6-4789-8012-abcdef012345', atajo: '/saludo' },
      ]);
      const res = await request(app.getHttpServer())
        .get('/shortcut')
        .expect(200);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('returns 401 when token is absent', async () => {
      app = await buildApp({
        canActivate: () => {
          throw new UnauthorizedException();
        },
      });
      await request(app.getHttpServer()).get('/shortcut').expect(401);
    });
  });

  // --- GET /shortcut/:uuid ---

  describe('GET /shortcut/:uuid', () => {
    it('returns 200 with the respuesta', async () => {
      app = await buildApp(panelGuard);
      mockService.findOne.mockResolvedValue({
        uuid: 'a1b2c3d4-e5f6-4789-8012-abcdef012345',
        atajo: '/saludo',
        texto: 'Hola',
      });
      const res = await request(app.getHttpServer())
        .get('/shortcut/a1b2c3d4-e5f6-4789-8012-abcdef012345')
        .expect(200);
      expect(res.body.data).toHaveProperty(
        'uuid',
        'a1b2c3d4-e5f6-4789-8012-abcdef012345',
      );
    });

    it('returns 404 when respuesta does not exist', async () => {
      app = await buildApp(panelGuard);
      mockService.findOne.mockRejectedValue(new NotFoundException());
      await request(app.getHttpServer())
        .get('/shortcut/00000000-0000-4000-8000-000000000000')
        .expect(404);
    });
  });

  // --- PUT /shortcut/:uuid ---

  describe('PUT /shortcut/:uuid', () => {
    it('returns 200 on valid update', async () => {
      app = await buildApp(panelGuard);
      mockService.update.mockResolvedValue({
        uuid: 'a1b2c3d4-e5f6-4789-8012-abcdef012345',
        atajo: '/hola',
        texto: 'Hola actualizado',
      });
      const res = await request(app.getHttpServer())
        .put('/shortcut/a1b2c3d4-e5f6-4789-8012-abcdef012345')
        .send({ atajo: '/hola', texto: 'Hola actualizado' })
        .expect(200);
      expect(res.body.data).toHaveProperty('atajo', '/hola');
      expect(mockService.update).toHaveBeenCalledWith(
        'a1b2c3d4-e5f6-4789-8012-abcdef012345',
        expect.objectContaining({ atajo: '/hola' }),
      );
    });

    it('returns 400 when atajo exceeds 50 chars', async () => {
      app = await buildApp(panelGuard);
      await request(app.getHttpServer())
        .put('/shortcut/a1b2c3d4-e5f6-4789-8012-abcdef012345')
        .send({ atajo: 'a'.repeat(51) })
        .expect(400);
    });

    it('returns 401 when token is absent', async () => {
      app = await buildApp({
        canActivate: () => {
          throw new UnauthorizedException();
        },
      });
      await request(app.getHttpServer())
        .put('/shortcut/a1b2c3d4-e5f6-4789-8012-abcdef012345')
        .send({ texto: 'X' })
        .expect(401);
    });
  });

  // --- DELETE /shortcut/:uuid ---

  describe('DELETE /shortcut/:uuid', () => {
    it('returns 200 on successful delete', async () => {
      app = await buildApp(panelGuard);
      mockService.remove.mockResolvedValue({ message: 'eliminado' });
      await request(app.getHttpServer())
        .delete('/shortcut/a1b2c3d4-e5f6-4789-8012-abcdef012345')
        .expect(200);
      expect(mockService.remove).toHaveBeenCalledWith(
        'a1b2c3d4-e5f6-4789-8012-abcdef012345',
      );
    });

    it('returns 404 when respuesta does not exist', async () => {
      app = await buildApp(panelGuard);
      mockService.remove.mockRejectedValue(new NotFoundException());
      await request(app.getHttpServer())
        .delete('/shortcut/00000000-0000-4000-8000-000000000000')
        .expect(404);
    });

    it('returns 401 when token is absent', async () => {
      app = await buildApp({
        canActivate: () => {
          throw new UnauthorizedException();
        },
      });
      await request(app.getHttpServer())
        .delete('/shortcut/a1b2c3d4-e5f6-4789-8012-abcdef012345')
        .expect(401);
    });
  });
});
