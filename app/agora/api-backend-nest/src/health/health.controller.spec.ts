import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { HealthCheckService, PrismaHealthIndicator } from '@nestjs/terminus';
import request from 'supertest';
import { HealthController } from './health.controller';
import { RedisHealthIndicator } from './redis-health.indicator';
import { PrismaService } from '../database/prisma/prisma.service';

const mockHealth = {
  check: jest.fn().mockResolvedValue({
    status: 'ok',
    info: { database: { status: 'up' }, redis: { status: 'up' } },
    error: {},
    details: { database: { status: 'up' }, redis: { status: 'up' } },
  }),
};

const mockPrismaIndicator = {
  pingCheck: jest.fn().mockResolvedValue({ database: { status: 'up' } }),
};

const mockRedisIndicator = {
  isHealthy: jest.fn().mockResolvedValue({ redis: { status: 'up' } }),
};

describe('HealthController', () => {
  let app: INestApplication;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        { provide: HealthCheckService, useValue: mockHealth },
        { provide: PrismaHealthIndicator, useValue: mockPrismaIndicator },
        { provide: RedisHealthIndicator, useValue: mockRedisIndicator },
        { provide: PrismaService, useValue: { $queryRaw: jest.fn() } },
      ],
    }).compile();

    app = module.createNestApplication();
    await app.init();
  });

  afterEach(() => app.close());

  describe('GET /ping', () => {
    it('returns 200 pong', () => {
      return request(app.getHttpServer())
        .get('/ping')
        .expect(200)
        .expect('pong\n');
    });
  });

  describe('GET /ping/db', () => {
    it('returns 200 con status ok cuando DB y Redis están up', async () => {
      const res = await request(app.getHttpServer())
        .get('/ping/db')
        .expect(200);
      expect(res.body.status).toBe('ok');
    });

    it('delega los checks a health.check()', async () => {
      await request(app.getHttpServer()).get('/ping/db');
      expect(mockHealth.check).toHaveBeenCalled();
    });
  });
});
