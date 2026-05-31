import { BadRequestException, Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma/prisma.service';
import {
  parseDate,
  formatReportResponse,
  ReportResult,
} from './report-formatter';

const TIMEZONE = 'America/Santiago';

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  catalogo() {
    return [
      {
        id: 'procesos',
        nombre: 'Consulta de eventos de threads',
        formatos: ['json', 'csv'],
        filtros: [
          'desde',
          'hasta',
          'session_id',
          'actor_external_id',
          'object_type',
          'event_type',
          'event_source',
          'direction',
          'provider',
        ],
      },
      {
        id: 'desempeno',
        nombre: 'Consulta de desempeño por fuente',
        formatos: ['json', 'csv'],
        filtros: ['desde', 'hasta', 'event_source', 'username'],
      },
      {
        id: 'procesos-semanales',
        nombre: 'Actividad semanal de threads',
        formatos: ['json', 'csv'],
        filtros: ['desde', 'hasta'],
      },
      {
        id: 'precios-planes',
        nombre: 'Consulta de precios de planes',
        formatos: ['json', 'csv'],
        filtros: ['codigo', 'tipo', 'nombre'],
      },
      {
        id: 'clientes-info',
        nombre: 'Agenda de contactos conversacionales',
        formatos: ['json', 'csv'],
        filtros: ['desde', 'hasta', 'rut', 'fono', 'nombre', 'object_type'],
      },
      {
        id: 'analisis-ventas',
        nombre: 'Análisis de ventas (leads)',
        formatos: ['json', 'csv'],
        filtros: [
          'desde',
          'hasta',
          'canal',
          'lead_type',
          'resultado',
          'motivo_perdida',
        ],
      },
    ];
  }

  async procesos(q: Record<string, string>): Promise<ReportResult> {
    const desde = parseDate(q.desde);
    const hasta = parseDate(q.hasta);
    if ((q.desde && !desde) || (q.hasta && !hasta))
      throw new BadRequestException('Parámetros de fecha inválidos');

    const where: Prisma.thread_eventsWhereInput = {};
    if (desde || hasta) {
      where.occurred_at = {
        ...(desde ? { gte: desde } : {}),
        ...(hasta ? { lte: hasta } : {}),
      };
    }
    if (q.session_id) where.session_id = q.session_id;
    if (q.actor_external_id) where.actor_external_id = q.actor_external_id;
    if (q.object_type) where.object_type = q.object_type.toUpperCase();
    if (q.event_type) where.event_type = q.event_type.toUpperCase();
    if (q.event_source) where.event_source = q.event_source.toUpperCase();
    if (q.direction) where.direction = q.direction.toUpperCase();
    if (q.provider) where.provider = q.provider.toUpperCase();

    const events = await this.prisma.thread_events.findMany({
      where,
      orderBy: { occurred_at: 'desc' },
      take: 5000,
    });
    const sessionIds = Array.from(new Set(events.map((e) => e.session_id)));
    const actorPairs = Array.from(
      new Map(
        events.map((e) => [`${e.actor_external_id}::${e.object_type}`, e]),
      ).values(),
    );

    const [threads, contacts] = await Promise.all([
      sessionIds.length
        ? this.prisma.threads.findMany({
            where: { session_id: { in: sessionIds } },
          })
        : Promise.resolve([]),
      actorPairs.length
        ? this.prisma.meta_inbox_contacts.findMany({
            where: {
              OR: actorPairs.map((e) => ({
                actor_external_id: e.actor_external_id,
                object_type: e.object_type,
              })),
            },
          })
        : Promise.resolve([]),
    ]);

    const threadMap = new Map(threads.map((t) => [t.session_id, t]));
    const contactMap = new Map(
      contacts.map((c) => [`${c.actor_external_id}::${c.object_type}`, c]),
    );

    const rows = events.map((event) => {
      const thread = threadMap.get(event.session_id);
      const contact = contactMap.get(
        `${event.actor_external_id}::${event.object_type}`,
      );
      return {
        id: event.id,
        session_id: event.session_id,
        actor_external_id: event.actor_external_id,
        object_type: event.object_type,
        actor_nombre: contact?.display_name ?? 'Nuevo',
        actor_fono: contact?.phone ?? null,
        event_type: event.event_type,
        event_source: event.event_source,
        direction: event.direction,
        provider: event.provider,
        source_channel: event.source_channel,
        from_value: event.from_value,
        to_value: event.to_value,
        username: event.username,
        external_event_id: event.external_event_id,
        message_external_id: event.message_external_id,
        thread_status_actual: thread?.thread_status ?? null,
        attention_mode_actual: thread?.attention_mode ?? null,
        thread_stage_actual: thread?.thread_stage ?? null,
        metadata: event.metadata,
        occurred_at: event.occurred_at.toISOString(),
      };
    });

    return {
      format: q.format === 'csv' ? 'csv' : 'json',
      filename: 'reporte_threads_eventos',
      rows,
    };
  }

  async desempeno(q: Record<string, string>): Promise<ReportResult> {
    const desde = parseDate(q.desde);
    const hasta = parseDate(q.hasta);
    if (!desde || !hasta)
      throw new BadRequestException(
        "Parámetros 'desde' y 'hasta' son requeridos",
      );

    const clauses = ['e.occurred_at >= $1', 'e.occurred_at <= $2'];
    const params: any[] = [desde, hasta];
    if (q.event_source) {
      params.push(String(q.event_source).toUpperCase());
      clauses.push(`e.event_source = $${params.length}`);
    }
    if (q.username) {
      params.push(`%${String(q.username)}%`);
      clauses.push(`e.username ILIKE $${params.length}`);
    }

    const rows: any[] = await this.prisma.$queryRawUnsafe(
      `
      SELECT
        COALESCE(e.username, e.event_source) AS operador,
        e.event_source,
        COUNT(*)::int AS total_eventos,
        COUNT(*) FILTER (WHERE e.event_type = 'MESSAGE_INCOMING')::int AS mensajes_entrantes,
        COUNT(*) FILTER (WHERE e.event_type = 'MESSAGE_OUTGOING')::int AS mensajes_salientes,
        COUNT(*) FILTER (WHERE e.event_type = 'THREAD_STATUS_CHANGED')::int AS cambios_estado,
        COUNT(*) FILTER (WHERE e.event_type = 'THREAD_STAGE_CHANGED')::int AS cambios_stage,
        COUNT(*) FILTER (WHERE e.event_type = 'ATTENTION_MODE_CHANGED')::int AS cambios_modo,
        COUNT(DISTINCT e.session_id)::int AS threads_distintos,
        MIN(e.occurred_at) AS primera_actividad,
        MAX(e.occurred_at) AS ultima_actividad
      FROM thread_events e
      WHERE ${clauses.join(' AND ')}
      GROUP BY COALESCE(e.username, e.event_source), e.event_source
      ORDER BY total_eventos DESC, ultima_actividad DESC
    `,
      ...params,
    );

    return {
      format: q.format === 'csv' ? 'csv' : 'json',
      filename: 'reporte_desempeno_threads',
      rows,
    };
  }

  async procesosSemanales(q: Record<string, string>): Promise<ReportResult> {
    const desde = parseDate(q.desde);
    const hasta = parseDate(q.hasta);
    if (!desde || !hasta)
      throw new BadRequestException(
        "Parámetros 'desde' y 'hasta' son requeridos",
      );

    const rows: any[] = await this.prisma.$queryRaw`
      SELECT
        date_trunc('week', occurred_at AT TIME ZONE ${TIMEZONE})::date AS semana_inicio,
        (date_trunc('week', occurred_at AT TIME ZONE ${TIMEZONE})::date + INTERVAL '6 days')::date AS semana_fin,
        COUNT(*) AS total_eventos,
        COUNT(*) FILTER (WHERE event_type = 'THREAD_CREATED') AS threads_creados,
        COUNT(*) FILTER (WHERE event_type = 'MESSAGE_INCOMING') AS mensajes_entrantes,
        COUNT(*) FILTER (WHERE event_type = 'MESSAGE_OUTGOING') AS mensajes_salientes,
        COUNT(DISTINCT session_id) AS threads_distintos
      FROM thread_events
      WHERE occurred_at >= ${desde}
        AND occurred_at <= ${hasta}
      GROUP BY 1, 2
      ORDER BY 1 ASC
      LIMIT 5000
    `;

    return {
      format: q.format === 'csv' ? 'csv' : 'json',
      filename: 'reporte_procesos_semanales',
      rows: rows.map((row) => ({
        semana_inicio:
          row.semana_inicio instanceof Date
            ? row.semana_inicio.toISOString().slice(0, 10)
            : row.semana_inicio,
        semana_fin:
          row.semana_fin instanceof Date
            ? row.semana_fin.toISOString().slice(0, 10)
            : row.semana_fin,
        total_eventos: Number(row.total_eventos),
        threads_creados: Number(row.threads_creados),
        mensajes_entrantes: Number(row.mensajes_entrantes),
        mensajes_salientes: Number(row.mensajes_salientes),
        threads_distintos: Number(row.threads_distintos),
      })),
    };
  }

  async preciosPlanes(q: Record<string, string>): Promise<ReportResult> {
    const rows = await this.prisma.precios_planes.findMany({
      where: {
        ...(q.codigo ? { codigo: String(q.codigo) } : {}),
        ...(q.tipo ? { tipo: String(q.tipo) } : {}),
        ...(q.nombre
          ? { nombre: { contains: String(q.nombre), mode: 'insensitive' } }
          : {}),
      },
      orderBy: { codigo: 'asc' },
    });

    return {
      format: q.format === 'csv' ? 'csv' : 'json',
      filename: 'reporte_precios_planes',
      rows: rows.map((row) => ({
        codigo: row.codigo,
        nombre: row.nombre ?? null,
        tipo: row.tipo ?? null,
        descripcion: row.descripcion ?? null,
        lineas: row.lineas ?? null,
        precio_base: row.precio_base ? Number(row.precio_base) : null,
        precio_normal: row.precio_normal ?? null,
        excluye_alta: row.excluye_alta ?? false,
        excluye_portabilidad_postpago:
          row.excluye_portabilidad_postpago ?? false,
        url_archivo: row.url_archivo ?? null,
      })),
    };
  }

  async clientesInfo(q: Record<string, string>): Promise<ReportResult> {
    const desde = parseDate(q.desde);
    const hasta = parseDate(q.hasta);
    if ((q.desde && !desde) || (q.hasta && !hasta))
      throw new BadRequestException('Parámetros de fecha inválidos');

    const rows = await this.prisma.meta_inbox_contacts.findMany({
      where: {
        ...(desde || hasta
          ? {
              created_at: {
                ...(desde ? { gte: desde } : {}),
                ...(hasta ? { lte: hasta } : {}),
              },
            }
          : {}),
        ...(q.rut ? { rut: String(q.rut) } : {}),
        ...(q.fono ? { phone: String(q.fono) } : {}),
        ...(q.object_type
          ? { object_type: String(q.object_type).toUpperCase() }
          : {}),
        ...(q.nombre
          ? {
              display_name: { contains: String(q.nombre), mode: 'insensitive' },
            }
          : {}),
      },
      orderBy: { created_at: 'desc' },
    });

    return {
      format: q.format === 'csv' ? 'csv' : 'json',
      filename: 'reporte_agenda_contactos',
      rows: rows.map((row) => ({
        id: row.id,
        actor_external_id: row.actor_external_id,
        object_type: row.object_type,
        rut: row.rut ?? null,
        nombre: row.display_name,
        first_name: row.first_name ?? null,
        last_name: row.last_name ?? null,
        email: row.email ?? null,
        direccion: row.address ?? null,
        comuna: row.city ?? null,
        region: row.region ?? null,
        fono: row.phone ?? null,
        notes: row.notes ?? null,
        metadata: row.metadata,
        fecha_registro: row.created_at?.toISOString() ?? null,
        fecha_actualizacion: row.updated_at?.toISOString() ?? null,
      })),
    };
  }

  async analisisVentas(q: Record<string, string>): Promise<ReportResult> {
    const desde = parseDate(q.desde);
    const hasta = parseDate(q.hasta);
    if ((q.desde && !desde) || (q.hasta && !hasta))
      throw new BadRequestException('Parámetros de fecha inválidos');

    const clauses: string[] = [];
    const params: unknown[] = [];

    if (desde) {
      params.push(desde);
      clauses.push(`lsa.created_at >= $${params.length}`);
    }
    if (hasta) {
      params.push(hasta);
      clauses.push(`lsa.created_at <= $${params.length}`);
    }
    if (q.canal) {
      params.push(String(q.canal).toUpperCase());
      clauses.push(`t.object_type = $${params.length}`);
    }
    if (q.lead_type) {
      params.push(String(q.lead_type).toUpperCase());
      clauses.push(`lsa.lead_type::text = $${params.length}`);
    }
    if (q.resultado) {
      params.push(String(q.resultado).toUpperCase());
      clauses.push(`lsa.result::text = $${params.length}`);
    }
    if (q.motivo_perdida) {
      params.push(String(q.motivo_perdida));
      clauses.push(`lsa.loss_reason = $${params.length}`);
    }

    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';

    const rows = await this.prisma.$queryRawUnsafe<Record<string, unknown>[]>(
      `SELECT
        to_char(lsa.created_at AT TIME ZONE '${TIMEZONE}', 'DD/MM/YYYY HH24:MI') AS fecha_registro,
        t.object_type                                                               AS canal,
        t.source_channel                                                            AS sub_canal,
        COALESCE(c.display_name, 'Sin nombre')                                     AS contacto,
        c.phone                                                                     AS telefono,
        c.rut                                                                       AS rut,
        lsa.lead_type::text                                                         AS tipo_lead,
        lsa.age_range::text                                                         AS rango_edad,
        lsa.sex::text                                                               AS sexo,
        lsa.customer_type                                                           AS tipo_cliente,
        lsa.purchase_intent                                                         AS intencion,
        lsa.result::text                                                            AS resultado,
        lsa.plan_contracted                                                         AS plan_contratado,
        lsa.sale_type                                                               AS modalidad,
        lsa.loss_reason                                                             AS motivo_perdida,
        array_to_string(lsa.verbalization_tags, ', ')                              AS tags_verbalizacion,
        lsa.verbalization_text                                                      AS verbalizacion_textual,
        lsa.session_id
       FROM lead_sales_analysis lsa
       JOIN threads t ON t.session_id = lsa.session_id
       LEFT JOIN meta_inbox_contacts c
         ON c.actor_external_id = t.actor_external_id AND c.object_type = t.object_type
       ${where}
       ORDER BY lsa.created_at DESC
       LIMIT 5000`,
      ...params,
    );

    return {
      format: q.format === 'csv' ? 'csv' : 'json',
      filename: 'reporte_analisis_ventas',
      rows,
    };
  }

  formatResponse(result: ReportResult): {
    headers?: Record<string, string>;
    body: any;
  } {
    return formatReportResponse(result);
  }
}
