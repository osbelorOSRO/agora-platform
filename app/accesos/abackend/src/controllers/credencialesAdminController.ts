import { Request, Response } from 'express';
import prisma from '../utils/prisma.js';
import speakeasy from 'speakeasy';
import { generarTokenUnico, expiracionEn } from '../utils/tokenUtils.js';

function verificarGuardas(id: number, usuario: { protegido: boolean }, selfId?: number): string | null {
  if (selfId && id === selfId) return 'No puedes realizar esta acción sobre tu propia cuenta';
  if (usuario.protegido) return 'Este usuario está protegido y no puede ser modificado';
  return null;
}

export const resetPassword = async (req: Request, res: Response): Promise<void> => {
  const id = Number(req.params.id);
  if (!id) { res.status(400).json({ error: 'ID inválido' }); return; }

  try {
    const usuario = await prisma.usuarios.findUnique({ where: { id }, select: { id: true, username: true, password: true, protegido: true } });
    if (!usuario) { res.status(404).json({ error: 'Usuario no encontrado' }); return; }
    const guarda = verificarGuardas(id, usuario, req.user?.id);
    if (guarda) { res.status(403).json({ error: guarda }); return; }
    if (!usuario.password) { res.status(400).json({ error: 'El usuario aún no ha completado el registro' }); return; }

    const { plain, hash } = generarTokenUnico();
    await prisma.usuarios.update({
      where: { id },
      data: { reset_token: hash, reset_token_expires: expiracionEn(24) },
    });

    res.json({ message: 'Token de reset generado', resetToken: plain, expiresAt: expiracionEn(24).toISOString() });
  } catch (err) {
    console.error('❌ reset-password admin:', err);
    res.status(500).json({ error: 'Error interno' });
  }
};

export const reset2FA = async (req: Request, res: Response): Promise<void> => {
  const id = Number(req.params.id);
  if (!id) { res.status(400).json({ error: 'ID inválido' }); return; }

  try {
    const usuario = await prisma.usuarios.findUnique({ where: { id }, select: { id: true, username: true, password: true, protegido: true } });
    if (!usuario) { res.status(404).json({ error: 'Usuario no encontrado' }); return; }
    const guarda = verificarGuardas(id, usuario, req.user?.id);
    if (guarda) { res.status(403).json({ error: guarda }); return; }
    if (!usuario.password) { res.status(400).json({ error: 'El usuario aún no ha completado el registro' }); return; }

    const { plain, hash } = generarTokenUnico();
    const newSecret = speakeasy.generateSecret({ name: `Accesos LTP (${usuario.username})` });

    await prisma.usuarios.update({
      where: { id },
      data: {
        mfa_bypass_token: hash,
        mfa_new_secret: newSecret.base32,
        mfa_reset_expires: expiracionEn(24),
      },
    });

    res.json({ message: 'Token de reset 2FA generado', bypassToken: plain, expiresAt: expiracionEn(24).toISOString() });
  } catch (err) {
    console.error('❌ reset-2fa admin:', err);
    res.status(500).json({ error: 'Error interno' });
  }
};

export const desbloquear = async (req: Request, res: Response): Promise<void> => {
  const id = Number(req.params.id);
  if (!id) { res.status(400).json({ error: 'ID inválido' }); return; }

  try {
    const usuario = await prisma.usuarios.findUnique({ where: { id }, select: { id: true, bloqueado: true, protegido: true } });
    if (!usuario) { res.status(404).json({ error: 'Usuario no encontrado' }); return; }
    const guarda = verificarGuardas(id, usuario, req.user?.id);
    if (guarda) { res.status(403).json({ error: guarda }); return; }

    await prisma.usuarios.update({
      where: { id },
      data: { bloqueado: false, login_attempts: 0, bloqueado_en: null },
    });

    res.json({ message: 'Cuenta desbloqueada' });
  } catch (err) {
    console.error('❌ desbloquear:', err);
    res.status(500).json({ error: 'Error interno' });
  }
};

export const regenerarInvitacion = async (req: Request, res: Response): Promise<void> => {
  const id = Number(req.params.id);
  if (!id) { res.status(400).json({ error: 'ID inválido' }); return; }

  try {
    const usuario = await prisma.usuarios.findUnique({ where: { id }, select: { id: true, password: true, protegido: true } });
    if (!usuario) { res.status(404).json({ error: 'Usuario no encontrado' }); return; }
    const guarda = verificarGuardas(id, usuario, req.user?.id);
    if (guarda) { res.status(403).json({ error: guarda }); return; }
    if (usuario.password) { res.status(400).json({ error: 'El usuario ya está registrado' }); return; }

    const { plain, hash } = generarTokenUnico();
    await prisma.usuarios.update({
      where: { id },
      data: { invitation_token: hash, invitation_expires_at: expiracionEn(24), invitation_attempts: 0 },
    });

    res.json({ message: 'Invitación regenerada', invitationToken: plain, expiresAt: expiracionEn(24).toISOString() });
  } catch (err) {
    console.error('❌ regenerar-invitacion:', err);
    res.status(500).json({ error: 'Error interno' });
  }
};

export const cancelarPreregistro = async (req: Request, res: Response): Promise<void> => {
  const id = Number(req.params.id);
  if (!id) { res.status(400).json({ error: 'ID inválido' }); return; }

  try {
    const usuario = await prisma.usuarios.findUnique({ where: { id }, select: { id: true, password: true, protegido: true } });
    if (!usuario) { res.status(404).json({ error: 'Usuario no encontrado' }); return; }
    const guarda = verificarGuardas(id, usuario, req.user?.id);
    if (guarda) { res.status(403).json({ error: guarda }); return; }
    if (usuario.password) { res.status(400).json({ error: 'No se puede cancelar un usuario ya registrado' }); return; }

    await prisma.usuarios.update({
      where: { id },
      data: {
        cancelado: true,
        invitation_token: null,
        invitation_expires_at: null,
        invitation_attempts: 0,
      },
    });
    res.json({ message: 'Preregistro cancelado' });
  } catch (err) {
    console.error('❌ cancelar-preregistro:', err);
    res.status(500).json({ error: 'Error interno' });
  }
};
