import { BadRequestException, HttpException, HttpStatus } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { HttpExceptionFilter } from './http-exception.filter';

const makeHost = (
  overrides: Partial<{
    status: jest.Mock;
    json: jest.Mock;
    method: string;
    url: string;
  }> = {},
) => {
  const json = overrides.json ?? jest.fn();
  const status = overrides.status ?? jest.fn().mockReturnValue({ json });
  return {
    switchToHttp: () => ({
      getResponse: () => ({ status, json }),
      getRequest: () => ({
        method: overrides.method ?? 'GET',
        url: overrides.url ?? '/test',
      }),
    }),
  } as any;
};

describe('HttpExceptionFilter', () => {
  let filter: HttpExceptionFilter;

  beforeEach(() => {
    filter = new HttpExceptionFilter();
  });

  it('formatea una HttpException con mensaje string', () => {
    const host = makeHost();
    const json = host.switchToHttp().getResponse().json;
    const status = host.switchToHttp().getResponse().status;

    filter.catch(new HttpException('Not found', HttpStatus.NOT_FOUND), host);

    expect(status).toHaveBeenCalledWith(404);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 404,
        message: 'Not found',
        path: '/test',
      }),
    );
  });

  it('aplana el array de mensajes de ValidationPipe', () => {
    const host = makeHost();
    const json = host.switchToHttp().getResponse().json;

    filter.catch(
      new BadRequestException({
        message: ['campo requerido', 'email inválido'],
        error: 'Bad Request',
      }),
      host,
    );

    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 400,
        message: 'campo requerido, email inválido',
      }),
    );
  });

  it('devuelve 500 para errores no-HTTP', () => {
    const host = makeHost();
    const json = host.switchToHttp().getResponse().json;
    const status = host.switchToHttp().getResponse().status;

    filter.catch(new Error('crash inesperado'), host);

    expect(status).toHaveBeenCalledWith(500);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 500,
        message: 'Internal server error',
      }),
    );
  });

  it('incluye timestamp y path en la respuesta', () => {
    const host = makeHost({ url: '/api/ventas' });
    const json = host.switchToHttp().getResponse().json;

    filter.catch(new HttpException('error', 400), host);

    const call = (json as jest.Mock).mock.calls[0][0];
    expect(call.timestamp).toBeDefined();
    expect(call.path).toBe('/api/ventas');
  });

  it('mapea Prisma P2025 → 404 NotFoundException', () => {
    const host = makeHost();
    const json = host.switchToHttp().getResponse().json;
    const err = new Prisma.PrismaClientKnownRequestError('Not found', {
      code: 'P2025',
      clientVersion: '7.0.0',
    });
    filter.catch(err, host);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 404 }),
    );
  });

  it('mapea Prisma P2002 → 409 ConflictException', () => {
    const host = makeHost();
    const json = host.switchToHttp().getResponse().json;
    const err = new Prisma.PrismaClientKnownRequestError('Unique', {
      code: 'P2002',
      clientVersion: '7.0.0',
    });
    filter.catch(err, host);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 409 }),
    );
  });

  it('mapea Prisma P2003 → 409 ConflictException', () => {
    const host = makeHost();
    const json = host.switchToHttp().getResponse().json;
    const err = new Prisma.PrismaClientKnownRequestError('FK', {
      code: 'P2003',
      clientVersion: '7.0.0',
    });
    filter.catch(err, host);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 409 }),
    );
  });

  it('mapea Prisma P2014 → 409 ConflictException', () => {
    const host = makeHost();
    const json = host.switchToHttp().getResponse().json;
    const err = new Prisma.PrismaClientKnownRequestError('Relation', {
      code: 'P2014',
      clientVersion: '7.0.0',
    });
    filter.catch(err, host);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 409 }),
    );
  });

  it('loguea errores 500 con string cuando la excepción no es un Error', () => {
    const host = makeHost({ method: 'POST' });
    expect(() => filter.catch('error-string-raw', host)).not.toThrow();
    const json = host.switchToHttp().getResponse().json;
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 500 }),
    );
  });
});
