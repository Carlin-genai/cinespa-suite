import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, AlertCircle, XCircle, Database, Shield, Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface HealthCheck {
  name: string;
  status: 'healthy' | 'warning' | 'error';
  message: string;
  icon: React.ReactNode;
}

const AppHealth = () => {
  const [checks, setChecks] = useState<HealthCheck[]>([]);
  const [loading, setLoading] = useState(true);
  const { user, session } = useAuth();

  useEffect(() => {
    const runHealthChecks = async () => {
      const healthChecks: HealthCheck[] = [];

      // 1. Database Connection
      try {
        const { data, error } = await supabase.from('profiles').select('count').limit(1);
        healthChecks.push({
          name: 'Database Connection',
          status: error ? 'error' : 'healthy',
          message: error ? 'Cannot connect to Supabase' : 'Connected to Supabase',
          icon: <Database className="h-4 w-4" />
        });
      } catch (error) {
        healthChecks.push({
          name: 'Database Connection',
          status: 'error',
          message: 'Database connection failed',
          icon: <Database className="h-4 w-4" />
        });
      }

      // 2. Authentication Status
      healthChecks.push({
        name: 'Authentication',
        status: user ? 'healthy' : 'warning',
        message: user ? `Signed in as ${user.email}` : 'Not authenticated',
        icon: <Shield className="h-4 w-4" />
      });

      // 3. RLS Policies Check (if authenticated)
      if (user) {
        try {
          const { data: tasksData, error: tasksError } = await supabase
            .from('tasks')
            .select('count')
            .limit(1);
          
          const { data: profilesData, error: profilesError } = await supabase
            .from('profiles')
            .select('count')
            .limit(1);

          healthChecks.push({
            name: 'RLS Policies',
            status: (tasksError || profilesError) ? 'warning' : 'healthy',
            message: (tasksError || profilesError) ? 'Some permissions may be restricted' : 'All permissions working',
            icon: <Users className="h-4 w-4" />
          });
        } catch (error) {
          healthChecks.push({
            name: 'RLS Policies',
            status: 'error',
            message: 'Unable to check permissions',
            icon: <Users className="h-4 w-4" />
          });
        }
      }

      // 4. Session Validity
      if (session) {
        const expiresAt = new Date(session.expires_at! * 1000);
        const now = new Date();
        const timeUntilExpiry = expiresAt.getTime() - now.getTime();
        
        healthChecks.push({
          name: 'Session Validity',
          status: timeUntilExpiry > 300000 ? 'healthy' : 'warning', // 5 minutes
          message: timeUntilExpiry > 0 
            ? `Valid for ${Math.round(timeUntilExpiry / 60000)} minutes`
            : 'Session expired',
          icon: <CheckCircle className="h-4 w-4" />
        });
      }

      setChecks(healthChecks);
      setLoading(false);
    };

    runHealthChecks();
  }, [user, session]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'warning':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <AlertCircle className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'warning':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'error':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  if (loading) {
    return (
      <Card className="w-full max-w-md mx-auto mb-4">
        <CardHeader>
          <CardTitle>System Health</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
            <span className="ml-2 text-sm text-muted-foreground">Checking system health...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md mx-auto mb-4">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {getStatusIcon(checks.some(c => c.status === 'error') ? 'error' : 
                       checks.some(c => c.status === 'warning') ? 'warning' : 'healthy')}
          System Health
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {checks.map((check, index) => (
          <div key={index} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {check.icon}
              <span className="text-sm font-medium">{check.name}</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge className={`text-xs ${getStatusColor(check.status)}`}>
                {check.status}
              </Badge>
            </div>
          </div>
        ))}
        
        <div className="pt-2 border-t">
          <p className="text-xs text-muted-foreground">
            {checks.every(c => c.status === 'healthy') 
              ? '✅ All systems operational' 
              : checks.some(c => c.status === 'error')
              ? '❌ Issues detected - check authentication'
              : '⚠️ Some warnings - functionality may be limited'
            }
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default AppHealth;