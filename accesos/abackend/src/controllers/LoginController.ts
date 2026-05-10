import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import speakeasy from "speakeasy";
import prisma from "../utils/prisma.js";
import { privateKey } from "../utils/jwtKeys.js";
import { Prisma, usuarios, rol, rol_permiso, permiso } from "@prisma/client";

type RolConPermisosSingle = rol & {
  rol_permiso: (rol_permiso & { permiso: permiso })[];
};

type UsuarioConPermisos = usuarios & {
  rol_usuarios_rol_idTorol: RolConPermisosSingle | null;
};

const MAX_LOGIN_ATTEMPTS = 5;

async function registrarIntentoFallido(username: string): Promise<void> {
  const updated = await prisma.usuarios.update({
    where: { username },
    data: { login_attempts: { increment: 1 } },
    select: { login_attempts: true },
  });
  if (updated.login_attempts >= MAX_LOGIN_ATTEMPTS) {
    await prisma.usuarios.update({
      where: { username },
      data: { bloqueado: true, bloqueado_en: new Date() },
    });
  }
}

export const login = async (req: Request, res: Response): Promise<void> => {
  const { username, password, token_2fa } = req.body;

  if (!username || !password || !token_2fa) {
    res.status(400).json({ error: "Faltan credenciales" });
    return;
  }

  if (typeof username !== 'string' || username.length > 100) {
    res.status(400).json({ error: "Credenciales inválidas" });
    return;
  }
  if (typeof password !== 'string' || password.length > 200) {
    res.status(400).json({ error: "Credenciales inválidas" });
    return;
  }
  if (typeof token_2fa !== 'string' || !/^\d{6}$/.test(token_2fa)) {
    res.status(400).json({ error: "Token 2FA inválido" });
    return;
  }

  try {
    const usuario: UsuarioConPermisos | null = await prisma.usuarios.findUnique({
      where: { username },
      include: {
        rol_usuarios_rol_idTorol: {
          include: { rol_permiso: { include: { permiso: true } } },
        },
      },
    });

    if (!usuario) {
      res.status(401).json({ error: "Credenciales incorrectas" });
      return;
    }

    if (usuario.cancelado) {
      res.status(401).json({ error: "Credenciales incorrectas" });
      return;
    }

    if (usuario.bloqueado) {
      res.status(403).json({ error: "Cuenta bloqueada. Contacta al administrador del sistema." });
      return;
    }

    const claveOk = await bcrypt.compare(password, usuario.password);
    if (!claveOk) {
      await registrarIntentoFallido(username);
      res.status(401).json({ error: "Credenciales incorrectas" });
      return;
    }

    const verificado = speakeasy.totp.verify({
      secret: usuario.token_2fa,
      encoding: "base32",
      token: token_2fa,
    });
    if (!verificado) {
      await registrarIntentoFallido(username);
      res.status(401).json({ error: "Token 2FA inválido" });
      return;
    }

    await prisma.usuarios.update({
      where: { username },
      data: { login_attempts: 0 },
    });

    const rolesArray = usuario.rol_usuarios_rol_idTorol ? [usuario.rol_usuarios_rol_idTorol] : [];
    const permisos = rolesArray.flatMap(r => r.rol_permiso.map(rp => rp.permiso.nombre));
    const nombreRol = rolesArray[0]?.nombre ?? null;

    const key = await privateKey();
    const tokenJwt = jwt.sign(
      { id: usuario.id, username: usuario.username, nombre: usuario.nombre, apellido: usuario.apellido, email: usuario.email, rol: nombreRol, permisos },
      key,
      { algorithm: "RS256", expiresIn: "12h" }
    );

    res.json({
      token: tokenJwt,
      usuario: { id: usuario.id, username: usuario.username, nombre: usuario.nombre, apellido: usuario.apellido, email: usuario.email, rol: nombreRol, permisos },
    });
  } catch (error) {
    console.error("Error en login:", error);
    res.status(500).json({ error: "Error interno en el servidor" });
  }
};
