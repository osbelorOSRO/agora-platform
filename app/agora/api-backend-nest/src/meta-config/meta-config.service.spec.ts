import { MetaConfigService } from './meta-config.service';

const TEST_KEY = '0123456789abcdef0123456789abcdef';

const makeCache = () => ({
  get: jest.fn().mockResolvedValue(undefined),
  set: jest.fn().mockResolvedValue(undefined),
  del: jest.fn().mockResolvedValue(undefined),
});

const makePrisma = (rows: unknown[] = []) => ({
  $queryRawUnsafe: jest.fn().mockResolvedValue(rows),
});

const makeSvc = (prisma = makePrisma(), cache = makeCache()) => {
  process.env.META_CONFIG_ENCRYPTION_KEY = TEST_KEY;
  return new MetaConfigService(prisma as any, cache as any);
};

describe('MetaConfigService — cifrado/descifrado', () => {
  it('encrypt y decrypt son inversos', () => {
    const svc = makeSvc();
    // Acceder a métodos privados vía any para test
    const encrypted = (svc as any).encrypt('mi-secreto');
    const decrypted = (svc as any).decrypt(encrypted);
    expect(decrypted).toBe('mi-secreto');
  });

  it('cada llamada a encrypt produce un ciphertext diferente (IV aleatorio)', () => {
    const svc = makeSvc();
    const a = (svc as any).encrypt('mismo-valor');
    const b = (svc as any).encrypt('mismo-valor');
    expect(a).not.toBe(b);
  });

  it('encryptRow cifra solo los campos ENCRYPTED_FIELDS', () => {
    const svc = makeSvc();
    const result = (svc as any).encryptRow({
      app_secret: 'secreto',
      webhook_verify_token: 'publico',
    });
    expect(result.webhook_verify_token).toBe('publico');
    expect(result.app_secret).not.toBe('secreto');
    expect(result.app_secret).toContain(':');
  });

  it('decryptRow descifra campos ENCRYPTED_FIELDS y pasa el resto', () => {
    const svc = makeSvc();
    const encrypted = (svc as any).encrypt('app-secret-value');
    const result = (svc as any).decryptRow({
      app_secret: encrypted,
      webhook_verify_token: 'token',
      id: 1,
      updated_at: new Date(),
    });
    expect(result.app_secret).toBe('app-secret-value');
    expect(result.webhook_verify_token).toBe('token');
    expect(result.id).toBeUndefined();
    expect(result.updated_at).toBeUndefined();
  });

  it('decryptRow devuelve null si el ciphertext está corrupto', () => {
    const svc = makeSvc();
    const result = (svc as any).decryptRow({ app_secret: 'corrupto:data' });
    expect(result.app_secret).toBeNull();
  });

  it('maskRow reemplaza campos sensibles con bullets', () => {
    const svc = makeSvc();
    const result = (svc as any).maskRow({
      app_secret: 'mi-secret',
      webhook_verify_token: 'visible',
    });
    expect(result.app_secret).toBe('••••••••');
    expect(result.webhook_verify_token).toBe('visible');
  });
});

describe('MetaConfigService — get / getSecret', () => {
  it('get devuelve {} si no hay filas en DB', async () => {
    const svc = makeSvc(makePrisma([]), makeCache());
    const result = await svc.get();
    expect(result).toEqual({});
  });

  it('get usa cache si está disponible', async () => {
    const cache = makeCache();
    cache.get.mockResolvedValue({
      webhook_verify_token: 'token',
      app_secret: 'secret',
    });
    const prisma = makePrisma();
    const svc = makeSvc(prisma, cache);
    await svc.get();
    expect(prisma.$queryRawUnsafe).not.toHaveBeenCalled();
  });

  it('getSecret devuelve el campo desencriptado desde DB', async () => {
    const svc = makeSvc();
    const encrypted = (svc as any).encrypt('mi-token');
    const prisma = makePrisma([
      { meta_page_access_token: encrypted, id: 1, updated_at: new Date() },
    ]);
    const svcWithDb = makeSvc(prisma, makeCache());
    const result = await svcWithDb.getSecret('meta_page_access_token');
    expect(result).toBe('mi-token');
  });

  it('getSecret devuelve null si no hay filas', async () => {
    const svc = makeSvc(makePrisma([]), makeCache());
    const result = await svc.getSecret('app_secret');
    expect(result).toBeNull();
  });

  it('reveal devuelve null para campos no sensibles', async () => {
    const svc = makeSvc();
    const result = await svc.reveal('webhook_verify_token');
    expect(result).toBeNull();
  });
});
