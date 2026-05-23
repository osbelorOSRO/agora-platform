import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import speakeasy from 'speakeasy';
import { PrismaService } from '../../database/prisma/prisma.service';
import { generarTokenUnico, expiracionEn } from '../shared/token-utils';

function calcularEstado(u: {
  bloqueado: boolean;
  password: string | null;
  invitation_token: string | null;
  invitation_expires_at: Date | null;
  mfa_bypass_token: string | null;
  reset_token: string | null;
}): string {
  if (u.bloqueado) return 'bloqueado';
  if (!u.password) {
    if (!u.invitation_token) return 'sin_invitacion';
    if (u.invitation_expires_at && u.invitation_expires_at < new Date()) return 'invitacion_expirada';
    return 'preregistrado';
  }
  if (u.mfa_bypass_token) return 'reset_2fa';
  if (u.reset_token) return 'reset_contraseña';
  return 'activo';
}

function checkGuarda(id: number, usuario: { protegido: boolean }, selfId?: number): void {
  if (selfId && id === selfId) throw new ForbiddenException('No puedes realizar esta acción sobre tu propia cuenta');
  if (usuario.protegido) throw new ForbiddenException('Este usuario está protegido y no puede ser modificado');
}

@Injectable()
export class UsuariosService {
  constructor(private readonly prisma: PrismaService) {}

  async preregistrarUsuario(username: string, rolId: number, actorId: number | null) {
    if (!username || !rolId) throw new BadRequestException('Faltan campos obligatorios (username y rolId)');
    if (typeof username !== 'string' || username.length > 100) throw new BadRequestException('username inválido');

    const rol = await this.prisma.rol.findUnique({ where: { id: Number(rolId) } });
    if (!rol) throw new BadRequestException('Rol no válido');

    const existente = await this.prisma.usuarios.findUnique({ where: { username } });
    if (existente) {
      const msg = existente.cancelado
        ? 'Ese nombre de usuario no está disponible'
        : 'Ya existe un usuario activo con ese nombre de usuario';
      throw new ConflictException(msg);
    }

    const { plain, hash } = generarTokenUnico();
    try {
      await this.prisma.usuarios.create({
        data: {
          username,
          password: '',
          token_2fa: '',
          nombre: '',
          apellido: '',
          run: '',
          telefono: '',
          email: '',
          invitation_token: hash,
          invitation_expires_at: expiracionEn(24),
          invitation_attempts: 0,
          rol_usuarios_rol_idTorol: { connect: { id: Number(rolId) } },
          creado_en: new Date(),
          actualizado_en: new Date(),
          ...(actorId && {
            usuarios_usuarios_creado_por_idTousuarios: { connect: { id: actorId } },
            usuarios_usuarios_actualizado_por_idTousuarios: { connect: { id: actorId } },
          }),
        },
      });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new ConflictException('Ese nombre de usuario no está disponible');
      }
      throw err;
    }

