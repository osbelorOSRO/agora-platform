import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma/prisma.service';

const JWT_TTL_MS = 12 * 60 * 60 * 1000;

@Injectable()
export class SesionesService {
  constructor(private readonly prisma: PrismaService) {}

  async me(userId: number) {
    const usuario = await this.prisma.usuarios.findUnique({
      where: { id: userId },
      include: { rol_usuarios_rol_idTorol: true },
    });
    if (!usuario) throw new NotFoundException('Usuario no encontrado');

    const rolObj = usuario.rol_usuarios_rol_idTorol;
    return {
      id: usuario.id,
      username: usuario.username,
      nombre: usuario.nombre ?? null,
      apellido: usuario.apellido ?? null,
      email: usuario.email ?? null,
      telefono: usuario.telefono ?? null,
      rol: Array.isArray(rolObj)
        ? (rolObj.length > 0 ? rolObj[0].nombre : null)
        : (rolObj?.nombre ?? null),
    };
  }

  async registrarSesion(userId: number, ip: string, userAgent: string) {
    await this.prisma.sesion.create({
      data: { usuarioId: userId, ip, userAgent, horaLogin: new Date(), ultimaInteraccion: new Date(), activo: true },
    });
    return { ok: true };
  }

  async sesionesActivas(userId: number) {
    await this.actualizarUltimaInteraccion(userId);
    return this.prisma.sesion.findMany({
      where: { usuarioId: userId, activo: true },
      orderBy: { horaLogin: 'desc' },
    });
  }

  async logout(userId: number) {
    await this.actualizarUltimaInteraccion(userId);
    await this.prisma.sesion.updateMany({
      where: { usuarioId: userId, activo: true },
      data: { activo: false },
    });
    return { message: 'Sesión cerrada' };
  }

  async listarTodasSesionesActivas() {
    const corte = new Date(Date.now() - JWT_TTL_MS);
    const sesiones = await this.prisma.sesion.findMany({
      where: { activo: true, horaLogin: { gte: corte } },
      orderBy: { ultimaInteraccion: 'desc' },
      include: {
        usuarios: {
          select: {
            id: true,
            username: true,
            nombre: true,
            apellido: true,
            rol_usuarios_rol_idTorol: { select: { nombre: true } },
          },
        },
      },
    });
    return sesiones.map((s) => ({
      id: s.id,
      ip: s.ip,
      userAgent: s.userAgent,
      horaLogin: s.horaLogin,
      ultimaInteraccion: s.ultimaInteraccion,
      usuario: {
        id: s.usuarios.id,
        username: s.usuarios.username,
        nombre: s.usuarios.nombre,
        apellido: s.usuarios.apellido,
        rol: s.usuarios.rol_usuarios_rol_idTorol?.nombre ?? null,
      },
    }));
  }

  async cerrarSesionAdmin(id: number) {
    if (!Number.isFinite(id) || id < 1) throw new ForbiddenException('ID de sesión inválido');
    await this.prisma.sesion.update({ where: { id }, data: { activo: false } });
    return { ok: true };
  }

  private async actualizarUltimaInteraccion(userId: number) {
    await this.prisma.sesion.updateMany({
      where: { usuarioId: userId, activo: true },
      data: { ultimaInteraccion: new Date() },
    }).catch((e) => console.error('⚠️ Error al actualizar última interacción:', e));
  }
}
