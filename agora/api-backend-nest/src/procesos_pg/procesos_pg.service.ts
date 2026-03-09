import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma/prisma.service';
import { CreateProcesoDto } from './dto/create-proceso.dto';
import { ProcesosMongoService } from '../mongodb/services/procesos.mongodb.service';
import { CreateMensajeDto } from './dto/create-mensaje.dto';
import { BaileysSenderService } from '../baileys/baileys-sender.service';
import { convertirWebmAOgg } from '../utils/convertidorAudio.service';
import path from 'path';
import fs from 'fs';
import { diskStorage } from 'multer';
import { WebsocketNotifierService } from '../websocket-notifier/websocket-notifier.service';

function convertirDuracion(segundos: number) {
  const minutos = 60;
  const horas = minutos * 60;
  const dias = horas * 24;
  const meses = dias * 30;
  const anos = dias * 365;

  if (segundos < minutos) {
    return { valor: Math.round(segundos), unidad: 'seg' };
  } else if (segundos < horas) {
    return { valor: Math.round(segundos / minutos), unidad: 'min' };
  } else if (segundos < dias) {
    return { valor: Math.round(segundos / horas), unidad: 'hrs' };
  } else if (segundos < meses) {
    return { valor: Math.round(segundos / dias), unidad: 'días' };
  } else if (segundos < anos) {
    return { valor: Math.round(segundos / meses), unidad: 'meses' };
  } else {
    return { valor: Math.round(segundos / anos), unidad: 'años' };
  }
}

@Injectable()
export class ProcesosPgService {
  private readonly mediaBaseUrl = (process.env.MEDIA_BASE_URL || '').replace(/\/+$/, '');

  constructor(
    private readonly prisma: PrismaService,
    private readonly baileysSender: BaileysSenderService,
    private readonly mongoService: ProcesosMongoService,
    private readonly websocketNotifier: WebsocketNotifierService,
  ) {}

  // 🔥 OPTIMIZADO: Notificar proceso creado
  async crearProceso(dto: CreateProcesoDto) {
    const fecha_inicio = new Date();

    // Validación previa
    if (!dto.cliente_id) {
      throw new Error("❌ cliente_id llegó vacío o indefinido al servicio");
    }
    if (!dto.tipo_proceso) {
      throw new Error("❌ tipo_proceso llegó vacío o indefinido al servicio");
    }

    // Crear en Postgres
    const proceso = await this.prisma.procesos.create({
      data: {
        cliente_id: String(dto.cliente_id),
        fecha_inicio,
        iniciado_por_id: dto.iniciado_por_id ?? null,
        tipo_proceso: dto.tipo_proceso,
      },
    });

    // Crear en Mongo
    await this.mongoService.crearProceso({
      proceso_id: String(proceso.id),
      cliente_id: String(dto.cliente_id),
      tipo: dto.tipo_proceso,
      estado: 'iniciado',
      creado_en: fecha_inicio,
      creado_por: String(dto.iniciado_por_id ?? "sistema"),
    });

    // 🔥 CAMBIO: De notificarRefrescarClientes() a notificarProcesoCreado()
    await this.websocketNotifier.notificarProcesoCreado(
      String(dto.cliente_id),
      String(proceso.id),
    );

    return proceso;
  }

  async obtenerProcesoActivoPorCliente(cliente_id: string) {
    return this.prisma.procesos.findFirst({
      where: {
        cliente_id,
        fecha_fin: null,
      },
      orderBy: {
        fecha_inicio: 'desc',
      },
    });
  }

