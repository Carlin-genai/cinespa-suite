import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Database, Settings, CheckCircle, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

const DatabaseSetup = () => {
  const [loading, setLoading] = useState(false);
  const [setupResults, setSetupResults] = useState<string[]>([]);
  const { user } = useAuth();
  const { toast } = useToast();

  const runDatabaseSetup = async () => {
    if (!user) {
      toast({
        title: 'Authentication Required',
        description: 'Please sign in first to setup your account',
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);
    const results: string[] = [];

    try {
      // 1. Ensure profile exists
      const { data: existingProfile, error: profileCheckError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (!existingProfile && !profileCheckError) {
        const { data: newProfile, error: profileCreateError } = await supabase
          .from('profiles')
          .insert([{
            id: user.id,
            email: user.email!,
            full_name: user.user_metadata?.full_name || user.email!.split('@')[0],
          }])
          .select()
          .single();

        if (profileCreateError) {
          results.push(`❌ Profile creation failed: ${profileCreateError.message}`);
        } else {
          results.push('✅ Profile created successfully');
        }
      } else if (existingProfile) {
        results.push('✅ Profile already exists');
      }

      // 2. Ensure user role exists
      const { data: existingRole, error: roleCheckError } = await supabase
        .from('user_roles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!existingRole && !roleCheckError) {
        const { data: newRole, error: roleCreateError } = await supabase
          .from('user_roles')
          .insert([{
            user_id: user.id,
            role: 'admin' // Default to admin for first-time setup
          }])
          .select()
          .single();

        if (roleCreateError) {
          results.push(`❌ Role creation failed: ${roleCreateError.message}`);
        } else {
          results.push('✅ Admin role assigned');
        }
      } else if (existingRole) {
        results.push(`✅ Role already exists: ${existingRole.role}`);
      }

      // 3. Test data access
      const { data: tasksData, error: tasksError } = await supabase
        .from('tasks')
        .select('count')
        .limit(1);

      if (tasksError) {
        results.push(`⚠️ Tasks access limited: ${tasksError.message}`);
      } else {
        results.push('✅ Tasks table accessible');
      }

      // 4. Create a sample task to verify everything works
      const { data: sampleTask, error: sampleTaskError } = await supabase
        .from('tasks')
        .insert([{
          title: 'Welcome Task',
          description: 'This is a sample task to verify everything works correctly',
          status: 'pending',
          priority: 'medium',
          assigned_to: user.id,
          assigned_by: user.id,
          due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
        }])
        .select()
        .single();

      if (sampleTaskError) {
        results.push(`❌ Sample task creation failed: ${sampleTaskError.message}`);
      } else {
        results.push('✅ Sample task created successfully');
      }

      setSetupResults(results);
      
      toast({
        title: 'Database Setup Complete',
        description: 'Your account is now ready to use all features',
      });

      // Refresh the page to load new data
      setTimeout(() => {
        window.location.reload();
      }, 2000);

    } catch (error) {
      results.push(`❌ Setup failed: ${error}`);
      setSetupResults(results);
      toast({
        title: 'Setup Error',
        description: 'Some issues occurred during setup',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return null;
  }

  return (
    <Card className="w-full max-w-md mx-auto mb-4">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          Database Setup
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          If you're experiencing issues with tasks or dashboard, click below to automatically setup your account.
        </p>
        
        <Button
          onClick={runDatabaseSetup}
          disabled={loading}
          className="w-full"
          variant="outline"
        >
          <Settings className="mr-2 h-4 w-4" />
          {loading ? 'Setting up...' : 'Auto-Setup Account'}
        </Button>
        
        {setupResults.length > 0 && (
          <div className="space-y-2 pt-2 border-t">
            <h4 className="text-sm font-medium">Setup Results:</h4>
            {setupResults.map((result, index) => (
              <div key={index} className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">
                  {result.startsWith('✅') ? 'Success' : 
                   result.startsWith('⚠️') ? 'Warning' : 'Error'}
                </Badge>
                <span className="text-xs">{result}</span>
              </div>
            ))}
          </div>
        )}
        
        {loading && (
          <div className="flex items-center justify-center py-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
            <span className="ml-2 text-xs text-muted-foreground">Configuring database...</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default DatabaseSetup;