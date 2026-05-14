import { Request, Response } from 'express';
import prisma from '../utils/prisma.js';
import bcrypt from 'bcryptjs';
import speakeasy from 'speakeasy';

// POST /api/auth/reset-password
// Body: { username, resetToken, newPassword, confirmarPassword }
export const resetPassword = async (req: Request, res: Response): Promise<void> => {
  const { username, resetToken, newPassword, confirmarPassword } = req.body;

  if (!username || !resetToken || !newPassword || !confirmarPassword) {
    res.status(400).json({ error: 'Faltan campos obligatorios' });
    return;
  }
  if (typeof username !== 'string' || username.length > 100) { res.status(400).json({ error: 'Datos inválidos' }); return; }
  if (typeof resetToken !== 'string' || resetToken.length > 20) { res.status(400).json({ error: 'Datos inválidos' }); return; }
  if (typeof newPassword !== 'string' || newPassword.length > 200) { res.status(400).json({ error: 'Datos inválidos' }); return; }
  if (newPassword !== confirmarPassword) { res.status(400).json({ error: 'Las contraseñas no coinciden' }); return; }

  try {
    const usuario = await prisma.usuarios.findUnique({
      where: { username },
      select: { id: true, reset_token: true, reset_token_expires: true },
    });

    if (!usuario || !usuario.reset_token || !usuario.reset_token_expires) {
      res.status(403).json({ error: 'Token de reset no válido' });
      return;
    }
    if (usuario.reset_token_expires < new Date()) {
      res.status(403).json({ error: 'El token de reset ha expirado. Contacta al administrador.' });
      return;
    }

    const tokenOk = await bcrypt.compare(resetToken, usuario.reset_token);
    if (!tokenOk) {
      res.status(403).json({ error: 'Token de reset incorrecto' });
      return;
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await prisma.usuarios.update({
      where: { id: usuario.id },
      data: { password: hashedPassword, reset_token: null, reset_token_expires: null, login_attempts: 0, bloqueado: false },
    });

    res.json({ message: 'Contraseña actualizada correctamente' });
  } catch (err) {
    console.error('❌ reset-password público:', err);
    res.status(500).json({ error: 'Error interno' });
  }
};

// POST /api/auth/setup-2fa/init
// Body: { username, password, bypassToken }
// Returns: { otpauth_url } para mostrar el QR
export const setup2FAInit = async (req: Request, res: Response): Promise<void> => {
  const { username, password, bypassToken } = req.body;

  if (!username || !password || !bypassToken) {
    res.status(400).json({ error: 'Faltan campos obligatorios' });
    return;
  }
  if (typeof username !== 'string' || username.length > 100) { res.status(400).json({ error: 'Datos inválidos' }); return; }
  if (typeof password !== 'string' || password.length > 200) { res.status(400).json({ error: 'Datos inválidos' }); return; }
  if (typeof bypassToken !== 'string' || bypassToken.length > 20) { res.status(400).json({ error: 'Datos inválidos' }); return; }

  try {
    const usuario = await prisma.usuarios.findUnique({
      where: { username },
      select: { id: true, password: true, mfa_bypass_token: true, mfa_new_secret: true, mfa_reset_expires: true },
    });

    if (!usuario || !usuario.password) {
      res.status(403).json({ error: 'Credenciales inválidas' });
      return;
    }
    if (!usuario.mfa_bypass_token || !usuario.mfa_new_secret || !usuario.mfa_reset_expires) {
      res.status(403).json({ error: 'Token de reset 2FA no válido' });
      return;
    }
    if (usuario.mfa_reset_expires < new Date()) {
      res.status(403).json({ error: 'El token de reset 2FA ha expirado. Contacta al administrador.' });
      return;
    }

    const claveOk = await bcrypt.compare(password, usuario.password);
    if (!claveOk) {
      res.status(403).json({ error: 'Credenciales inválidas' });
      return;
    }

    const tokenOk = await bcrypt.compare(bypassToken, usuario.mfa_bypass_token);
    if (!tokenOk) {
      res.status(403).json({ error: 'Token de reset 2FA incorrecto' });
      return;
    }

    const otpauthUrl = speakeasy.otpauthURL({
      secret: usuario.mfa_new_secret,
      label: `Accesos LTP (${username})`,
      encoding: 'base32',
    });

    res.json({ otpauth_url: otpauthUrl });
  } catch (err) {
    console.error('❌ setup-2fa init:', err);
    res.status(500).json({ error: 'Error interno' });
  }
};

// POST /api/auth/setup-2fa/confirmar
// Body: { username, bypassToken, totpCode }
export const setup2FAConfirmar = async (req: Request, res: Response): Promise<void> => {
  const { username, bypassToken, totpCode } = req.body;

  if (!username || !bypassToken || !totpCode) {
    res.status(400).json({ error: 'Faltan campos obligatorios' });
    return;
  }
  if (typeof username !== 'string' || username.length > 100) { res.status(400).json({ error: 'Datos inválidos' }); return; }
  if (typeof bypassToken !== 'string' || bypassToken.length > 20) { res.status(400).json({ error: 'Datos inválidos' }); return; }
  if (typeof totpCode !== 'string' || !/^\d{6}$/.test(totpCode)) { res.status(400).json({ error: 'Código TOTP inválido' }); return; }

  try {
    const usuario = await prisma.usuarios.findUnique({
      where: { username },
      select: { id: true, mfa_bypass_token: true, mfa_new_secret: true, mfa_reset_expires: true },
    });

    if (!usuario || !usuario.mfa_bypass_token || !usuario.mfa_new_secret || !usuario.mfa_reset_expires) {
      res.status(403).json({ error: 'Token de reset 2FA no válido' });
      return;
    }
    if (usuario.mfa_reset_expires < new Date()) {
      res.status(403).json({ error: 'El token de reset 2FA ha expirado' });
      return;
    }

    const tokenOk = await bcrypt.compare(bypassToken, usuario.mfa_bypass_token);
    if (!tokenOk) {
      res.status(403).json({ error: 'Token de reset 2FA incorrecto' });
      return;
    }

    const totpOk = speakeasy.totp.verify({
      secret: usuario.mfa_new_secret,
      encoding: 'base32',
      token: totpCode,
    });
    if (!totpOk) {
      res.status(403).json({ error: 'Código TOTP incorrecto. Asegúrate de haber escaneado el código QR.' });
      return;
    }

    await prisma.usuarios.update({
      where: { id: usuario.id },
      data: {
        token_2fa: usuario.mfa_new_secret,
        mfa_bypass_token: null,
        mfa_new_secret: null,
        mfa_reset_expires: null,
        login_attempts: 0,
        bloqueado: false,
      },
    });

    res.json({ message: 'Autenticador 2FA configurado correctamente' });
  } catch (err) {
    console.error('❌ setup-2fa confirmar:', err);
    res.status(500).json({ error: 'Error interno' });
  }
};
