import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, UnauthorizedException } from '@nestjs/common';
import request from 'supertest';
import { MetaConfigController } from './meta-config.controller';
import { MetaConfigService } from './meta-config.service';
import { SuperadminJwtGuard } from '../auth/superadmin-jwt.guard';

const superadminGuard = {
  canActivate: (ctx: any) => {
    ctx.switchToHttp().getRequest().userPayload = { id: 12, rol: 'superadmin' };
    return true;
  },
};

const mockService = {
  get: jest.fn(),
  reveal: jest.fn(),
  upsert: jest.fn(),
};

async function buildApp(authGuard: object): Promise<INestApplication> {
  const module: TestingModule = await Test.createTestingModule({
    controllers: [MetaConfigController],
    providers: [{ provide: MetaConfigService, useValue: mockService }],
  })
    .overrideGuard(SuperadminJwtGuard)
    .useValue(authGuard)
    .compile();

  const app = module.createNestApplication();
  await app.init();
  return app;
}

describe('MetaConfigController', () => {
  let app: INestApplication;

  beforeEach(() => jest.clearAllMocks());
  afterEach(() => app?.close());

  // --- GET /meta-config ---

  describe('GET /meta-config', () => {
    it('returns 200 with config (sensitive fields masked)', async () => {
      app = await buildApp(superadminGuard);
      mockService.get.mockResolvedValue({ app_id: '123', app_secret: '***', display_name: 'Agora' });
      const res = await request(app.getHttpServer()).get('/meta-config').expect(200);
      expect(res.body).toHaveProperty('app_id');
    });

    it('returns 401 when token is absent', async () => {
      app = await buildApp({ canActivate: () => { throw new UnauthorizedException(); } });
      await request(app.getHttpServer()).get('/meta-config').expect(401);
    });
  });

  // --- GET /meta-config/reveal/:field ---

  describe('GET /meta-config/reveal/:field', () => {
    it('returns 200 with revealed field value', async () => {
      app = await buildApp(superadminGuard);
      mockService.reveal.mockResolvedValue('secret_value_xyz');
      const res = await request(app.getHttpServer()).get('/meta-config/reveal/app_secret').expect(200);
      expect(res.body).toHaveProperty('value', 'secret_value_xyz');
      expect(mockService.reveal).toHaveBeenCalledWith('app_secret');
    });

    it('returns 401 when token is absent', async () => {
      app = await buildApp({ canActivate: () => { throw new UnauthorizedException(); } });
      await request(app.getHttpServer()).get('/meta-config/reveal/app_secret').expect(401);
    });
  });

  // --- PATCH /meta-config ---

  describe('PATCH /meta-config', () => {
    it('returns 200 on valid update', async () => {
      app = await buildApp(superadminGuard);
      mockService.upsert.mockResolvedValue({ display_name: 'Agora V2' });
      const res = await request(app.getHttpServer())
        .patch('/meta-config')
        .send({ display_name: 'Agora V2' })
        .expect(200);
      expect(res.body).toHaveProperty('display_name', 'Agora V2');
      expect(mockService.upsert).toHaveBeenCalledWith(expect.objectContaining({ display_name: 'Agora V2' }));
    });

    it('returns 400 when unknown field is sent', async () => {
      app = await buildApp(superadminGuard);
      await request(app.getHttpServer()).patch('/meta-config').send({ campo_inexistente: 'valor' }).expect(400);
    });

    it('returns 200 with empty body (all fields optional)', async () => {
      app = await buildApp(superadminGuard);
      mockService.upsert.mockResolvedValue({});
      await request(app.getHttpServer()).patch('/meta-config').send({}).expect(200);
    });

    it('returns 401 when token is absent', async () => {
      app = await buildApp({ canActivate: () => { throw new UnauthorizedException(); } });
      await request(app.getHttpServer()).patch('/meta-config').send({ display_name: 'X' }).expect(401);
    });
  });
});
