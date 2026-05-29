import { ForbiddenException } from '@nestjs/common';
import { BaileysInternalTokenGuard } from './baileys-internal-token.guard';

const makeContext = (token?: string) =>
  ({
    switchToHttp: () => ({
      getRequest: () => ({
        headers: { 'x-internal-token': token },
      }),
    }),
  }) as any;

const makeConfig = (value?: string) => ({
  get: jest.fn().mockReturnValue(value),
});

describe('BaileysInternalTokenGuard', () => {
  it('lanza ForbiddenException si el token esperado no está configurado', () => {
    const guard = new BaileysInternalTokenGuard(makeConfig(undefined) as any);
    expect(() => guard.canActivate(makeContext('algo'))).toThrow(
      ForbiddenException,
    );
  });

  it('lanza ForbiddenException si no se envía token', () => {
    const guard = new BaileysInternalTokenGuard(makeConfig('secreto') as any);
    expect(() => guard.canActivate(makeContext())).toThrow(ForbiddenException);
  });

  it('lanza ForbiddenException con token incorrecto', () => {
    const guard = new BaileysInternalTokenGuard(makeConfig('secreto') as any);
    expect(() => guard.canActivate(makeContext('incorrecto'))).toThrow(
      ForbiddenException,
    );
  });

  it('devuelve true con token correcto', () => {
    const guard = new BaileysInternalTokenGuard(makeConfig('secreto') as any);
    expect(guard.canActivate(makeContext('secreto'))).toBe(true);
  });
});
