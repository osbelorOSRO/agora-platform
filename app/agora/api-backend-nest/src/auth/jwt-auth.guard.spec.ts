import { UnauthorizedException } from '@nestjs/common';
import { JwtAuthGuard } from './jwt-auth.guard';

const makeContext = (authHeader?: string) =>
  ({
    switchToHttp: () => ({
      getRequest: () => ({ headers: { authorization: authHeader } }),
    }),
  }) as any;

const makeAuth = (result: unknown = { id: 1 }) => ({
  verificarToken: jest.fn().mockResolvedValue(result),
});

describe('JwtAuthGuard', () => {
  it('lanza UnauthorizedException sin header', async () => {
    const guard = new JwtAuthGuard(makeAuth() as any);
    await expect(guard.canActivate(makeContext())).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('lanza UnauthorizedException con header sin token', async () => {
    const guard = new JwtAuthGuard(makeAuth() as any);
    await expect(guard.canActivate(makeContext('Bearer'))).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('devuelve true con token válido y setea botPayload', async () => {
    const auth = makeAuth({ id: 99 });
    const guard = new JwtAuthGuard(auth as any);
    const req: Record<string, unknown> = {
      headers: { authorization: 'Bearer token123' },
    };
    const ctx = { switchToHttp: () => ({ getRequest: () => req }) } as any;

    const result = await guard.canActivate(ctx);
    expect(result).toBe(true);
    expect(req.botPayload).toEqual({ id: 99 });
  });

  it('lanza UnauthorizedException cuando verificarToken falla', async () => {
    const auth = {
      verificarToken: jest.fn().mockRejectedValue(new Error('bad')),
    };
    const guard = new JwtAuthGuard(auth as any);
    await expect(
      guard.canActivate(makeContext('Bearer token123')),
    ).rejects.toThrow(UnauthorizedException);
  });
});
