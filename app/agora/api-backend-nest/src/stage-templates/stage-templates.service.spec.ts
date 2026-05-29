import { NotFoundException } from '@nestjs/common';
import { StageTemplatesService } from './stage-templates.service';

const row = (overrides = {}) => ({
  id: '1',
  stage_actual: 'INICIO',
  posicion: 1,
  posibles_match: 'hola',
  es_fallback: false,
  procesa_datos: false,
  dato_esperado: null,
  nuevo_stage: 'PASO_2',
  tipo_respuesta: 'texto',
  activo: true,
  stage_route: null,
  modo_default: null,
  factible: null,
  decision: null,
  accion: null,
  created_at: new Date(),
  updated_at: new Date(),
  ...overrides,
});

const mockPrisma = () => ({
  $queryRawUnsafe: jest.fn(),
  $executeRawUnsafe: jest.fn(),
});

describe('StageTemplatesService', () => {
  describe('findAll', () => {
    it('devuelve todos los templates sin filtro', async () => {
      const prisma = mockPrisma();
      prisma.$queryRawUnsafe.mockResolvedValue([row()]);
      const svc = new StageTemplatesService(prisma as any);
      const result = await svc.findAll();
      expect(result).toHaveLength(1);
    });

    it('filtra por stageActual cuando se provee', async () => {
      const prisma = mockPrisma();
      prisma.$queryRawUnsafe.mockResolvedValue([row()]);
      const svc = new StageTemplatesService(prisma as any);
      await svc.findAll('INICIO');
      const call = (prisma.$queryRawUnsafe as jest.Mock).mock
        .calls[0][0] as string;
      expect(call).toContain('WHERE stage_actual');
    });
  });

  describe('findOne', () => {
    it('lanza NotFoundException si no existe', async () => {
      const prisma = mockPrisma();
      prisma.$queryRawUnsafe.mockResolvedValue([]);
      const svc = new StageTemplatesService(prisma as any);
      await expect(svc.findOne(99)).rejects.toThrow(NotFoundException);
    });

    it('devuelve el template si existe', async () => {
      const prisma = mockPrisma();
      prisma.$queryRawUnsafe.mockResolvedValue([row()]);
      const svc = new StageTemplatesService(prisma as any);
      const result = await svc.findOne(1);
      expect(result.stage_actual).toBe('INICIO');
    });
  });

  describe('create', () => {
    it('inserta y devuelve el nuevo template', async () => {
      const prisma = mockPrisma();
      prisma.$queryRawUnsafe.mockResolvedValue([row()]);
      const svc = new StageTemplatesService(prisma as any);
      const dto = {
        stage_actual: 'INICIO',
        posibles_match: 'hola',
        nuevo_stage: 'PASO_2',
        tipo_respuesta: 'texto',
      } as any;
      const result = await svc.create(dto);
      expect(result.stage_actual).toBe('INICIO');
    });
  });

  describe('update', () => {
    it('lanza NotFoundException si el template no existe', async () => {
      const prisma = mockPrisma();
      prisma.$queryRawUnsafe.mockResolvedValue([]);
      const svc = new StageTemplatesService(prisma as any);
      await expect(svc.update(99, { activo: false })).rejects.toThrow(
        NotFoundException,
      );
    });

    it('devuelve sin cambios si dto está vacío', async () => {
      const prisma = mockPrisma();
      prisma.$queryRawUnsafe.mockResolvedValue([row()]);
      const svc = new StageTemplatesService(prisma as any);
      const result = await svc.update(1, {});
      expect(result.id).toBe('1');
    });

    it('actualiza con los campos provistos', async () => {
      const prisma = mockPrisma();
      prisma.$queryRawUnsafe
        .mockResolvedValueOnce([row()])
        .mockResolvedValueOnce([row({ activo: false })]);
      const svc = new StageTemplatesService(prisma as any);
      const result = await svc.update(1, { activo: false });
      expect(result.activo).toBe(false);
    });
  });

  describe('remove', () => {
    it('lanza NotFoundException si no existe', async () => {
      const prisma = mockPrisma();
      prisma.$queryRawUnsafe.mockResolvedValue([]);
      const svc = new StageTemplatesService(prisma as any);
      await expect(svc.remove(99)).rejects.toThrow(NotFoundException);
    });

    it('elimina y devuelve ok', async () => {
      const prisma = mockPrisma();
      prisma.$queryRawUnsafe.mockResolvedValue([row()]);
      prisma.$executeRawUnsafe.mockResolvedValue(1);
      const svc = new StageTemplatesService(prisma as any);
      const result = await svc.remove(1);
      expect(result).toEqual({ ok: true, id: 1 });
    });
  });
});
