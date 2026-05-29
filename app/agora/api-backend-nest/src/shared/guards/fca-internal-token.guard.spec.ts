import { ForbiddenException } from '@nestjs/common';
import { FcaInternalTokenGuard } from './fca-internal-token.guard';

const makeContext = (token?: string) =>
  ({
    switchToHttp: () => ({
      getRequest: () => ({ headers: { 'x-internal-token': token } }),
    }),
  }) as any;

const makeConfig = (value?: string) => ({
  get: jest.fn().mockReturnValue(value),
});

describe('FcaInternalTokenGuard', () => {
  it('lanza ForbiddenException si el token esperado no está configurado', () => {
    const guard = new FcaInternalTokenGuard(makeConfig(undefined) as any);
    expect(() => guard.canActivate(makeContext('algo'))).toThrow(
      ForbiddenException,
    );
  });

  it('lanza ForbiddenException si no se envía token', () => {
    const guard = new FcaInternalTokenGuard(makeConfig('fca-secret') as any);
    expect(() => guard.canActivate(makeContext())).toThrow(ForbiddenException);
  });

  it('lanza ForbiddenException con token incorrecto', () => {
    const guard = new FcaInternalTokenGuard(makeConfig('fca-secret') as any);
    expect(() => guard.canActivate(makeContext('incorrecto'))).toThrow(
      ForbiddenException,
    );
  });

  it('devuelve true con token correcto', () => {
    const guard = new FcaInternalTokenGuard(makeConfig('fca-secret') as any);
    expect(guard.canActivate(makeContext('fca-secret'))).toBe(true);
  });
});
