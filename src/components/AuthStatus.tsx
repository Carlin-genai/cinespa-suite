import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle, CheckCircle, User, Shield } from 'lucide-react';

const AuthStatus = () => {
  const { user, session, profile, userRole, loading } = useAuth();

  if (loading) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
            Checking Authentication...
          </CardTitle>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md mx-auto mb-4">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {user ? (
            <CheckCircle className="h-5 w-5 text-completed-green" />
          ) : (
            <AlertCircle className="h-5 w-5 text-overdue-red" />
          )}
          Authentication Status
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">User Session:</span>
          <span className={`text-sm font-medium ${user ? 'text-completed-green' : 'text-overdue-red'}`}>
            {user ? 'Active' : 'None'}
          </span>
        </div>
        
        {user && (
          <>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Email:</span>
              <span className="text-sm font-medium">{user.email}</span>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Profile:</span>
              <span className={`text-sm font-medium ${profile ? 'text-completed-green' : 'text-pending-yellow'}`}>
                {profile ? 'Loaded' : 'Loading...'}
              </span>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Role:</span>
              <span className={`text-sm font-medium flex items-center gap-1 ${userRole ? 'text-completed-green' : 'text-pending-yellow'}`}>
                {userRole ? (
                  <>
                    {userRole.role === 'admin' ? <Shield className="h-3 w-3" /> : <User className="h-3 w-3" />}
                    {userRole.role}
                  </>
                ) : (
                  'Not Set'
                )}
              </span>
            </div>
          </>
        )}
        
        {!user && (
          <div className="text-center pt-2">
            <p className="text-sm text-muted-foreground mb-3">
              You need to sign in to access task management features
            </p>
            <Button onClick={() => window.location.reload()} variant="outline" size="sm">
              Refresh Page
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AuthStatus;