import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { offer_modality } from '@prisma/client';
import { SalesService } from './sales.service';
import { PrismaService } from '../database/prisma/prisma.service';

// ─── Stubs ───────────────────────────────────────────────────────────────────

const OFFER_STUB = {
  id: 1,
  code: '4FU',
  modality: offer_modality.POST_A_POST,
  level: 5,
  points: '1.5',
};

const PRICE_STUB = { id: 10, level: 5, range: 1, price: 800 };

const SALE_STUB = {
  id: 1,
  fecha: new Date('2026-05-15'),
  run: '12345678-9',
  full_name: 'Juan Pérez',
  phone: '912345678',
  address: 'Av. Principal 123',
  city: 'Santiago',
  province: 'Santiago',
  country: 'Chile',
  contract_number: 'C-001',
  modality: offer_modality.POST_A_POST,
  offers_code: '4FU',
  offer_id: 1,
  level_price: 5,
  points: '1.5',
  offers_price: 800,
  offer: OFFER_STUB,
};

const CREATE_DTO = {
  fecha: '2026-05-15',
  run: '12345678-9',
  full_name: 'Juan Pérez',
  phone: '912345678',
  address: 'Av. Principal 123',
  city: 'Santiago',
  province: 'Santiago',
  country: 'Chile',
  contract_number: 'C-001',
  modality: offer_modality.POST_A_POST,
  offers_code: '4FU',
};

// ─── Mocks ───────────────────────────────────────────────────────────────────

const mockTx = {
  offer: { findUnique: jest.fn() },
  points_level: { findUnique: jest.fn(), upsert: jest.fn(), update: jest.fn() },
  price_level: { findUnique: jest.fn(), findMany: jest.fn() },
  sale_record: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
    delete: jest.fn(),
  },
};

const mockPrisma = {
  points_level: { findMany: jest.fn(), findUnique: jest.fn() },
  sale_record: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  $transaction: jest
    .fn()
    .mockImplementation((fn: (tx: typeof mockTx) => Promise<unknown>) =>
      fn(mockTx),
    ),
};

async function buildService(): Promise<SalesService> {
  const module = await Test.createTestingModule({
    providers: [SalesService, { provide: PrismaService, useValue: mockPrisma }],
  }).compile();
  return module.get(SalesService);
}

