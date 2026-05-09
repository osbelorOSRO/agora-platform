import { Request, Response } from 'express';
import prisma from '../utils/prisma.js';
import bcrypt from 'bcryptjs';
import speakeasy from 'speakeasy';
import { Prisma } from '@prisma/client';

export const registrarUsuario = async (req: Request, res: Response): Promise<void> => {
  const { username, password, confirmarPassword } = req.body;

  if (!username || !password || !confirmarPassword) {
    res.status(400).json({ error: 'Faltan campos obligatorios' });
    return;
  }

  if (typeof username !== 'string' || username.length > 100) {
    res.status(400).json({ error: 'username inválido' });
    return;
  }
  if (typeof password !== 'string' || password.length > 200) {
    res.status(400).json({ error: 'password inválido' });
    return;
  }
  if (typeof confirmarPassword !== 'string' || confirmarPassword.length > 200) {
    res.status(400).json({ error: 'confirmarPassword inválido' });
    return;
  }

  if (password !== confirmarPassword) {
    res.status(400).json({ error: 'Las contraseñas no coinciden' });
    return;
  }

  try {
    const usuario = await prisma.usuarios.findUnique({
      where: { username },
    });

    if (!usuario) {
      res.status(404).json({ error: 'Usuario no existe como preregistro' });
      return;
    }

    if (usuario.password || usuario.token_2fa) {
      res.status(400).json({ error: 'El usuario ya está registrado o activado' });
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const secret = speakeasy.generateSecret({
      name: `Accesos LTP (${username})`,
    });

    const datosUpdate: Prisma.usuariosUpdateInput = {
      password: hashedPassword,
      token_2fa: secret.base32,
    };

    await prisma.usuarios.update({
      where: { username },
      data: datosUpdate,
    });

    res.status(201).json({
      message: 'Usuario registrado correctamente',
      secret_otpauth_url: secret.otpauth_url,
      secret_base32: secret.base32,
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error('❌ Error al registrar usuario desde web:', err.message);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};
