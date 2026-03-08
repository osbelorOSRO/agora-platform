import {
  Injectable,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma/prisma.service';
import { ProcesosMongoService } from 'src/mongodb/services/procesos.mongodb.service';
import { ClientesMongoService } from '../mongodb/services/clientes.mongodb.service';
import { EstadoClienteService, EstadoCliente } from './estado-cliente.service';
import { CacheService } from '../cache/cache.service';
import { WebsocketNotifierService } from '../websocket-notifier/websocket-notifier.service';

const MEDIA_BASE_URL = (process.env.MEDIA_BASE_URL || 'http://localhost:4001').replace(/\/+$/, '');
const AVATARES = [
  `${MEDIA_BASE_URL}/uploads/avatares/foto_perfil_hombre_default_02.png`,
  `${MEDIA_BASE_URL}/uploads/avatares/foto_perfil_hombre_default_03.png`,
  `${MEDIA_BASE_URL}/uploads/avatares/foto_perfil_hombre_default_05.png`,
  `${MEDIA_BASE_URL}/uploads/avatares/foto_perfil_mujer_default_01.png`,
  `${MEDIA_BASE_URL}/uploads/avatares/foto_perfil_mujer_default_04.png`,
  `${MEDIA_BASE_URL}/uploads/avatares/foto_perfil_mujer_default_06.png`,
];
const pickAvatar = () => AVATARES[Math.floor(Math.random() * AVATARES.length)];

type ClienteLite = {
  cliente_id: string;
  tipo_id: string;
  nombre: string | null;
  estado_actual: number | null;
  etiqueta_actual: string | null; // 🔥 AGREGADO
  intervenida: boolean;
  fecha_registro: Date | null;
  fecha_actual: Date | null;
  foto_perfil: string | null;
};

@Injectable()
export class ClientesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly procesosMongoService: ProcesosMongoService,
    private readonly clientesMongoService: ClientesMongoService,
    private readonly estadoClienteService: EstadoClienteService,
    private readonly cacheService: CacheService,
    private readonly websocketNotifierService: WebsocketNotifierService,
  ) {}

  // 🔥 OPTIMIZADO: CREACIÓN MANUAL
  async crearManual(cliente_id: string, tipo_id: string, nombre?: string, foto_perfil?: string) {
    const existe = await this.prisma.clientes.findUnique({ where: { cliente_id } });
    if (existe) return null;

    const foto = foto_perfil?.trim() ? foto_perfil.trim() : pickAvatar();

    const nuevo = await this.prisma.clientes.create({
      data: {
        cliente_id,
        tipo_id,
        nombre,
        foto_perfil: foto,
        estado_actual: 1,
        intervenida: true,
      },
      select: {
        cliente_id: true,
        tipo_id: true,
        nombre: true,
        estado_actual: true,
        etiqueta_actual: true, // 🔥 AGREGADO
        intervenida: true,
        fecha_registro: true,
        fecha_actual: true,
        foto_perfil: true,
      },
    });

    const existeMongo = await this.clientesMongoService.existe(cliente_id);
    if (!existeMongo) {
      await this.clientesMongoService.crearCliente({
        cliente_id,
        nombre: { nuevo: nombre || '' },
        foto_perfil: foto,
      });
    } else {
      await this.clientesMongoService.actualizarCampo({
        cliente_id,
        campo: 'foto_perfil',
        valor: foto,
      });
    }

    const proceso = await this.prisma.procesos.create({
      data: {
        cliente_id,
        fecha_inicio: new Date(),
        iniciado_por_id: 12,
        tipo_proceso: 'panel_manual',
      },
    });

    await this.procesosMongoService.crearProceso({
      proceso_id: String(proceso.id),
      cliente_id,
      tipo: 'panel_manual',
      estado: 'iniciado',
      creado_en: new Date(),
      creado_por: '12',
    });

    await this.procesosMongoService.agregarConversacion(String(proceso.id), {
      contenido: 'Creado desde el panel',
      tipo: 'texto',
      direccion: 'input',
      fecha_envio: new Date(),
      usuario: '12',
    });

    await this.prisma.map_journey.create({
      data: {
        cliente_id,
        etiqueta_id: 1,
        fuente: 'obeltran',
        fecha: new Date(),
      },
    });

    // 🔥 NOTIFICAR CLIENTE CREADO
    await this.websocketNotifierService.notificarClienteCreado(
      nuevo.cliente_id,
      nuevo.tipo_id,
      nuevo.nombre || 'Sin nombre',
      nuevo.foto_perfil,
    );

    return nuevo;
  }

  // 🔥 OPTIMIZADO: CREACIÓN DESDE BOT
  async crearDesdeBot(cliente_id: string, tipo_id: string, nombre?: string, foto_perfil?: string) {
    const existe = await this.prisma.clientes.findUnique({ where: { cliente_id } });
    if (existe) return null;

    const foto = foto_perfil?.trim() ? foto_perfil.trim() : pickAvatar();

    const nuevo = await this.prisma.clientes.create({
      data: {
        cliente_id,
        tipo_id,
        nombre,
        foto_perfil: foto,
        estado_actual: 1,
        intervenida: false,
      },
      select: {
        cliente_id: true,
        tipo_id: true,
        nombre: true,
        estado_actual: true,
        etiqueta_actual: true, // 🔥 AGREGADO
        intervenida: true,
        fecha_registro: true,
        fecha_actual: true,
        foto_perfil: true,
      },
    });

    const existeMongo = await this.clientesMongoService.existe(cliente_id);
    if (!existeMongo) {
      await this.clientesMongoService.crearCliente({
        cliente_id,
        nombre: { nuevo: nombre || '' },
        foto_perfil: foto,
      });
    } else {
      await this.clientesMongoService.actualizarCampo({
        cliente_id,
        campo: 'foto_perfil',
        valor: foto,
      });
    }

    // 🔥 NOTIFICAR CLIENTE CREADO (cambio de notificarRefrescarClientes)
    await this.websocketNotifierService.notificarClienteCreado(
      nuevo.cliente_id,
      nuevo.tipo_id,
      nuevo.nombre || 'Sin nombre',
      nuevo.foto_perfil,
    );

    return nuevo;
  }

  // DELETE
  async eliminar(cliente_id: string) {
    await this.prisma.conversaciones.deleteMany({ where: { cliente_id } });
    await this.prisma.map_journey.deleteMany({ where: { cliente_id } });
    await this.prisma.clientes.delete({ where: { cliente_id } });
    await this.clientesMongoService.eliminarCliente(cliente_id);
  }

  // 🔥 OPTIMIZADO: Query base con etiqueta_actual
  private async traerClientesBase(): Promise<ClienteLite[]> {
    return this.prisma.clientes.findMany({
      select: {
        cliente_id: true,
        tipo_id: true,
        nombre: true,
        estado_actual: true,
        etiqueta_actual: true, // 🔥 AGREGADO - Ahora viene directamente de BD
        intervenida: true,
        fecha_registro: true,
        fecha_actual: true,
        foto_perfil: true,
      },
      orderBy: { fecha_actual: 'desc' },
    });
  }

  private async listarPorEstado(estadoDeseado: EstadoCliente): Promise<ClienteLite[]> {
    const clientes = await this.traerClientesBase();
    if (clientes.length === 0) return [];

    const ids = clientes.map(c => c.cliente_id);
    const mapa = await this.estadoClienteService.mapearEstados(ids);

    return clientes.filter(c => mapa[c.cliente_id] === estadoDeseado);
  }

  async listarActivos() {
    return this.listarPorEstado('ACTIVO');
  }

  async listarCerrados() {
    return this.listarPorEstado('CERRADO');
  }

  async listarInactivos() {
    return this.listarPorEstado('INACTIVO');
  }

  async listar({ filtro }: { filtro: 'activos' | 'cerrados' | 'inactivos' | 'todos' }) {
    const clientes = await this.traerClientesBase();
    if (clientes.length === 0) return [];

    const ids = clientes.map(c => c.cliente_id);
    const mapa = await this.estadoClienteService.mapearEstados(ids);
    if (filtro === 'todos')
      return clientes.map(c => ({ ...c, estado_derivado: mapa[c.cliente_id] }));

    const objetivo: Record<string, EstadoCliente> = {
      activos: 'ACTIVO',
      cerrados: 'CERRADO',
      inactivos: 'INACTIVO',
      todos: 'ACTIVO',
    };

    return clientes
      .filter(c => mapa[c.cliente_id] === objetivo[filtro])
      .map(c => ({ ...c, estado_derivado: mapa[c.cliente_id] }));
  }

  // 🔥 OPTIMIZADO: Actualizar etiqueta y notificar
  async actualizarYObtenerEtiqueta(
    cliente_id: string,
    etiqueta_id: number,
    fuente: 'bot' | 'humano' | 'panel',
    proceso_id?: number,
  ) {
    // Insertar en map_journey (el trigger de BD actualizará clientes)
    await this.prisma.map_journey.create({
      data: {
        cliente_id,
        etiqueta_id,
        fuente,
        proceso_id: proceso_id ?? null,
      },
    });

    // 🔥 SELECT para obtener valores actualizados por el trigger
    const clienteActualizado = await this.prisma.clientes.findUnique({
      where: { cliente_id },
      select: {
        estado_actual: true,
        etiqueta_actual: true,
      },
    });

    if (!clienteActualizado) {
      throw new BadRequestException('Cliente no encontrado');
    }

    // 🔥 NOTIFICAR CAMBIO DE ESTADO
    await this.websocketNotifierService.notificarCambioEstado(
      cliente_id,
      clienteActualizado.estado_actual,
      clienteActualizado.etiqueta_actual,
    );

    // Invalidar cache si usas
    await this.cacheService.del('etiquetas:all');

    return {
      ok: true,
      estado_actual: clienteActualizado.estado_actual,
      etiqueta_actual: clienteActualizado.etiqueta_actual,
    };
  }

  async crearEtiqueta(nombre_etiqueta: string) {
    const existe = await this.prisma.etiquetas.findUnique({ where: { nombre_etiqueta } });
    if (existe) {
      throw new BadRequestException('La etiqueta ya existe');
    }

    const totalEtiquetas = await this.prisma.etiquetas.count();
    const totalColores = await this.prisma.colores.count();
    if (totalColores === 0) {
      throw new InternalServerErrorException('No hay colores disponibles');
    }

    const color_id = (totalEtiquetas % totalColores) + 1;

    await this.prisma.etiquetas.create({
      data: {
        nombre_etiqueta,
        color_id,
      },
    });

    await this.cacheService.del('etiquetas:all');

    return { mensaje: 'Etiqueta creada correctamente' };
  }

  async verificarExistencia(cliente_id: string, tipo_id: string): Promise<boolean> {
    const cliente = await this.prisma.clientes.findFirst({
      where: {
        cliente_id,
        tipo_id,
      },
    });
    return !!cliente;
  }

  async obtenerClientePorId(cliente_id: string) {
    return this.prisma.clientes.findUnique({
      where: { cliente_id },
      select: {
        cliente_id: true,
        tipo_id: true,
        intervenida: true,
        foto_perfil: true,
      },
    });
  }

  async debugRawQuery() {
    const cacheKey = 'etiquetas:all';
    const cached = await this.cacheService.get(cacheKey);
    if (cached) {
      return cached;
    }

    const etiquetas = await this.prisma.$queryRawUnsafe(`SELECT * FROM etiquetas`);
    await this.cacheService.set(cacheKey, etiquetas, 10800);
    return etiquetas;
  }

  // 🔥 OPTIMIZADO: Actualizar intervención con notificación
  async actualizarIntervencionManual(cliente_id: string, intervenida: boolean) {
    const cliente = await this.prisma.clientes.findUnique({ where: { cliente_id } });
    if (!cliente) throw new BadRequestException('Cliente no encontrado');

    await this.prisma.clientes.update({ where: { cliente_id }, data: { intervenida } });

    const proceso = await this.prisma.procesos.findFirst({
      where: { cliente_id, fecha_fin: null, abandono: false },
      orderBy: { fecha_inicio: 'desc' },
    });

    if (proceso) {
      await this.prisma.procesos.update({
        where: { id: proceso.id },
        data: { delegado_humano: intervenida },
      });
    }

    // 🔥 NOTIFICAR CAMBIO DE INTERVENCIÓN
    await this.websocketNotifierService.notificarCambioIntervencion(
      cliente_id,
      intervenida,
    );

    return {
      cliente_id,
      intervenida,
      mensaje: intervenida
        ? 'Cliente marcado como intervenido (humano)'
        : 'Cliente liberado para el bot',
    };
  }

