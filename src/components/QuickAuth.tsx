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
        // Try to sign in with existing user
        const { error } = await signIn('carlingenai@gmail.com', 'password123');
        if (error) {
          toast({
            title: 'Sign In Failed',
            description: 'Try creating a demo account instead',
            variant: 'destructive'
          });
        } else {
          toast({
            title: 'Welcome back!',
            description: 'Successfully signed in'
          });
        }
      } else {
        // Create demo account
        const demoEmail = `demo${Date.now()}@example.com`;
        const { error } = await signUp(demoEmail, 'password123', 'Demo User');
        if (error) {
          toast({
            title: 'Demo Account Creation Failed',
            description: error.message,
            variant: 'destructive'
          });
        } else {
          toast({
            title: 'Demo Account Created!',
            description: 'You are now signed in'
          });
        }
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Something went wrong. Please try again.',
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