  // 🔥 OPTIMIZADO: Notificar cambio de estado al cerrar
  async cerrarProcesoManual(data: {
    proceso_id: string;
    tipo_proceso: string;
    tipo_cierre: string;
    abandono: boolean;
    cerrado_por_id: string;
    fuente?: string;
  }) {
    const proceso_id = Number(data.proceso_id);
    const cerrado_por_id = Number(data.cerrado_por_id);
    const fuente = data.fuente || "panel";

    return await this.prisma.$transaction(async (prisma) => {
      const proceso = await prisma.procesos.findUnique({
        where: { id: proceso_id },
      });

      if (!proceso || proceso.fecha_fin) {
        throw new NotFoundException("El proceso no existe o ya fue cerrado");
      }

      const fecha_fin = new Date();
      const duracionMilisegundos = fecha_fin.getTime() - new Date(proceso.fecha_inicio).getTime();
      const duracionSegundos = duracionMilisegundos / 1000;
      const { valor: duracion_valor, unidad: duracion_unidad } = convertirDuracion(duracionSegundos);

      await prisma.procesos.update({
        where: { id: proceso_id },
        data: {
          tipo_proceso: data.tipo_proceso,
          tipo_cierre: data.tipo_cierre,
          abandono: data.abandono,
          delegado_humano: true,
          cerrado_por_id,
          fecha_fin,
          duracion_valor,
          duracion_unidad,
        },
      });

      // Actualizamos intervenida a false en clientes
      await prisma.clientes.update({
        where: { cliente_id: proceso.cliente_id },
        data: { intervenida: false },
      });

      // Insertamos registro en map_journey
      await prisma.map_journey.create({
        data: {
          proceso_id,
          cliente_id: proceso.cliente_id,
          etiqueta_id: 1,
          fuente,
          fecha: fecha_fin,
        },
      });

      // Cerramos proceso en MongoDB
      await this.mongoService.cerrarProceso({
        proceso_id: data.proceso_id,
        tipo: data.tipo_proceso,
        tipo_cierre: data.tipo_cierre,
        cerrado_por: data.cerrado_por_id,
        fecha_fin,
      });

      // 🔥 CAMBIO: Obtener estado actualizado y notificar
      const clienteActualizado = await prisma.clientes.findUnique({
        where: { cliente_id: proceso.cliente_id },
        select: {
          estado_actual: true,
          etiqueta_actual: true,
        },
      });

      if (clienteActualizado) {
        await this.websocketNotifier.notificarCambioEstado(
          proceso.cliente_id,
          clienteActualizado.estado_actual,
          clienteActualizado.etiqueta_actual,
        );
      }

      // 🔥 TAMBIÉN notificar cambio de intervención (false)
      await this.websocketNotifier.notificarCambioIntervencion(
        proceso.cliente_id,
        false,
      );

      // 🔥 NUEVO: Notificar proceso cerrado para mover de activos a inactivos
      await this.websocketNotifier.notificarProcesoCerrado(
        proceso.cliente_id,
        data.proceso_id,
      );

      return { success: true, proceso_id, fecha_fin };
    });
  }

  async clientesConProcesoAbierto(clienteIds: string[]): Promise<Set<string>> {
    if (!clienteIds?.length) return new Set();

    const rows = await this.prisma.procesos.findMany({
      where: {
        cliente_id: { in: clienteIds },
        fecha_fin: null,
      },
      select: { cliente_id: true },
      distinct: ['cliente_id'],
    });

    return new Set(rows.map(r => r.cliente_id));
  }

  async enviarMensaje(proceso_id: number, dto: CreateMensajeDto, tipoId: string) {
    const proceso = await this.prisma.procesos.findUnique({ where: { id: proceso_id } });
    if (!proceso) throw new NotFoundException('Proceso no encontrado');

    const numero = proceso.cliente_id;
    const tipoValido: 'texto' | 'imagen' | 'audio' | 'documento' | 'video' =
      dto.tipo as any;

    await this.baileysSender.enviarMensajeWhatsApp(
      numero,
      tipoValido,
      dto.contenido,
      tipoId
    );

    await this.mongoService.agregarConversacion(String(proceso_id), {
      contenido: dto.contenido,
      tipo: tipoValido,
      direccion: 'output',
      fecha_envio: new Date(),
      usuario: dto.usuario,
      url_archivo: tipoValido !== 'texto' ? dto.contenido : undefined,
    });

    return { success: true };
  }

  async enviarNotaVoz(
    proceso_id: number,
    archivo: Express.Multer.File,
    usuario: string,
    tipoId: string,
  ) {
    const proceso = await this.prisma.procesos.findUnique({ where: { id: proceso_id } });
    if (!proceso) throw new NotFoundException('Proceso no encontrado');

    const rutaOriginal = archivo.path;
    const rutaOgg = await convertirWebmAOgg(rutaOriginal);
    if (!rutaOgg) throw new Error('Error al convertir nota de voz');

    const filename = path.basename(rutaOgg);
    const url = `${this.mediaBaseUrl}/uploads/${filename}`;

    await this.baileysSender.enviarMensajeWhatsApp(
      proceso.cliente_id,
      'audio',
      '',
      tipoId,
      url,
    );

    await this.mongoService.agregarConversacion(String(proceso_id), {
      contenido: url,
      tipo: 'audio',
      direccion: 'output',
      fecha_envio: new Date(),
      usuario,
      url_archivo: url,
    });

    return { success: true, url };
  }

  async enviarArchivoGeneral(
    proceso_id: number,
    archivo: Express.Multer.File,
    tipo: 'imagen' | 'documento' | 'video',
    usuario: string,
    tipoId: string
  ) {
    const proceso = await this.prisma.procesos.findUnique({
      where: { id: proceso_id },
    });
    if (!proceso) throw new NotFoundException('Proceso no encontrado');

    const filename = archivo.filename;
    const url = `${this.mediaBaseUrl}/uploads/${filename}`;

    await this.baileysSender.enviarMensajeWhatsApp(
      proceso.cliente_id,
      tipo,
      filename,
      tipoId,
      url
    );

    await this.mongoService.agregarConversacion(String(proceso_id), {
      contenido: filename,
      tipo,
      direccion: 'output',
      fecha_envio: new Date(),
      usuario,
      url_archivo: url,
    });

    return { success: true, url };
  }
}
