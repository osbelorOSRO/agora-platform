import { ConflictException, NotFoundException } from '@nestjs/common';
import { OffersService } from './offers.service';

const offerRow = (overrides = {}) => ({
  codigo: 'PLAN-01',
  nombre: 'Plan Básico',
  precio_base: '9990',
  tipo: 'postpago',
  descripcion: null,
  lineas: 1,
  excluye_alta: false,
  excluye_portabilidad_postpago: false,
  url_archivo: null,
  precio_normal: 9990,
  duracion_precio: '12m',
  gigas: 10,
  minutos: 'ilimitados',
  tiene_redes_libres: false,
  roaming: null,
  ...overrides,
});

const mockPrisma = () => ({
  $queryRawUnsafe: jest.fn(),
  $executeRawUnsafe: jest.fn(),
});

describe('OffersService', () => {
  describe('findAll', () => {
    it('devuelve lista de ofertas', async () => {
      const prisma = mockPrisma();
      prisma.$queryRawUnsafe.mockResolvedValue([offerRow()]);
      const svc = new OffersService(prisma as any);
      const result = await svc.findAll();
      expect(result).toHaveLength(1);
      expect(result[0].codigo).toBe('PLAN-01');
    });
  });

  describe('findOne', () => {
    it('lanza NotFoundException si no existe', async () => {
      const prisma = mockPrisma();
      prisma.$queryRawUnsafe.mockResolvedValue([]);
      const svc = new OffersService(prisma as any);
      await expect(svc.findOne('NO-EXISTE')).rejects.toThrow(NotFoundException);
    });

    it('devuelve la oferta si existe', async () => {
      const prisma = mockPrisma();
      prisma.$queryRawUnsafe.mockResolvedValue([offerRow()]);
      const svc = new OffersService(prisma as any);
      const result = await svc.findOne('PLAN-01');
      expect(result.nombre).toBe('Plan Básico');
    });
  });

  describe('create', () => {
    it('lanza ConflictException si el código ya existe', async () => {
      const prisma = mockPrisma();
      prisma.$queryRawUnsafe.mockResolvedValueOnce([offerRow()]);
      const svc = new OffersService(prisma as any);
      await expect(svc.create({ codigo: 'PLAN-01' } as any)).rejects.toThrow(
        ConflictException,
      );
    });

    it('crea y devuelve la oferta nueva', async () => {
      const prisma = mockPrisma();
      prisma.$queryRawUnsafe
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([offerRow({ codigo: 'PLAN-02' })]);
      const svc = new OffersService(prisma as any);
      const result = await svc.create({ codigo: 'PLAN-02' } as any);
      expect(result.codigo).toBe('PLAN-02');
    });
  });

  describe('update', () => {
    it('lanza NotFoundException si el código no existe', async () => {
      const prisma = mockPrisma();
      prisma.$queryRawUnsafe.mockResolvedValue([]);
      const svc = new OffersService(prisma as any);
      await expect(svc.update('NO-EXISTE', { nombre: 'X' })).rejects.toThrow(
        NotFoundException,
      );
    });

    it('devuelve sin cambios si dto está vacío', async () => {
      const prisma = mockPrisma();
      prisma.$queryRawUnsafe.mockResolvedValue([offerRow()]);
      const svc = new OffersService(prisma as any);
      const result = await svc.update('PLAN-01', {});
      expect(result.codigo).toBe('PLAN-01');
    });

    it('actualiza y devuelve la oferta modificada', async () => {
      const prisma = mockPrisma();
      prisma.$queryRawUnsafe
        .mockResolvedValueOnce([offerRow()])
        .mockResolvedValueOnce([offerRow({ nombre: 'Plan Premium' })]);
      const svc = new OffersService(prisma as any);
      const result = await svc.update('PLAN-01', { nombre: 'Plan Premium' });
      expect(result.nombre).toBe('Plan Premium');
    });
  });

  describe('remove', () => {
    it('lanza NotFoundException si no existe', async () => {
      const prisma = mockPrisma();
      prisma.$queryRawUnsafe.mockResolvedValue([]);
      const svc = new OffersService(prisma as any);
      await expect(svc.remove('NO-EXISTE')).rejects.toThrow(NotFoundException);
    });

    it('elimina y devuelve ok', async () => {
      const prisma = mockPrisma();
      prisma.$queryRawUnsafe.mockResolvedValue([offerRow()]);
      prisma.$executeRawUnsafe.mockResolvedValue(1);
      const svc = new OffersService(prisma as any);
      const result = await svc.remove('PLAN-01');
      expect(result).toEqual({ ok: true, codigo: 'PLAN-01' });
    });
  });
});
