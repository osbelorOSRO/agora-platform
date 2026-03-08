import { Request, Response, NextFunction } from "express";

const ALLOWED_SERVICE_IPS = (process.env.SERVICE_ALLOWED_IPS || "100.121.165.88,100.67.8.81,127.0.0.1")
  .split(",")
  .map((ip) => ip.trim())
  .filter(Boolean);

export function validateServiceIp(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const clientIp = req.ip || req.socket.remoteAddress;
  
  if (!clientIp || !ALLOWED_SERVICE_IPS.includes(clientIp)) {
    res.status(403).json({ 
      mensaje: "Acceso denegado: IP no autorizada para servicios"
    });
    return;
  }
  
  next();
}