async verificarModoPiloto(cliente_id: string, msg_mode: string) {
  const ahora = new Date().toLocaleString('en-US', { timeZone: 'America/Santiago' });
  const hora = new Date(ahora).getHours();

  const cliente = await this.prisma.clientes.findUnique({ where: { cliente_id } });
  const clienteExiste = !!cliente;
  const estaIntervenida = cliente?.intervenida ?? false;
  const estadoActual = cliente?.estado_actual ?? null;

  const fueraDeHorario = hora >= 22 || hora < 9;
  const usar_piloto = !estaIntervenida || fueraDeHorario;
  const registrar_cliente = !clienteExiste;

  let saludar = false;
  let motivo = '';
  let session_mode: 'audio' | 'no_audio' | null = null;

  if (!clienteExiste) {
    saludar = true;
    motivo = 'Cliente no existe';
  } else {
    const procesoActivo = await this.prisma.procesos.findFirst({
      where: { cliente_id, fecha_fin: null },
      orderBy: { fecha_inicio: 'desc' },
      select: {
        id: true,
        fecha_saludo: true,
        session_mode: true,
      },
    });

    if (!procesoActivo) {
      saludar = true;
      motivo = 'No hay proceso en curso';
    } else {
      const proceso_id: number = Number(procesoActivo.id);
      const fechaSaludo: Date | null = procesoActivo.fecha_saludo;
      const ahoraDate = new Date();
      const horasEntreSaludos = 24;

      // estado actual del lock
      session_mode = (procesoActivo.session_mode as 'audio' | 'no_audio' | null) ?? null;

      // reglas de lock:
      // 1) estado=1 + audio => audio
      // 2) estado!=1 + null => no_audio
      if (session_mode === null) {
        if (estadoActual === 1 && msg_mode === 'audio') {
          await this.prisma.procesos.updateMany({
            where: { id: proceso_id, session_mode: null },
            data: { session_mode: 'audio' },
          });
        } else if (estadoActual !== 1) {
          await this.prisma.procesos.updateMany({
            where: { id: proceso_id, session_mode: null },
            data: { session_mode: 'no_audio' },
          });
        }

        // releer valor final
        const procesoPostLock = await this.prisma.procesos.findUnique({
          where: { id: proceso_id },
          select: { session_mode: true },
        });

        session_mode = (procesoPostLock?.session_mode as 'audio' | 'no_audio' | null) ?? null;
      }

      if (estadoActual === 1) {
        if (!fechaSaludo || ahoraDate.getTime() - fechaSaludo.getTime() > horasEntreSaludos * 3600 * 1000) {
          saludar = true;
          motivo = 'Estado 1 y último saludo hace más de 24 horas o no existe';
          await this.prisma.procesos.update({
            where: { id: proceso_id },
            data: { fecha_saludo: ahoraDate },
          });
        } else {
          saludar = false;
          motivo = `Saludo ya enviado hace menos de ${horasEntreSaludos} horas`;
        }
      } else {
        saludar = false;
        motivo = `Estado actual del cliente = ${estadoActual}, no corresponde saludar`;
      }
    }
  }

  return {
    success: true,
    cliente_id,
    ya_intervenido: estaIntervenida,
    intervenida: estaIntervenida,
    mensaje: usar_piloto
      ? fueraDeHorario
        ? 'Modo piloto activo (fuera de horario humano)'
        : 'Modo piloto activo (cliente no intervenido)'
      : 'Cliente intervenido y dentro de horario humano',
    usar_piloto,
    registrar_cliente,
    tratar_como_nuevo: !clienteExiste,
    saludar,
    motivo,
    session_mode,
  };
}

  async listarLite(params: { search?: string; page?: number; limit?: number }) {
    const cacheKey = `clientes:lite:${params.search || ''}:${params.page || 1}:${params.limit || 30}`;
    const cached = await this.cacheService.get(cacheKey);
    if (cached) {
      return cached;
    }

    const search = (params.search ?? '').trim();
    const page = Number(params.page ?? 1);
    const limit = Number(params.limit ?? 30);
    const skip = (page - 1) * limit;

    const where = search
      ? {
          OR: [
            { cliente_id: { contains: search } },
            { nombre: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : undefined;

    const [items, total] = await this.prisma.$transaction([
      this.prisma.clientes.findMany({
        where,
        select: { cliente_id: true, nombre: true, foto_perfil: true },
        orderBy: { fecha_actual: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.clientes.count({ where }),
    ]);

    const result = { items, total, page, limit, hasNext: page * limit < total };
    await this.cacheService.set(cacheKey, result, 300);

    return result;
  }

  async obtenerLitePorId(cliente_id: string) {
    const c = await this.prisma.clientes.findUnique({
      where: { cliente_id },
      select: {
        cliente_id: true,
        tipo_id: true,
        nombre: true,
        foto_perfil: true,
      },
    });
    return c ?? null;
  }

  async abrirOContinuarProceso(params: { cliente_id: string; iniciado_por_id: number }) {
    const { cliente_id, iniciado_por_id } = params;

    const activo = await this.prisma.procesos.findFirst({
      where: { cliente_id, fecha_fin: null, abandono: false },
      orderBy: { fecha_inicio: 'desc' },
    });

    if (activo) {
      return { ok: true, cliente_id, proceso_id: String(activo.id), reanudado: true };
    }

    const nuevo = await this.prisma.procesos.create({
      data: {
        cliente_id,
        fecha_inicio: new Date(),
        iniciado_por_id,
        tipo_proceso: 'panel_manual',
        delegado_humano: true,
        abandono: false,
      },
    });
    const proceso_id = String(nuevo.id);

    await this.procesosMongoService.crearProceso({
      proceso_id,
      cliente_id,
      tipo: 'panel_manual',
      estado: 'iniciado',
      creado_en: new Date(),
      creado_por: String(iniciado_por_id),
    });

    await this.procesosMongoService.agregarConversacion(proceso_id, {
      contenido: 'Chat manual iniciado desde panel',
      tipo: 'texto',
      direccion: 'input',
      fecha_envio: new Date(),
      usuario: String(iniciado_por_id),
    });

    return { ok: true, cliente_id, proceso_id, reanudado: false };
  }

  async actualizarNombrePostgres(cliente_id: string, nuevo_nombre: string): Promise<void> {
    try {
      await this.prisma.clientes.update({
        where: { cliente_id },
        data: { nombre: nuevo_nombre },
      });
    } catch (error) {
      console.error(`[❌ actualizarNombrePostgres] Error al actualizar nombre:`, error);
      throw new InternalServerErrorException('No se pudo actualizar el nombre del cliente en Postgres');
    }
  }

// Agregar este método a la clase ClientesService


async actualizarEtiquetaDesdeN8N(
  cliente_id: string,
  etiqueta_id: number,
  fuente: string,
  proceso_id?: number,
  fecha?: Date,
): Promise<{
  ok: boolean;
  estado_actual: number;
  etiqueta_actual: string;
}> {
  await this.prisma.map_journey.create({
    data: {
      cliente_id,
      etiqueta_id,
      fuente,    
      proceso_id: proceso_id ?? null,
      fecha: fecha,

    },
  });

  const clienteActualizado = await this.prisma.clientes.findUnique({
    where: { cliente_id },
    select: {
      estado_actual: true,
      etiqueta_actual: true,
    },
  });

  if (!clienteActualizado) {
    throw new BadRequestException('Cliente no encontrado');
  }

  await this.websocketNotifierService.notificarCambioEstado(
    cliente_id,
    clienteActualizado.estado_actual,
    clienteActualizado.etiqueta_actual,
  );

  return {
    ok: true,
    estado_actual: clienteActualizado.estado_actual,
    etiqueta_actual: clienteActualizado.etiqueta_actual,
  };
}
}
