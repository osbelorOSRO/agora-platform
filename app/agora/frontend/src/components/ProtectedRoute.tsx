import React from "react";
import { Navigate } from "react-router-dom";
import { getTokenData } from "../utils/getTokenData";
import type { UserFeatures } from "../utils/getTokenData";

interface ProtectedRouteProps {
  children: React.ReactElement;
  requiredFeature?: keyof UserFeatures;
  redirectTo?: string;
}

const ProtectedRoute = ({
  children,
  requiredFeature,
  redirectTo = "/accesos/welcome",
}: ProtectedRouteProps) => {
  const user = getTokenData();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (requiredFeature && !user.features?.[requiredFeature]) {
    return <Navigate to={redirectTo} replace />;
  }

  return children;
};

export default ProtectedRoute;