    return {
      message: 'Usuario preregistrado correctamente',
      invitationToken: plain,
      expiresAt: expiracionEn(24).toISOString(),
    };
  }

  async obtenerUsuarios() {
    const usuarios = await this.prisma.usuarios.findMany({
      where: { cancelado: false },
      include: {
        rol_usuarios_rol_idTorol: true,
        usuarios_usuarios_creado_por_idTousuarios: { select: { username: true } },
        usuarios_usuarios_actualizado_por_idTousuarios: { select: { username: true } },
      },
    });
    return usuarios.map((u) => {
      const rolObj = u.rol_usuarios_rol_idTorol;
      return {
        id: u.id,
        username: u.username,
        nombre: u.nombre,
        apellido: u.apellido,
        run: u.run,
        telefono: u.telefono,
        email: u.email,
        creado_en: u.creado_en,
        actualizado_en: u.actualizado_en,
        creado_por_username: u.usuarios_usuarios_creado_por_idTousuarios?.username ?? null,
        actualizado_por_username: u.usuarios_usuarios_actualizado_por_idTousuarios?.username ?? null,
        rol: rolObj ? { id: rolObj.id ?? null, nombre: rolObj.nombre ?? null } : null,
        oficina: null,
        estado: calcularEstado(u),
      };
    });
  }

  async actualizarUsuario(id: number, data: any) {
    const isOptionalString = (v: any, max: number) =>
      v === undefined || v === null || (typeof v === 'string' && v.length <= max);
    if (
      !isOptionalString(data.nombre, 120) ||
      !isOptionalString(data.apellido, 120) ||
      !isOptionalString(data.run, 20) ||
      !isOptionalString(data.email, 200) ||
      !isOptionalString(data.telefono, 30)
    ) {
      throw new BadRequestException('Datos inválidos');
    }

    const datosActualizados: any = {
      nombre: data.nombre,
      apellido: data.apellido,
      run: data.run,
      email: data.email,
      telefono: data.telefono,
    };
    const rolId = data.rolId ?? data.rol?.id;
    if (rolId !== undefined && rolId !== null) {
      datosActualizados.rol_usuarios_rol_idTorol = { connect: { id: Number(rolId) } };
    }

    const u = await this.prisma.usuarios.update({
      where: { id },
      data: datosActualizados,
      include: {
        rol_usuarios_rol_idTorol: true,
        usuarios_usuarios_creado_por_idTousuarios: { select: { username: true } },
        usuarios_usuarios_actualizado_por_idTousuarios: { select: { username: true } },
      },
    });
    const rolObj = u.rol_usuarios_rol_idTorol;
    return {
      id: u.id,
      username: u.username,
      nombre: u.nombre,
      apellido: u.apellido,
      run: u.run,
      telefono: u.telefono,
      email: u.email,
      creado_en: u.creado_en,
      actualizado_en: u.actualizado_en,
      creado_por_username: u.usuarios_usuarios_creado_por_idTousuarios?.username ?? null,
      actualizado_por_username: u.usuarios_usuarios_actualizado_por_idTousuarios?.username ?? null,
      rol: rolObj ? { id: rolObj.id ?? null, nombre: rolObj.nombre ?? null } : null,
      oficina: null,
    };
  }

  async adminResetPassword(id: number, selfId?: number) {
    const usuario = await this.prisma.usuarios.findUnique({
      where: { id },
      select: { id: true, username: true, password: true, protegido: true },
    });
    if (!usuario) throw new NotFoundException('Usuario no encontrado');
    checkGuarda(id, usuario, selfId);
    if (!usuario.password) throw new BadRequestException('El usuario aún no ha completado el registro');

    const { plain, hash } = generarTokenUnico();
    await this.prisma.usuarios.update({ where: { id }, data: { reset_token: hash, reset_token_expires: expiracionEn(24) } });
    return { message: 'Token de reset generado', resetToken: plain, expiresAt: expiracionEn(24).toISOString() };
  }

  async reset2FA(id: number, selfId?: number) {
    const usuario = await this.prisma.usuarios.findUnique({
      where: { id },
      select: { id: true, username: true, password: true, protegido: true },
    });
    if (!usuario) throw new NotFoundException('Usuario no encontrado');
    checkGuarda(id, usuario, selfId);
    if (!usuario.password) throw new BadRequestException('El usuario aún no ha completado el registro');

    const { plain, hash } = generarTokenUnico();
    const newSecret = speakeasy.generateSecret({ name: `Accesos LTP (${usuario.username})` });
    await this.prisma.usuarios.update({
      where: { id },
      data: { mfa_bypass_token: hash, mfa_new_secret: newSecret.base32, mfa_reset_expires: expiracionEn(24) },
    });
    return { message: 'Token de reset 2FA generado', bypassToken: plain, expiresAt: expiracionEn(24).toISOString() };
  }

  async desbloquear(id: number, selfId?: number) {
    const usuario = await this.prisma.usuarios.findUnique({
      where: { id },
      select: { id: true, bloqueado: true, protegido: true },
    });
    if (!usuario) throw new NotFoundException('Usuario no encontrado');
    checkGuarda(id, usuario, selfId);
    await this.prisma.usuarios.update({ where: { id }, data: { bloqueado: false, login_attempts: 0, bloqueado_en: null } });
    return { message: 'Cuenta desbloqueada' };
  }

  async regenerarInvitacion(id: number, selfId?: number) {
    const usuario = await this.prisma.usuarios.findUnique({
      where: { id },
      select: { id: true, password: true, protegido: true },
    });
    if (!usuario) throw new NotFoundException('Usuario no encontrado');
    checkGuarda(id, usuario, selfId);
    if (usuario.password) throw new BadRequestException('El usuario ya está registrado');

    const { plain, hash } = generarTokenUnico();
    await this.prisma.usuarios.update({
      where: { id },
      data: { invitation_token: hash, invitation_expires_at: expiracionEn(24), invitation_attempts: 0 },
    });
    return { message: 'Invitación regenerada', invitationToken: plain, expiresAt: expiracionEn(24).toISOString() };
  }

  async cancelarPreregistro(id: number, selfId?: number) {
    const usuario = await this.prisma.usuarios.findUnique({
      where: { id },
      select: { id: true, password: true, protegido: true },
    });
    if (!usuario) throw new NotFoundException('Usuario no encontrado');
    checkGuarda(id, usuario, selfId);
    if (usuario.password) throw new BadRequestException('No se puede cancelar un usuario ya registrado');

    await this.prisma.usuarios.update({
      where: { id },
      data: { cancelado: true, invitation_token: null, invitation_expires_at: null, invitation_attempts: 0 },
    });
    return { message: 'Preregistro cancelado' };
  }
}
