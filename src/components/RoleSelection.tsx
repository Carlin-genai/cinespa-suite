
import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Shield, Users, CheckCircle, AlertCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface RoleSelectionProps {
  onRoleSelected: () => void;
}

const RoleSelection: React.FC<RoleSelectionProps> = ({ onRoleSelected }) => {
  const [selectedRole, setSelectedRole] = useState<'admin' | 'employee' | null>(null);
  const [loading, setLoading] = useState(false);
  const [orgInitializing, setOrgInitializing] = useState(true);
  const [error, setError] = useState<{ title: string; message: string } | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);
  const { updateUserRole, ensureOrganization, user, profile, userRole } = useAuth();
  const { toast } = useToast();

  // Check user status and skip role screen if already set
  useEffect(() => {
    const checkUserStatus = async () => {
      if (!user) return;
      
      try {
        setOrgInitializing(true);
        setError(null);
        
        // If user already has a role and org → skip this screen
        if (userRole?.role && profile?.org_id) {
          console.log('User already has role and org, redirecting...', { role: userRole.role, org_id: profile.org_id });
          
          // Store locally
          localStorage.setItem('userRole', userRole.role);
          localStorage.setItem('themePreference', 'light');
          
          // Redirect based on role
          const destination = userRole.role === 'admin' 
            ? '/dashboard?scope=team' 
            : '/dashboard?scope=my';
          
          toast({
            title: 'Welcome back!',
            description: `Redirecting to your ${userRole.role} dashboard...`,
          });
          
          setTimeout(() => {
            onRoleSelected();
            window.location.href = destination;
          }, 500);
          
          return;
        }
        
        // Otherwise, ensure org exists for new users
        const result = await ensureOrganization();
        
        if (result.error) {
          setError({
            title: 'Failed to initialize',
            message: result.error
          });
        }
      } catch (err) {
        setError({
          title: 'Network error',
          message: 'Please check your connection and try again.'
        });
      } finally {
        setOrgInitializing(false);
      }
    };

    checkUserStatus();
  }, [user, profile, userRole]);

  const retryOrgInit = async () => {
    setError(null);
    setOrgInitializing(true);
    
    try {
      const result = await ensureOrganization();
      if (result.error) {
        setError({
          title: 'Failed to initialize',
          message: result.error
        });
      }
    } catch (err) {
      setError({
        title: 'Network error',
        message: 'Please check your connection and try again.'
      });
    } finally {
      setOrgInitializing(false);
    }
  };

  const handleRoleSelection = async () => {
    if (!selectedRole || !user || loading) return;

    // Debounce: prevent double-submit
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    debounceTimer.current = setTimeout(async () => {
      setLoading(true);
      setError(null);

      // Timeout after 10 seconds
      const timeoutId = setTimeout(() => {
        setError({
          title: 'Network is slow',
          message: 'Check your connection and try again.'
        });
        setLoading(false);
      }, 10000);

      try {
        const { error } = await updateUserRole(selectedRole);
        clearTimeout(timeoutId);

        if (error) {
          // Handle specific error types
          const errorMsg = typeof error === 'string' ? error : 'Failed to save role';
          
          setError({
            title: 'Failed to set role',
            message: errorMsg
          });
          setLoading(false);
        } else {
          // Success: store role in localStorage for routing
          localStorage.setItem('userRole', selectedRole);
          localStorage.setItem('themePreference', 'light');
          
          toast({
            title: 'Success!',
            description: `Your role has been set as ${selectedRole === 'admin' ? 'Administrator' : 'Employee'}.`,
          });

          // Route based on role
          setTimeout(() => {
            onRoleSelected();
          }, 500);
        }
      } catch (error: any) {
        clearTimeout(timeoutId);
        console.error('Role selection error:', error);
        
        // Check for auth errors
        if (error?.message?.includes('401') || error?.message?.includes('403')) {
          setError({
            title: 'Session expired',
            message: 'Please log in again.'
          });
          localStorage.clear();
          setTimeout(() => window.location.href = '/auth', 2000);
        } else {
          setError({
            title: 'Error',
            message: 'Something went wrong. Please try again.'
          });
        }
        setLoading(false);
      }
    }, 500);
  };

  // Cleanup debounce timer
  useEffect(() => {
    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, []);

  const roles = [
    {
      id: 'admin' as const,
      title: 'Administrator',
      description: 'Manage teams, assign tasks, and oversee operations',
      icon: Shield,
      features: [
        'Create and assign tasks to employees',
        'View all team tasks and progress',
        'Access analytics and reports',
        'Manage team members',
        'Verify completed tasks'
      ]
    },
    {
      id: 'employee' as const,
      title: 'Employee',
      description: 'Complete assigned tasks and manage your personal workflow',
      icon: Users,
      features: [
        'View and update assigned tasks',
        'Create personal self-tasks',
        'Track your progress and deadlines',
        'Collaborate with team members',
        'Access your performance analytics'
      ]
    }
  ];

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-4xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Welcome to Wedot</h1>
          <p className="text-muted-foreground">Please select your role to continue</p>
          {profile?.full_name && (
            <p className="text-sm text-muted-foreground mt-1">{profile.full_name} • {profile.email}</p>
          )}
        </div>

        {/* Error Banner */}
        {error && (
          <Alert variant="destructive" className="mb-6" role="alert">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>{error.title}</AlertTitle>
            <AlertDescription className="flex items-center justify-between">
              <span>{error.message}</span>
              {!orgInitializing && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={retryOrgInit}
                  className="ml-4"
                >
                  Retry
                </Button>
              )}
            </AlertDescription>
          </Alert>
        )}

        {/* Organization Initializing State */}
        {orgInitializing && !error && (
          <div className="mb-6 p-4 bg-muted rounded-lg text-center">
            <div className="flex items-center justify-center gap-2">
              <span className="h-4 w-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
              <span className="text-sm text-muted-foreground">Setting up your workspace...</span>
            </div>
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {roles.map((role) => {
            const Icon = role.icon;
            const isSelected = selectedRole === role.id;

            return (
              <Card
                key={role.id}
                className={`cursor-pointer transition-all duration-300 hover:shadow-lg ${
                  isSelected 
                    ? 'ring-2 ring-primary shadow-lg shadow-primary/20' 
                    : 'hover:shadow-primary/10'
                }`}
                onClick={() => setSelectedRole(role.id)}
              >
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`p-3 rounded-lg ${
                        isSelected ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                      }`}>
                        <Icon className="h-6 w-6" />
                      </div>
                      <div>
                        <CardTitle className="text-xl">{role.title}</CardTitle>
                        <p className="text-sm text-muted-foreground">{role.description}</p>
                      </div>
                    </div>
                    {isSelected && (
                      <CheckCircle className="h-6 w-6 text-primary" />
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {role.features.map((feature, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <div className="h-1.5 w-1.5 bg-primary rounded-full" />
                        <span className="text-sm text-muted-foreground">{feature}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="text-center">
          <Button
            onClick={handleRoleSelection}
            disabled={!selectedRole || loading || orgInitializing}
            className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-2 min-w-[150px]"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                Saving...
              </span>
            ) : (
              'Continue'
            )}
          </Button>
          {selectedRole && !loading && (
            <p className="text-sm text-muted-foreground mt-2">
              You selected: <Badge variant="secondary" className="bg-primary/10 text-primary">{selectedRole}</Badge>
            </p>
          )}
          {orgInitializing && (
            <p className="text-xs text-muted-foreground mt-2">
              Please wait while we set up your workspace
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default RoleSelection;
