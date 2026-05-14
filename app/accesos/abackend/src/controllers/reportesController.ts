import { Request, Response } from "express";
import prisma from "../utils/prisma.js";
import { Prisma } from "@prisma/client";

type ReportRow = Record<string, unknown>;

const TIMEZONE = "America/Santiago";

const parseDate = (value: unknown): Date | null => {
  if (typeof value !== "string" || !value.trim()) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const toNullableString = (value: unknown): string | null => {
  if (value === null || value === undefined) return null;
  return String(value);
};

const toBoolean = (value: unknown): boolean | null => {
  if (typeof value === "boolean") return value;
  if (typeof value !== "string") return null;

  const normalized = value.trim().toLowerCase();
  if (["true", "1", "si", "sí"].includes(normalized)) return true;
  if (["false", "0", "no"].includes(normalized)) return false;
  return null;
};

const csvEscape = (value: unknown): string => {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return value.toISOString();
  const serialized =
    typeof value === "object" ? JSON.stringify(value) : String(value);
  return `"${serialized.replace(/"/g, '""')}"`;
};

const rowsToCsv = (rows: ReportRow[]): string => {
  if (rows.length === 0) return "";

  const headers = Array.from(
    rows.reduce((set, row) => {
      Object.keys(row).forEach((key) => set.add(key));
      return set;
    }, new Set<string>())
  );

  const lines = [
    headers.join(","),
    ...rows.map((row) => headers.map((header) => csvEscape(row[header])).join(",")),
  ];

  return lines.join("\n");
};

const shouldReturnCsv = (req: Request) =>
  String(req.query.format || "").trim().toLowerCase() === "csv";

const sendReport = (req: Request, res: Response, filename: string, rows: ReportRow[]) => {
  if (shouldReturnCsv(req)) {
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}.csv"`);
    res.status(200).send(rowsToCsv(rows));
    return;
  }

  res.json({
    report: filename,
    total: rows.length,
    rows,
  });
};

const addFilter = (
  clauses: string[],
  params: unknown[],
  sql: string,
  value: unknown,
) => {
  params.push(value);
  clauses.push(sql.replace("?", `$${params.length}`));
};

export const listarCatalogoReportes = (_req: Request, res: Response): void => {
  res.json([
    {
      id: "procesos",
      nombre: "Consulta de eventos de threads",
      formatos: ["json", "csv"],
      filtros: ["desde", "hasta", "session_id", "actor_external_id", "object_type", "event_type", "event_source", "direction", "provider"],
    },
    {
      id: "desempeno",
      nombre: "Consulta de desempeño por fuente",
      formatos: ["json", "csv"],
      filtros: ["desde", "hasta", "event_source", "username"],
    },
    {
      id: "procesos-semanales",
      nombre: "Actividad semanal de threads",
      formatos: ["json", "csv"],
      filtros: ["desde", "hasta"],
    },
    {
      id: "precios-planes",
      nombre: "Consulta de precios de planes",
      formatos: ["json", "csv"],
      filtros: ["codigo", "tipo", "nombre"],
    },
    {
      id: "clientes-info",
      nombre: "Agenda de contactos conversacionales",
      formatos: ["json", "csv"],
      filtros: ["desde", "hasta", "rut", "fono", "nombre", "object_type"],
    },
  ]);
};

