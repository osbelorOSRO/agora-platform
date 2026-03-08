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

export const login = async (req: Request, res: Response): Promise<void> => {
  const { username, password, token_2fa } = req.body;

  if (!username || !password || !token_2fa) {
    res.status(400).json({ error: "Faltan credenciales" });
    return;
  }

  try {
    const usuario: UsuarioConPermisos | null = await prisma.usuarios.findUnique({
      where: { username },
      include: {
        rol_usuarios_rol_idTorol: {
          include: {
            rol_permiso: {
              include: {
                permiso: true,
              },
            },
          },
        },
      },
    });

    if (!usuario) {
      res.status(401).json({ error: "Usuario no encontrado" });
      return;
    }

    const claveOk = await bcrypt.compare(password, usuario.password);
    if (!claveOk) {
      res.status(401).json({ error: "Contraseña incorrecta" });
      return;
    }

    const verificado = speakeasy.totp.verify({
      secret: usuario.token_2fa,
      encoding: "base32",
      token: token_2fa,
    });
    if (!verificado) {
      res.status(401).json({ error: "Token 2FA inválido" });
      return;
    }

    const rolesArray = usuario.rol_usuarios_rol_idTorol ? [usuario.rol_usuarios_rol_idTorol] : [];
    const permisos = rolesArray.flatMap(rolItem =>
      rolItem.rol_permiso.map(rp => rp.permiso.nombre)
    );

    const nombreRol = rolesArray.length > 0 ? rolesArray[0].nombre : null;

    // Obtener la clave privada de Vault de forma asíncrona
    const key = await privateKey();

    const tokenJwt = jwt.sign(
      {
        id: usuario.id,
        username: usuario.username,
        nombre: usuario.nombre,
        apellido: usuario.apellido,
        email: usuario.email,
        rol: nombreRol,
        permisos,
      },
      key,
      { algorithm: "RS256", expiresIn: "12h" }
    );

    res.json({
      token: tokenJwt,
      usuario: {
        id: usuario.id,
        username: usuario.username,
        nombre: usuario.nombre,
        apellido: usuario.apellido,
        email: usuario.email,
        rol: nombreRol,
        permisos,
      },
    });
  } catch (error) {
    console.error("Error en login:", error);
    res.status(500).json({ error: "Error interno en el servidor" });
  }
};
