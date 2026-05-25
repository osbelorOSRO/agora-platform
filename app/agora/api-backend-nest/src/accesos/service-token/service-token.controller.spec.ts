import { Test, TestingModule } from '@nestjs/testing';
import {
  INestApplication,
  UnauthorizedException,
  ValidationPipe,
} from '@nestjs/common';
import request from 'supertest';
import { ServiceTokenController } from './service-token.controller';
import { ServiceTokenService } from './service-token.service';

const mockService = { issueServiceToken: jest.fn() };

describe('ServiceTokenController', () => {
  let app: INestApplication;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ServiceTokenController],
      providers: [{ provide: ServiceTokenService, useValue: mockService }],
    }).compile();

    app = module.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
  });

  afterEach(() => app.close());

  describe('POST /api/service-auth/service-token', () => {
    const validBody = {
      serviceId: 'n8n-service',
      secretKey: 'super-secret-key',
    };

    it('returns 200 with token on valid credentials', async () => {
      mockService.issueServiceToken.mockResolvedValue({
        token: 'jwt',
        expiresIn: 1800,
        tokenType: 'Bearer',
      });
      const res = await request(app.getHttpServer())
        .post('/api/service-auth/service-token')
        .send(validBody)
        .expect(200);
      expect(res.body).toMatchObject({
        token: 'jwt',
        expiresIn: 1800,
        tokenType: 'Bearer',
      });
      expect(mockService.issueServiceToken).toHaveBeenCalledWith(
        'n8n-service',
        'super-secret-key',
      );
    });

    it('returns 400 when serviceId is missing', () => {
      return request(app.getHttpServer())
        .post('/api/service-auth/service-token')
        .send({ secretKey: 'super-secret-key' })
        .expect(400);
    });

    it('returns 400 when secretKey is missing', () => {
      return request(app.getHttpServer())
        .post('/api/service-auth/service-token')
        .send({ serviceId: 'n8n-service' })
        .expect(400);
    });

    it('returns 400 when body is empty', () => {
      return request(app.getHttpServer())
        .post('/api/service-auth/service-token')
        .send({})
        .expect(400);
    });

    it('returns 401 when service secret is wrong', async () => {
      mockService.issueServiceToken.mockRejectedValue(
        new UnauthorizedException('Credenciales de servicio inválidas'),
      );
      await request(app.getHttpServer())
        .post('/api/service-auth/service-token')
        .send(validBody)
        .expect(401);
    });
  });
});
