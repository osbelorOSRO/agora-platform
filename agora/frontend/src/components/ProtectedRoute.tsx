import React from "react";
import { Navigate } from "react-router-dom";
import { getTokenData } from "../utils/getTokenData";

interface ProtectedRouteProps {
  children: JSX.Element;
}

const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const user = getTokenData();

  if (!user) {
    console.warn("⚠️ Usuario no autenticado. Redirigiendo a /login");
    return <Navigate to="/login" replace />;
  }

  return children;
};

export default ProtectedRoute;
