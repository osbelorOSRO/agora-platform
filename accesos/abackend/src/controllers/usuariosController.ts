import { Request, Response } from 'express';
import prisma from '../utils/prisma.js';

type EstadoUsuario = 'activo' | 'preregistrado' | 'invitacion_expirada' | 'sin_invitacion' | 'bloqueado' | 'reset_contraseña' | 'reset_2fa';

function calcularEstado(u: {
  password: string;
  bloqueado: boolean;
  invitation_token: string | null;
  invitation_expires_at: Date | null;
  reset_token: string | null;
  mfa_bypass_token: string | null;
}): EstadoUsuario {
  if (u.bloqueado) return 'bloqueado';
  if (!u.password) {
    if (!u.invitation_token) return 'sin_invitacion';
    if (u.invitation_expires_at && u.invitation_expires_at < new Date()) return 'invitacion_expirada';
    return 'preregistrado';
  }
  if (u.mfa_bypass_token) return 'reset_2fa';
  if (u.reset_token) return 'reset_contraseña';
  return 'activo';
}

// Obtener todos los usuarios
export const obtenerUsuarios = async (_req: Request, res: Response): Promise<void> => {
  try {
    const usuarios = await prisma.usuarios.findMany({
      where: { cancelado: false },
      include: {
        rol_usuarios_rol_idTorol: true,
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
        oficina: null,
        estado: calcularEstado(u),
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

  const isOptionalString = (v: unknown, max: number) =>
    v === undefined || v === null || (typeof v === 'string' && v.length <= max);

  if (
    !isOptionalString(data.nombre, 120) ||
    !isOptionalString(data.apellido, 120) ||
    !isOptionalString(data.run, 20) ||
    !isOptionalString(data.email, 200) ||
    !isOptionalString(data.telefono, 30)
  ) {
    res.status(400).json({ error: 'Datos inválidos' });
    return;
  }

  try {
    const datosActualizados: Record<string, any> = {
      nombre: data.nombre,
      apellido: data.apellido,
      run: data.run,
      email: data.email,
      telefono: data.telefono,
    };

    const rolId = data.rolId ?? data.rol?.id;
    if (rolId !== undefined && rolId !== null) {
      datosActualizados.rol_usuarios_rol_idTorol = { connect: { id: Number(rolId) } };
    }

    const usuarioActualizado = await prisma.usuarios.update({
      where: { id },
      data: datosActualizados,
      include: {
        rol_usuarios_rol_idTorol: true,
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
      oficina: null
    };

    res.json(respuesta);
  } catch (error) {
    console.error("❌ Error al actualizar usuario:", (error as Error).message);
    res.status(500).json({ error: "Error al actualizar usuario" });
  }
};
