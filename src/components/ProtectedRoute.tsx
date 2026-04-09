import React from 'react';
import { Navigate } from 'react-router-dom';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRole: 'tutor' | 'student';
  user: any;
  isAuthReady: boolean;
}

const ProtectedRoute = ({ children, allowedRole, user, isAuthReady }: ProtectedRouteProps) => {
  // 0. Hvis vi fremdeles sjekker innlogging, vis laster
  if (!isAuthReady) {
    return <div className="flex items-center justify-center min-h-screen">Laster...</div>;
  }

  // 1. Hvis ikke logget inn, send til login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // 2. Hvis rollen ikke matcher, send til en 'Unauthorized' side
  if (user.role !== allowedRole) {
    return <Navigate to="/unauthorized" replace />;
  }

  // 3. Hvis læreren ikke har betalt, send til betaling
  if (allowedRole === 'tutor' && !user.hasPaid) {
    return <Navigate to="/payment" replace />;
  }

  // 4. Alt OK, slipp brukeren inn
  return <>{children}</>;
};

export default ProtectedRoute;
