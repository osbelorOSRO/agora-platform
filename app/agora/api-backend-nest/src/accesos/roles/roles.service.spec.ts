import { BadRequestException, NotFoundException } from '@nestjs/common';
import { RolesService } from './roles.service';

const rolRow = (overrides = {}) => ({
  id: 1,
  nombre: 'agente',
  creado_en: new Date(),
  actualizado_en: new Date(),
  rol_permiso: [{ permiso: { id: 10 } }, { permiso: { id: 20 } }],
  usuarios_rol_creado_por_idTousuarios: null,
  usuarios_rol_actualizado_por_idTousuarios: null,
  ...overrides,
});

const mockPrisma = () => ({
  rol: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  rol_permiso: { deleteMany: jest.fn() },
});

describe('RolesService', () => {
  describe('obtenerRoles', () => {
    it('devuelve lista mapeada con permisos como array de ids', async () => {
      const prisma = mockPrisma();
      prisma.rol.findMany.mockResolvedValue([rolRow()]);
      const svc = new RolesService(prisma as any);
      const result = await svc.obtenerRoles();
      expect(result).toHaveLength(1);
      expect(result[0].permisos).toEqual([10, 20]);
    });
  });

  describe('obtenerRolPorId', () => {
    it('lanza NotFoundException si no existe', async () => {
      const prisma = mockPrisma();
      prisma.rol.findUnique.mockResolvedValue(null);
      const svc = new RolesService(prisma as any);
      await expect(svc.obtenerRolPorId(99)).rejects.toThrow(NotFoundException);
    });

    it('devuelve el rol mapeado', async () => {
      const prisma = mockPrisma();
      prisma.rol.findUnique.mockResolvedValue(rolRow());
      const svc = new RolesService(prisma as any);
      const result = await svc.obtenerRolPorId(1);
      expect(result.nombre).toBe('agente');
      expect(result.permisos).toEqual([10, 20]);
    });
  });

  describe('crearRol', () => {
    it('lanza BadRequestException con nombre vacío', async () => {
      const svc = new RolesService(mockPrisma() as any);
      await expect(svc.crearRol('', [1])).rejects.toThrow(BadRequestException);
    });

    it('lanza BadRequestException con permisos inválidos', async () => {
      const svc = new RolesService(mockPrisma() as any);
      await expect(
        svc.crearRol('agente', ['no-numero'] as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('crea el rol y devuelve mapeado', async () => {
      const prisma = mockPrisma();
      prisma.rol.create.mockResolvedValue(rolRow());
      const svc = new RolesService(prisma as any);
      const result = await svc.crearRol('agente', [10, 20]);
      expect(result.nombre).toBe('agente');
    });
  });

  describe('actualizarRol', () => {
    it('lanza BadRequestException con nombre demasiado largo', async () => {
      const svc = new RolesService(mockPrisma() as any);
      await expect(svc.actualizarRol(1, 'a'.repeat(101), [])).rejects.toThrow(
        BadRequestException,
      );
    });

    it('actualiza y devuelve el rol mapeado', async () => {
      const prisma = mockPrisma();
      prisma.rol_permiso.deleteMany.mockResolvedValue({ count: 1 });
      prisma.rol.update.mockResolvedValue(rolRow({ nombre: 'supervisor' }));
      const svc = new RolesService(prisma as any);
      const result = await svc.actualizarRol(1, 'supervisor', [10]);
      expect(result.nombre).toBe('supervisor');
      expect(prisma.rol_permiso.deleteMany).toHaveBeenCalledWith({
        where: { rol_id: 1 },
      });
    });
  });
});
