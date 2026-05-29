import { BadRequestException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import {
  OfferContextService,
  OfferEventRow,
  OfferPlanRow,
} from './offer-context.service';
import { PrismaService } from '../../database/prisma/prisma.service';

const PLAN_STUB: OfferPlanRow = {
  codigo: 'PLAN_A',
  nombre: 'Plan A',
  precioBase: '9990',
  descripcion: 'Desc A',
  precioNormal: '9990',
  urlArchivo: null,
  duracionPrecio: null,
  gigas: 10,
  minutos: 'Ilimitado',
  tieneRedesLibres: false,
  roaming: null,
};

const EVENT_STUB: OfferEventRow = {
  id: 'uuid-1',
  sessionId: 'sess-1',
  stageActual: 'oferta',
  tipo: 'portabilidad',
  codigo: 'PLAN_A',
  nombrePlan: 'Plan A',
  precioBase: '9990',
  descripcion: 'Desc A',
  precioNormal: '9990',
  urlArchivo: null,
  duracionPrecio: null,
  gigas: 10,
  minutos: 'Ilimitado',
  tieneRedesLibres: false,
  roaming: null,
  decision: 'indefinido',
  createdAt: new Date('2024-01-01'),
  updatedAt: null,
};

function buildPrisma(overrides: Partial<{ queryRawUnsafe: jest.Mock }> = {}) {
  return {
    $queryRawUnsafe: overrides.queryRawUnsafe ?? jest.fn(),
    $executeRawUnsafe: jest.fn(),
  } as unknown as PrismaService;
}

async function buildService(prisma: PrismaService) {
  const module = await Test.createTestingModule({
    providers: [
      OfferContextService,
      { provide: PrismaService, useValue: prisma },
    ],
  }).compile();
  return module.get(OfferContextService);
}

describe('OfferContextService', () => {
  describe('createOfferEventForAutomation', () => {
    it('inserta evento y retorna la fila', async () => {
      const prisma = buildPrisma({
        queryRawUnsafe: jest
          .fn()
          .mockResolvedValueOnce([PLAN_STUB]) // getOfferPlanByCode
          .mockResolvedValueOnce([EVENT_STUB]), // INSERT RETURNING
      });
      const svc = await buildService(prisma);

      const result = await svc.createOfferEventForAutomation({
        sessionId: 'sess-1',
        stageActual: 'oferta',
        tipo: 'portabilidad',
        codigo: 'PLAN_A',
        decision: 'Interesado',
      });

      expect(result).toEqual(EVENT_STUB);
      // normaliza decision a lowercase
      const insertCall = (prisma.$queryRawUnsafe as jest.Mock).mock.calls[1];
      expect(insertCall).toContain('interesado');
    });

    it('lanza BadRequest si el codigo no existe', async () => {
      const prisma = buildPrisma({
        queryRawUnsafe: jest.fn().mockResolvedValueOnce([]), // plan not found
      });
      const svc = await buildService(prisma);

      await expect(
        svc.createOfferEventForAutomation({
          sessionId: 's',
          stageActual: 'x',
          tipo: 'portabilidad',
          codigo: 'BAD',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getOfferEventById', () => {
    it('retorna el evento cuando existe', async () => {
      const prisma = buildPrisma({
        queryRawUnsafe: jest.fn().mockResolvedValueOnce([EVENT_STUB]),
      });
      const svc = await buildService(prisma);

      const result = await svc.getOfferEventById('uuid-1');
      expect(result.id).toBe('uuid-1');
      expect(result.sessionId).toBe('sess-1');
    });

    it('lanza BadRequest si el evento no existe', async () => {
      const prisma = buildPrisma({
        queryRawUnsafe: jest.fn().mockResolvedValueOnce([]),
      });
      const svc = await buildService(prisma);

      await expect(svc.getOfferEventById('no-existe')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('listOfferEvents', () => {
    it('retorna lista filtrada por sessionId', async () => {
      const events = [EVENT_STUB, { ...EVENT_STUB, id: 'uuid-2' }];
      const prisma = buildPrisma({
        queryRawUnsafe: jest.fn().mockResolvedValueOnce(events),
      });
      const svc = await buildService(prisma);

      const result = await svc.listOfferEvents({ sessionId: 'sess-1' });
      expect(result).toHaveLength(2);
      expect((prisma.$queryRawUnsafe as jest.Mock).mock.calls[0]).toContain(
        'sess-1',
      );
    });

    it('pasa null para filtros omitidos', async () => {
      const prisma = buildPrisma({
        queryRawUnsafe: jest.fn().mockResolvedValueOnce([]),
      });
      const svc = await buildService(prisma);

      await svc.listOfferEvents({});
      const args = (prisma.$queryRawUnsafe as jest.Mock).mock.calls[0];
      expect(args.slice(1)).toEqual([null, null, null, null, null]);
    });
  });

  describe('updateOfferEventForAutomation', () => {
    it('lanza BadRequest si el evento no existe', async () => {
      const prisma = buildPrisma({
        queryRawUnsafe: jest.fn().mockResolvedValueOnce([]), // getOfferEventById → not found
      });
      const svc = await buildService(prisma);

      await expect(
        svc.updateOfferEventForAutomation('no-existe', { decision: 'acepta' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('lanza BadRequest si no hay cambios reales', async () => {
      const prisma = buildPrisma({
        queryRawUnsafe: jest.fn().mockResolvedValueOnce([EVENT_STUB]), // getOfferEventById
      });
      const svc = await buildService(prisma);

      await expect(
        svc.updateOfferEventForAutomation('uuid-1', {}),
      ).rejects.toThrow(BadRequestException);
    });

    it('actualiza el evento y devuelve la fila modificada', async () => {
      const updated = { ...EVENT_STUB, decision: 'acepta' };
      const prisma = buildPrisma({
        queryRawUnsafe: jest
          .fn()
          .mockResolvedValueOnce([EVENT_STUB]) // getOfferEventById
          .mockResolvedValueOnce([updated]), // UPDATE RETURNING
      });
      const svc = await buildService(prisma);

      const result = await svc.updateOfferEventForAutomation('uuid-1', {
        decision: 'acepta',
      });

      expect(result.decision).toBe('acepta');
    });

    it('actualiza el codigo del plan cuando se envía input.codigo', async () => {
      const updated = { ...EVENT_STUB, codigo: 'PLAN_B' };
      const prisma = buildPrisma({
        queryRawUnsafe: jest
          .fn()
          .mockResolvedValueOnce([EVENT_STUB]) // getOfferEventById
          .mockResolvedValueOnce([PLAN_STUB]) // getOfferPlanByCode
          .mockResolvedValueOnce([updated]), // UPDATE RETURNING
      });
      const svc = await buildService(prisma);

      const result = await svc.updateOfferEventForAutomation('uuid-1', {
        codigo: 'PLAN_B',
      });

      expect(result.codigo).toBe('PLAN_B');
    });
  });

  describe('getOfferContextForAutomation', () => {
    it('lanza BadRequest si no se envía sessionId', async () => {
      const prisma = buildPrisma();
      const svc = await buildService(prisma);

      await expect(
        svc.getOfferContextForAutomation({ sessionId: '' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('devuelve contexto con catalog vacío si no hay planes', async () => {
      const prisma = buildPrisma({
        queryRawUnsafe: jest
          .fn()
          .mockResolvedValueOnce([]) // listOfferEvents
          .mockResolvedValueOnce([]), // listOfferCatalogPlans
      });
      const svc = await buildService(prisma);

      const result = await svc.getOfferContextForAutomation({
        sessionId: 'sess-1',
      });

      expect(result.sessionId).toBe('sess-1');
      expect(result.catalog).toEqual([]);
      expect(result.currentOffer).toBeNull();
    });

    it('devuelve currentOffer del evento más reciente si no se especifica currentOfferId', async () => {
      const prisma = buildPrisma({
        queryRawUnsafe: jest
          .fn()
          .mockResolvedValueOnce([EVENT_STUB]) // listOfferEvents
          .mockResolvedValueOnce([]), // listOfferCatalogPlans
      });
      const svc = await buildService(prisma);

      const result = await svc.getOfferContextForAutomation({
        sessionId: 'sess-1',
      });

      expect(result.currentOffer?.id).toBe('uuid-1');
    });

    it('normaliza modo inválido a portabilidad por defecto', async () => {
      const prisma = buildPrisma({
        queryRawUnsafe: jest
          .fn()
          .mockResolvedValueOnce([])
          .mockResolvedValueOnce([]),
      });
      const svc = await buildService(prisma);

      const result = await svc.getOfferContextForAutomation({
        sessionId: 'sess-1',
        modo: 'invalido',
      });

      expect(result.modo).toBe('portabilidad');
    });
  });
});
