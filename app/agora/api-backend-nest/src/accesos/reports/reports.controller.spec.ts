import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, UnauthorizedException, ValidationPipe } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import request from 'supertest';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';
import { PanelJwtAuthGuard } from '../../auth/panel-jwt-auth.guard';
import { RequirePermissionGuard } from '../guards/require-permission.guard';

const makeGuard = (payload: object) => ({
  canActivate: (ctx: any) => {
    ctx.switchToHttp().getRequest().userPayload = payload;
    return true;
  },
});

const mockService = {
  catalogo: jest.fn(),
  procesos: jest.fn(),
  desempeno: jest.fn(),
  procesosSemanales: jest.fn(),
  preciosPlanes: jest.fn(),
  clientesInfo: jest.fn(),
  formatResponse: jest.fn(),
};

const jsonResult = { body: { report: 'test', total: 1, rows: [{ id: 1 }] } };
const csvResult = {
  headers: {
    'Content-Type': 'text/csv; charset=utf-8',
    'Content-Disposition': 'attachment; filename="reporte.csv"',
  },
  body: 'col1,col2\nval1,val2',
};

async function buildApp(authGuard: object): Promise<INestApplication> {
  const module: TestingModule = await Test.createTestingModule({
    controllers: [ReportsController],
    providers: [
      { provide: ReportsService, useValue: mockService },
      Reflector,
      RequirePermissionGuard,
    ],
  })
    .overrideGuard(PanelJwtAuthGuard)
    .useValue(authGuard)
    .compile();

  const app = module.createNestApplication();
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true, transformOptions: { enableImplicitConversion: true } }));
  await app.init();
  return app;
}

describe('ReportsController', () => {
  let app: INestApplication;

  beforeEach(() => jest.clearAllMocks());
  afterEach(() => app?.close());

  const conPermiso = makeGuard({ id: 1, rol: 'superadmin', permisos: ['ver_reportes'] });
  const sinPermiso = makeGuard({ id: 2, rol: 'agente', permisos: [] });

  // --- GET /api/reportes ---

  describe('GET /api/reportes', () => {
    it('devuelve 200 con catálogo de reportes disponibles', async () => {
      app = await buildApp(conPermiso);
      mockService.catalogo.mockReturnValue([{ id: 'procesos', nombre: 'Procesos' }]);
      const res = await request(app.getHttpServer()).get('/api/reportes').expect(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(mockService.catalogo).toHaveBeenCalledTimes(1);
    });

    it('devuelve 403 sin permiso ver_reportes', async () => {
      app = await buildApp(sinPermiso);
      await request(app.getHttpServer()).get('/api/reportes').expect(403);
    });

    it('devuelve 401 sin token', async () => {
      app = await buildApp({ canActivate: () => { throw new UnauthorizedException(); } });
      await request(app.getHttpServer()).get('/api/reportes').expect(401);
    });
  });

  // --- GET /api/reportes/procesos ---

  describe('GET /api/reportes/procesos', () => {
    it('devuelve 200 con reporte JSON', async () => {
      app = await buildApp(conPermiso);
      mockService.procesos.mockResolvedValue({ format: 'json', filename: 'procesos', rows: [{ id: 1 }] });
      mockService.formatResponse.mockReturnValue(jsonResult);
      const res = await request(app.getHttpServer()).get('/api/reportes/procesos').expect(200);
      expect(res.body).toHaveProperty('report');
      expect(mockService.formatResponse).toHaveBeenCalledTimes(1);
    });

    it('devuelve 200 con Content-Type text/csv cuando format=csv', async () => {
      app = await buildApp(conPermiso);
      mockService.procesos.mockResolvedValue({ format: 'csv', filename: 'procesos', rows: [] });
      mockService.formatResponse.mockReturnValue(csvResult);
      const res = await request(app.getHttpServer()).get('/api/reportes/procesos?format=csv').expect(200);
      expect(res.headers['content-type']).toContain('text/csv');
    });

    it('devuelve 403 sin permiso', async () => {
      app = await buildApp(sinPermiso);
      await request(app.getHttpServer()).get('/api/reportes/procesos').expect(403);
    });
  });

  // --- GET /api/reportes/desempeno ---

  describe('GET /api/reportes/desempeno', () => {
    it('devuelve 200 con reporte de desempeño', async () => {
      app = await buildApp(conPermiso);
      mockService.desempeno.mockResolvedValue({ format: 'json', filename: 'desempeno', rows: [] });
      mockService.formatResponse.mockReturnValue(jsonResult);
      const res = await request(app.getHttpServer()).get('/api/reportes/desempeno').expect(200);
      expect(res.body).toHaveProperty('report');
    });
  });

  // --- GET /api/reportes/procesos-semanales ---

  describe('GET /api/reportes/procesos-semanales', () => {
    it('devuelve 200 con datos semanales', async () => {
      app = await buildApp(conPermiso);
      mockService.procesosSemanales.mockResolvedValue({ format: 'json', filename: 'semanales', rows: [] });
      mockService.formatResponse.mockReturnValue(jsonResult);
      const res = await request(app.getHttpServer()).get('/api/reportes/procesos-semanales').expect(200);
      expect(res.body).toHaveProperty('report');
    });
  });

  // --- GET /api/reportes/precios-planes ---

  describe('GET /api/reportes/precios-planes', () => {
    it('devuelve 200 con precios de planes', async () => {
      app = await buildApp(conPermiso);
      mockService.preciosPlanes.mockResolvedValue({ format: 'json', filename: 'precios', rows: [] });
      mockService.formatResponse.mockReturnValue(jsonResult);
      const res = await request(app.getHttpServer()).get('/api/reportes/precios-planes').expect(200);
      expect(res.body).toHaveProperty('report');
    });
  });

  // --- GET /api/reportes/clientes-info ---

  describe('GET /api/reportes/clientes-info', () => {
    it('devuelve 200 con información de clientes', async () => {
      app = await buildApp(conPermiso);
      mockService.clientesInfo.mockResolvedValue({ format: 'json', filename: 'clientes', rows: [] });
      mockService.formatResponse.mockReturnValue(jsonResult);
      const res = await request(app.getHttpServer()).get('/api/reportes/clientes-info').expect(200);
      expect(res.body).toHaveProperty('report');
    });
  });
});
