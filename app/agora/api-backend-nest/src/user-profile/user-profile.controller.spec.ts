import { Test, TestingModule } from '@nestjs/testing';
import {
  INestApplication,
  UnauthorizedException,
  ValidationPipe,
} from '@nestjs/common';
import request from 'supertest';
import { UserProfileController } from './user-profile.controller';
import { UserProfileService } from './user-profile.service';
import { PanelJwtAuthGuard } from '../auth/panel-jwt-auth.guard';

const panelGuard = {
  canActivate: (ctx: any) => {
    ctx.switchToHttp().getRequest().userPayload = {
      id: 7,
      rol: 'agente',
      permisos: [],
    };
    return true;
  },
};

const mockService = {
  getPhotoUrl: jest.fn(),
  uploadPhoto: jest.fn(),
  removePhoto: jest.fn(),
};

// Minimal 1×1 PNG
const TINY_PNG = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49,
  0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x08, 0x02,
  0x00, 0x00, 0x00, 0x90, 0x77, 0x53, 0xde, 0x00, 0x00, 0x00, 0x0c, 0x49, 0x44,
  0x41, 0x54, 0x08, 0xd7, 0x63, 0xf8, 0xcf, 0xc0, 0x00, 0x00, 0x00, 0x02, 0x00,
  0x01, 0xe2, 0x21, 0xbc, 0x33, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44,
  0xae, 0x42, 0x60, 0x82,
]);

async function buildApp(authGuard: object): Promise<INestApplication> {
  const module: TestingModule = await Test.createTestingModule({
    controllers: [UserProfileController],
    providers: [{ provide: UserProfileService, useValue: mockService }],
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
      transformOptions: { enableImplicitConversion: true },
    }),
  );
  await app.init();
  return app;
}

describe('UserProfileController', () => {
  let app: INestApplication;

  beforeEach(() => jest.clearAllMocks());
  afterEach(() => app?.close());

  // --- GET /user-profile/photo ---

  describe('GET /user-profile/photo', () => {
    it('devuelve 200 con photoUrl cuando existe', async () => {
      app = await buildApp(panelGuard);
      mockService.getPhotoUrl.mockResolvedValue(
        'https://cdn.example.com/photo.jpg',
      );
      const res = await request(app.getHttpServer())
        .get('/user-profile/photo')
        .expect(200);
      expect(res.body).toHaveProperty(
        'photoUrl',
        'https://cdn.example.com/photo.jpg',
      );
      expect(mockService.getPhotoUrl).toHaveBeenCalledWith(7);
    });

    it('devuelve 200 con photoUrl null cuando no hay foto', async () => {
      app = await buildApp(panelGuard);
      mockService.getPhotoUrl.mockResolvedValue(null);
      const res = await request(app.getHttpServer())
        .get('/user-profile/photo')
        .expect(200);
      expect(res.body).toHaveProperty('photoUrl', null);
    });

    it('devuelve 401 sin token', async () => {
      app = await buildApp({
        canActivate: () => {
          throw new UnauthorizedException();
        },
      });
      await request(app.getHttpServer()).get('/user-profile/photo').expect(401);
    });
  });

  // --- POST /user-profile/photo ---

  describe('POST /user-profile/photo', () => {
    it('devuelve 200 con nueva photoUrl al subir archivo', async () => {
      app = await buildApp(panelGuard);
      mockService.uploadPhoto.mockResolvedValue(
        'https://cdn.example.com/new-photo.jpg',
      );
      const res = await request(app.getHttpServer())
        .post('/user-profile/photo')
        .attach('photo', TINY_PNG, {
          filename: 'avatar.png',
          contentType: 'image/png',
        })
        .expect(201);
      expect(res.body).toHaveProperty(
        'photoUrl',
        'https://cdn.example.com/new-photo.jpg',
      );
      expect(mockService.uploadPhoto).toHaveBeenCalledWith(
        7,
        expect.objectContaining({ originalname: 'avatar.png' }),
      );
    });

    it('devuelve 401 sin token', async () => {
      app = await buildApp({
        canActivate: () => {
          throw new UnauthorizedException();
        },
      });
      await request(app.getHttpServer())
        .post('/user-profile/photo')
        .attach('photo', TINY_PNG, {
          filename: 'avatar.png',
          contentType: 'image/png',
        })
        .expect(401);
    });
  });

  // --- DELETE /user-profile/photo ---

  describe('DELETE /user-profile/photo', () => {
    it('devuelve 200 con ok:true al eliminar foto', async () => {
      app = await buildApp(panelGuard);
      mockService.removePhoto.mockResolvedValue(undefined);
      const res = await request(app.getHttpServer())
        .delete('/user-profile/photo')
        .expect(200);
      expect(res.body).toHaveProperty('ok', true);
      expect(mockService.removePhoto).toHaveBeenCalledWith(7);
    });

    it('devuelve 401 sin token', async () => {
      app = await buildApp({
        canActivate: () => {
          throw new UnauthorizedException();
        },
      });
      await request(app.getHttpServer())
        .delete('/user-profile/photo')
        .expect(401);
    });
  });
});
