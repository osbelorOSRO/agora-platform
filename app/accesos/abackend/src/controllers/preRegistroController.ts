import { Request, Response } from 'express';
import prisma from '../utils/prisma.js';
import bcrypt from 'bcryptjs';
import speakeasy from 'speakeasy';
import { Prisma } from '@prisma/client';

const MAX_INVITATION_ATTEMPTS = 5;

export const registrarUsuario = async (req: Request, res: Response): Promise<void> => {
  const { username, invitationToken, password, confirmarPassword } = req.body;

  if (!username || !invitationToken || !password || !confirmarPassword) {
    res.status(400).json({ error: 'Faltan campos obligatorios' });
    return;
  }

  if (typeof username !== 'string' || username.length > 100) {
    res.status(400).json({ error: 'Datos inválidos' });
    return;
  }
  if (typeof invitationToken !== 'string' || invitationToken.length > 20) {
    res.status(400).json({ error: 'Datos inválidos' });
    return;
  }
  if (typeof password !== 'string' || password.length > 200) {
    res.status(400).json({ error: 'Datos inválidos' });
    return;
  }
  if (typeof confirmarPassword !== 'string' || confirmarPassword.length > 200) {
    res.status(400).json({ error: 'Datos inválidos' });
    return;
  }

  if (password !== confirmarPassword) {
    res.status(400).json({ error: 'Las contraseñas no coinciden' });
    return;
  }

  try {
    const usuario = await prisma.usuarios.findUnique({ where: { username } });

    if (!usuario) {
      res.status(404).json({ error: 'Invitación no válida' });
      return;
    }

    if (usuario.password || usuario.token_2fa) {
      res.status(400).json({ error: 'El usuario ya está registrado' });
      return;
    }

    if (!usuario.invitation_token || !usuario.invitation_expires_at) {
      res.status(403).json({ error: 'Invitación no válida. Contacta al administrador.' });
      return;
    }

    if (usuario.invitation_expires_at < new Date()) {
      res.status(403).json({ error: 'La invitación ha expirado. Contacta al administrador.' });
      return;
    }

    if (usuario.invitation_attempts >= MAX_INVITATION_ATTEMPTS) {
      res.status(403).json({ error: 'Invitación bloqueada por intentos fallidos. Contacta al administrador.' });
      return;
    }

    const tokenOk = await bcrypt.compare(invitationToken, usuario.invitation_token);
    if (!tokenOk) {
      await prisma.usuarios.update({
        where: { username },
        data: { invitation_attempts: { increment: 1 } },
      });
      res.status(403).json({ error: 'Código de invitación incorrecto' });
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const secret = speakeasy.generateSecret({ name: `Accesos LTP (${username})` });

    const datosUpdate: Prisma.usuariosUpdateInput = {
      password: hashedPassword,
      token_2fa: secret.base32,
      invitation_token: null,
      invitation_expires_at: null,
      invitation_attempts: 0,
    };

    await prisma.usuarios.update({ where: { username }, data: datosUpdate });

    res.status(201).json({
      message: 'Usuario registrado correctamente',
      secret_otpauth_url: secret.otpauth_url,
      secret_base32: secret.base32,
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error('❌ Error al registrar usuario:', err.message);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};
