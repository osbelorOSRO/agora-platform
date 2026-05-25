import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ServiceUnavailableException } from '@nestjs/common';
import request from 'supertest';
import { HealthController } from './health.controller';
import { PrismaService } from '../database/prisma/prisma.service';

describe('HealthController', () => {
  let app: INestApplication;
  let prismaQueryRaw: jest.Mock;

  beforeEach(async () => {
    prismaQueryRaw = jest.fn();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [{ provide: PrismaService, useValue: { $queryRawUnsafe: prismaQueryRaw } }],
    }).compile();

    app = module.createNestApplication();
    await app.init();
  });

  afterEach(() => app.close());

  describe('GET /ping', () => {
    it('returns 200 pong', () => {
      return request(app.getHttpServer()).get('/ping').expect(200).expect('pong\n');
    });
  });

  describe('GET /ping/db', () => {
    it('returns 200 when DB is reachable', async () => {
      prismaQueryRaw.mockResolvedValue([{ '?column?': 1 }]);
      const res = await request(app.getHttpServer()).get('/ping/db').expect(200);
      expect(res.body).toEqual({ ok: true, db: 'up' });
    });

    it('returns 503 when DB is unreachable', async () => {
      prismaQueryRaw.mockRejectedValue(new Error('connection refused'));
      await request(app.getHttpServer()).get('/ping/db').expect(503);
    });
  });
});
