import { getTokenData } from "./getTokenData";

export const hasPermission = (permission: string, permissions?: string[]): boolean => {
  const source = permissions ?? getTokenData()?.permisos ?? [];
  return source.includes(permission);
};

export const hasAnyPermission = (requiredPermissions: string[], permissions?: string[]): boolean => {
  if (requiredPermissions.length === 0) return true;
  return requiredPermissions.some((permission) => hasPermission(permission, permissions));
};
