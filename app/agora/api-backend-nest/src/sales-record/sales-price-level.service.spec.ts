import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { SalesPriceLevelService } from './sales-price-level.service';
import { PrismaService } from '../database/prisma/prisma.service';
import { CacheService } from '../cache/cache.service';

const PRICE_STUB = { id: 1, level: 9, range: 3, price: 1500 };

const mockPrisma = {
  price_level: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
};

const mockCache = {
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
};

async function buildService(): Promise<SalesPriceLevelService> {
  const module = await Test.createTestingModule({
    providers: [
      SalesPriceLevelService,
      { provide: PrismaService, useValue: mockPrisma },
      { provide: CacheService, useValue: mockCache },
    ],
  }).compile();
  return module.get(SalesPriceLevelService);
}

describe('SalesPriceLevelService', () => {
  let svc: SalesPriceLevelService;

  beforeEach(async () => {
    jest.clearAllMocks();
    svc = await buildService();
  });

  // ─── listPriceMatrix ────────────────────────────────────────────────────────

  describe('listPriceMatrix', () => {
    it('retorna lista cacheada sin consultar Prisma', async () => {
      const cached = [PRICE_STUB];
      mockCache.get.mockResolvedValue(cached);

      const result = await svc.listPriceMatrix();

      expect(result).toBe(cached);
      expect(mockPrisma.price_level.findMany).not.toHaveBeenCalled();
    });

    it('consulta Prisma y guarda en cache cuando no hay hit', async () => {
      mockCache.get.mockResolvedValue(undefined);
      mockPrisma.price_level.findMany.mockResolvedValue([PRICE_STUB]);

      const result = await svc.listPriceMatrix();

      expect(result).toEqual([PRICE_STUB]);
      expect(mockCache.set).toHaveBeenCalledWith('sales:price-matrix:list', [PRICE_STUB], 300);
    });
  });

  // ─── createPriceLevel ───────────────────────────────────────────────────────

  describe('createPriceLevel', () => {
    it('crea la entrada e invalida cache', async () => {
      mockPrisma.price_level.findUnique.mockResolvedValue(null);
      mockPrisma.price_level.create.mockResolvedValue(PRICE_STUB);

      const result = await svc.createPriceLevel({ level: 9, range: 3, price: 1500 });

      expect(result).toBe(PRICE_STUB);
      expect(mockCache.del).toHaveBeenCalledWith('sales:price-matrix:list');
    });

    it('lanza ConflictException cuando ya existe la combinación level/range', async () => {
      mockPrisma.price_level.findUnique.mockResolvedValue(PRICE_STUB);

      await expect(
        svc.createPriceLevel({ level: 9, range: 3, price: 1500 }),
      ).rejects.toThrow(ConflictException);

      expect(mockPrisma.price_level.create).not.toHaveBeenCalled();
    });
  });

  // ─── updatePriceLevel ───────────────────────────────────────────────────────

  describe('updatePriceLevel', () => {
    it('actualiza el precio e invalida cache', async () => {
      mockPrisma.price_level.findUnique.mockResolvedValue(PRICE_STUB);
      const updated = { ...PRICE_STUB, price: 2000 };
      mockPrisma.price_level.update.mockResolvedValue(updated);

      const result = await svc.updatePriceLevel(1, { price: 2000 });

      expect(result).toBe(updated);
      expect(mockPrisma.price_level.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { price: 2000 },
      });
      expect(mockCache.del).toHaveBeenCalledWith('sales:price-matrix:list');
    });

    it('lanza NotFoundException cuando la entrada no existe', async () => {
      mockPrisma.price_level.findUnique.mockResolvedValue(null);

      await expect(svc.updatePriceLevel(99, { price: 500 })).rejects.toThrow(NotFoundException);

      expect(mockPrisma.price_level.update).not.toHaveBeenCalled();
    });
  });

  // ─── deletePriceLevel ───────────────────────────────────────────────────────

  describe('deletePriceLevel', () => {
    it('elimina la entrada e invalida cache', async () => {
      mockPrisma.price_level.findUnique.mockResolvedValue(PRICE_STUB);
      mockPrisma.price_level.delete.mockResolvedValue(PRICE_STUB);

      const result = await svc.deletePriceLevel(1);

      expect(result).toEqual({ ok: true, id: 1 });
      expect(mockCache.del).toHaveBeenCalledWith('sales:price-matrix:list');
    });

    it('lanza NotFoundException cuando la entrada no existe', async () => {
      mockPrisma.price_level.findUnique.mockResolvedValue(null);

      await expect(svc.deletePriceLevel(99)).rejects.toThrow(NotFoundException);

      expect(mockPrisma.price_level.delete).not.toHaveBeenCalled();
    });
  });
});
