import { Request, Response, NextFunction } from "express";
import prisma from "../utils/prisma.js";

export const actualizarUltimaInteraccion = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (req.user?.id) {
      await prisma.sesion.updateMany({
        where: { usuarioId: req.user.id, activo: true },
        data: { ultimaInteraccion: new Date() },
      });
    }
  } catch (error) {
    console.error("⚠️ Error al actualizar última interacción:", error);
  }
  next();
};
