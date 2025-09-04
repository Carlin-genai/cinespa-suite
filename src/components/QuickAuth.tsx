import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { LogIn, UserPlus } from 'lucide-react';

const QuickAuth = () => {
  const [loading, setLoading] = useState(false);
  const { signIn, signUp } = useAuth();
  const { toast } = useToast();

  const handleQuickLogin = async (type: 'existing' | 'demo') => {
    setLoading(true);
    
    try {
      if (type === 'existing') {
        // Try multiple existing accounts
        const accounts = [
          { email: 'carlingenai@gmail.com', name: 'Carlin' },
          { email: 'cinespa.ai@gmail.com', name: 'Srenivasan' },
          { email: 'hs@marktechnologies.in', name: 'Nithin' }
        ];
        
        let success = false;
        for (const account of accounts) {
          const { error } = await signIn(account.email, 'password123');
          if (!error) {
            success = true;
            toast({
              title: `Welcome back, ${account.name}!`,
              description: 'Successfully signed in'
            });
            break;
          }
        }
        
        if (!success) {
          toast({
            title: 'Sign In Failed',
            description: 'Try creating a demo account instead',
            variant: 'destructive'
          });
        }
      } else {
        // Create demo account with admin role
        const demoEmail = `admin${Date.now()}@demo.com`;
        const { error } = await signUp(demoEmail, 'demo123456', 'Demo Admin');
        if (error) {
          toast({
            title: 'Demo Account Creation Failed',
            description: error.message || 'Please try manual sign up',
            variant: 'destructive'
          });
        } else {
          toast({
            title: 'Demo Admin Account Created!',
            description: 'You can now access all features'
          });
        }
      }
    } catch (error) {
      toast({
        title: 'Authentication Error',
        description: 'Please try manual sign up below',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto mb-4">
      <CardHeader>
        <CardTitle>Quick Authentication</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Button
          onClick={() => handleQuickLogin('existing')}
          disabled={loading}
          className="w-full"
          variant="outline"
        >
          <LogIn className="mr-2 h-4 w-4" />
          Try Existing Account
        </Button>
        
        <Button
          onClick={() => handleQuickLogin('demo')}
          disabled={loading}
          className="w-full"
        >
          <UserPlus className="mr-2 h-4 w-4" />
          Create Demo Account
        </Button>
        
        <div className="text-center">
          <p className="text-xs text-muted-foreground">
            {loading ? 'Authenticating...' : 'Use these buttons to quickly test authentication'}
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default QuickAuth;