export const reporteProcesos = async (req: Request, res: Response): Promise<void> => {
  const desde = parseDate(req.query.desde);
  const hasta = parseDate(req.query.hasta);

  if ((req.query.desde && !desde) || (req.query.hasta && !hasta)) {
    res.status(400).json({ error: "Parámetros de fecha inválidos" });
    return;
  }

  try {
    const where: Prisma.thread_eventsWhereInput = {
      ...(desde || hasta
        ? {
            occurred_at: {
              ...(desde ? { gte: desde } : {}),
              ...(hasta ? { lte: hasta } : {}),
            },
          }
        : {}),
      ...(req.query.session_id ? { session_id: String(req.query.session_id) } : {}),
      ...(req.query.actor_external_id ? { actor_external_id: String(req.query.actor_external_id) } : {}),
      ...(req.query.object_type ? { object_type: String(req.query.object_type).toUpperCase() } : {}),
      ...(req.query.event_type ? { event_type: String(req.query.event_type).toUpperCase() } : {}),
      ...(req.query.event_source ? { event_source: String(req.query.event_source).toUpperCase() } : {}),
      ...(req.query.direction ? { direction: String(req.query.direction).toUpperCase() } : {}),
      ...(req.query.provider ? { provider: String(req.query.provider).toUpperCase() } : {}),
    };

    const events = await prisma.thread_events.findMany({
      where,
      orderBy: { occurred_at: "desc" },
      take: 5000,
    });

    const sessionIds = Array.from(new Set(events.map((item) => item.session_id)));
    const actorPairs = Array.from(
      new Map(events.map((item) => [`${item.actor_external_id}::${item.object_type}`, item])).values()
    );

    const [threads, contacts] = await Promise.all([
      sessionIds.length
        ? prisma.threads.findMany({
            where: { session_id: { in: sessionIds } },
          })
        : Promise.resolve([]),
      actorPairs.length
        ? prisma.meta_inbox_contacts.findMany({
            where: {
              OR: actorPairs.map((item) => ({
                actor_external_id: item.actor_external_id,
                object_type: item.object_type,
              })),
            },
          })
        : Promise.resolve([]),
    ]);

    const threadMap = new Map(threads.map((item) => [item.session_id, item]));
    const contactMap = new Map(contacts.map((item) => [`${item.actor_external_id}::${item.object_type}`, item]));

    const rows = events.map((event) => {
      const thread = threadMap.get(event.session_id);
      const contact = contactMap.get(`${event.actor_external_id}::${event.object_type}`);
      return {
        id: event.id,
        session_id: event.session_id,
        actor_external_id: event.actor_external_id,
        object_type: event.object_type,
        actor_nombre: contact?.display_name ?? "Nuevo",
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

    sendReport(req, res, "reporte_threads_eventos", rows);
  } catch (error) {
    console.error("❌ Error en reporte de eventos de threads:", error);
    res.status(500).json({ error: "Error al generar reporte de eventos de threads" });
  }
};

export const reporteDesempeno = async (req: Request, res: Response): Promise<void> => {
  const desde = parseDate(req.query.desde);
  const hasta = parseDate(req.query.hasta);

  if (!desde || !hasta) {
    res.status(400).json({ error: "Parámetros 'desde' y 'hasta' son requeridos" });
    return;
  }

  try {
    const clauses = ["e.occurred_at >= $1", "e.occurred_at <= $2"];
    const params: unknown[] = [desde, hasta];
    if (req.query.event_source) addFilter(clauses, params, "e.event_source = ?", String(req.query.event_source).toUpperCase());
    if (req.query.username) addFilter(clauses, params, "e.username ILIKE ?", `%${String(req.query.username)}%`);

    const rows = await prisma.$queryRawUnsafe<ReportRow[]>(
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
      WHERE ${clauses.join(" AND ")}
      GROUP BY COALESCE(e.username, e.event_source), e.event_source
      ORDER BY total_eventos DESC, ultima_actividad DESC
    `,
      ...params
    );

    sendReport(req, res, "reporte_desempeno_threads", rows);
  } catch (error) {
    console.error("❌ Error en reporte de desempeño de threads:", error);
    res.status(500).json({ error: "Error al generar reporte de desempeño de threads" });
  }
};

export const reporteProcesosSemanales = async (req: Request, res: Response): Promise<void> => {
  const desde = parseDate(req.query.desde);
  const hasta = parseDate(req.query.hasta);

  if (!desde || !hasta) {
    res.status(400).json({ error: "Parámetros 'desde' y 'hasta' son requeridos" });
    return;
  }

  try {
    const rows = await prisma.$queryRaw<
      Array<{
        semana_inicio: Date;
        semana_fin: Date;
        total_eventos: bigint | number;
        threads_creados: bigint | number;
        mensajes_entrantes: bigint | number;
        mensajes_salientes: bigint | number;
        threads_distintos: bigint | number;
      }>
    >`
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

    sendReport(
      req,
      res,
      "reporte_procesos_semanales",
      rows.map((row) => ({
        semana_inicio: row.semana_inicio instanceof Date ? row.semana_inicio.toISOString().slice(0, 10) : row.semana_inicio,
        semana_fin: row.semana_fin instanceof Date ? row.semana_fin.toISOString().slice(0, 10) : row.semana_fin,
        total_eventos: Number(row.total_eventos),
        threads_creados: Number(row.threads_creados),
        mensajes_entrantes: Number(row.mensajes_entrantes),
        mensajes_salientes: Number(row.mensajes_salientes),
        threads_distintos: Number(row.threads_distintos),
      }))
    );
  } catch (error) {
    console.error("❌ Error en reporte semanal de threads:", error);
    res.status(500).json({ error: "Error al generar reporte semanal de threads" });
  }
};

export const reportePreciosPlanes = async (req: Request, res: Response): Promise<void> => {
  try {
    const rows = await prisma.precios_planes.findMany({
      where: {
        ...(req.query.codigo ? { codigo: String(req.query.codigo) } : {}),
        ...(req.query.tipo ? { tipo: String(req.query.tipo) } : {}),
        ...(req.query.nombre
          ? {
              nombre: {
                contains: String(req.query.nombre),
                mode: "insensitive",
              },
            }
          : {}),
      },
      orderBy: { codigo: "asc" },
    });

    sendReport(
      req,
      res,
      "reporte_precios_planes",
      rows.map((row) => ({
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
      }))
    );
  } catch (error) {
    console.error("❌ Error en reporte de precios de planes:", error);
    res.status(500).json({ error: "Error al generar reporte de precios de planes" });
  }
};

export const reporteClientesInfo = async (req: Request, res: Response): Promise<void> => {
  const desde = parseDate(req.query.desde);
  const hasta = parseDate(req.query.hasta);

  if ((req.query.desde && !desde) || (req.query.hasta && !hasta)) {
    res.status(400).json({ error: "Parámetros de fecha inválidos" });
    return;
  }

  try {
    const rows = await prisma.meta_inbox_contacts.findMany({
      where: {
        ...(desde || hasta
          ? {
              created_at: {
                ...(desde ? { gte: desde } : {}),
                ...(hasta ? { lte: hasta } : {}),
              },
            }
          : {}),
        ...(req.query.rut ? { rut: String(req.query.rut) } : {}),
        ...(req.query.fono ? { phone: String(req.query.fono) } : {}),
        ...(req.query.object_type ? { object_type: String(req.query.object_type).toUpperCase() } : {}),
        ...(req.query.nombre
          ? {
              display_name: {
                contains: String(req.query.nombre),
                mode: "insensitive",
              },
            }
          : {}),
      },
      orderBy: { created_at: "desc" },
    });

    sendReport(
      req,
      res,
      "reporte_agenda_contactos",
      rows.map((row) => ({
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
      }))
    );
  } catch (error) {
    console.error("❌ Error en reporte de agenda/contactos:", error);
    res.status(500).json({ error: "Error al generar reporte de agenda/contactos" });
  }
};
