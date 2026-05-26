import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { offer_modality } from '@prisma/client';
import { SalesCatalogService } from './sales-catalog.service';
import { PrismaService } from '../database/prisma/prisma.service';
import { CacheService } from '../cache/cache.service';

const OFFER_STUB = {
  id: 1,
  code: '4FU',
  modality: offer_modality.POST_A_POST,
  level: 5,
  points: '1.5',
};

const mockPrisma = {
  offer: {
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

async function buildService(): Promise<SalesCatalogService> {
  const module = await Test.createTestingModule({
    providers: [
      SalesCatalogService,
      { provide: PrismaService, useValue: mockPrisma },
      { provide: CacheService, useValue: mockCache },
    ],
  }).compile();
  return module.get(SalesCatalogService);
}

describe('SalesCatalogService', () => {
  let svc: SalesCatalogService;

  beforeEach(async () => {
    jest.clearAllMocks();
    svc = await buildService();
  });

  // ─── listCatalog ────────────────────────────────────────────────────────────

  describe('listCatalog', () => {
    it('retorna lista cacheada sin consultar Prisma', async () => {
      const cached = [OFFER_STUB];
      mockCache.get.mockResolvedValue(cached);

      const result = await svc.listCatalog();

      expect(result).toBe(cached);
      expect(mockPrisma.offer.findMany).not.toHaveBeenCalled();
      expect(mockCache.set).not.toHaveBeenCalled();
    });

    it('consulta Prisma y guarda en cache cuando no hay hit', async () => {
      mockCache.get.mockResolvedValue(undefined);
      mockPrisma.offer.findMany.mockResolvedValue([OFFER_STUB]);

      const result = await svc.listCatalog();

      expect(result).toEqual([OFFER_STUB]);
      expect(mockPrisma.offer.findMany).toHaveBeenCalledTimes(1);
      expect(mockCache.set).toHaveBeenCalledWith('sales:catalog:list', [OFFER_STUB], 300);
    });
  });

  // ─── createCatalog ──────────────────────────────────────────────────────────

  describe('createCatalog', () => {
    it('crea la oferta e invalida cache', async () => {
      mockPrisma.offer.findUnique.mockResolvedValue(null);
      mockPrisma.offer.create.mockResolvedValue(OFFER_STUB);

      const result = await svc.createCatalog({
        code: '4FU',
        modality: offer_modality.POST_A_POST,
        level: 5,
        points: 1.5,
      });

      expect(result).toBe(OFFER_STUB);
      expect(mockPrisma.offer.create).toHaveBeenCalledTimes(1);
      expect(mockCache.del).toHaveBeenCalledWith('sales:catalog:list');
    });

    it('lanza ConflictException cuando ya existe la combinación code/modality', async () => {
      mockPrisma.offer.findUnique.mockResolvedValue(OFFER_STUB);

      await expect(
        svc.createCatalog({
          code: '4FU',
          modality: offer_modality.POST_A_POST,
          level: 5,
          points: 1.5,
        }),
      ).rejects.toThrow(ConflictException);

      expect(mockPrisma.offer.create).not.toHaveBeenCalled();
      expect(mockCache.del).not.toHaveBeenCalled();
    });
  });

  // ─── updateCatalog ──────────────────────────────────────────────────────────

  describe('updateCatalog', () => {
    it('actualiza la oferta e invalida cache', async () => {
      mockPrisma.offer.findUnique.mockResolvedValue(OFFER_STUB);
      const updated = { ...OFFER_STUB, level: 7 };
      mockPrisma.offer.update.mockResolvedValue(updated);

      const result = await svc.updateCatalog(1, { level: 7 });

      expect(result).toBe(updated);
      expect(mockPrisma.offer.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { level: 7 },
      });
      expect(mockCache.del).toHaveBeenCalledWith('sales:catalog:list');
    });

    it('lanza NotFoundException cuando la oferta no existe', async () => {
      mockPrisma.offer.findUnique.mockResolvedValue(null);

      await expect(svc.updateCatalog(99, { level: 3 })).rejects.toThrow(NotFoundException);

      expect(mockPrisma.offer.update).not.toHaveBeenCalled();
    });
  });

  // ─── deleteCatalog ──────────────────────────────────────────────────────────

  describe('deleteCatalog', () => {
    it('elimina la oferta e invalida cache', async () => {
      mockPrisma.offer.findUnique.mockResolvedValue(OFFER_STUB);
      mockPrisma.offer.delete.mockResolvedValue(OFFER_STUB);

      const result = await svc.deleteCatalog(1);

      expect(result).toEqual({ ok: true, id: 1 });
      expect(mockCache.del).toHaveBeenCalledWith('sales:catalog:list');
    });

    it('lanza NotFoundException cuando la oferta no existe', async () => {
      mockPrisma.offer.findUnique.mockResolvedValue(null);

      await expect(svc.deleteCatalog(99)).rejects.toThrow(NotFoundException);

      expect(mockPrisma.offer.delete).not.toHaveBeenCalled();
    });

    it('lanza ConflictException cuando hay ventas asociadas (FK violation)', async () => {
      mockPrisma.offer.findUnique.mockResolvedValue(OFFER_STUB);
      mockPrisma.offer.delete.mockRejectedValue(new Error('Foreign key constraint failed'));

      await expect(svc.deleteCatalog(1)).rejects.toThrow(ConflictException);
    });
  });
});
