import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma/prisma.service';

@Injectable()
export class RolesService {
  constructor(private readonly prisma: PrismaService) {}

  private mapRol(r: any) {
    return {
      id: r.id,
      nombre: r.nombre,
      permisos: r.rol_permiso.map((rp: any) => rp.permiso.id),
      creado_por_username: r.usuarios_rol_creado_por_idTousuarios?.username ?? null,
      actualizado_por_username: r.usuarios_rol_actualizado_por_idTousuarios?.username ?? null,
      creado_en: r.creado_en,
      actualizado_en: r.actualizado_en,
    };
  }

  private readonly include = {
    rol_permiso: { include: { permiso: true } },
    usuarios_rol_creado_por_idTousuarios: true,
    usuarios_rol_actualizado_por_idTousuarios: true,
  };

  async obtenerRoles() {
    const roles = await this.prisma.rol.findMany({ include: this.include });
    return roles.map(this.mapRol);
  }

  async obtenerRolPorId(id: number) {
    const rol = await this.prisma.rol.findUnique({ where: { id }, include: this.include });
    if (!rol) throw new NotFoundException('Rol no encontrado');
    return this.mapRol(rol);
  }

  async crearRol(nombre: string, permisos: number[], actorId?: number) {
    if (typeof nombre !== 'string' || nombre.length < 1 || nombre.length > 100)
      throw new BadRequestException('nombre inválido');
    if (!Array.isArray(permisos) || permisos.length > 100 || permisos.some((p) => typeof p !== 'number' || !Number.isInteger(p)))
      throw new BadRequestException('permisos inválidos');

    const nuevo = await this.prisma.rol.create({
      data: {
        nombre,
        creado_por_id: actorId ?? undefined,
        actualizado_por_id: actorId ?? undefined,
        rol_permiso: { create: permisos.map((permisoId) => ({ permiso: { connect: { id: permisoId } } })) },
      },
      include: this.include,
    });
    return this.mapRol(nuevo);
  }

  async actualizarRol(id: number, nombre: string, permisos: number[], actorId?: number) {
    if (typeof nombre !== 'string' || nombre.length < 1 || nombre.length > 100)
      throw new BadRequestException('nombre inválido');
    if (!Array.isArray(permisos) || permisos.length > 100 || permisos.some((p) => typeof p !== 'number' || !Number.isInteger(p)))
      throw new BadRequestException('permisos inválidos');

    await this.prisma.rol_permiso.deleteMany({ where: { rol_id: id } });
    const actualizado = await this.prisma.rol.update({
      where: { id },
      data: {
        nombre,
        actualizado_por_id: actorId ?? undefined,
        rol_permiso: { create: permisos.map((permisoId) => ({ permiso: { connect: { id: permisoId } } })) },
      },
      include: this.include,
    });
    return this.mapRol(actualizado);
  }
}
