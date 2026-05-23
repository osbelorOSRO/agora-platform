import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma/prisma.service';

@Injectable()
export class PermisosService {
  constructor(private readonly prisma: PrismaService) {}

  obtenerPermisos() {
    return this.prisma.permiso.findMany();
  }
}
