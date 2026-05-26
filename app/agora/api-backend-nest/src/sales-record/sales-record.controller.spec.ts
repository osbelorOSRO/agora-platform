import { Test, TestingModule } from '@nestjs/testing';
import {
  INestApplication,
  UnauthorizedException,
  ValidationPipe,
} from '@nestjs/common';
import request from 'supertest';
import { SalesRecordController } from './sales-record.controller';
import { SalesCatalogService } from './sales-catalog.service';
import { SalesPriceLevelService } from './sales-price-level.service';
import { SalesService } from './sales.service';
import { PanelJwtAuthGuard } from '../auth/panel-jwt-auth.guard';

const panelGuard = {
  canActivate: (ctx: any) => {
    ctx.switchToHttp().getRequest().userPayload = {
      id: 1,
      rol: 'superadmin',
      permisos: [],
    };
    return true;
  },
};

const noAuthGuard = {
  canActivate: () => {
    throw new UnauthorizedException();
  },
};

const mockCatalog: Record<string, jest.Mock> = {
  listCatalog: jest.fn(),
  createCatalog: jest.fn(),
  updateCatalog: jest.fn(),
  deleteCatalog: jest.fn(),
};

const mockPriceLevel: Record<string, jest.Mock> = {
  listPriceMatrix: jest.fn(),
  createPriceLevel: jest.fn(),
  updatePriceLevel: jest.fn(),
  deletePriceLevel: jest.fn(),
};

const mockSales: Record<string, jest.Mock> = {
  listMonthlyPoints: jest.fn(),
  getMonthlyPoints: jest.fn(),
  listSales: jest.fn(),
  createSale: jest.fn(),
  updateSale: jest.fn(),
  deleteSale: jest.fn(),
};

async function buildApp(authGuard: object): Promise<INestApplication> {
  const module: TestingModule = await Test.createTestingModule({
    controllers: [SalesRecordController],
    providers: [
      { provide: SalesCatalogService, useValue: mockCatalog },
      { provide: SalesPriceLevelService, useValue: mockPriceLevel },
      { provide: SalesService, useValue: mockSales },
    ],
  })
    .overrideGuard(PanelJwtAuthGuard)
    .useValue(authGuard)
    .compile();

  const app = module.createNestApplication();
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );
  await app.init();
  return app;
}

// ─── fixtures ────────────────────────────────────────────────────────────────

const VALID_CATALOG = {
  code: '4FU',
  modality: 'POST_A_POST',
  level: 5,
  points: 1.5,
};

const VALID_PRICE_LEVEL = { level: 9, range: 3, price: 1500 };

const VALID_SALE = {
  fecha: '2026-05-26',
  run: '12345678-9',
  full_name: 'Juan Pérez',
  phone: '912345678',
  address: 'Av. Principal 123',
  city: 'Santiago',
  province: 'Santiago',
  country: 'Chile',
  contract_number: 'C-001',
  modality: 'POST_A_POST',
  offers_code: '4FU',
};

// ─── Catálogo de ofertas ──────────────────────────────────────────────────────

