import { Request, Response } from 'express';
import prisma from '../utils/prisma.js';

// Obtener todos los usuarios
export const obtenerUsuarios = async (_req: Request, res: Response): Promise<void> => {
  try {
    const usuarios = await prisma.usuarios.findMany({
      include: {
        rol_usuarios_rol_idTorol: true,
        oficinas: true,
        usuarios_usuarios_creado_por_idTousuarios: { select: { username: true } },
        usuarios_usuarios_actualizado_por_idTousuarios: { select: { username: true } }
      }
    });

    const resultado = usuarios.map((u) => {
      const rolObjeto = u.rol_usuarios_rol_idTorol;
      return {
        id: u.id,
        username: u.username,
        nombre: u.nombre,
        apellido: u.apellido,
        run: u.run,
        telefono: u.telefono,
        email: u.email,
        creado_en: u.creado_en,
        actualizado_en: u.actualizado_en,
        creado_por_username: u.usuarios_usuarios_creado_por_idTousuarios?.username || null,
        actualizado_por_username: u.usuarios_usuarios_actualizado_por_idTousuarios?.username || null,
        rol: rolObjeto ? { id: rolObjeto.id || null, nombre: rolObjeto.nombre || null } : null,
        oficina: u.oficinas
          ? {
              id: u.oficinas.id,
              nombre: u.oficinas.nombre,
              region: u.oficinas.region
            }
          : null
      };
    });

    res.json(resultado);
  } catch (error) {
    console.error('❌ Error al obtener usuarios:', (error as Error).message);
    res.status(500).json({ error: 'Error al obtener usuarios' });
  }
};

// Actualizar usuario
export const actualizarUsuario = async (req: Request, res: Response): Promise<void> => {
  const id = Number(req.params.id);
  const data = req.body;

  try {
    const datosActualizados: Record<string, any> = {
      nombre: data.nombre,
      apellido: data.apellido,
      run: data.run,
      email: data.email,
      telefono: data.telefono,
    };

    if (data.rolId !== undefined) {
      datosActualizados.rol_usuarios_rol_idTorol = { connect: { id: data.rolId } };
    }

    if (data.oficinaId !== undefined) {
      datosActualizados.oficinas = { connect: { id: data.oficinaId } };
    }

    const usuarioActualizado = await prisma.usuarios.update({
      where: { id },
      data: datosActualizados,
      include: {
        rol_usuarios_rol_idTorol: true,
        oficinas: true,
        usuarios_usuarios_creado_por_idTousuarios: { select: { username: true } },
        usuarios_usuarios_actualizado_por_idTousuarios: { select: { username: true } }
      }
    });

    const rolObjeto = usuarioActualizado.rol_usuarios_rol_idTorol;

    const respuesta = {
      id: usuarioActualizado.id,
      username: usuarioActualizado.username,
      nombre: usuarioActualizado.nombre,
      apellido: usuarioActualizado.apellido,
      run: usuarioActualizado.run,
      telefono: usuarioActualizado.telefono,
      email: usuarioActualizado.email,
      creado_en: usuarioActualizado.creado_en,
      actualizado_en: usuarioActualizado.actualizado_en,
      creado_por_username: usuarioActualizado.usuarios_usuarios_creado_por_idTousuarios?.username || null,
      actualizado_por_username: usuarioActualizado.usuarios_usuarios_actualizado_por_idTousuarios?.username || null,
      rol: rolObjeto ? { id: rolObjeto.id || null, nombre: rolObjeto.nombre || null } : null,
      oficina: usuarioActualizado.oficinas
        ? {
            id: usuarioActualizado.oficinas.id,
            nombre: usuarioActualizado.oficinas.nombre,
            region: usuarioActualizado.oficinas.region
          }
        : null
    };

    res.json(respuesta);
  } catch (error) {
    console.error("❌ Error al actualizar usuario:", (error as Error).message);
    res.status(500).json({ error: "Error al actualizar usuario" });
  }
};
