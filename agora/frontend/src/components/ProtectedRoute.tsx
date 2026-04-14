import React from "react";
import { Navigate } from "react-router-dom";
import { getTokenData } from "../utils/getTokenData";
import { hasAnyPermission } from "@/utils/permissions";

interface ProtectedRouteProps {
  children: React.ReactElement;
  requiredPermissions?: string[];
  redirectTo?: string;
}

const ProtectedRoute = ({
  children,
  requiredPermissions = [],
  redirectTo = "/accesos/welcome",
}: ProtectedRouteProps) => {
  const user = getTokenData();

  if (!user) {
    console.warn("⚠️ Usuario no autenticado. Redirigiendo a /login");
    return <Navigate to="/login" replace />;
  }

  if (!hasAnyPermission(requiredPermissions, user.permisos)) {
    console.warn("⚠️ Usuario sin permisos suficientes. Redirigiendo.");
    return <Navigate to={redirectTo} replace />;
  }

  return children;
};

export default ProtectedRoute;
