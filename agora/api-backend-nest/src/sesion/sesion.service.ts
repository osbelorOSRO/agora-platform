import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma/prisma.service';

@Injectable()
export class SesionService {
  constructor(private prisma: PrismaService) {}

  async registrarEstadoBot(activo: boolean) {
    const usuarioId = 20;
    const username = 'baileysbot';
    const ip = '157.180.76.223';
    const ahora = new Date();

    const existente = await this.prisma.sesion.findFirst({
      where: { usuarioId },
    });

    if (existente) {
      return this.prisma.sesion.update({
        where: { id: existente.id },
        data: {
          activo,
          ultimaInteraccion: ahora,
          ip,
          userAgent: username,
        },
      });
    } else {
      return this.prisma.sesion.create({
        data: {
          usuarioId,
          ip,
          userAgent: username,
          horaLogin: ahora,
          ultimaInteraccion: ahora,
          activo,
        },
      });
    }
  }
}
