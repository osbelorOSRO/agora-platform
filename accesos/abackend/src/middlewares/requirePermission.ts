import { Request, Response, NextFunction } from "express";

const normalize = (value: string) => value.trim().toLowerCase();

export function requirePermission(permission: string) {
  const expected = normalize(permission);

  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: "No autorizado" });
      return;
    }

    const userPermissions = Array.isArray(req.user.permisos)
      ? req.user.permisos.map((item) => normalize(String(item)))
      : [];

    if (!userPermissions.includes(expected)) {
      res.status(403).json({
        error: "Permiso insuficiente",
        requiredPermission: permission,
      });
      return;
    }

    next();
  };
}

export function requireAnyPermission(permissions: string[]) {
  const normalized = permissions.map(normalize);

  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: "No autorizado" });
      return;
    }

    const userPermissions = Array.isArray(req.user.permisos)
      ? req.user.permisos.map((item) => normalize(String(item)))
      : [];

    const allowed = normalized.some((permission) =>
      userPermissions.includes(permission)
    );

    if (!allowed) {
      res.status(403).json({
        error: "Permiso insuficiente",
        requiredAnyPermission: permissions,
      });
      return;
    }

    next();
  };
}
