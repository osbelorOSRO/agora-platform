import { Request, Response } from "express";
import prisma from "../utils/prisma.js";
import { Prisma } from "@prisma/client";

export const register = async (req: Request, res: Response): Promise<void> => {
  const { username, rolId } = req.body;
  const usuarioId = req.user?.id ?? null;

  if (!username || !rolId) {
    res.status(400).json({ error: "Faltan campos obligatorios (username y rolId)" });
    return;
  }

  try {
    const rol = await prisma.rol.findUnique({
      where: { id: Number(rolId) },
    });

    if (!rol) {
      res.status(400).json({ error: "Rol no válido" });
      return;
    }

    const existente = await prisma.usuarios.findUnique({ where: { username } });
    if (existente) {
      res.status(409).json({ error: "Ya existe un usuario con ese username" });
      return;
    }

    const data: Prisma.usuariosCreateInput = {
      username,
      password: "",
      token_2fa: "",
      nombre: "",
      apellido: "",
      run: "",
      telefono: "",
      email: "",
      rol_usuarios_rol_idTorol: { connect: { id: Number(rolId) } },
      creado_en: new Date(),
      actualizado_en: new Date(),
      ...(usuarioId && {
        usuarios_usuarios_creado_por_idTousuarios: { connect: { id: usuarioId } },
        usuarios_usuarios_actualizado_por_idTousuarios: { connect: { id: usuarioId } },
      }),
    };

    await prisma.usuarios.create({ data });

    res.status(201).json({ message: "Usuario preregistrado correctamente" });
  } catch (err: unknown) {
    const error = err as Error;
    console.error("❌ Error en preregistro:", error.message);
    res.status(500).json({ error: "Error interno al preregistrar usuario" });
  }
};
