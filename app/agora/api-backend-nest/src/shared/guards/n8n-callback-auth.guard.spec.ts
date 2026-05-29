import { UnauthorizedException } from '@nestjs/common';
import { N8nCallbackAuthGuard } from './n8n-callback-auth.guard';
import * as runtimeSecrets from '../runtime-secrets';

const makeContext = (token?: string) =>
  ({
    switchToHttp: () => ({
      getRequest: () => ({
        headers: token ? { authorization: `Bearer ${token}` } : {},
      }),
    }),
  }) as any;

const makeConfig = (callback?: string, n8n?: string) => ({
  get: jest.fn((key: string) => {
    if (key === 'N8N_CALLBACK_SECRET_TOKEN') return callback;
    if (key === 'N8N_SECRET_TOKEN') return n8n;
    return undefined;
  }),
});

describe('N8nCallbackAuthGuard', () => {
  beforeEach(() => {
    jest
      .spyOn(runtimeSecrets, 'getRuntimeSecret')
      .mockRejectedValue(new Error('no vault'));
  });

  afterEach(() => jest.restoreAllMocks());

  it('lanza UnauthorizedException sin token enviado', async () => {
    const guard = new N8nCallbackAuthGuard(
      makeConfig('callback-secret') as any,
    );
    await expect(guard.canActivate(makeContext())).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('lanza UnauthorizedException con token incorrecto', async () => {
    const guard = new N8nCallbackAuthGuard(
      makeConfig('callback-secret') as any,
    );
    await expect(guard.canActivate(makeContext('incorrecto'))).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('devuelve true con N8N_CALLBACK_SECRET_TOKEN correcto', async () => {
    const guard = new N8nCallbackAuthGuard(
      makeConfig('callback-secret') as any,
    );
    expect(await guard.canActivate(makeContext('callback-secret'))).toBe(true);
  });

  it('usa N8N_SECRET_TOKEN como fallback si no hay callback token', async () => {
    const guard = new N8nCallbackAuthGuard(
      makeConfig(undefined, 'n8n-secret') as any,
    );
    expect(await guard.canActivate(makeContext('n8n-secret'))).toBe(true);
  });
});
