import { Request, Response } from "express";
import prisma from "../utils/prisma.js";
import { Prisma } from "@prisma/client";
import { generarTokenUnico, expiracionEn } from "../utils/tokenUtils.js";

export const register = async (req: Request, res: Response): Promise<void> => {
  const { username, rolId } = req.body;
  const usuarioId = req.user?.id ?? null;

  if (!username || !rolId) {
    res.status(400).json({ error: "Faltan campos obligatorios (username y rolId)" });
    return;
  }

  if (typeof username !== 'string' || username.length > 100) {
    res.status(400).json({ error: "username inválido" });
    return;
  }

  try {
    const rol = await prisma.rol.findUnique({ where: { id: Number(rolId) } });
    if (!rol) {
      res.status(400).json({ error: "Rol no válido" });
      return;
    }

    const existente = await prisma.usuarios.findUnique({ where: { username } });
    if (existente) {
      const msg = existente.cancelado
        ? "Ese nombre de usuario no está disponible"
        : "Ya existe un usuario activo con ese nombre de usuario";
      res.status(409).json({ error: msg });
      return;
    }

    const { plain, hash } = generarTokenUnico();

    const data: Prisma.usuariosCreateInput = {
      username,
      password: "",
      token_2fa: "",
      nombre: "",
      apellido: "",
      run: "",
      telefono: "",
      email: "",
      invitation_token: hash,
      invitation_expires_at: expiracionEn(24),
      invitation_attempts: 0,
      rol_usuarios_rol_idTorol: { connect: { id: Number(rolId) } },
      creado_en: new Date(),
      actualizado_en: new Date(),
      ...(usuarioId && {
        usuarios_usuarios_creado_por_idTousuarios: { connect: { id: usuarioId } },
        usuarios_usuarios_actualizado_por_idTousuarios: { connect: { id: usuarioId } },
      }),
    };

    await prisma.usuarios.create({ data });

    res.status(201).json({
      message: "Usuario preregistrado correctamente",
      invitationToken: plain,
      expiresAt: expiracionEn(24).toISOString(),
    });
  } catch (err: unknown) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      res.status(409).json({ error: "Ese nombre de usuario no está disponible" });
      return;
    }
    const error = err as Error;
    console.error("❌ Error en preregistro:", error.message);
    res.status(500).json({ error: "Error interno al preregistrar usuario" });
  }
};
