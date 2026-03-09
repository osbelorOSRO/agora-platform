import { Request, Response, NextFunction } from "express";

const ALLOWED_SERVICE_IPS = (process.env.SERVICE_ALLOWED_IPS || "127.0.0.1,::1")
  .split(",")
  .map((ip) => ip.trim())
  .filter(Boolean);

const normalizeIp = (ip?: string): string => {
  if (!ip) return "";
  return ip.startsWith("::ffff:") ? ip.replace("::ffff:", "") : ip;
};

export function validateServiceIp(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const clientIp = normalizeIp(req.ip || req.socket.remoteAddress);
  
  if (!clientIp || !ALLOWED_SERVICE_IPS.includes(clientIp)) {
    res.status(403).json({ 
      mensaje: "Acceso denegado: IP no autorizada para servicios"
    });
    return;
  }
  
  next();
}
