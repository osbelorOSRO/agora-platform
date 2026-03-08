import { Request, Response } from "express";
import prisma from "../utils/prisma.js";
import type { procesos, usuarios } from "@prisma/client";

// Úsalo SOLO si tienes algún BigInt, pero no lo uses para Dates
function transformBigInts(obj: any): any {
  if (Array.isArray(obj)) {
    return obj.map(transformBigInts);
  } else if (obj && typeof obj === "object") {
    return Object.fromEntries(
      Object.entries(obj).map(([key, value]) => [
        key,
        typeof value === "bigint" ? Number(value) : value
      ])
    );
  }
  return obj;
}

// --- PRODUCTIVIDAD POR AGENTE ---
export const getProductividadAgente = async (req: Request, res: Response): Promise<void> => {
  const { usuario_id } = req.params;
  const { desde, hasta } = req.query;

  if (!desde || !hasta) {
    res.status(400).json({ error: "Parámetros 'desde' y 'hasta' son requeridos." });
    return;
  }

  try {
    const usuario = await prisma.usuarios.findUnique({
      where: { id: Number(usuario_id) },
      select: {
        username: true,
        rol_usuarios_rol_idTorol: {
          select: { nombre: true },
        },
      },
    });

    if (!usuario) {
      res.status(404).json({ error: "Usuario no encontrado." });
      return;
    }

    const procesos = await prisma.procesos.findMany({
      where: {
        fecha_inicio: {
          gte: new Date(desde as string),
          lte: new Date(hasta as string),
        },
        OR: [
          { iniciado_por_id: Number(usuario_id) },
          { cerrado_por_id: Number(usuario_id) },
        ],
      },
    });

    console.log("Prisma procesos (agente):", procesos.slice(0, 5));

    const procesosSerializados = procesos.map((p) => ({
      ...p,
      fecha_inicio: p.fecha_inicio ? p.fecha_inicio.toISOString() : null,
      fecha_fin: p.fecha_fin ? p.fecha_fin.toISOString() : null,
      duracion_valor: p.duracion_valor ? Number(p.duracion_valor) : null,
    }));

    console.log("Procesos serializados (agente):", procesosSerializados.slice(0, 5));

    const total_iniciados = procesosSerializados.filter((p: any) => p.iniciado_por_id === Number(usuario_id)).length;
    const total_cerrados = procesosSerializados.filter(
      (p: any) =>
        p.cerrado_por_id === Number(usuario_id) &&
        typeof p.fecha_fin === "string" &&
        p.fecha_fin.trim() !== ""
    ).length;
    const con_intervencion = procesosSerializados.filter((p: any) => p.delegado_humano === true).length;
    const abandonados = procesosSerializados.filter((p: any) => p.abandono === true).length;
    const duracion_val_promedio = procesosSerializados.length
      ? Math.round(
          procesosSerializados.reduce((acc: number, p: any) => acc + Number(p.duracion_valor ?? 0), 0) /
            procesosSerializados.length
        )
      : 0;
    const duracion_unidad_promedio = procesosSerializados.length
      ? procesosSerializados.filter((p: any) => p.duracion_unidad !== null).length
      : 0;
    const agrupados = procesosSerializados.reduce((acc: Record<string, number>, p: any) => {
      const key = `${p.tipo_proceso || "N/A"} - ${p.tipo_cierre || "N/A"}`;
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    const nombreRol = usuario.rol_usuarios_rol_idTorol?.nombre ?? null;

    res.json({
      usuario_id: Number(usuario_id),
      username: usuario.username,
      rol: nombreRol,
      desde,
      hasta,
      total_iniciados,
      total_cerrados,
      con_intervencion,
      duracion_val_promedio,
      duracion_unidad_promedio,
      tasa_abandono: procesosSerializados.length
        ? Math.round((abandonados / procesosSerializados.length) * 100)
        : 0,
      procesos_agrupados: agrupados,
    });
  } catch (error) {
    console.error("Error en getProductividadAgente:", error);
    res.status(500).json({ error: "Error al obtener productividad del agente." });
  }
};

// --- TODOS LOS PROCESOS ---
export const getTodosLosProcesos = async (req: Request, res: Response): Promise<void> => {
  try {
    const procesos = await prisma.procesos.findMany();

    console.log("Prisma procesos (todos):", procesos.slice(0, 5));

    const transformados = procesos.map((p) => ({
      cliente_id: p.cliente_id,
      proceso_id: p.id,
      iniciado_por: p.iniciado_por_id?.toString(),
      fecha_inicio: p.fecha_inicio ? p.fecha_inicio.toISOString() : null,
      fecha_cierre: p.fecha_fin ? p.fecha_fin.toISOString() : null,
      duracion_valor: p.duracion_valor ? Number(p.duracion_valor) : null,
      duracion_unidad: p.duracion_unidad,
      abandonado: p.abandono ?? false,
      ultima_etiqueta: "",
    }));

    console.log("Procesos serializados (todos):", transformados.slice(0, 5));

    res.json(transformados);
  } catch (error) {
    console.error("❌ Error al obtener todos los procesos:", error);
    res.status(500).json({ error: "Error al obtener procesos." });
  }
};

// --- RESUMEN POR USUARIO Y PERIODO ---
export const getResumenProcesosPorUsuarioPeriodo = async (req: Request, res: Response): Promise<void> => {
  const { desde, hasta } = req.query;

  try {
    let where: any = {};
    if (desde && hasta) {
      where.fecha_inicio = {
        gte: new Date(desde as string),
        lte: new Date(hasta as string),
      };
    }

    const procesos = await prisma.procesos.findMany({ where });

    console.log("Prisma procesos (resumen):", procesos.slice(0, 5));

    const procesosSerializados = procesos.map((p) => ({
      ...p,
      fecha_inicio: p.fecha_inicio ? p.fecha_inicio.toISOString() : null,
      fecha_fin: p.fecha_fin ? p.fecha_fin.toISOString() : null,
      duracion_valor: p.duracion_valor ? Number(p.duracion_valor) : null,
    }));

    console.log("Procesos serializados (resumen):", procesosSerializados.slice(0, 5));

    const resumen: Record<number, { abiertos: number; cerrados: number }> = {};

    procesosSerializados.forEach((p: any) => {
      const usuarioId = Number(p.iniciado_por_id);
      if (!resumen[usuarioId]) {
        resumen[usuarioId] = { abiertos: 0, cerrados: 0 };
      }
      const isCerrado = typeof p.fecha_fin === "string" && p.fecha_fin.trim() !== "";
      if (isCerrado) {
        resumen[usuarioId].cerrados += 1;
      } else {
        resumen[usuarioId].abiertos += 1;
      }
    });

    const salida = Object.entries(resumen).map(([usuario_id, valores]) => ({
      usuario_id: Number(usuario_id),
      abiertos: valores.abiertos,
      cerrados: valores.cerrados,
      username: "",
    }));

    res.json(salida);
  } catch (error) {
    console.error("Error en getResumenProcesosPorUsuarioPeriodo:", error);
    res.status(500).json({ error: "Error al obtener resumen de procesos por usuario." });
  }
};
