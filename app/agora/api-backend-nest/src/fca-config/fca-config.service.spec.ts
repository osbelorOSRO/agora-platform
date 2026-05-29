import { FcaConfigService } from './fca-config.service';

const TEST_KEY = 'abcdef0123456789abcdef0123456789';

const makeCache = () => ({
  get: jest.fn().mockResolvedValue(undefined),
  set: jest.fn().mockResolvedValue(undefined),
  del: jest.fn().mockResolvedValue(undefined),
});

const makePrisma = (rows: unknown[] = []) => ({
  $queryRawUnsafe: jest.fn().mockResolvedValue(rows),
});

const makeSvc = (prisma = makePrisma(), cache = makeCache()) => {
  process.env.FCA_CONFIG_ENCRYPTION_KEY = TEST_KEY;
  return new FcaConfigService(prisma as any, cache as any);
};

describe('FcaConfigService — cifrado', () => {
  it('encrypt y decrypt son inversos', () => {
    const svc = makeSvc();
    const encrypted = (svc as any).encrypt('app-state-data');
    expect((svc as any).decrypt(encrypted)).toBe('app-state-data');
  });

  it('cada encrypt produce ciphertext único', () => {
    const svc = makeSvc();
    expect((svc as any).encrypt('x')).not.toBe((svc as any).encrypt('x'));
  });

  it('encryptRow cifra solo app_state', () => {
    const svc = makeSvc();
    const result = (svc as any).encryptRow({
      app_state: 'state-data',
      fb_user_id: 'user123',
    });
    expect(result.fb_user_id).toBe('user123');
    expect(result.app_state).not.toBe('state-data');
  });

  it('decryptRow descifra app_state y pasa el resto', () => {
    const svc = makeSvc();
    const encrypted = (svc as any).encrypt('state-data');
    const result = (svc as any).decryptRow({
      app_state: encrypted,
      fb_user_id: 'user123',
      id: 1,
      updated_at: new Date(),
    });
    expect(result.app_state).toBe('state-data');
    expect(result.fb_user_id).toBe('user123');
    expect(result.id).toBeUndefined();
  });

  it('maskRow enmascara app_state', () => {
    const svc = makeSvc();
    const result = (svc as any).maskRow({
      app_state: 'secreto',
      fb_user_id: 'user',
    });
    expect(result.app_state).toBe('••••••••');
    expect(result.fb_user_id).toBe('user');
  });
});

describe('FcaConfigService — get / getSecret', () => {
  it('get devuelve {} si no hay filas', async () => {
    const svc = makeSvc(makePrisma([]), makeCache());
    expect(await svc.get()).toEqual({});
  });

  it('get usa cache si disponible', async () => {
    const cache = makeCache();
    cache.get.mockResolvedValue({ fb_user_id: 'user' });
    const prisma = makePrisma();
    const svc = makeSvc(prisma, cache);
    await svc.get();
    expect(prisma.$queryRawUnsafe).not.toHaveBeenCalled();
  });

  it('getSecret devuelve null si no hay filas', async () => {
    const svc = makeSvc(makePrisma([]), makeCache());
    expect(await svc.getSecret('app_state')).toBeNull();
  });

  it('reveal devuelve null para campo no encriptado', async () => {
    const svc = makeSvc();
    expect(await svc.reveal('fb_user_id')).toBeNull();
  });
});

describe('FcaConfigService — MQTT status', () => {
  it('getMqttStatus devuelve null antes de setMqttStatus', () => {
    const svc = makeSvc();
    expect(svc.getMqttStatus()).toBeNull();
  });

  it('setMqttStatus y getMqttStatus trabajan juntos', () => {
    const svc = makeSvc();
    svc.setMqttStatus({
      mqtt_connected: true,
      event: 'connected',
      fb_user_id: 'user123',
      fb_user_name: 'Test User',
    });
    const status = svc.getMqttStatus();
    expect(status?.mqtt_connected).toBe(true);
    expect(status?.event).toBe('connected');
    expect(status?.fb_user_id).toBe('user123');
    expect(status?.updated_at).toBeDefined();
  });

  it('setMqttStatus acepta fb_user_id null', () => {
    const svc = makeSvc();
    svc.setMqttStatus({ mqtt_connected: false, event: 'disconnected' });
    expect(svc.getMqttStatus()?.fb_user_id).toBeNull();
  });
});
