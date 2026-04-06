import React from 'react';
import { Navigate } from 'react-router-dom';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRole?: string;
  user: any;
}

const ProtectedRoute = ({ children, allowedRole, user }: ProtectedRouteProps) => {
  // 1. Hvis ikke logget inn, send til login
  if (!user) return <Navigate to="/login" replace />;

  // 2. Hvis rollen ikke matcher, send til en 'Unauthorized' side
  if (allowedRole && user.role && user.role !== allowedRole) {
    return <Navigate to="/unauthorized" replace />;
  }

  // 3. Alt OK, slipp brukeren inn
  return <>{children}</>;
};

export default ProtectedRoute;
