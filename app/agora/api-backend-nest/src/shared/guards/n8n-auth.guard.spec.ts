import { UnauthorizedException } from '@nestjs/common';
import { N8nAuthGuard } from './n8n-auth.guard';
import * as runtimeSecrets from '../runtime-secrets';

const makeContext = (token?: string) =>
  ({
    switchToHttp: () => ({
      getRequest: () => ({
        headers: token ? { authorization: `Bearer ${token}` } : {},
      }),
    }),
  }) as any;

const makeConfig = (value?: string) => ({
  get: jest.fn().mockReturnValue(value),
});

describe('N8nAuthGuard', () => {
  beforeEach(() => {
    jest
      .spyOn(runtimeSecrets, 'getRuntimeSecret')
      .mockRejectedValue(new Error('no vault'));
  });

  afterEach(() => jest.restoreAllMocks());

  it('lanza UnauthorizedException sin token', async () => {
    const guard = new N8nAuthGuard(makeConfig('secreto') as any);
    await expect(guard.canActivate(makeContext())).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('lanza UnauthorizedException con token incorrecto', async () => {
    const guard = new N8nAuthGuard(makeConfig('secreto') as any);
    await expect(guard.canActivate(makeContext('incorrecto'))).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('devuelve true con token correcto desde ConfigService', async () => {
    const guard = new N8nAuthGuard(makeConfig('secreto') as any);
    expect(await guard.canActivate(makeContext('secreto'))).toBe(true);
  });
});
