import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { SuperadminJwtGuard } from './superadmin-jwt.guard';

const makeContext = (authHeader?: string) =>
  ({
    switchToHttp: () => ({
      getRequest: () => ({ headers: { authorization: authHeader } }),
    }),
  }) as any;

const makeAuth = (payload: unknown) => ({
  verificarToken: jest.fn().mockResolvedValue(payload),
});

describe('SuperadminJwtGuard', () => {
  it('lanza UnauthorizedException sin header', async () => {
    const guard = new SuperadminJwtGuard(makeAuth(null) as any);
    await expect(guard.canActivate(makeContext())).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('lanza UnauthorizedException con esquema incorrecto', async () => {
    const guard = new SuperadminJwtGuard(makeAuth(null) as any);
    await expect(guard.canActivate(makeContext('Token abc'))).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('lanza ForbiddenException si rol no es superadmin', async () => {
    const guard = new SuperadminJwtGuard(
      makeAuth({ id: 1, rol: 'agente' }) as any,
    );
    await expect(
      guard.canActivate(makeContext('Bearer token')),
    ).rejects.toThrow(ForbiddenException);
  });

  it('devuelve true y setea userPayload con rol superadmin', async () => {
    const payload = { id: 1, rol: 'superadmin' };
    const guard = new SuperadminJwtGuard(makeAuth(payload) as any);
    const req: Record<string, unknown> = {
      headers: { authorization: 'Bearer token' },
    };
    const ctx = { switchToHttp: () => ({ getRequest: () => req }) } as any;

    expect(await guard.canActivate(ctx)).toBe(true);
    expect(req.userPayload).toEqual(payload);
  });
});
