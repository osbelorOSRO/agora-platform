import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import { VaultService } from "../secrets/vault.service.js";
import { privateKey } from "../utils/jwtKeys.js";

const vaultService = new VaultService();

export async function issueServiceToken(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const { serviceId, secretKey } = req.body;

    if (!serviceId || !secretKey) {
      res.status(400).json({ mensaje: "serviceId y secretKey son requeridos" });
      return;
    }

    // Validar secretKey contra Vault
    const vaultPath = `accesos/service-keys/${serviceId}`;
    
    let storedSecret: string;
    try {
      storedSecret = await vaultService.getSecretKey(vaultPath);
    } catch (error) {
      res.status(400).json({ mensaje: "serviceId no válido" });
      return;
    }

    if (secretKey !== storedSecret) {
      res.status(401).json({ mensaje: "Credenciales de servicio inválidas" });
      return;
    }

    // Obtener clave privada y firmar
    const key = await privateKey();

    const token = jwt.sign(
      { sub: serviceId },
      key,
      {
        algorithm: "RS256",
        expiresIn: "30m"
      }
    );

    res.json({
      token,
      expiresIn: 1800,
      tokenType: "Bearer"
    });

  } catch (error) {
    console.error("❌ Error emitiendo service token:", error);
    res.status(500).json({ mensaje: "Error interno del servidor" });
  }
}
