import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { ServiceTokenService } from './service-token.service';

const makeAuth = () => ({
  firmarToken: jest.fn().mockResolvedValue('jwt-token'),
});

const makeVault = (key = 'correct-key') => ({
  getSecretKey: jest.fn().mockResolvedValue(key),
  getSecretField: jest.fn(),
});

describe('ServiceTokenService', () => {
  it('lanza BadRequestException si serviceId o secretKey están vacíos', async () => {
    const svc = new ServiceTokenService(makeAuth() as any, makeVault() as any);
    await expect(svc.issueServiceToken('', 'key')).rejects.toThrow(
      BadRequestException,
    );
    await expect(svc.issueServiceToken('id', '')).rejects.toThrow(
      BadRequestException,
    );
  });

  it('lanza BadRequestException si serviceId tiene caracteres inválidos', async () => {
    const svc = new ServiceTokenService(makeAuth() as any, makeVault() as any);
    await expect(
      svc.issueServiceToken('id con espacios', 'key'),
    ).rejects.toThrow(BadRequestException);
  });

  it('lanza BadRequestException si vault no tiene el serviceId', async () => {
    const vault = {
      getSecretKey: jest.fn().mockRejectedValue(new Error('not found')),
      getSecretField: jest.fn(),
    };
    const svc = new ServiceTokenService(makeAuth() as any, vault as any);
    await expect(svc.issueServiceToken('mi-servicio', 'key')).rejects.toThrow(
      BadRequestException,
    );
  });

  it('lanza UnauthorizedException si la secretKey no coincide', async () => {
    const svc = new ServiceTokenService(
      makeAuth() as any,
      makeVault('expected-key') as any,
    );
    await expect(
      svc.issueServiceToken('mi-servicio', 'wrong-key'),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('devuelve token con clave correcta', async () => {
    const svc = new ServiceTokenService(
      makeAuth() as any,
      makeVault('correct-key') as any,
    );
    const result = await svc.issueServiceToken('mi-servicio', 'correct-key');
    expect(result).toMatchObject({ token: 'jwt-token', tokenType: 'Bearer' });
  });
});
