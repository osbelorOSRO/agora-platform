import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { UsersService } from './users.service';

const mockPrisma = () => {
  const p = {
    rol: { findUnique: jest.fn() },
    usuarios: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    $transaction: jest.fn(),
  };
  p.$transaction.mockImplementation(
    async (cb: (tx: typeof p) => Promise<unknown>) => cb(p),
  );
  return p;
};

const baseUser = (overrides = {}) => ({
  id: 1,
  username: 'testuser',
  nombre: 'Test',
  apellido: 'User',
  run: '12345678-9',
  telefono: '912345678',
  email: 'test@test.com',
  password: 'hashed',
  bloqueado: false,
  protegido: false,
  cancelado: false,
  invitation_token: null,
  invitation_expires_at: null,
  mfa_bypass_token: null,
  reset_token: null,
  creado_en: new Date(),
  actualizado_en: new Date(),
  rol_usuarios_rol_idTorol: { id: 1, nombre: 'agente' },
  usuarios_usuarios_creado_por_idTousuarios: null,
  usuarios_usuarios_actualizado_por_idTousuarios: null,
  ...overrides,
});

describe('UsersService', () => {
  // ─── preregistrarUsuario ──────────────────────────────────────────────────

  describe('preregistrarUsuario', () => {
    it('lanza BadRequestException si faltan campos', async () => {
      const svc = new UsersService(mockPrisma() as any);
      await expect(svc.preregistrarUsuario('', 1, null)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('lanza BadRequestException si rolId no existe', async () => {
      const prisma = mockPrisma();
      prisma.rol.findUnique.mockResolvedValue(null);
      const svc = new UsersService(prisma as any);
      await expect(
        svc.preregistrarUsuario('usuario', 99, null),
      ).rejects.toThrow(BadRequestException);
    });

    it('lanza ConflictException si el username ya existe', async () => {
      const prisma = mockPrisma();
      prisma.rol.findUnique.mockResolvedValue({ id: 1, nombre: 'agente' });
      prisma.usuarios.findUnique.mockResolvedValue(
        baseUser({ cancelado: false }),
      );
      const svc = new UsersService(prisma as any);
      await expect(
        svc.preregistrarUsuario('testuser', 1, null),
      ).rejects.toThrow(ConflictException);
    });

    it('crea usuario y devuelve invitationToken', async () => {
      const prisma = mockPrisma();
      prisma.rol.findUnique.mockResolvedValue({ id: 1, nombre: 'agente' });
      prisma.usuarios.findUnique.mockResolvedValue(null);
      prisma.usuarios.create.mockResolvedValue(baseUser());
      const svc = new UsersService(prisma as any);
      const result = await svc.preregistrarUsuario('nuevo', 1, null);
      expect(result.invitationToken).toBeDefined();
      expect(result.message).toContain('preregistrado');
    });

    it('lanza ConflictException con P2002 de Prisma', async () => {
      const prisma = mockPrisma();
      prisma.rol.findUnique.mockResolvedValue({ id: 1, nombre: 'agente' });
      prisma.usuarios.findUnique.mockResolvedValue(null);
      const err = new Prisma.PrismaClientKnownRequestError('unique', {
        code: 'P2002',
        clientVersion: '7.0.0',
      });
      prisma.usuarios.create.mockRejectedValue(err);
      const svc = new UsersService(prisma as any);
      await expect(svc.preregistrarUsuario('nuevo', 1, null)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  // ─── obtenerUsuarios ──────────────────────────────────────────────────────

  describe('obtenerUsuarios', () => {
    it('devuelve lista mapeada con estado calculado', async () => {
      const prisma = mockPrisma();
      prisma.usuarios.findMany.mockResolvedValue([baseUser()]);
      const svc = new UsersService(prisma as any);
      const result = await svc.obtenerUsuarios();
      expect(result).toHaveLength(1);
      expect(result[0].estado).toBe('activo');
      expect(result[0].username).toBe('testuser');
    });

    it('devuelve estado bloqueado correctamente', async () => {
      const prisma = mockPrisma();
      prisma.usuarios.findMany.mockResolvedValue([
        baseUser({ bloqueado: true }),
      ]);
      const svc = new UsersService(prisma as any);
      const [u] = await svc.obtenerUsuarios();
      expect(u.estado).toBe('bloqueado');
    });

    it('devuelve estado preregistrado si tiene invitation_token', async () => {
      const prisma = mockPrisma();
      prisma.usuarios.findMany.mockResolvedValue([
        baseUser({
          password: '',
          invitation_token: 'token',
          invitation_expires_at: new Date(Date.now() + 86400000),
        }),
      ]);
      const svc = new UsersService(prisma as any);
      const [u] = await svc.obtenerUsuarios();
      expect(u.estado).toBe('preregistrado');
    });
  });

  // ─── adminResetPassword ───────────────────────────────────────────────────

  describe('adminResetPassword', () => {
    it('lanza NotFoundException si el usuario no existe', async () => {
      const prisma = mockPrisma();
      prisma.usuarios.findUnique.mockResolvedValue(null);
      const svc = new UsersService(prisma as any);
      await expect(svc.adminResetPassword(99)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('lanza ForbiddenException si protegido', async () => {
      const prisma = mockPrisma();
      prisma.usuarios.findUnique.mockResolvedValue(
        baseUser({ protegido: true }),
      );
      const svc = new UsersService(prisma as any);
      await expect(svc.adminResetPassword(1)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('lanza ForbiddenException al actuar sobre sí mismo', async () => {
      const prisma = mockPrisma();
      prisma.usuarios.findUnique.mockResolvedValue(baseUser());
      const svc = new UsersService(prisma as any);
      await expect(svc.adminResetPassword(1, 1)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('lanza BadRequestException si no tiene password', async () => {
      const prisma = mockPrisma();
      prisma.usuarios.findUnique.mockResolvedValue(
        baseUser({ password: null }),
      );
      const svc = new UsersService(prisma as any);
      await expect(svc.adminResetPassword(1, 99)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('genera resetToken y actualiza usuario', async () => {
      const prisma = mockPrisma();
      prisma.usuarios.findUnique.mockResolvedValue(baseUser());
      prisma.usuarios.update.mockResolvedValue(baseUser());
      const svc = new UsersService(prisma as any);
      const result = await svc.adminResetPassword(1, 99);
      expect(result.resetToken).toBeDefined();
      expect(prisma.usuarios.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 1 } }),
      );
    });
  });

  // ─── desbloquear ──────────────────────────────────────────────────────────

  describe('desbloquear', () => {
    it('lanza NotFoundException si el usuario no existe', async () => {
      const prisma = mockPrisma();
      prisma.usuarios.findUnique.mockResolvedValue(null);
      const svc = new UsersService(prisma as any);
      await expect(svc.desbloquear(99)).rejects.toThrow(NotFoundException);
    });

    it('desbloquea y devuelve mensaje', async () => {
      const prisma = mockPrisma();
      prisma.usuarios.findUnique.mockResolvedValue(
        baseUser({ bloqueado: true }),
      );
      prisma.usuarios.update.mockResolvedValue(baseUser());
      const svc = new UsersService(prisma as any);
      const result = await svc.desbloquear(1, 99);
      expect(result.message).toContain('desbloqueada');
    });
  });

  // ─── regenerarInvitacion ──────────────────────────────────────────────────

  describe('regenerarInvitacion', () => {
    it('lanza BadRequestException si ya está registrado', async () => {
      const prisma = mockPrisma();
      prisma.usuarios.findUnique.mockResolvedValue(baseUser());
      const svc = new UsersService(prisma as any);
      await expect(svc.regenerarInvitacion(1, 99)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('regenera invitación para usuario sin password', async () => {
      const prisma = mockPrisma();
      prisma.usuarios.findUnique.mockResolvedValue(
        baseUser({ password: null }),
      );
      prisma.usuarios.update.mockResolvedValue(baseUser());
      const svc = new UsersService(prisma as any);
      const result = await svc.regenerarInvitacion(1, 99);
      expect(result.invitationToken).toBeDefined();
    });
  });

  // ─── cancelarPreregistro ──────────────────────────────────────────────────

  describe('cancelarPreregistro', () => {
    it('lanza BadRequestException si ya tiene password', async () => {
      const prisma = mockPrisma();
      prisma.usuarios.findUnique.mockResolvedValue(baseUser());
      const svc = new UsersService(prisma as any);
      await expect(svc.cancelarPreregistro(1, 99)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('cancela el preregistro', async () => {
      const prisma = mockPrisma();
      prisma.usuarios.findUnique.mockResolvedValue(
        baseUser({ password: null }),
      );
      prisma.usuarios.update.mockResolvedValue(baseUser());
      const svc = new UsersService(prisma as any);
      const result = await svc.cancelarPreregistro(1, 99);
      expect(result.message).toContain('cancelado');
    });
  });
});
