import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRole: 'tutor' | 'student' | 'admin';
  user: any;
  isAuthReady: boolean;
}

const ProtectedRoute = ({ children, allowedRole, user, isAuthReady }: ProtectedRouteProps) => {
  const location = useLocation();

  if (!isAuthReady) {
    return <div className="flex items-center justify-center min-h-screen">Laster...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (user.role !== allowedRole) {
    return <Navigate to="/unauthorized" replace />;
  }

  if (allowedRole === 'admin' && user.forcePasswordChange && location.pathname !== '/admin/change-password') {
    return <Navigate to="/admin/change-password" replace />;
  }

  if (allowedRole === 'admin' && !user.forcePasswordChange && location.pathname === '/admin/change-password') {
    return <Navigate to="/admin" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
