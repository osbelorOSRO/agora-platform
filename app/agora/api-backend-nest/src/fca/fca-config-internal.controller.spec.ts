import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import request from 'supertest';
import { FcaConfigInternalController } from './fca-config-internal.controller';
import { FcaConfigService } from '../fca-config/fca-config.service';
import { WEBSOCKET_NOTIFIER_GATEWAY } from '../websocket-notifier/interfaces/websocket-notifier-gateway.interface';

const INTERNAL_TOKEN = 'test-fca-internal-token';

const mockFcaConfig = {
  getSecret: jest.fn(),
  get: jest.fn(),
  updateStatusFields: jest.fn(),
  setMqttStatus: jest.fn(),
};
const mockWs = { notificarFcaMqttStatus: jest.fn() };

async function buildApp(): Promise<INestApplication> {
  const module: TestingModule = await Test.createTestingModule({
    controllers: [FcaConfigInternalController],
    providers: [
      { provide: FcaConfigService, useValue: mockFcaConfig },
      { provide: WEBSOCKET_NOTIFIER_GATEWAY, useValue: mockWs },
      { provide: ConfigService, useValue: { get: () => INTERNAL_TOKEN } },
    ],
  }).compile();

  const app = module.createNestApplication();
  await app.init();
  return app;
}

describe('FcaConfigInternalController', () => {
  let app: INestApplication;

  beforeAll(() => {
    process.env.FCA_INTERNAL_TOKEN = INTERNAL_TOKEN;
  });
  afterAll(() => {
    delete process.env.FCA_INTERNAL_TOKEN;
  });
  beforeEach(async () => {
    jest.clearAllMocks();
    app = await buildApp();
  });
  afterEach(() => app?.close());

  describe('GET /internal/fca/config', () => {
    it('devuelve 200 con app_state + flags y token correcto', async () => {
      mockFcaConfig.getSecret.mockResolvedValue('state-blob');
      mockFcaConfig.get.mockResolvedValue({
        enabled: 'true',
        fb_backend_url: 'http://fb-backend:3001',
      });
      const res = await request(app.getHttpServer())
        .get('/internal/fca/config')
        .set('x-internal-token', INTERNAL_TOKEN)
        .expect(200);
      expect(res.body).toEqual({
        app_state: 'state-blob',
        enabled: 'true',
        fb_backend_url: 'http://fb-backend:3001',
      });
    });

    it('devuelve 403 sin token interno', async () => {
      await request(app.getHttpServer())
        .get('/internal/fca/config')
        .expect(403);
      expect(mockFcaConfig.get).not.toHaveBeenCalled();
    });
  });

  describe('POST /internal/fca/status', () => {
    it('devuelve 200 y actualiza campos de estado', async () => {
      const res = await request(app.getHttpServer())
        .post('/internal/fca/status')
        .set('x-internal-token', INTERNAL_TOKEN)
        .send({ fb_user_id: 'u1', fb_user_name: 'User' })
        .expect(200);
      expect(res.body).toEqual({ ok: true });
      expect(mockFcaConfig.updateStatusFields).toHaveBeenCalledWith({
        fb_user_id: 'u1',
        fb_user_name: 'User',
      });
      expect(mockFcaConfig.setMqttStatus).not.toHaveBeenCalled();
      expect(mockWs.notificarFcaMqttStatus).not.toHaveBeenCalled();
    });

    it('propaga estado MQTT al websocket cuando hay mqtt_event', async () => {
      await request(app.getHttpServer())
        .post('/internal/fca/status')
        .set('x-internal-token', INTERNAL_TOKEN)
        .send({
          mqtt_connected: true,
          mqtt_event: 'connected',
          fb_user_id: 'u1',
        })
        .expect(200);
      expect(mockFcaConfig.setMqttStatus).toHaveBeenCalledTimes(1);
      expect(mockWs.notificarFcaMqttStatus).toHaveBeenCalledWith(
        expect.objectContaining({ mqtt_connected: true, event: 'connected' }),
      );
    });

    it('devuelve 403 sin token interno', async () => {
      await request(app.getHttpServer())
        .post('/internal/fca/status')
        .send({ fb_user_id: 'u1' })
        .expect(403);
      expect(mockFcaConfig.updateStatusFields).not.toHaveBeenCalled();
    });
  });
});
