import Vault from 'node-vault';
import { ConfigService } from '@nestjs/config';
import { VaultService } from './vault.service';

jest.mock('node-vault', () =>
  jest.fn().mockImplementation(() => ({
    approleLogin: jest.fn().mockResolvedValue({
      auth: { client_token: 'test-token', lease_duration: 3600 },
    }),
    read: jest.fn().mockResolvedValue({
      data: { data: { key: 'pem-key-data' } },
    }),
    token: 'test-token',
  })),
);

function makeConfig(overrides: Record<string, string> = {}): ConfigService {
  const env: Record<string, string> = {
    VAULT_ROLE_ID: 'role-id',
    VAULT_SECRET_ID: 'secret-id',
    VAULT_ADDR: 'http://vault:8200',
    ...overrides,
  };
  return { get: (key: string) => env[key] } as unknown as ConfigService;
}

describe('VaultService', () => {
  it('está definido', () => {
    const svc = new VaultService(makeConfig());
    expect(svc).toBeDefined();
  });

  it('getSecretField autentica con Vault y devuelve el campo', async () => {
    const svc = new VaultService(makeConfig());
    const result = await svc.getSecretField('accesos/keys/private', 'key');
    expect(result).toBe('pem-key-data');
  });

  it('getSecretKey llama a getSecretField con el campo "key"', async () => {
    const svc = new VaultService(makeConfig());
    const spy = jest.spyOn(svc, 'getSecretField').mockResolvedValue('pem-key');
    const result = await svc.getSecretKey('accesos/keys/public');
    expect(spy).toHaveBeenCalledWith('accesos/keys/public', 'key');
    expect(result).toBe('pem-key');
  });

  it('lanza si VAULT_ROLE_ID no está definido', async () => {
    const svc = new VaultService(
      makeConfig({ VAULT_ROLE_ID: undefined as unknown as string }),
    );
    await expect(svc.getSecretField('any/path', 'key')).rejects.toThrow(
      'VAULT_ROLE_ID',
    );
  });

  it('lanza si el secreto no contiene el campo solicitado', async () => {
    (Vault as jest.Mock).mockImplementationOnce(() => ({
      approleLogin: jest.fn().mockResolvedValue({
        auth: { client_token: 'token', lease_duration: 3600 },
      }),
      read: jest.fn().mockResolvedValue({
        data: { data: {} },
      }),
    }));
    const svc = new VaultService(makeConfig());
    await expect(
      svc.getSecretField('any/path', 'missing-field'),
    ).rejects.toThrow();
  });
});
