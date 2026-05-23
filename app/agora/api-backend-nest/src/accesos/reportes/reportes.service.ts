import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma/prisma.service';

const TIMEZONE = 'America/Santiago';

function parseDate(value: any): Date | null {
  if (typeof value !== 'string' || !value.trim()) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function csvEscape(value: any): string {
  if (value === null || value === undefined) return '';
  if (value instanceof Date) return value.toISOString();
  const serialized = typeof value === 'object' ? JSON.stringify(value) : String(value);
  return `"${serialized.replace(/"/g, '""')}"`;
}

function rowsToCsv(rows: Record<string, any>[]): string {
  if (rows.length === 0) return '';
  const headers = [...rows.reduce<Set<string>>((set, row) => { Object.keys(row).forEach((k) => set.add(k)); return set; }, new Set<string>())];
  return [
    headers.join(','),
    ...rows.map((row) => headers.map((h) => csvEscape(row[h])).join(',')),
  ].join('\n');
}

export interface ReportResult {
  format: 'json' | 'csv';
  filename: string;
  rows: Record<string, any>[];
}

@Injectable()
export class ReportesService {
  constructor(private readonly prisma: PrismaService) {}

  catalogo() {
    return [
      { id: 'procesos', nombre: 'Consulta de eventos de threads', formatos: ['json', 'csv'], filtros: ['desde', 'hasta', 'session_id', 'actor_external_id', 'object_type', 'event_type', 'event_source', 'direction', 'provider'] },
      { id: 'desempeno', nombre: 'Consulta de desempeño por fuente', formatos: ['json', 'csv'], filtros: ['desde', 'hasta', 'event_source', 'username'] },
      { id: 'procesos-semanales', nombre: 'Actividad semanal de threads', formatos: ['json', 'csv'], filtros: ['desde', 'hasta'] },
      { id: 'precios-planes', nombre: 'Consulta de precios de planes', formatos: ['json', 'csv'], filtros: ['codigo', 'tipo', 'nombre'] },
      { id: 'clientes-info', nombre: 'Agenda de contactos conversacionales', formatos: ['json', 'csv'], filtros: ['desde', 'hasta', 'rut', 'fono', 'nombre', 'object_type'] },
    ];
  }

  async procesos(q: Record<string, any>): Promise<ReportResult> {
    const desde = parseDate(q.desde);
    const hasta = parseDate(q.hasta);
    if ((q.desde && !desde) || (q.hasta && !hasta)) throw new BadRequestException('Parámetros de fecha inválidos');

    const where: any = {
      ...(desde || hasta ? { occurred_at: { ...(desde ? { gte: desde } : {}), ...(hasta ? { lte: hasta } : {}) } } : {}),
      ...(q.session_id ? { session_id: String(q.session_id) } : {}),
      ...(q.actor_external_id ? { actor_external_id: String(q.actor_external_id) } : {}),
      ...(q.object_type ? { object_type: String(q.object_type).toUpperCase() } : {}),
      ...(q.event_type ? { event_type: String(q.event_type).toUpperCase() } : {}),
      ...(q.event_source ? { event_source: String(q.event_source).toUpperCase() } : {}),
      ...(q.direction ? { direction: String(q.direction).toUpperCase() } : {}),
      ...(q.provider ? { provider: String(q.provider).toUpperCase() } : {}),
    };

    const events = await this.prisma.thread_events.findMany({ where, orderBy: { occurred_at: 'desc' }, take: 5000 });
    const sessionIds = Array.from(new Set(events.map((e) => e.session_id)));
    const actorPairs = Array.from(new Map(events.map((e) => [`${e.actor_external_id}::${e.object_type}`, e])).values());

    const [threads, contacts] = await Promise.all([
      sessionIds.length ? this.prisma.threads.findMany({ where: { session_id: { in: sessionIds } } }) : Promise.resolve([]),
      actorPairs.length ? this.prisma.meta_inbox_contacts.findMany({ where: { OR: actorPairs.map((e) => ({ actor_external_id: e.actor_external_id, object_type: e.object_type })) } }) : Promise.resolve([]),
    ]);

    const threadMap = new Map(threads.map((t) => [t.session_id, t]));
    const contactMap = new Map(contacts.map((c) => [`${c.actor_external_id}::${c.object_type}`, c]));

    const rows = events.map((event) => {
      const thread = threadMap.get(event.session_id);
      const contact = contactMap.get(`${event.actor_external_id}::${event.object_type}`);
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

    return { format: q.format === 'csv' ? 'csv' : 'json', filename: 'reporte_threads_eventos', rows };
  }

  async desempeno(q: Record<string, any>): Promise<ReportResult> {
    const desde = parseDate(q.desde);
    const hasta = parseDate(q.hasta);
    if (!desde || !hasta) throw new BadRequestException("Parámetros 'desde' y 'hasta' son requeridos");

    const clauses = ['e.occurred_at >= $1', 'e.occurred_at <= $2'];
    const params: any[] = [desde, hasta];
    if (q.event_source) { params.push(String(q.event_source).toUpperCase()); clauses.push(`e.event_source = $${params.length}`); }
    if (q.username) { params.push(`%${String(q.username)}%`); clauses.push(`e.username ILIKE $${params.length}`); }

    const rows: any[] = await this.prisma.$queryRawUnsafe(`
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
    `, ...params);

    return { format: q.format === 'csv' ? 'csv' : 'json', filename: 'reporte_desempeno_threads', rows };
  }

  async procesosSemanales(q: Record<string, any>): Promise<ReportResult> {
    const desde = parseDate(q.desde);
    const hasta = parseDate(q.hasta);
    if (!desde || !hasta) throw new BadRequestException("Parámetros 'desde' y 'hasta' son requeridos");

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
    `;

    return {
      format: q.format === 'csv' ? 'csv' : 'json',
      filename: 'reporte_procesos_semanales',
      rows: rows.map((row) => ({
        semana_inicio: row.semana_inicio instanceof Date ? row.semana_inicio.toISOString().slice(0, 10) : row.semana_inicio,
        semana_fin: row.semana_fin instanceof Date ? row.semana_fin.toISOString().slice(0, 10) : row.semana_fin,
        total_eventos: Number(row.total_eventos),
        threads_creados: Number(row.threads_creados),
        mensajes_entrantes: Number(row.mensajes_entrantes),
        mensajes_salientes: Number(row.mensajes_salientes),
        threads_distintos: Number(row.threads_distintos),
      })),
    };
  }

  async preciosPlanes(q: Record<string, any>): Promise<ReportResult> {
    const rows = await this.prisma.precios_planes.findMany({
      where: {
        ...(q.codigo ? { codigo: String(q.codigo) } : {}),
        ...(q.tipo ? { tipo: String(q.tipo) } : {}),
        ...(q.nombre ? { nombre: { contains: String(q.nombre), mode: 'insensitive' } } : {}),
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
        excluye_portabilidad_postpago: row.excluye_portabilidad_postpago ?? false,
        url_archivo: row.url_archivo ?? null,
      })),
    };
  }

  async clientesInfo(q: Record<string, any>): Promise<ReportResult> {
    const desde = parseDate(q.desde);
    const hasta = parseDate(q.hasta);
    if ((q.desde && !desde) || (q.hasta && !hasta)) throw new BadRequestException('Parámetros de fecha inválidos');

    const rows = await this.prisma.meta_inbox_contacts.findMany({
      where: {
        ...(desde || hasta ? { created_at: { ...(desde ? { gte: desde } : {}), ...(hasta ? { lte: hasta } : {}) } } : {}),
        ...(q.rut ? { rut: String(q.rut) } : {}),
        ...(q.fono ? { phone: String(q.fono) } : {}),
        ...(q.object_type ? { object_type: String(q.object_type).toUpperCase() } : {}),
        ...(q.nombre ? { display_name: { contains: String(q.nombre), mode: 'insensitive' } } : {}),
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

  formatResponse(result: ReportResult): { headers?: Record<string, string>; body: any } {
    if (result.format === 'csv') {
      return {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="${result.filename}.csv"`,
        },
        body: rowsToCsv(result.rows),
      };
    }
    return { body: { report: result.filename, total: result.rows.length, rows: result.rows } };
  }
}
