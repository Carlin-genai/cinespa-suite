
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { user, userRole, loading } = useAuth();

  console.log('ProtectedRoute check:', { user: user?.email, userRole: userRole?.role, loading });

  // Extended loading check - give more time for auth to stabilize
  if (loading || (user && userRole === null)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-rose-gold mx-auto mb-4"></div>
          <p className="text-muted-foreground font-opensans">Loading authentication...</p>
          <p className="text-xs text-muted-foreground mt-2">Verifying user permissions</p>
        </div>
      </div>
    );
  }

  if (!user) {
    console.log('No user found, redirecting to /auth');
    return <Navigate to="/auth" replace />;
  }

  // Allow access if user exists - role will be handled by Auth page if missing
  console.log('User authenticated, showing protected content');
  return <>{children}</>;
};

export default ProtectedRoute;
