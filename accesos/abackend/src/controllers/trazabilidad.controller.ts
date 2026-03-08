import { Request, Response } from "express";
import prisma from "../utils/prisma.js";
import type { procesos, map_journey } from "@prisma/client";

export const getProcesosPorCliente = async (req: Request, res: Response): Promise<void> => {
  const { cliente_id } = req.params;

  try {
    const procesos: (procesos & {
      map_journey: map_journey[];
    })[] = await prisma.procesos.findMany({
      where: { cliente_id },
      orderBy: { fecha_inicio: "desc" },
      include: {
        map_journey: {
          orderBy: { fecha: "asc" },
        },
      },
    });

    const respuesta = procesos.map((p) => ({
      id: p.id,
      fecha_inicio: p.fecha_inicio,
      fecha_cierre: p.fecha_fin,
      tipo_proceso: p.tipo_proceso,
      tipo_cierre: p.tipo_cierre,
      delegado_humano: p.delegado_humano,
      duracion_valor: p.duracion_valor,
      duracion_unidad: p.duracion_unidad,
      abandono: p.abandono,
      iniciado_por_id: p.iniciado_por_id,
      cerrado_por_id: p.cerrado_por_id,
      flujo_etiquetas: p.map_journey.map((mj) => ({
        etiqueta_id: mj.etiqueta_id,
        fecha: mj.fecha,
      })),
    }));

    res.json({ cliente_id, procesos: respuesta });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("Error en getProcesosPorCliente:", err.message);
    res.status(500).json({ error: "Error al obtener procesos del cliente." });
  }
};
