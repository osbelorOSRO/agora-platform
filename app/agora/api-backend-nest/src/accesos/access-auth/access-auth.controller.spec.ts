import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AccessAuthController } from './access-auth.controller';
import { AccessAuthService } from './access-auth.service';

const mockService = {
  login: jest.fn(),
  registrarUsuario: jest.fn(),
  resetPassword: jest.fn(),
  setup2FAInit: jest.fn(),
  setup2FAConfirmar: jest.fn(),
};

describe('AccessAuthController', () => {
  let app: INestApplication;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AccessAuthController],
      providers: [{ provide: AccessAuthService, useValue: mockService }],
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

  // --- POST /api/auth/login ---

  describe('POST /api/auth/login', () => {
    const validBody = {
      username: 'obeltran',
      password: 'Pass1234',
      token_2fa: '123456',
    };

    it('returns 200 on valid credentials', async () => {
      mockService.login.mockResolvedValue({ token: 'jwt', expiresIn: 3600 });
      const res = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send(validBody)
        .expect(200);
      expect(res.body).toHaveProperty('token');
      expect(mockService.login).toHaveBeenCalledWith(
        'obeltran',
        'Pass1234',
        '123456',
        expect.any(String),
        expect.any(String),
      );
    });

    it('returns 400 when username is missing', () => {
      return request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ password: 'Pass1234', token_2fa: '123456' })
        .expect(400);
    });

    it('returns 400 when token_2fa is not 6 digits', () => {
      return request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ ...validBody, token_2fa: 'abc' })
        .expect(400);
    });

    it('returns 400 when body is empty', () => {
      return request(app.getHttpServer())
        .post('/api/auth/login')
        .send({})
        .expect(400);
    });
  });

  // --- POST /api/auth/registrar-usuario ---

  describe('POST /api/auth/registrar-usuario', () => {
    const validBody = {
      username: 'newuser',
      invitationToken: 'TOKEN123',
      password: 'Pass1234',
      confirmarPassword: 'Pass1234',
    };

    it('returns 201 on valid registration', async () => {
      mockService.registrarUsuario.mockResolvedValue({ message: 'ok' });
      const res = await request(app.getHttpServer())
        .post('/api/auth/registrar-usuario')
        .send(validBody)
        .expect(201);
      expect(res.body).toHaveProperty('message');
    });

    it('returns 400 when invitationToken is missing', () => {
      return request(app.getHttpServer())
        .post('/api/auth/registrar-usuario')
        .send({
          username: 'newuser',
          password: 'Pass1234',
          confirmarPassword: 'Pass1234',
        })
        .expect(400);
    });

    it('returns 400 when body is empty', () => {
      return request(app.getHttpServer())
        .post('/api/auth/registrar-usuario')
        .send({})
        .expect(400);
    });
  });

  // --- POST /api/auth/reset-password ---

  describe('POST /api/auth/reset-password', () => {
    const validBody = {
      username: 'obeltran',
      resetToken: 'RST123',
      newPassword: 'NewPass1',
      confirmarPassword: 'NewPass1',
    };

    it('returns 200 on valid reset', async () => {
      mockService.resetPassword.mockResolvedValue({ message: 'ok' });
      const res = await request(app.getHttpServer())
        .post('/api/auth/reset-password')
        .send(validBody)
        .expect(200);
      expect(res.body).toHaveProperty('message');
    });

    it('returns 400 when resetToken is missing', () => {
      return request(app.getHttpServer())
        .post('/api/auth/reset-password')
        .send({
          username: 'obeltran',
          newPassword: 'NewPass1',
          confirmarPassword: 'NewPass1',
        })
        .expect(400);
    });
  });

  // --- POST /api/auth/setup-2fa/init ---

  describe('POST /api/auth/setup-2fa/init', () => {
    const validBody = {
      username: 'obeltran',
      password: 'Pass1234',
      bypassToken: 'BYP123',
    };

    it('returns 200 with QR data', async () => {
      mockService.setup2FAInit.mockResolvedValue({
        qrCode: 'data:image/png;base64,...',
        secret: 'ABC',
      });
      const res = await request(app.getHttpServer())
        .post('/api/auth/setup-2fa/init')
        .send(validBody)
        .expect(200);
      expect(res.body).toHaveProperty('qrCode');
    });

    it('returns 400 when bypassToken is missing', () => {
      return request(app.getHttpServer())
        .post('/api/auth/setup-2fa/init')
        .send({ username: 'obeltran', password: 'Pass1234' })
        .expect(400);
    });
  });

  // --- POST /api/auth/setup-2fa/confirmar ---

  describe('POST /api/auth/setup-2fa/confirmar', () => {
    const validBody = {
      username: 'obeltran',
      bypassToken: 'BYP123',
      totpCode: '654321',
    };

    it('returns 200 on successful 2FA confirmation', async () => {
      mockService.setup2FAConfirmar.mockResolvedValue({
        message: '2FA configurado',
      });
      const res = await request(app.getHttpServer())
        .post('/api/auth/setup-2fa/confirmar')
        .send(validBody)
        .expect(200);
      expect(res.body).toHaveProperty('message');
    });

    it('returns 400 when totpCode is not 6 digits', () => {
      return request(app.getHttpServer())
        .post('/api/auth/setup-2fa/confirmar')
        .send({ ...validBody, totpCode: '12' })
        .expect(400);
    });

    it('returns 400 when totpCode contains letters', () => {
      return request(app.getHttpServer())
        .post('/api/auth/setup-2fa/confirmar')
        .send({ ...validBody, totpCode: 'abcdef' })
        .expect(400);
    });
  });
});
