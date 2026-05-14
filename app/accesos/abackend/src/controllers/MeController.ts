import { Request, Response } from "express";
import prisma from "../utils/prisma.js";

interface UsuarioResponse {
  id: number;
  username: string;
  nombre: string | null;
  apellido: string | null;
  email: string | null;
  telefono: string | null;
  rol: string | null;
}

export const me = async (req: Request, res: Response): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ error: "No autorizado" });
    return;
  }

  const { id } = req.user as { id: number };

  try {
    const usuario = await prisma.usuarios.findUnique({
      where: { id },
      include: {
        rol_usuarios_rol_idTorol: true,
      },
    });

    if (!usuario) {
      res.status(404).json({ error: "Usuario no encontrado" });
      return;
    }

    // Adaptar para manejar si es objeto o array
    let nombreRol: string | null = null;
    if (usuario.rol_usuarios_rol_idTorol) {
      if (Array.isArray(usuario.rol_usuarios_rol_idTorol)) {
        nombreRol = usuario.rol_usuarios_rol_idTorol.length > 0 ? usuario.rol_usuarios_rol_idTorol[0].nombre : null;
      } else {
        nombreRol = usuario.rol_usuarios_rol_idTorol.nombre ?? null;
      }
    }

    const response: UsuarioResponse = {
      id: usuario.id,
      username: usuario.username,
      nombre: usuario.nombre ?? null,
      apellido: usuario.apellido ?? null,
      email: usuario.email ?? null,
      telefono: usuario.telefono ?? null,
      rol: nombreRol,
    };

    res.status(200).json(response);
  } catch (error) {
    console.error("Error en /me:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
};
