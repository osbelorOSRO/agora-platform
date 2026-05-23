import { BadRequestException, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import bcrypt from 'bcryptjs';
import speakeasy from 'speakeasy';
import { PrismaService } from '../../database/prisma/prisma.service';
import { AuthService } from '../../auth/auth.service';
import { generarTokenUnico, expiracionEn } from '../shared/token-utils';

const MAX_LOGIN_ATTEMPTS = 5;
const MAX_INVITATION_ATTEMPTS = 5;
const JWT_TTL_MS = 12 * 60 * 60 * 1000;

@Injectable()
export class AccesosAuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authService: AuthService,
  ) {}

  async login(
    username: string,
    password: string,
    token_2fa: string,
    ip: string,
    userAgent: string,
  ) {
    if (!username || !password || !token_2fa)
      throw new BadRequestException('Faltan credenciales');
    if (typeof username !== 'string' || username.length > 100)
      throw new BadRequestException('Credenciales inválidas');
    if (typeof password !== 'string' || password.length > 200)
      throw new BadRequestException('Credenciales inválidas');
    if (typeof token_2fa !== 'string' || !/^\d{6}$/.test(token_2fa))
      throw new BadRequestException('Token 2FA inválido');

    const usuario = await this.prisma.usuarios.findUnique({
      where: { username },
      include: {
        rol_usuarios_rol_idTorol: {
          include: { rol_permiso: { include: { permiso: true } } },
        },
      },
    });

    if (!usuario) throw new UnauthorizedException('Credenciales incorrectas');
    if (usuario.cancelado) throw new UnauthorizedException('Credenciales incorrectas');
    if (usuario.bloqueado) throw new ForbiddenException('Cuenta bloqueada. Contacta al administrador del sistema.');

    const claveOk = await bcrypt.compare(password, usuario.password);
    if (!claveOk) {
      await this.registrarIntentoFallido(username);
      throw new UnauthorizedException('Credenciales incorrectas');
    }

    const verificado = speakeasy.totp.verify({
      secret: usuario.token_2fa,
      encoding: 'base32',
      token: token_2fa,
    });
    if (!verificado) {
      await this.registrarIntentoFallido(username);
      throw new UnauthorizedException('Token 2FA inválido');
    }

    await this.prisma.usuarios.update({ where: { username }, data: { login_attempts: 0 } });

    const rol = usuario.rol_usuarios_rol_idTorol;
    const permisos = rol ? rol.rol_permiso.map((rp) => rp.permiso.nombre) : [];
    const nombreRol = rol?.nombre ?? null;

    const tokenJwt = await this.authService.firmarToken({
      id: usuario.id,
      username: usuario.username,
      nombre: usuario.nombre,
      apellido: usuario.apellido,
      email: usuario.email,
      rol: nombreRol,
      permisos,
    });

    await this.prisma.sesion.create({
      data: {
        usuarioId: usuario.id,
        ip,
        userAgent,
        horaLogin: new Date(),
        ultimaInteraccion: new Date(),
        activo: true,
      },
    }).catch((e) => console.error('Error registrando sesión:', e));

    return {
      token: tokenJwt,
      usuario: { id: usuario.id, username: usuario.username, nombre: usuario.nombre, apellido: usuario.apellido, email: usuario.email, rol: nombreRol, permisos },
    };
  }

  async registrarUsuario(username: string, invitationToken: string, password: string, confirmarPassword: string) {
    if (!username || !invitationToken || !password || !confirmarPassword)
      throw new BadRequestException('Faltan campos obligatorios');
    if (typeof username !== 'string' || username.length > 100) throw new BadRequestException('Datos inválidos');
    if (typeof invitationToken !== 'string' || invitationToken.length > 20) throw new BadRequestException('Datos inválidos');
    if (typeof password !== 'string' || password.length > 200) throw new BadRequestException('Datos inválidos');
    if (password !== confirmarPassword) throw new BadRequestException('Las contraseñas no coinciden');

    const usuario = await this.prisma.usuarios.findUnique({ where: { username } });
    if (!usuario) throw new ForbiddenException('Invitación no válida');
    if (usuario.password) throw new BadRequestException('El usuario ya está registrado');
    if (!usuario.invitation_token || !usuario.invitation_expires_at)
      throw new ForbiddenException('Invitación no válida. Contacta al administrador.');
    if (usuario.invitation_expires_at < new Date())
      throw new ForbiddenException('La invitación ha expirado. Contacta al administrador.');
    if (usuario.invitation_attempts >= MAX_INVITATION_ATTEMPTS)
      throw new ForbiddenException('Invitación bloqueada por intentos fallidos. Contacta al administrador.');

    const tokenOk = await bcrypt.compare(invitationToken, usuario.invitation_token);
    if (!tokenOk) {
      await this.prisma.usuarios.update({ where: { username }, data: { invitation_attempts: { increment: 1 } } });
      throw new ForbiddenException('Código de invitación incorrecto');
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const secret = speakeasy.generateSecret({ name: `Accesos LTP (${username})` });

    await this.prisma.usuarios.update({
      where: { username },
      data: { password: hashedPassword, token_2fa: secret.base32, invitation_token: null, invitation_expires_at: null, invitation_attempts: 0 },
    });

    return { message: 'Usuario registrado correctamente', secret_otpauth_url: secret.otpauth_url, secret_base32: secret.base32 };
  }

  async resetPassword(username: string, resetToken: string, newPassword: string, confirmarPassword: string) {
    if (!username || !resetToken || !newPassword || !confirmarPassword)
      throw new BadRequestException('Faltan campos obligatorios');
    if (typeof username !== 'string' || username.length > 100) throw new BadRequestException('Datos inválidos');
    if (typeof resetToken !== 'string' || resetToken.length > 20) throw new BadRequestException('Datos inválidos');
    if (typeof newPassword !== 'string' || newPassword.length > 200) throw new BadRequestException('Datos inválidos');
    if (newPassword !== confirmarPassword) throw new BadRequestException('Las contraseñas no coinciden');

    const usuario = await this.prisma.usuarios.findUnique({ where: { username }, select: { id: true, reset_token: true, reset_token_expires: true } });
    if (!usuario || !usuario.reset_token || !usuario.reset_token_expires)
      throw new ForbiddenException('Token de reset no válido');
    if (usuario.reset_token_expires < new Date())
      throw new ForbiddenException('El token de reset ha expirado. Contacta al administrador.');

    const tokenOk = await bcrypt.compare(resetToken, usuario.reset_token);
    if (!tokenOk) throw new ForbiddenException('Token de reset incorrecto');

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await this.prisma.usuarios.update({
      where: { id: usuario.id },
      data: { password: hashedPassword, reset_token: null, reset_token_expires: null, login_attempts: 0, bloqueado: false },
    });

    return { message: 'Contraseña actualizada correctamente' };
  }

  async setup2FAInit(username: string, password: string, bypassToken: string) {
    if (!username || !password || !bypassToken) throw new BadRequestException('Faltan campos obligatorios');
    if (typeof username !== 'string' || username.length > 100) throw new BadRequestException('Datos inválidos');
    if (typeof password !== 'string' || password.length > 200) throw new BadRequestException('Datos inválidos');
    if (typeof bypassToken !== 'string' || bypassToken.length > 20) throw new BadRequestException('Datos inválidos');

    const usuario = await this.prisma.usuarios.findUnique({
      where: { username },
      select: { id: true, password: true, mfa_bypass_token: true, mfa_new_secret: true, mfa_reset_expires: true },
    });

    if (!usuario || !usuario.password) throw new ForbiddenException('Credenciales inválidas');
    if (!usuario.mfa_bypass_token || !usuario.mfa_new_secret || !usuario.mfa_reset_expires)
      throw new ForbiddenException('Token de reset 2FA no válido');
    if (usuario.mfa_reset_expires < new Date())
      throw new ForbiddenException('El token de reset 2FA ha expirado. Contacta al administrador.');

    const claveOk = await bcrypt.compare(password, usuario.password);
    if (!claveOk) throw new ForbiddenException('Credenciales inválidas');

    const tokenOk = await bcrypt.compare(bypassToken, usuario.mfa_bypass_token);
    if (!tokenOk) throw new ForbiddenException('Token de reset 2FA incorrecto');

    const otpauthUrl = speakeasy.otpauthURL({ secret: usuario.mfa_new_secret, label: `Accesos LTP (${username})`, encoding: 'base32' });
    return { otpauth_url: otpauthUrl };
  }

  async setup2FAConfirmar(username: string, bypassToken: string, totpCode: string) {
    if (!username || !bypassToken || !totpCode) throw new BadRequestException('Faltan campos obligatorios');
    if (typeof username !== 'string' || username.length > 100) throw new BadRequestException('Datos inválidos');
    if (typeof bypassToken !== 'string' || bypassToken.length > 20) throw new BadRequestException('Datos inválidos');
    if (typeof totpCode !== 'string' || !/^\d{6}$/.test(totpCode)) throw new BadRequestException('Código TOTP inválido');

    const usuario = await this.prisma.usuarios.findUnique({
      where: { username },
      select: { id: true, mfa_bypass_token: true, mfa_new_secret: true, mfa_reset_expires: true },
    });

    if (!usuario || !usuario.mfa_bypass_token || !usuario.mfa_new_secret || !usuario.mfa_reset_expires)
      throw new ForbiddenException('Token de reset 2FA no válido');
    if (usuario.mfa_reset_expires < new Date())
      throw new ForbiddenException('El token de reset 2FA ha expirado');

    const tokenOk = await bcrypt.compare(bypassToken, usuario.mfa_bypass_token);
    if (!tokenOk) throw new ForbiddenException('Token de reset 2FA incorrecto');

    const totpOk = speakeasy.totp.verify({ secret: usuario.mfa_new_secret, encoding: 'base32', token: totpCode });
    if (!totpOk) throw new ForbiddenException('Código TOTP incorrecto. Asegúrate de haber escaneado el código QR.');

    await this.prisma.usuarios.update({
      where: { id: usuario.id },
      data: { token_2fa: usuario.mfa_new_secret, mfa_bypass_token: null, mfa_new_secret: null, mfa_reset_expires: null, login_attempts: 0, bloqueado: false },
    });

    return { message: 'Autenticador 2FA configurado correctamente' };
  }

  private async registrarIntentoFallido(username: string): Promise<void> {
    const updated = await this.prisma.usuarios.update({
      where: { username },
      data: { login_attempts: { increment: 1 } },
      select: { login_attempts: true },
    });
    if (updated.login_attempts >= MAX_LOGIN_ATTEMPTS) {
      await this.prisma.usuarios.update({ where: { username }, data: { bloqueado: true, bloqueado_en: new Date() } });
    }
  }

  async limpiarSesionesExpiradas(): Promise<void> {
    const corte = new Date(Date.now() - JWT_TTL_MS);
    const { count } = await this.prisma.sesion.updateMany({
      where: { activo: true, horaLogin: { lt: corte } },
      data: { activo: false },
    });
    if (count > 0) console.log(`🧹 Sesiones expiradas cerradas: ${count}`);
  }
}
