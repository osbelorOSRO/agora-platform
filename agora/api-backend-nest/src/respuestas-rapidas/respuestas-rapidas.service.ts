import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma/prisma.service';
import { CreateRespuestaRapidaDto } from './dto/create-respuesta-rapida.dto';
import { UpdateRespuestaRapidaDto } from './dto/update-respuesta-rapida.dto';

@Injectable()
export class RespuestasRapidasService {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateRespuestaRapidaDto) {
    return this.prisma.respuestas_rapidas.create({ data });
  }

  async findAll() {
    return this.prisma.respuestas_rapidas.findMany();
  }

  async findOne(uuid: string) {
    const respuesta = await this.prisma.respuestas_rapidas.findUnique({ where: { uuid } });
    if (!respuesta) throw new NotFoundException('Respuesta rápida no encontrada');
    return respuesta;
  }

  async update(uuid: string, data: UpdateRespuestaRapidaDto) {
    const respuesta = await this.prisma.respuestas_rapidas.findUnique({ where: { uuid } });
    if (!respuesta) throw new NotFoundException('Respuesta rápida no encontrada');

    return this.prisma.respuestas_rapidas.update({
      where: { uuid },
      data,
    });
  }

  async remove(uuid: string) {
    const respuesta = await this.prisma.respuestas_rapidas.findUnique({ where: { uuid } });
    if (!respuesta) throw new NotFoundException('Respuesta rápida no encontrada');

    await this.prisma.respuestas_rapidas.delete({
      where: { uuid },
    });

    return { message: 'Respuesta rápida eliminada correctamente' };
  }
}