describe('SalesService', () => {
  let svc: SalesService;

  beforeEach(async () => {
    jest.clearAllMocks();
    svc = await buildService();
  });

  // ─── listMonthlyPoints ──────────────────────────────────────────────────────

  describe('listMonthlyPoints', () => {
    it('delega a prisma.points_level.findMany con orden desc', async () => {
      const rows = [{ id: 1, year: 2026, month: 5, total_points: '22.5' }];
      mockPrisma.points_level.findMany.mockResolvedValue(rows);

      const result = await svc.listMonthlyPoints();

      expect(result).toBe(rows);
      expect(mockPrisma.points_level.findMany).toHaveBeenCalledWith({
        orderBy: [{ year: 'desc' }, { month: 'desc' }],
      });
    });
  });

  // ─── getMonthlyPoints ───────────────────────────────────────────────────────

  describe('getMonthlyPoints', () => {
    it('retorna total_points y active_range 2 cuando hay 22.5 puntos acumulados', async () => {
      mockPrisma.points_level.findUnique.mockResolvedValue({
        year: 2026,
        month: 5,
        total_points: '22.5',
      });

      const result = await svc.getMonthlyPoints(2026, 5);

      expect(result.total_points).toBe(22.5);
      expect(result.active_range).toBe(2);
    });

    it('retorna total_points 0 y active_range 1 cuando no hay registro del mes', async () => {
      mockPrisma.points_level.findUnique.mockResolvedValue(null);

      const result = await svc.getMonthlyPoints(2026, 6);

      expect(result.total_points).toBe(0);
      expect(result.active_range).toBe(1);
    });

    it('retorna active_range 3 cuando total >= 35', async () => {
      mockPrisma.points_level.findUnique.mockResolvedValue({
        year: 2026,
        month: 5,
        total_points: '36',
      });

      const result = await svc.getMonthlyPoints(2026, 5);

      expect(result.active_range).toBe(3);
    });
  });

  // ─── listSales ──────────────────────────────────────────────────────────────

  describe('listSales', () => {
    it('filtra por mes actual cuando no se pasan year/month', async () => {
      mockPrisma.sale_record.findMany.mockResolvedValue([SALE_STUB]);
      const now = new Date();
      const y = now.getFullYear();
      const m = now.getMonth() + 1;

      const result = await svc.listSales();

      expect(result).toEqual([SALE_STUB]);
      const call = mockPrisma.sale_record.findMany.mock.calls[0][0];
      expect(call.where.fecha.gte).toEqual(new Date(y, m - 1, 1));
      expect(call.where.fecha.lt).toEqual(new Date(y, m, 1));
    });

    it('filtra por el mes especificado cuando se pasan year y month', async () => {
      mockPrisma.sale_record.findMany.mockResolvedValue([]);

      await svc.listSales(2026, 3);

      const call = mockPrisma.sale_record.findMany.mock.calls[0][0];
      expect(call.where.fecha.gte).toEqual(new Date(2026, 2, 1));
      expect(call.where.fecha.lt).toEqual(new Date(2026, 3, 1));
    });

    it('siempre incluye la relación offer', async () => {
      mockPrisma.sale_record.findMany.mockResolvedValue([]);

      await svc.listSales(2026, 5);

      const call = mockPrisma.sale_record.findMany.mock.calls[0][0];
      expect(call.include).toEqual({ offer: true });
    });
  });

  // ─── createSale ─────────────────────────────────────────────────────────────

  describe('createSale', () => {
    it('crea venta cuando no hay cambio de rango (puntos < 20)', async () => {
      mockTx.offer.findUnique.mockResolvedValue(OFFER_STUB);
      mockTx.points_level.findUnique.mockResolvedValue({ total_points: '5' });
      mockTx.points_level.upsert.mockResolvedValue({});
      mockTx.price_level.findUnique.mockResolvedValue(PRICE_STUB);
      mockTx.sale_record.create.mockResolvedValue(SALE_STUB);

      const result = await svc.createSale(CREATE_DTO);

      expect(result).toBe(SALE_STUB);
      expect(mockTx.sale_record.create).toHaveBeenCalledTimes(1);
      expect(mockTx.sale_record.updateMany).not.toHaveBeenCalled();
    });

    it('recalcula el mes cuando los puntos cruzan el umbral de 20 (rango 1 → 2)', async () => {
      mockTx.offer.findUnique.mockResolvedValue({
        ...OFFER_STUB,
        points: '2.0',
      });
      mockTx.points_level.findUnique.mockResolvedValue({ total_points: '19' });
      mockTx.points_level.upsert.mockResolvedValue({});
      mockTx.sale_record.findMany.mockResolvedValue([{ level_price: 5 }]);
      // findUnique: precio de la venta nueva (flujo principal)
      mockTx.price_level.findUnique.mockResolvedValue({
        id: 10,
        level: 5,
        range: 2,
        price: 1200,
      });
      // findMany: precios del rango para el recálculo del mes (batch, sin N+1)
      mockTx.price_level.findMany.mockResolvedValue([
        { id: 10, level: 5, range: 2, price: 1200 },
      ]);
      mockTx.sale_record.updateMany.mockResolvedValue({ count: 2 });
      mockTx.sale_record.create.mockResolvedValue(SALE_STUB);

      await svc.createSale(CREATE_DTO);

      expect(mockTx.sale_record.updateMany).toHaveBeenCalledTimes(1);
      expect(mockTx.sale_record.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({ data: { offers_price: 1200 } }),
      );
    });

    it('lanza NotFoundException cuando la oferta no existe en el catálogo', async () => {
      mockTx.offer.findUnique.mockResolvedValue(null);

      await expect(svc.createSale(CREATE_DTO)).rejects.toThrow(
        NotFoundException,
      );

      expect(mockTx.sale_record.create).not.toHaveBeenCalled();
    });

    it('lanza NotFoundException cuando no hay precio configurado para el level/rango', async () => {
      mockTx.offer.findUnique.mockResolvedValue(OFFER_STUB);
      mockTx.points_level.findUnique.mockResolvedValue(null);
      mockTx.points_level.upsert.mockResolvedValue({});
      mockTx.price_level.findUnique.mockResolvedValue(null);

      await expect(svc.createSale(CREATE_DTO)).rejects.toThrow(
        NotFoundException,
      );

      expect(mockTx.sale_record.create).not.toHaveBeenCalled();
    });
  });

  // ─── updateSale ─────────────────────────────────────────────────────────────

  describe('updateSale', () => {
    it('actualiza los campos no-calculados', async () => {
      mockPrisma.sale_record.findUnique.mockResolvedValue(SALE_STUB);
      const updated = { ...SALE_STUB, full_name: 'Juan Actualizado' };
      mockPrisma.sale_record.update.mockResolvedValue(updated);

      const result = await svc.updateSale(1, { full_name: 'Juan Actualizado' });

      expect(result).toBe(updated);
      expect(mockPrisma.sale_record.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { full_name: 'Juan Actualizado' },
        include: { offer: true },
      });
    });

    it('lanza NotFoundException cuando la venta no existe', async () => {
      mockPrisma.sale_record.findUnique.mockResolvedValue(null);

      await expect(svc.updateSale(99, { full_name: 'x' })).rejects.toThrow(
        NotFoundException,
      );

      expect(mockPrisma.sale_record.update).not.toHaveBeenCalled();
    });
  });

  // ─── deleteSale ─────────────────────────────────────────────────────────────

  describe('deleteSale', () => {
    it('elimina la venta y retorna { ok: true } sin recalcular cuando no hay registro mensual', async () => {
      mockTx.sale_record.findUnique.mockResolvedValue(SALE_STUB);
      mockTx.sale_record.delete.mockResolvedValue(SALE_STUB);
      mockTx.points_level.findUnique.mockResolvedValue(null);

      const result = await svc.deleteSale(1);

      expect(result).toEqual({ ok: true, id: 1 });
      expect(mockTx.points_level.update).not.toHaveBeenCalled();
    });

    it('recalcula el mes cuando la eliminación baja el rango (25 → 23.5, rango 2 → 2, sin recalculo)', async () => {
      mockTx.sale_record.findUnique.mockResolvedValue({
        ...SALE_STUB,
        points: '1.5',
      });
      mockTx.sale_record.delete.mockResolvedValue({});
      mockTx.points_level.findUnique.mockResolvedValue({ total_points: '25' });
      mockTx.points_level.update.mockResolvedValue({});

      const result = await svc.deleteSale(1);

      expect(result).toEqual({ ok: true, id: 1 });
      expect(mockTx.points_level.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { total_points: 23.5 } }),
      );
      expect(mockTx.sale_record.updateMany).not.toHaveBeenCalled();
    });

    it('recalcula el mes cuando la eliminación baja el rango (21 → 19.5, rango 2 → 1)', async () => {
      mockTx.sale_record.findUnique.mockResolvedValue({
        ...SALE_STUB,
        points: '1.5',
      });
      mockTx.sale_record.delete.mockResolvedValue({});
      mockTx.points_level.findUnique.mockResolvedValue({ total_points: '21' });
      mockTx.points_level.update.mockResolvedValue({});
      mockTx.sale_record.findMany.mockResolvedValue([{ level_price: 5 }]);
      // recalc del mes usa findMany (batch de precios del rango, sin N+1)
      mockTx.price_level.findMany.mockResolvedValue([
        { id: 11, level: 5, range: 1, price: 500 },
      ]);
      mockTx.sale_record.updateMany.mockResolvedValue({ count: 3 });

      const result = await svc.deleteSale(1);

      expect(result).toEqual({ ok: true, id: 1 });
      expect(mockTx.sale_record.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({ data: { offers_price: 500 } }),
      );
    });

    it('lanza NotFoundException cuando la venta no existe', async () => {
      mockTx.sale_record.findUnique.mockResolvedValue(null);

      await expect(svc.deleteSale(99)).rejects.toThrow(NotFoundException);

      expect(mockTx.sale_record.delete).not.toHaveBeenCalled();
    });
  });
});
