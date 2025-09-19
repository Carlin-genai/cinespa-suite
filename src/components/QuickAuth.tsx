import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { LogIn, UserPlus, Zap } from 'lucide-react';

const QuickAuth = () => {
  const [loading, setLoading] = useState(false);
  const { signIn, signUp } = useAuth();
  const { toast } = useToast();

  const handleQuickLogin = async (type: 'admin' | 'demo') => {
    setLoading(true);
    
    try {
      if (type === 'admin') {
        // Try existing admin account
        const { error } = await signIn('carlingenai@gmail.com', 'password123');
        if (!error) {
          toast({
            title: 'Welcome back, Admin!',
            description: 'Successfully signed in with admin privileges'
          });
        } else {
          throw error;
        }
      } else {
        // Create demo account
        const demoEmail = `demo${Date.now()}@taskmanager.com`;
        const { error } = await signUp(demoEmail, 'demo123456', 'Demo User');
        if (error) {
          throw error;
        } else {
          toast({
            title: 'Demo Account Created!',
            description: 'You can now explore all features'
          });
        }
      }
    } catch (error) {
      toast({
        title: 'Authentication Failed',
        description: error instanceof Error ? error.message : 'Please try manual authentication below',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="mb-4 border-primary/20 bg-gradient-to-r from-primary/5 to-secondary/5">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Zap className="w-5 h-5 text-primary" />
          Quick Test Access
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="text-center text-sm text-muted-foreground mb-3">
          Skip manual signup - get instant access for testing
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Button
            onClick={() => handleQuickLogin('admin')}
            variant="outline"
            size="sm"
            className="flex items-center gap-2 hover:bg-primary/10"
            disabled={loading}
          >
            <LogIn className="w-4 h-4" />
            Admin Login
          </Button>
          <Button
            onClick={() => handleQuickLogin('demo')}
            variant="outline"
            size="sm"
            className="flex items-center gap-2 hover:bg-secondary/10"
            disabled={loading}
          >
            <UserPlus className="w-4 h-4" />
            Demo Account
          </Button>
        </div>
        {loading && (
          <div className="text-center text-xs text-muted-foreground mt-2">
            Authenticating...
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default QuickAuth;