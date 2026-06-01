import { Test, TestingModule } from '@nestjs/testing';
import {
  INestApplication,
  UnauthorizedException,
  ValidationPipe,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import request from 'supertest';
import { SocialPostingsN8nController } from './social-postings-n8n.controller';
import { SocialPostingsService } from './social-postings.service';
import { N8nAuthGuard } from '../shared/guards/n8n-auth.guard';

const n8nGuard = { canActivate: () => true };
const unauthorizedGuard = {
  canActivate: () => {
    throw new UnauthorizedException('Token N8N ausente o inválido');
  },
};

const mockService = {
  getPendientesHoy: jest.fn(),
  registrarResultado: jest.fn(),
};

async function buildApp(guard: object): Promise<INestApplication> {
  const module: TestingModule = await Test.createTestingModule({
    controllers: [SocialPostingsN8nController],
    providers: [
      { provide: SocialPostingsService, useValue: mockService },
      {
        provide: ConfigService,
        useValue: { get: jest.fn().mockReturnValue('test-n8n-token') },
      },
    ],
  })
    .overrideGuard(N8nAuthGuard)
    .useValue(guard)
    .compile();

  const app = module.createNestApplication();
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );
  await app.init();
  return app;
}

describe('SocialPostingsN8nController', () => {
  let app: INestApplication;
  beforeEach(() => jest.clearAllMocks());
  afterEach(() => app?.close());

  describe('GET /social-postings/n8n/pendientes-hoy', () => {
    it('devuelve 200 con la lista (envelope TransformInterceptor)', async () => {
      app = await buildApp(n8nGuard);
      mockService.getPendientesHoy.mockResolvedValue({
        token: 't',
        fanpage_id: '123',
        tareas: [],
      });
      const res = await request(app.getHttpServer())
        .get('/social-postings/n8n/pendientes-hoy')
        .expect(200);
      expect(res.body.data).toEqual({
        token: 't',
        fanpage_id: '123',
        tareas: [],
      });
      expect(mockService.getPendientesHoy).toHaveBeenCalledTimes(1);
    });

    it('devuelve 401 cuando el guard N8N rechaza', async () => {
      app = await buildApp(unauthorizedGuard);
      await request(app.getHttpServer())
        .get('/social-postings/n8n/pendientes-hoy')
        .expect(401);
      expect(mockService.getPendientesHoy).not.toHaveBeenCalled();
    });
  });

  describe('PATCH /social-postings/n8n/:id/resultado', () => {
    it('devuelve 200 y delega con id numérico + dto mapeado', async () => {
      app = await buildApp(n8nGuard);
      mockService.registrarResultado.mockResolvedValue({ id: 7 });
      const res = await request(app.getHttpServer())
        .patch('/social-postings/n8n/7/resultado')
        .send({ estado: 'publicado', id_post: 'p-1', raw: { ok: true } })
        .expect(200);
      expect(res.body.data).toEqual({ id: 7 });
      expect(mockService.registrarResultado).toHaveBeenCalledWith(7, {
        estado: 'publicado',
        id_post: 'p-1',
        raw: { ok: true },
      });
    });

    it('devuelve 400 cuando el id no es numérico (ParseIntPipe)', async () => {
      app = await buildApp(n8nGuard);
      await request(app.getHttpServer())
        .patch('/social-postings/n8n/abc/resultado')
        .send({ estado: 'publicado' })
        .expect(400);
      expect(mockService.registrarResultado).not.toHaveBeenCalled();
    });
  });
});
