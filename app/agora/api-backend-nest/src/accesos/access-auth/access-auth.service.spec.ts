import { Test } from '@nestjs/testing';
import { BadRequestException, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { AccessAuthService } from './access-auth.service';
import { PrismaService } from '../../database/prisma/prisma.service';
import { AuthService } from '../../auth/auth.service';

jest.mock('bcryptjs', () => ({
  __esModule: true,
  default: { compare: jest.fn(), hash: jest.fn() },
  compare: jest.fn(),
  hash: jest.fn(),
}));

jest.mock('speakeasy', () => ({
  __esModule: true,
  default: {
    totp: { verify: jest.fn() },
    generateSecret: jest.fn(),
    otpauthURL: jest.fn(),
  },
  totp: { verify: jest.fn() },
  generateSecret: jest.fn(),
  otpauthURL: jest.fn(),
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const bcrypt = require('bcryptjs');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const speakeasy = require('speakeasy');

const baseUsuario = {
  id: 1,
  username: 'testuser',
  nombre: 'Test',
  apellido: 'User',
  email: 'test@example.com',
  password: '$2a$10$hashedpassword',
  token_2fa: 'JBSWY3DPEHPK3PXP',
  cancelado: false,
  bloqueado: false,
  login_attempts: 0,
  rol_usuarios_rol_idTorol: {
    nombre: 'agente',
    rol_permiso: [{ permiso: { nombre: 'inbox:read' } }],
  },
};

function buildPrismaMock() {
  return {
    usuarios: {
      findUnique: jest.fn(),
      update: jest.fn().mockResolvedValue({}),
    },
    sesion: {
      create: jest.fn().mockResolvedValue({}),
    },
  };
}

async function buildModule(prismaMock: ReturnType<typeof buildPrismaMock>) {
  const authServiceMock = { firmarToken: jest.fn().mockResolvedValue('jwt-token') };
  const module = await Test.createTestingModule({
    providers: [
      AccessAuthService,
      { provide: PrismaService, useValue: prismaMock },
      { provide: AuthService, useValue: authServiceMock },
    ],
  }).compile();
  return { service: module.get(AccessAuthService), authServiceMock };
}

describe('AccessAuthService', () => {
  let prisma: ReturnType<typeof buildPrismaMock>;
  let service: AccessAuthService;

  beforeEach(async () => {
    jest.clearAllMocks();
    prisma = buildPrismaMock();
    ({ service } = await buildModule(prisma));
  });

  describe('login', () => {
    it('lanza UnauthorizedException cuando el usuario no existe', async () => {
      prisma.usuarios.findUnique.mockResolvedValue(null);

      await expect(service.login('testuser', 'pass', '123456', '127.0.0.1', 'agent')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('lanza UnauthorizedException cuando el usuario está cancelado', async () => {
      prisma.usuarios.findUnique.mockResolvedValue({ ...baseUsuario, cancelado: true });

      await expect(service.login('testuser', 'pass', '123456', '127.0.0.1', 'agent')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('lanza ForbiddenException cuando el usuario está bloqueado', async () => {
      prisma.usuarios.findUnique.mockResolvedValue({ ...baseUsuario, bloqueado: true });

      await expect(service.login('testuser', 'pass', '123456', '127.0.0.1', 'agent')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('lanza UnauthorizedException y registra intento fallido cuando la contraseña es incorrecta', async () => {
      prisma.usuarios.findUnique.mockResolvedValue({ ...baseUsuario });
      bcrypt.compare.mockResolvedValue(false);

      await expect(service.login('testuser', 'wrongpass', '123456', '127.0.0.1', 'agent')).rejects.toThrow(
        UnauthorizedException,
      );
      expect(prisma.usuarios.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { login_attempts: { increment: 1 } } }),
      );
    });

    it('lanza UnauthorizedException y registra intento fallido cuando el token 2FA es inválido', async () => {
      prisma.usuarios.findUnique.mockResolvedValue({ ...baseUsuario });
      bcrypt.compare.mockResolvedValue(true);
      speakeasy.totp.verify.mockReturnValue(false);

      await expect(service.login('testuser', 'pass', '000000', '127.0.0.1', 'agent')).rejects.toThrow(
        UnauthorizedException,
      );
      expect(prisma.usuarios.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { login_attempts: { increment: 1 } } }),
      );
    });

    it('devuelve token y datos del usuario en login exitoso', async () => {
      prisma.usuarios.findUnique.mockResolvedValue({ ...baseUsuario });
      bcrypt.compare.mockResolvedValue(true);
      speakeasy.totp.verify.mockReturnValue(true);

      const result = await service.login('testuser', 'pass', '123456', '127.0.0.1', 'agent');

      expect(result.token).toBe('jwt-token');
      expect(result.usuario.username).toBe('testuser');
      expect(result.usuario.rol).toBe('agente');
      expect(prisma.usuarios.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { login_attempts: 0 } }),
      );
    });

    it('bloquea la cuenta cuando se alcanza el límite de intentos fallidos', async () => {
      prisma.usuarios.findUnique.mockResolvedValue({ ...baseUsuario, login_attempts: 4 });
      prisma.usuarios.update
        .mockResolvedValueOnce({ login_attempts: 5 })
        .mockResolvedValue({});
      bcrypt.compare.mockResolvedValue(false);

      await expect(service.login('testuser', 'wrongpass', '123456', '127.0.0.1', 'agent')).rejects.toThrow(
        UnauthorizedException,
      );
      expect(prisma.usuarios.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { bloqueado: true, bloqueado_en: expect.any(Date) } }),
      );
    });
  });

  describe('registrarUsuario', () => {
    it('lanza BadRequestException cuando las contraseñas no coinciden', async () => {
      await expect(
        service.registrarUsuario('testuser', 'token', 'pass1', 'pass2'),
      ).rejects.toThrow(BadRequestException);
    });

    it('lanza ForbiddenException cuando el usuario no existe', async () => {
      prisma.usuarios.findUnique.mockResolvedValue(null);

      await expect(
        service.registrarUsuario('noexiste', 'token', 'pass1', 'pass1'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('lanza BadRequestException cuando el usuario ya tiene contraseña registrada', async () => {
      prisma.usuarios.findUnique.mockResolvedValue({ ...baseUsuario });

      await expect(
        service.registrarUsuario('testuser', 'token', 'pass1', 'pass1'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('resetPassword', () => {
    it('lanza BadRequestException cuando las contraseñas no coinciden', async () => {
      await expect(
        service.resetPassword('testuser', 'token', 'pass1', 'pass2'),
      ).rejects.toThrow(BadRequestException);
    });

    it('lanza ForbiddenException cuando el usuario no tiene token de reset', async () => {
      prisma.usuarios.findUnique.mockResolvedValue({ id: 1, reset_token: null, reset_token_expires: null });

      await expect(
        service.resetPassword('testuser', 'token', 'pass1', 'pass1'),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