describe('SalesRecordController — /sales-record/catalog', () => {
  let app: INestApplication;

  beforeEach(() => jest.clearAllMocks());
  afterEach(() => app?.close());

  describe('GET /sales-record/catalog', () => {
    it('devuelve 200 con array de ofertas', async () => {
      app = await buildApp(panelGuard);
      mockCatalog.listCatalog.mockResolvedValue([VALID_CATALOG]);
      const res = await request(app.getHttpServer())
        .get('/sales-record/catalog')
        .expect(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(mockCatalog.listCatalog).toHaveBeenCalledTimes(1);
    });

    it('devuelve 401 sin token', async () => {
      app = await buildApp(noAuthGuard);
      await request(app.getHttpServer())
        .get('/sales-record/catalog')
        .expect(401);
    });
  });

  describe('POST /sales-record/catalog', () => {
    it('devuelve 201 con body válido', async () => {
      app = await buildApp(panelGuard);
      mockCatalog.createCatalog.mockResolvedValue({ id: 1, ...VALID_CATALOG });
      const res = await request(app.getHttpServer())
        .post('/sales-record/catalog')
        .send(VALID_CATALOG)
        .expect(201);
      expect(res.body).toHaveProperty('id');
      expect(mockCatalog.createCatalog).toHaveBeenCalledWith(
        expect.objectContaining({ code: '4FU', modality: 'POST_A_POST' }),
      );
    });

    it('devuelve 400 cuando level supera 9', async () => {
      app = await buildApp(panelGuard);
      await request(app.getHttpServer())
        .post('/sales-record/catalog')
        .send({ ...VALID_CATALOG, level: 10 })
        .expect(400);
    });

    it('devuelve 400 cuando level es 0', async () => {
      app = await buildApp(panelGuard);
      await request(app.getHttpServer())
        .post('/sales-record/catalog')
        .send({ ...VALID_CATALOG, level: 0 })
        .expect(400);
    });

    it('devuelve 400 cuando points no es múltiplo de 0.5 válido', async () => {
      app = await buildApp(panelGuard);
      await request(app.getHttpServer())
        .post('/sales-record/catalog')
        .send({ ...VALID_CATALOG, points: 1.3 })
        .expect(400);
    });

    it('devuelve 400 cuando points supera 3', async () => {
      app = await buildApp(panelGuard);
      await request(app.getHttpServer())
        .post('/sales-record/catalog')
        .send({ ...VALID_CATALOG, points: 3.5 })
        .expect(400);
    });

    it('devuelve 400 cuando modality tiene valor inválido', async () => {
      app = await buildApp(panelGuard);
      await request(app.getHttpServer())
        .post('/sales-record/catalog')
        .send({ ...VALID_CATALOG, modality: 'OTRO' })
        .expect(400);
    });

    it('devuelve 400 cuando se envía campo no permitido', async () => {
      app = await buildApp(panelGuard);
      await request(app.getHttpServer())
        .post('/sales-record/catalog')
        .send({ ...VALID_CATALOG, campoExtra: 'x' })
        .expect(400);
    });

    it('devuelve 400 cuando falta code', async () => {
      app = await buildApp(panelGuard);
      const { code: _omit, ...rest } = VALID_CATALOG;
      await request(app.getHttpServer())
        .post('/sales-record/catalog')
        .send(rest)
        .expect(400);
    });

    it('devuelve 401 sin token', async () => {
      app = await buildApp(noAuthGuard);
      await request(app.getHttpServer())
        .post('/sales-record/catalog')
        .send(VALID_CATALOG)
        .expect(401);
    });
  });

  describe('PATCH /sales-record/catalog/:id', () => {
    it('devuelve 200 con actualización de level válido', async () => {
      app = await buildApp(panelGuard);
      mockCatalog.updateCatalog.mockResolvedValue({
        id: 1,
        ...VALID_CATALOG,
        level: 7,
      });
      const res = await request(app.getHttpServer())
        .patch('/sales-record/catalog/1')
        .send({ level: 7 })
        .expect(200);
      expect(res.body).toHaveProperty('level', 7);
      expect(mockCatalog.updateCatalog).toHaveBeenCalledWith(1, { level: 7 });
    });

    it('devuelve 200 con actualización de points válido', async () => {
      app = await buildApp(panelGuard);
      mockCatalog.updateCatalog.mockResolvedValue({
        id: 1,
        ...VALID_CATALOG,
        points: 2.5,
      });
      await request(app.getHttpServer())
        .patch('/sales-record/catalog/1')
        .send({ points: 2.5 })
        .expect(200);
    });

    it('devuelve 400 cuando level sale del rango', async () => {
      app = await buildApp(panelGuard);
      await request(app.getHttpServer())
        .patch('/sales-record/catalog/1')
        .send({ level: 0 })
        .expect(400);
    });

    it('devuelve 400 cuando se envía campo no permitido (code)', async () => {
      app = await buildApp(panelGuard);
      await request(app.getHttpServer())
        .patch('/sales-record/catalog/1')
        .send({ code: 'XXX' })
        .expect(400);
    });

    it('devuelve 401 sin token', async () => {
      app = await buildApp(noAuthGuard);
      await request(app.getHttpServer())
        .patch('/sales-record/catalog/1')
        .send({ level: 3 })
        .expect(401);
    });
  });

  describe('DELETE /sales-record/catalog/:id', () => {
    it('devuelve 200 con confirmación', async () => {
      app = await buildApp(panelGuard);
      mockCatalog.deleteCatalog.mockResolvedValue({ ok: true, id: 1 });
      const res = await request(app.getHttpServer())
        .delete('/sales-record/catalog/1')
        .expect(200);
      expect(res.body).toHaveProperty('ok', true);
      expect(mockCatalog.deleteCatalog).toHaveBeenCalledWith(1);
    });

    it('devuelve 401 sin token', async () => {
      app = await buildApp(noAuthGuard);
      await request(app.getHttpServer())
        .delete('/sales-record/catalog/1')
        .expect(401);
    });
  });
});

// ─── Matriz de precios ────────────────────────────────────────────────────────

describe('SalesRecordController — /sales-record/price-matrix', () => {
  let app: INestApplication;

  beforeEach(() => jest.clearAllMocks());
  afterEach(() => app?.close());

  describe('GET /sales-record/price-matrix', () => {
    it('devuelve 200 con array de precios', async () => {
      app = await buildApp(panelGuard);
      mockPriceLevel.listPriceMatrix.mockResolvedValue([VALID_PRICE_LEVEL]);
      const res = await request(app.getHttpServer())
        .get('/sales-record/price-matrix')
        .expect(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it('devuelve 401 sin token', async () => {
      app = await buildApp(noAuthGuard);
      await request(app.getHttpServer())
        .get('/sales-record/price-matrix')
        .expect(401);
    });
  });

  describe('POST /sales-record/price-matrix', () => {
    it('devuelve 201 con body válido', async () => {
      app = await buildApp(panelGuard);
      mockPriceLevel.createPriceLevel.mockResolvedValue({
        id: 1,
        ...VALID_PRICE_LEVEL,
      });
      const res = await request(app.getHttpServer())
        .post('/sales-record/price-matrix')
        .send(VALID_PRICE_LEVEL)
        .expect(201);
      expect(res.body).toHaveProperty('id');
      expect(mockPriceLevel.createPriceLevel).toHaveBeenCalledWith(
        expect.objectContaining({ level: 9, range: 3, price: 1500 }),
      );
    });

    it('devuelve 400 cuando level es 0', async () => {
      app = await buildApp(panelGuard);
      await request(app.getHttpServer())
        .post('/sales-record/price-matrix')
        .send({ ...VALID_PRICE_LEVEL, level: 0 })
        .expect(400);
    });

    it('devuelve 400 cuando level supera 9', async () => {
      app = await buildApp(panelGuard);
      await request(app.getHttpServer())
        .post('/sales-record/price-matrix')
        .send({ ...VALID_PRICE_LEVEL, level: 10 })
        .expect(400);
    });

    it('devuelve 400 cuando range es 0', async () => {
      app = await buildApp(panelGuard);
      await request(app.getHttpServer())
        .post('/sales-record/price-matrix')
        .send({ ...VALID_PRICE_LEVEL, range: 0 })
        .expect(400);
    });

    it('devuelve 400 cuando range supera 3', async () => {
      app = await buildApp(panelGuard);
      await request(app.getHttpServer())
        .post('/sales-record/price-matrix')
        .send({ ...VALID_PRICE_LEVEL, range: 4 })
        .expect(400);
    });

    it('devuelve 400 cuando price es negativo', async () => {
      app = await buildApp(panelGuard);
      await request(app.getHttpServer())
        .post('/sales-record/price-matrix')
        .send({ ...VALID_PRICE_LEVEL, price: -1 })
        .expect(400);
    });

    it('devuelve 400 cuando se envía campo no permitido', async () => {
      app = await buildApp(panelGuard);
      await request(app.getHttpServer())
        .post('/sales-record/price-matrix')
        .send({ ...VALID_PRICE_LEVEL, nombre: 'x' })
        .expect(400);
    });

    it('devuelve 401 sin token', async () => {
      app = await buildApp(noAuthGuard);
      await request(app.getHttpServer())
        .post('/sales-record/price-matrix')
        .send(VALID_PRICE_LEVEL)
        .expect(401);
    });
  });

  describe('PATCH /sales-record/price-matrix/:id', () => {
    it('devuelve 200 con price actualizado', async () => {
      app = await buildApp(panelGuard);
      mockPriceLevel.updatePriceLevel.mockResolvedValue({
        id: 1,
        ...VALID_PRICE_LEVEL,
        price: 2000,
      });
      const res = await request(app.getHttpServer())
        .patch('/sales-record/price-matrix/1')
        .send({ price: 2000 })
        .expect(200);
      expect(res.body).toHaveProperty('price', 2000);
      expect(mockPriceLevel.updatePriceLevel).toHaveBeenCalledWith(1, {
        price: 2000,
      });
    });

    it('devuelve 400 cuando price es negativo', async () => {
      app = await buildApp(panelGuard);
      await request(app.getHttpServer())
        .patch('/sales-record/price-matrix/1')
        .send({ price: -500 })
        .expect(400);
    });

    it('devuelve 400 cuando se envía campo no permitido (level)', async () => {
      app = await buildApp(panelGuard);
      await request(app.getHttpServer())
        .patch('/sales-record/price-matrix/1')
        .send({ level: 3 })
        .expect(400);
    });

    it('devuelve 401 sin token', async () => {
      app = await buildApp(noAuthGuard);
      await request(app.getHttpServer())
        .patch('/sales-record/price-matrix/1')
        .send({ price: 100 })
        .expect(401);
    });
  });

  describe('DELETE /sales-record/price-matrix/:id', () => {
    it('devuelve 200 con confirmación', async () => {
      app = await buildApp(panelGuard);
      mockPriceLevel.deletePriceLevel.mockResolvedValue({ ok: true, id: 1 });
      const res = await request(app.getHttpServer())
        .delete('/sales-record/price-matrix/1')
        .expect(200);
      expect(res.body).toHaveProperty('ok', true);
      expect(mockPriceLevel.deletePriceLevel).toHaveBeenCalledWith(1);
    });

    it('devuelve 401 sin token', async () => {
      app = await buildApp(noAuthGuard);
      await request(app.getHttpServer())
        .delete('/sales-record/price-matrix/1')
        .expect(401);
    });
  });
});

// ─── Puntos mensuales ─────────────────────────────────────────────────────────

describe('SalesRecordController — /sales-record/monthly-points', () => {
  let app: INestApplication;

  beforeEach(() => jest.clearAllMocks());
  afterEach(() => app?.close());

  describe('GET /sales-record/monthly-points', () => {
    it('devuelve 200 con lista de meses', async () => {
      app = await buildApp(panelGuard);
      mockSales.listMonthlyPoints.mockResolvedValue([
        { year: 2026, month: 5, total_points: '22.5' },
      ]);
      const res = await request(app.getHttpServer())
        .get('/sales-record/monthly-points')
        .expect(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it('devuelve 401 sin token', async () => {
      app = await buildApp(noAuthGuard);
      await request(app.getHttpServer())
        .get('/sales-record/monthly-points')
        .expect(401);
    });
  });

  describe('GET /sales-record/monthly-points/:year/:month', () => {
    it('devuelve 200 con total_points y active_range', async () => {
      app = await buildApp(panelGuard);
      mockSales.getMonthlyPoints.mockResolvedValue({
        year: 2026,
        month: 5,
        total_points: 22.5,
        active_range: 2,
      });
      const res = await request(app.getHttpServer())
        .get('/sales-record/monthly-points/2026/5')
        .expect(200);
      expect(res.body).toHaveProperty('active_range', 2);
      expect(res.body).toHaveProperty('total_points', 22.5);
      expect(mockSales.getMonthlyPoints).toHaveBeenCalledWith(2026, 5);
    });

    it('devuelve active_range 1 cuando no hay puntos en el mes', async () => {
      app = await buildApp(panelGuard);
      mockSales.getMonthlyPoints.mockResolvedValue({
        year: 2026,
        month: 6,
        total_points: 0,
        active_range: 1,
      });
      const res = await request(app.getHttpServer())
        .get('/sales-record/monthly-points/2026/6')
        .expect(200);
      expect(res.body).toHaveProperty('active_range', 1);
    });

    it('devuelve 401 sin token', async () => {
      app = await buildApp(noAuthGuard);
      await request(app.getHttpServer())
        .get('/sales-record/monthly-points/2026/5')
        .expect(401);
    });
  });
});

// ─── Ventas ───────────────────────────────────────────────────────────────────

describe('SalesRecordController — /sales-record', () => {
  let app: INestApplication;

  beforeEach(() => jest.clearAllMocks());
  afterEach(() => app?.close());

  describe('GET /sales-record', () => {
    it('devuelve 200 con lista de ventas del mes actual cuando no hay filtros', async () => {
      app = await buildApp(panelGuard);
      mockSales.listSales.mockResolvedValue([{ id: 1, ...VALID_SALE }]);
      const res = await request(app.getHttpServer())
        .get('/sales-record')
        .expect(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(mockSales.listSales).toHaveBeenCalledWith(undefined, undefined);
    });

    it('pasa filtros year y month al servicio para navegación mensual', async () => {
      app = await buildApp(panelGuard);
      mockSales.listSales.mockResolvedValue([]);
      await request(app.getHttpServer())
        .get('/sales-record?year=2026&month=5')
        .expect(200);
      expect(mockSales.listSales).toHaveBeenCalledWith(2026, 5);
    });

    it('devuelve 401 sin token', async () => {
      app = await buildApp(noAuthGuard);
      await request(app.getHttpServer()).get('/sales-record').expect(401);
    });
  });

  describe('POST /sales-record', () => {
    it('devuelve 201 con body válido y campos calculados en respuesta', async () => {
      app = await buildApp(panelGuard);
      mockSales.createSale.mockResolvedValue({
        id: 1,
        ...VALID_SALE,
        level_price: 5,
        points: 1.5,
        offers_price: 800,
      });
      const res = await request(app.getHttpServer())
        .post('/sales-record')
        .send(VALID_SALE)
        .expect(201);
      expect(res.body).toHaveProperty('id');
      expect(res.body).toHaveProperty('level_price');
      expect(res.body).toHaveProperty('offers_price');
      expect(mockSales.createSale).toHaveBeenCalledWith(
        expect.objectContaining({
          offers_code: '4FU',
          modality: 'POST_A_POST',
        }),
      );
    });

    it('devuelve 400 cuando fecha es inválida', async () => {
      app = await buildApp(panelGuard);
      await request(app.getHttpServer())
        .post('/sales-record')
        .send({ ...VALID_SALE, fecha: 'no-es-fecha' })
        .expect(400);
    });

    it('devuelve 400 cuando modality tiene valor inválido', async () => {
      app = await buildApp(panelGuard);
      await request(app.getHttpServer())
        .post('/sales-record')
        .send({ ...VALID_SALE, modality: 'PREPAGO' })
        .expect(400);
    });

    it('devuelve 400 cuando run excede 12 caracteres', async () => {
      app = await buildApp(panelGuard);
      await request(app.getHttpServer())
        .post('/sales-record')
        .send({ ...VALID_SALE, run: '1234567890123' })
        .expect(400);
    });

    it('devuelve 400 cuando offers_code excede 20 caracteres', async () => {
      app = await buildApp(panelGuard);
      await request(app.getHttpServer())
        .post('/sales-record')
        .send({ ...VALID_SALE, offers_code: 'X'.repeat(21) })
        .expect(400);
    });

    it('devuelve 400 cuando se envía campo calculado (level_price)', async () => {
      app = await buildApp(panelGuard);
      await request(app.getHttpServer())
        .post('/sales-record')
        .send({ ...VALID_SALE, level_price: 3 })
        .expect(400);
    });

    it('devuelve 400 cuando falta full_name', async () => {
      app = await buildApp(panelGuard);
      const { full_name: _omit, ...rest } = VALID_SALE;
      await request(app.getHttpServer())
        .post('/sales-record')
        .send(rest)
        .expect(400);
    });

    it('devuelve 400 cuando falta fecha', async () => {
      app = await buildApp(panelGuard);
      const { fecha: _omit, ...rest } = VALID_SALE;
      await request(app.getHttpServer())
        .post('/sales-record')
        .send(rest)
        .expect(400);
    });

    it('devuelve 401 sin token', async () => {
      app = await buildApp(noAuthGuard);
      await request(app.getHttpServer())
        .post('/sales-record')
        .send(VALID_SALE)
        .expect(401);
    });
  });

  describe('PATCH /sales-record/:id', () => {
    it('devuelve 200 con actualización de full_name', async () => {
      app = await buildApp(panelGuard);
      mockSales.updateSale.mockResolvedValue({
        id: 1,
        ...VALID_SALE,
        full_name: 'Juan Actualizado',
      });
      const res = await request(app.getHttpServer())
        .patch('/sales-record/1')
        .send({ full_name: 'Juan Actualizado' })
        .expect(200);
      expect(res.body).toHaveProperty('full_name', 'Juan Actualizado');
      expect(mockSales.updateSale).toHaveBeenCalledWith(1, {
        full_name: 'Juan Actualizado',
      });
    });

    it('devuelve 400 cuando se intenta modificar campo calculado (level_price)', async () => {
      app = await buildApp(panelGuard);
      await request(app.getHttpServer())
        .patch('/sales-record/1')
        .send({ level_price: 7 })
        .expect(400);
    });

    it('devuelve 400 cuando se intenta modificar offers_code', async () => {
      app = await buildApp(panelGuard);
      await request(app.getHttpServer())
        .patch('/sales-record/1')
        .send({ offers_code: 'NEW' })
        .expect(400);
    });

    it('devuelve 400 cuando full_name excede 200 caracteres', async () => {
      app = await buildApp(panelGuard);
      await request(app.getHttpServer())
        .patch('/sales-record/1')
        .send({ full_name: 'A'.repeat(201) })
        .expect(400);
    });

    it('devuelve 401 sin token', async () => {
      app = await buildApp(noAuthGuard);
      await request(app.getHttpServer())
        .patch('/sales-record/1')
        .send({ full_name: 'test' })
        .expect(401);
    });
  });

  describe('DELETE /sales-record/:id', () => {
    it('devuelve 200 con confirmación y recalculo implícito', async () => {
      app = await buildApp(panelGuard);
      mockSales.deleteSale.mockResolvedValue({ ok: true, id: 1 });
      const res = await request(app.getHttpServer())
        .delete('/sales-record/1')
        .expect(200);
      expect(res.body).toHaveProperty('ok', true);
      expect(mockSales.deleteSale).toHaveBeenCalledWith(1);
    });

    it('devuelve 401 sin token', async () => {
      app = await buildApp(noAuthGuard);
      await request(app.getHttpServer()).delete('/sales-record/1').expect(401);
    });
  });
});
