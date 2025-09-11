import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

interface AuthGuardProps {
  children: React.ReactNode;
  requireAuth?: boolean;
}

const AuthGuard: React.FC<AuthGuardProps> = ({ children, requireAuth = true }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  // Show loading spinner while checking authentication
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <p className="ml-4 text-muted-foreground">Checking authentication...</p>
      </div>
    );
  }

  // If authentication is required but user is not logged in
  if (requireAuth && !user) {
    console.log('[AuthGuard] User not authenticated, redirecting to /auth');
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  // If user is logged in but trying to access auth page
  if (!requireAuth && user) {
    console.log('[AuthGuard] User already authenticated, redirecting to dashboard');
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

export default AuthGuard;