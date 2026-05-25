import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { LegalController } from './legal.controller';

describe('LegalController', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [LegalController],
    }).compile();

    app = module.createNestApplication();
    await app.init();
  });

  afterEach(() => app.close());

  describe('GET /legal/privacy', () => {
    it('returns 200 with HTML content', async () => {
      const res = await request(app.getHttpServer())
        .get('/legal/privacy')
        .expect(200);
      expect(res.headers['content-type']).toMatch(/text\/html/);
      expect(res.text).toContain('Política de Privacidad');
    });
  });

  describe('GET /legal/terms', () => {
    it('returns 200 with HTML content', async () => {
      const res = await request(app.getHttpServer())
        .get('/legal/terms')
        .expect(200);
      expect(res.headers['content-type']).toMatch(/text\/html/);
      expect(res.text).toContain('Términos de Servicio');
    });
  });

  describe('GET /legal/delete-data', () => {
    it('returns 200 with HTML content', async () => {
      const res = await request(app.getHttpServer())
        .get('/legal/delete-data')
        .expect(200);
      expect(res.headers['content-type']).toMatch(/text\/html/);
      expect(res.text).toContain('Eliminación de Datos');
    });
  });
});
