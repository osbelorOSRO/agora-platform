jest.mock('ioredis', () => ({
  Redis: jest.fn().mockImplementation(() => ({
    on: jest.fn(),
    call: jest.fn().mockResolvedValue(1),
  })),
}));

jest.mock('rate-limit-redis', () =>
  jest.fn().mockImplementation(() => ({ prefix: 'rl' })),
);

jest.mock('express-rate-limit', () =>
  jest.fn().mockImplementation(() => jest.fn()),
);

import { crearLimitadores } from './rate-limiter';

const LIMITADOR_KEYS = [
  'limitadorMediaGuardar',
  'limitadorMediaUploadTts',
  'limitadorMediaSend',
  'limitadorBaileysEvents',
  'limitadorMsgDelegation',
  'limitadorN8n',
  'limitadorPanelEnvio',
  'limitadorPanelGeneral',
  'limitadorRespuestasRapidas',
  'limitadorPing',
  'limitadorWebhookMetaPost',
  'limitadorWebhookMetaGet',
  'limitadorLegal',
  'limitadorLogin',
  'limitadorRecuperacion',
  'limitadorRegistro',
  'limitadorSesionesAdmin',
  'limitadorSettings',
  'limitadorSalesRecord',
  'limitadorRaiz',
] as const;

describe('crearLimitadores', () => {
  it('devuelve todas las claves de limitadores como funciones', () => {
    const rl = crearLimitadores('localhost', 6379);
    for (const key of LIMITADOR_KEYS) {
      expect(rl).toHaveProperty(key);
      expect(typeof rl[key]).toBe('function');
    }
  });

  it('funciona sin password (undefined)', () => {
    expect(() => crearLimitadores('localhost', 6379, undefined)).not.toThrow();
  });

  it('funciona con password definido', () => {
    expect(() => crearLimitadores('redis-host', 6380, 'secret')).not.toThrow();
  });

  it('devuelve exactamente 20 limitadores', () => {
    const rl = crearLimitadores('localhost', 6379);
    expect(Object.keys(rl)).toHaveLength(20);
  });
});
