import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { publicKey } from "../utils/jwtKeys.js"; // clave pública asíncrona
import { User } from "../interfaces/User.js";

export async function verifyToken(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers["authorization"];
  const token = authHeader?.split(" ")[1];

  if (!token) {
    res.status(401).json({ mensaje: "Token requerido" });
    return;
  }

  try {
    const key = await publicKey(); // obtener la clave pública desde Vault
    const decoded = jwt.verify(token, key, { algorithms: ["RS256"] }) as User;
    req.user = decoded;
    next();
  } catch (err) {
    res.status(403).json({ mensaje: "Token inválido o expirado" });
  }
}
