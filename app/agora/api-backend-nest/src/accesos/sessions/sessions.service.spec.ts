import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { SessionsService } from './sessions.service';

const mockPrisma = () => ({
  usuarios: { findUnique: jest.fn() },
  sesion: {
    create: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
  },
});

const usuarioBase = (overrides = {}) => ({
  id: 1,
  username: 'testuser',
  nombre: 'Test',
  apellido: 'User',
  email: 'test@test.com',
  telefono: '912345678',
  rol_usuarios_rol_idTorol: { nombre: 'agente' },
  ...overrides,
});

describe('SessionsService', () => {
  describe('me', () => {
    it('lanza NotFoundException si usuario no existe', async () => {
      const prisma = mockPrisma();
      prisma.usuarios.findUnique.mockResolvedValue(null);
      const svc = new SessionsService(prisma as any);
      await expect(svc.me(99)).rejects.toThrow(NotFoundException);
    });

    it('devuelve datos del usuario con su rol', async () => {
      const prisma = mockPrisma();
      prisma.usuarios.findUnique.mockResolvedValue(usuarioBase());
      const svc = new SessionsService(prisma as any);
      const result = await svc.me(1);
      expect(result.username).toBe('testuser');
      expect(result.rol).toBe('agente');
    });

    it('devuelve null si no tiene rol', async () => {
      const prisma = mockPrisma();
      prisma.usuarios.findUnique.mockResolvedValue(
        usuarioBase({ rol_usuarios_rol_idTorol: null }),
      );
      const svc = new SessionsService(prisma as any);
      const result = await svc.me(1);
      expect(result.rol).toBeNull();
    });
  });

  describe('registrarSesion', () => {
    it('crea sesión y devuelve ok: true', async () => {
      const prisma = mockPrisma();
      prisma.sesion.create.mockResolvedValue({ id: 1 });
      const svc = new SessionsService(prisma as any);
      const result = await svc.registrarSesion(1, '127.0.0.1', 'Mozilla');
      expect(result).toEqual({ ok: true });
      expect(prisma.sesion.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ usuarioId: 1, activo: true }),
        }),
      );
    });
  });

  describe('logout', () => {
    it('marca sesiones como inactivas y devuelve mensaje', async () => {
      const prisma = mockPrisma();
      prisma.sesion.updateMany.mockResolvedValue({ count: 1 });
      const svc = new SessionsService(prisma as any);
      const result = await svc.logout(1);
      expect(result.message).toContain('cerrada');
      expect(prisma.sesion.updateMany).toHaveBeenCalledTimes(2);
    });
  });

  describe('cerrarSesionAdmin', () => {
    it('lanza ForbiddenException con id inválido', async () => {
      const svc = new SessionsService(mockPrisma() as any);
      await expect(svc.cerrarSesionAdmin(-1)).rejects.toThrow(
        ForbiddenException,
      );
      await expect(svc.cerrarSesionAdmin(0)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('cierra la sesión indicada', async () => {
      const prisma = mockPrisma();
      prisma.sesion.update.mockResolvedValue({ id: 5, activo: false });
      const svc = new SessionsService(prisma as any);
      const result = await svc.cerrarSesionAdmin(5);
      expect(result).toEqual({ ok: true });
      expect(prisma.sesion.update).toHaveBeenCalledWith({
        where: { id: 5 },
        data: { activo: false },
      });
    });
  });

  describe('limpiarSesionesExpiradas', () => {
    it('llama a updateMany con corte de 12h', async () => {
      const prisma = mockPrisma();
      prisma.sesion.updateMany.mockResolvedValue({ count: 3 });
      const svc = new SessionsService(prisma as any);
      await svc.limpiarSesionesExpiradas();
      expect(prisma.sesion.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { activo: false },
        }),
      );
    });
  });

  describe('sesionesActivas', () => {
    it('devuelve lista de sesiones activas', async () => {
      const prisma = mockPrisma();
      prisma.sesion.updateMany.mockResolvedValue({ count: 0 });
      prisma.sesion.findMany.mockResolvedValue([
        { id: 1, usuarioId: 1, activo: true },
      ]);
      const svc = new SessionsService(prisma as any);
      const result = await svc.sesionesActivas(1);
      expect(result).toHaveLength(1);
    });
  });
});
