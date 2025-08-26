
import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, LogIn, UserPlus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const Auth = () => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Prefill remembered credentials (user opted-in previously)
  useEffect(() => {
    const savedEmail = localStorage.getItem('remembered_email');
    const savedPassword = localStorage.getItem('remembered_password');
    if (savedEmail) setEmail(savedEmail);
    if (savedPassword) {
      try {
        setPassword(atob(savedPassword));
      } catch {
        // ignore decode errors
      }
    }
  }, []);

  const persistCredentials = () => {
    if (rememberMe) {
      localStorage.setItem('remembered_email', email);
      // Store password only if user opts in. This is for convenience in this environment.
      localStorage.setItem('remembered_password', btoa(password));
    } else {
      localStorage.removeItem('remembered_email');
      localStorage.removeItem('remembered_password');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isSignUp) {
        const { error } = await signUp(email, password, fullName);
        if (error) {
          const msg = String(error.message || '');
          // Give a clearer hint if project still requires confirmation
          if (msg.toLowerCase().includes('email not confirmed')) {
            toast({
              title: 'Sign Up Error',
              description: 'Your Supabase project currently requires email confirmation. Disable it in Auth > Providers > Email to allow instant login.',
              variant: 'destructive',
            });
          } else {
            toast({
              title: 'Sign Up Error',
              description: msg || 'Something went wrong.',
              variant: 'destructive',
            });
          }
        } else {
          persistCredentials();
          toast({
            title: 'Welcome!',
            description: 'Account created successfully! You are now signed in.',
          });
          navigate('/');
        }
      } else {
        const { error } = await signIn(email, password);
        if (error) {
          const msg = String(error.message || '');
          if (msg.toLowerCase().includes('invalid login credentials')) {
            toast({
              title: 'Sign In Error',
              description: 'Invalid credentials. Check your email and password or sign up if you don’t have an account.',
              variant: 'destructive',
            });
          } else if (msg.toLowerCase().includes('email not confirmed')) {
            toast({
              title: 'Sign In Error',
              description: 'Email confirmation is enabled in Supabase. Turn it off in Auth > Providers > Email to sign in instantly.',
              variant: 'destructive',
            });
          } else {
            toast({
              title: 'Sign In Error',
              description: msg || 'Something went wrong.',
              variant: 'destructive',
            });
          }
        } else {
          persistCredentials();
          toast({
            title: 'Welcome back!',
            description: 'Successfully signed in.',
          });
          navigate('/');
        }
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Something went wrong. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mb-4">
            <h1 className="font-montserrat text-2xl font-bold text-foreground">
              CINESPA
            </h1>
            <p className="text-sm text-muted-foreground font-opensans">
              LUXURY HOME THEATRES & AUTOMATIONS
            </p>
          </div>
          <CardTitle className="text-xl font-montserrat">
            {isSignUp ? 'Create Account' : 'Sign In'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignUp && (
              <div>
                <Label htmlFor="fullName">Full Name</Label>
                <Input
                  id="fullName"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  placeholder="Enter your full name"
                  autoComplete="name"
                />
              </div>
            )}
            
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="Enter your email"
                autoComplete="email"
              />
            </div>
            
            <div>
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="Enter your password"
                  autoComplete={isSignUp ? 'new-password' : 'current-password'}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 p-0"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            {!isSignUp && (
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="remember"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-4 w-4 text-luxury-gold border-gray-300 rounded focus:ring-luxury-gold"
                />
                <Label htmlFor="remember" className="text-sm">
                  Remember me
                </Label>
              </div>
            )}
            
            <Button type="submit" disabled={loading} className="w-full gradient-gold text-charcoal-black">
              {loading ? 'Please wait...' : (
                <>
                  {isSignUp ? <UserPlus className="mr-2 h-4 w-4" /> : <LogIn className="mr-2 h-4 w-4" />}
                  {isSignUp ? 'Create Account' : 'Sign In'}
                </>
              )}
            </Button>
          </form>
          
          <div className="mt-4 text-center">
            <p className="text-sm text-muted-foreground">
              {isSignUp ? 'Already have an account?' : "Don't have an account?"}
              <Button
                variant="link"
                onClick={() => setIsSignUp(!isSignUp)}
                className="p-0 ml-1 h-auto font-normal text-luxury-gold"
              >
                {isSignUp ? 'Sign in' : 'Sign up'}
              </Button>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;
