import { Request, Response } from "express";
import prisma from "../utils/prisma.js";
import type { sesion } from "@prisma/client";

// Registrar sesión
export const registrarSesion = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = req.user as { id: number };

    if (!user?.id) {
      res.status(401).json({ error: "No autorizado" });
      return;
    }

    const ip: string = req.ip ?? "0.0.0.0";
    const userAgent: string = req.headers["user-agent"] ?? "desconocido";

    await prisma.sesion.create({
      data: {
        usuarioId: user.id,
        ip,
        userAgent,
        horaLogin: new Date(),
        ultimaInteraccion: new Date(),
        activo: true,
      },
    });

    res.status(200).json({ ok: true });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("❌ Error al registrar sesión:", err.message);
    res.status(500).json({ error: "Error al registrar sesión" });
  }
};

// Listar sesiones activas
export const listarSesionesActivas = async (req: Request, res: Response): Promise<void> => {
  const user = req.user as { id: number };

  if (!user?.id) {
    res.status(401).json({ error: "No autorizado" });
    return;
  }

  try {
    const sesiones: sesion[] = await prisma.sesion.findMany({
      where: {
        usuarioId: user.id,
        activo: true,
      },
      orderBy: { horaLogin: "desc" },
    });

    res.status(200).json(sesiones);
  } catch (error: unknown) {
    const err = error as Error;
    console.error("❌ Error al listar sesiones activas:", err.message);
    res.status(500).json({ error: "Error al obtener sesiones" });
  }
};

// Cerrar sesión
export const logout = async (req: Request, res: Response): Promise<void> => {
  const user = req.user as { id: number };

  if (!user?.id) {
    res.status(401).json({ error: "No autorizado" });
    return;
  }

  try {
    await prisma.sesion.updateMany({
      where: { usuarioId: user.id, activo: true },
      data: { activo: false },
    });

    res.status(200).json({ message: "Sesión cerrada" });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("❌ Error en logout:", err.message);
    res.status(500).json({ error: "Error al cerrar sesión" });
  }
};
