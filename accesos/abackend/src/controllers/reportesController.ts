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

export const listarCatalogoReportes = (_req: Request, res: Response): void => {
  res.json([
    {
      id: "procesos",
      nombre: "Consulta de procesos",
      formatos: ["json", "csv"],
      filtros: ["desde", "hasta", "cliente_id", "iniciado_por_id", "tipo_proceso", "tipo_cierre", "abandono", "delegado_humano"],
    },
    {
      id: "desempeno",
      nombre: "Consulta de desempeño por usuario",
      formatos: ["json", "csv"],
      filtros: ["desde", "hasta", "usuario_id"],
    },
    {
      id: "procesos-semanales",
      nombre: "Procesos semanales creados",
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
      id: "contratos",
      nombre: "Contratos creados",
      formatos: ["json", "csv"],
      filtros: ["desde", "hasta", "rut_cliente", "estado", "creado_por_id", "tipo", "modo"],
    },
    {
      id: "clientes-info",
      nombre: "Clientes con info cliente",
      formatos: ["json", "csv"],
      filtros: ["desde", "hasta", "rut", "fono", "nombre"],
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
    const where: Prisma.procesosWhereInput = {
      ...(desde || hasta
        ? {
            fecha_inicio: {
              ...(desde ? { gte: desde } : {}),
              ...(hasta ? { lte: hasta } : {}),
            },
          }
        : {}),
      ...(req.query.cliente_id
        ? { cliente_id: String(req.query.cliente_id) }
        : {}),
      ...(req.query.iniciado_por_id
        ? { iniciado_por_id: Number(req.query.iniciado_por_id) }
        : {}),
      ...(req.query.tipo_proceso
        ? { tipo_proceso: String(req.query.tipo_proceso) }
        : {}),
      ...(req.query.tipo_cierre
        ? { tipo_cierre: String(req.query.tipo_cierre) }
        : {}),
    };

    const abandono = toBoolean(req.query.abandono);
    if (abandono !== null) where.abandono = abandono;

    const delegadoHumano = toBoolean(req.query.delegado_humano);
    if (delegadoHumano !== null) where.delegado_humano = delegadoHumano;

    const procesos = await prisma.procesos.findMany({
      where,
      orderBy: { fecha_inicio: "desc" },
      include: {
        usuarios_procesos_iniciado_por_idTousuarios: {
          select: { id: true, username: true, nombre: true, apellido: true, email: true },
        },
        usuarios_procesos_cerrado_por_idTousuarios: {
          select: { id: true, username: true, nombre: true, apellido: true, email: true },
        },
      },
    });

    const clientes = await prisma.clientes.findMany({
      where: {
        cliente_id: { in: Array.from(new Set(procesos.map((item) => item.cliente_id))) },
      },
    });

    const clientesMap = new Map(clientes.map((item) => [item.cliente_id, item]));

    const rows = procesos.map((proceso) => {
      const cliente = clientesMap.get(proceso.cliente_id);

      return {
        proceso_id: proceso.id,
        cliente_id: proceso.cliente_id,
        cliente_nombre: cliente?.nombre ?? null,
        cliente_tipo_id: cliente?.tipo_id ?? null,
        cliente_estado_actual: cliente?.estado_actual ?? null,
        cliente_etiqueta_actual: cliente?.etiqueta_actual ?? null,
        cliente_intervenida: cliente?.intervenida ?? null,
        cliente_fecha_registro: cliente?.fecha_registro?.toISOString() ?? null,
        fecha_inicio: proceso.fecha_inicio?.toISOString() ?? null,
        fecha_fin: proceso.fecha_fin?.toISOString() ?? null,
        tipo_proceso: proceso.tipo_proceso ?? null,
        tipo_cierre: proceso.tipo_cierre ?? null,
        delegado_humano: proceso.delegado_humano ?? false,
        abandono: proceso.abandono ?? false,
        duracion_total: proceso.duracion_total ?? null,
        duracion_valor: proceso.duracion_valor ? Number(proceso.duracion_valor) : null,
        duracion_unidad: proceso.duracion_unidad ?? null,
        sla_humano: proceso.sla_humano ?? null,
        tmo: proceso.tmo ?? null,
        iniciado_por_id: proceso.iniciado_por_id,
        iniciado_por_username:
          proceso.usuarios_procesos_iniciado_por_idTousuarios?.username ?? null,
        iniciado_por_nombre: [
          proceso.usuarios_procesos_iniciado_por_idTousuarios?.nombre,
          proceso.usuarios_procesos_iniciado_por_idTousuarios?.apellido,
        ]
          .filter(Boolean)
          .join(" ") || null,
        cerrado_por_id: proceso.cerrado_por_id ?? null,
        cerrado_por_username:
          proceso.usuarios_procesos_cerrado_por_idTousuarios?.username ?? null,
        cerrado_por_nombre: [
          proceso.usuarios_procesos_cerrado_por_idTousuarios?.nombre,
          proceso.usuarios_procesos_cerrado_por_idTousuarios?.apellido,
        ]
          .filter(Boolean)
          .join(" ") || null,
      };
    });

    sendReport(req, res, "reporte_procesos", rows);
  } catch (error) {
    console.error("❌ Error en reporte de procesos:", error);
    res.status(500).json({ error: "Error al generar reporte de procesos" });
  }
};

export const reporteDesempeno = async (req: Request, res: Response): Promise<void> => {
  const desde = parseDate(req.query.desde);
  const hasta = parseDate(req.query.hasta);

  if (!desde || !hasta) {
    res.status(400).json({ error: "Parámetros 'desde' y 'hasta' son requeridos" });
    return;
  }

  const usuarioId = req.query.usuario_id ? Number(req.query.usuario_id) : null;

  try {
    const where: Prisma.procesosWhereInput = {
      fecha_inicio: {
        gte: desde,
        lte: hasta,
      },
      ...(usuarioId ? { iniciado_por_id: usuarioId } : {}),
    };

    const procesos = await prisma.procesos.findMany({
      where,
      orderBy: [{ iniciado_por_id: "asc" }, { fecha_inicio: "desc" }],
      include: {
        usuarios_procesos_iniciado_por_idTousuarios: {
          include: {
            rol_usuarios_rol_idTorol: true,
          },
        },
        usuarios_procesos_cerrado_por_idTousuarios: {
          select: { id: true, username: true },
        },
      },
    });

    const rows = procesos.map((proceso) => {
      const usuario = proceso.usuarios_procesos_iniciado_por_idTousuarios;
      return {
        usuario_id: usuario?.id ?? proceso.iniciado_por_id,
        username: usuario?.username ?? null,
        usuario_nombre: [usuario?.nombre, usuario?.apellido].filter(Boolean).join(" ") || null,
        rol: usuario?.rol_usuarios_rol_idTorol?.nombre ?? null,
        proceso_id: proceso.id,
        cliente_id: proceso.cliente_id,
        fecha_inicio: proceso.fecha_inicio.toISOString(),
        fecha_fin: proceso.fecha_fin?.toISOString() ?? null,
        tipo_proceso: proceso.tipo_proceso ?? null,
        tipo_cierre: proceso.tipo_cierre ?? null,
        delegado_humano: proceso.delegado_humano ?? false,
        abandono: proceso.abandono ?? false,
        duracion_total: proceso.duracion_total ?? null,
        duracion_valor: proceso.duracion_valor ? Number(proceso.duracion_valor) : null,
        duracion_unidad: proceso.duracion_unidad ?? null,
        cerrado_por_id: proceso.cerrado_por_id ?? null,
        cerrado_por_username:
          proceso.usuarios_procesos_cerrado_por_idTousuarios?.username ?? null,
      };
    });

    sendReport(req, res, "reporte_desempeno", rows);
  } catch (error) {
    console.error("❌ Error en reporte de desempeño:", error);
    res.status(500).json({ error: "Error al generar reporte de desempeño" });
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
      Array<{ semana_inicio: Date; semana_fin: Date; total_procesos: bigint | number }>
    >`
      SELECT
        date_trunc('week', fecha_inicio AT TIME ZONE ${TIMEZONE})::date AS semana_inicio,
        (date_trunc('week', fecha_inicio AT TIME ZONE ${TIMEZONE})::date + INTERVAL '6 days')::date AS semana_fin,
        COUNT(*) AS total_procesos
      FROM procesos
      WHERE fecha_inicio >= ${desde}
        AND fecha_inicio <= ${hasta}
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
        total_procesos: Number(row.total_procesos),
      }))
    );
  } catch (error) {
    console.error("❌ Error en reporte semanal de procesos:", error);
    res.status(500).json({ error: "Error al generar reporte semanal de procesos" });
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

export const reporteContratos = async (req: Request, res: Response): Promise<void> => {
  const desde = parseDate(req.query.desde);
  const hasta = parseDate(req.query.hasta);

  if ((req.query.desde && !desde) || (req.query.hasta && !hasta)) {
    res.status(400).json({ error: "Parámetros de fecha inválidos" });
    return;
  }

  try {
    const rows = await prisma.contratos.findMany({
      where: {
        ...(desde || hasta
          ? {
              creado_en: {
                ...(desde ? { gte: desde } : {}),
                ...(hasta ? { lte: hasta } : {}),
              },
            }
          : {}),
        ...(req.query.rut_cliente
          ? { rut_cliente: String(req.query.rut_cliente) }
          : {}),
        ...(req.query.estado ? { estado: String(req.query.estado) } : {}),
        ...(req.query.creado_por_id
          ? { creado_por_id: Number(req.query.creado_por_id) }
          : {}),
        ...(req.query.tipo ? { tipo: String(req.query.tipo) } : {}),
        ...(req.query.modo ? { modo: String(req.query.modo) } : {}),
      },
      orderBy: { creado_en: "desc" },
      include: {
        info: true,
        planes: true,
        usuarios: {
          select: { id: true, username: true, nombre: true, apellido: true },
        },
      },
    });

    sendReport(
      req,
      res,
      "reporte_contratos",
      rows.map((row) => ({
        contrato_id: row.id,
        creado_en: row.creado_en?.toISOString() ?? null,
        rut_cliente: row.rut_cliente,
        cliente_nombre: row.info?.nombre ?? null,
        cliente_email: row.info?.email ?? null,
        cliente_fono: row.info?.fono ?? null,
        tipo: row.tipo,
        modo: row.modo,
        estado: row.estado ?? null,
        plan_id: row.plan_id ?? null,
        plan_codigo: row.planes?.codigo ?? null,
        plan_nombre: row.planes?.nombre ?? null,
        ciclo: row.ciclo ?? null,
        cantidad_lineas: row.cantidad_lineas ?? null,
        creado_por_id: row.creado_por_id ?? null,
        creado_por_username: row.usuarios?.username ?? null,
        creado_por_nombre: [row.usuarios?.nombre, row.usuarios?.apellido]
          .filter(Boolean)
          .join(" ") || null,
      }))
    );
  } catch (error) {
    console.error("❌ Error en reporte de contratos:", error);
    res.status(500).json({ error: "Error al generar reporte de contratos" });
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
    const rows = await prisma.info.findMany({
      where: {
        ...(desde || hasta
          ? {
              fecha_registro: {
                ...(desde ? { gte: desde } : {}),
                ...(hasta ? { lte: hasta } : {}),
              },
            }
          : {}),
        ...(req.query.rut ? { rut: String(req.query.rut) } : {}),
        ...(req.query.fono ? { fono: String(req.query.fono) } : {}),
        ...(req.query.nombre
          ? {
              nombre: {
                contains: String(req.query.nombre),
                mode: "insensitive",
              },
            }
          : {}),
      },
      orderBy: { fecha_registro: "desc" },
    });

    sendReport(
      req,
      res,
      "reporte_clientes_info",
      rows.map((row) => ({
        id: row.id,
        rut: row.rut ?? null,
        nombre: row.nombre,
        email: row.email ?? null,
        direccion: row.direccion ?? null,
        comuna: row.comuna ?? null,
        region: row.region ?? null,
        fono: row.fono ?? null,
        fecha_registro: row.fecha_registro?.toISOString() ?? null,
        usuario_registro_id: row.usuario_registro_id ?? null,
        fecha_actualizacion: row.fecha_actualizacion?.toISOString() ?? null,
        usuario_actualiza_id: row.usuario_actualiza_id ?? null,
      }))
    );
  } catch (error) {
    console.error("❌ Error en reporte de clientes/info:", error);
    res.status(500).json({ error: "Error al generar reporte de clientes/info" });
  }
};
