import { Request, Response } from "express";
import prisma from "../utils/prisma.js";
import type { Prisma, rol, rol_permiso, permiso, usuarios } from "@prisma/client";

type RolConPermisos = rol & {
  rol_permiso: (rol_permiso & { permiso: permiso })[];
  usuarios_rol_creado_por_idTousuarios?: usuarios | null;
  usuarios_rol_actualizado_por_idTousuarios?: usuarios | null;
};

// GET /api/roles
export const obtenerRoles = async (_req: Request, res: Response): Promise<void> => {
  try {
    const roles: RolConPermisos[] = await prisma.rol.findMany({
      include: {
        rol_permiso: {
          include: {
            permiso: true,
          },
        },
        usuarios_rol_creado_por_idTousuarios: true,
        usuarios_rol_actualizado_por_idTousuarios: true,
      },
    });

    const resultado = roles.map((r) => ({
      id: r.id,
      nombre: r.nombre,
      permisos: r.rol_permiso.map((rp) => rp.permiso.id),
      creado_por_username: r.usuarios_rol_creado_por_idTousuarios?.username || null,
      actualizado_por_username: r.usuarios_rol_actualizado_por_idTousuarios?.username || null,
      creado_en: r.creado_en,
      actualizado_en: r.actualizado_en,
    }));

    res.json(resultado);
  } catch (error) {
    console.error("❌ Error al obtener roles:", error);
    res.status(500).json({ error: "Error al obtener los roles" });
  }
};

// GET /api/roles/:id
export const obtenerRolPorId = async (req: Request, res: Response): Promise<void> => {
  const id = Number(req.params.id);

  try {
    const rolItem: RolConPermisos | null = await prisma.rol.findUnique({
      where: { id },
      include: {
        rol_permiso: {
          include: {
            permiso: true,
          },
        },
        usuarios_rol_creado_por_idTousuarios: true,
        usuarios_rol_actualizado_por_idTousuarios: true,
      },
    });

    if (!rolItem) {
      res.status(404).json({ error: "Rol no encontrado" });
      return;
    }

    res.json({
      id: rolItem.id,
      nombre: rolItem.nombre,
      permisos: rolItem.rol_permiso.map((rp) => rp.permiso.id),
      creado_por_username: rolItem.usuarios_rol_creado_por_idTousuarios?.username || null,
      actualizado_por_username: rolItem.usuarios_rol_actualizado_por_idTousuarios?.username || null,
      creado_en: rolItem.creado_en,
      actualizado_en: rolItem.actualizado_en,
    });
  } catch (error) {
    console.error("❌ Error al obtener rol:", error);
    res.status(500).json({ error: "Error al obtener el rol" });
  }
};

// POST /api/roles
export const crearRol = async (req: Request, res: Response): Promise<void> => {
  const { nombre, permisos } = req.body;
  const usuarioId = req.user?.id;

  try {
    const nuevoRol = await prisma.rol.create({
      data: {
        nombre: nombre,
        creado_por_id: usuarioId ?? undefined,
        actualizado_por_id: usuarioId ?? undefined,
        rol_permiso: {
          create: permisos.map((permisoId: number) => ({
            permiso: { connect: { id: permisoId } },
          })),
        },
      },
      include: {
        rol_permiso: {
          include: {
            permiso: true,
          },
        },
      },
    });

    res.status(201).json({
      id: nuevoRol.id,
      nombre: nuevoRol.nombre,
      permisos: nuevoRol.rol_permiso.map((rp) => rp.permiso.id),
    });
  } catch (error) {
    console.error("❌ Error al crear rol:", error);
    res.status(500).json({ error: "Error al crear rol" });
  }
};

// PUT /api/roles/:id
export const actualizarRol = async (req: Request, res: Response): Promise<void> => {
  const id = Number(req.params.id);
  const { nombre, permisos } = req.body;
  const usuarioId = req.user?.id;

  try {
    // Eliminar permisos anteriores
    await prisma.rol_permiso.deleteMany({ where: { rol_id: id } });

    // Actualizar rol y crear nuevos permisos
    const rolActualizado = await prisma.rol.update({
      where: { id },
      data: {
        nombre: nombre,
        actualizado_por_id: usuarioId ?? undefined,
        rol_permiso: {
          create: permisos.map((permisoId: number) => ({
            permiso: { connect: { id: permisoId } },
          })),
        },
      },
      include: {
        rol_permiso: {
          include: {
            permiso: true,
          },
        },
      },
    });

    res.json({
      id: rolActualizado.id,
      nombre: rolActualizado.nombre,
      permisos: rolActualizado.rol_permiso.map((rp) => rp.permiso.id),
    });
  } catch (error) {
    console.error("❌ Error al actualizar rol:", error);
    res.status(500).json({ error: "Error al actualizar rol" });
  }
};
