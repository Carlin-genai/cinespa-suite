
import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  avatar_url?: string;
}

interface UserRole {
  id: string;
  user_id: string;
  role: 'admin' | 'employee';
  created_at: string;
  updated_at: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  userRole: UserRole | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signInWithGoogle: () => Promise<{ error: any }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<{ error: any }>;
  updateUserRole: (role: 'admin' | 'employee') => Promise<{ error: any }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch user profile
  const fetchUserProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching profile:', error);
        return null;
      }

      if (!data) {
        console.log('No profile found, user may need to complete signup');
        return null;
      }

      const profileData: UserProfile = {
        id: data.id,
        email: data.email,
        full_name: data.full_name || '',
        avatar_url: data.avatar_url
      };

      return profileData;
    } catch (error) {
      console.error('Error fetching profile:', error);
      return null;
    }
  };

  // Fetch user role
  const fetchUserRole = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching user role:', error);
        return null;
      }

      return data as UserRole;
    } catch (error) {
      console.error('Error fetching user role:', error);
      return null;
    }
  };

  // Initialize auth state
  useEffect(() => {
    console.log('[Auth] Initializing authentication...');
    
    let mounted = true;
    
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('[Auth] State changed:', event, session?.user?.email || 'no user');
      
      if (!mounted) return;
      
      // Update session and user immediately 
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        console.log('[Auth] Scheduling user data fetch for:', session.user.email);
        // Defer Supabase calls to prevent deadlocks
        setTimeout(() => {
          Promise.all([
            fetchUserProfile(session.user!.id),
            fetchUserRole(session.user!.id),
          ])
            .then(([userProfile, userRoleData]) => {
              if (!mounted) return;
              console.log('[Auth] Profile:', userProfile?.email);
              console.log('[Auth] Role:', userRoleData?.role);
              setProfile(userProfile);
              setUserRole(userRoleData);
            })
            .catch((error) => {
              console.error('[Auth] Error fetching user data:', error);
              setProfile(null);
              setUserRole(null);
            })
            .finally(() => {
              if (mounted) {
                setLoading(false);
              }
            });
        }, 0);
      } else {
        setProfile(null);
        setUserRole(null);
        setLoading(false);
      }
    });

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (!mounted) return;
      
      if (error) {
        console.error('[Auth] Error getting session:', error);
        setLoading(false);
        return;
      }
      
      console.log('[Auth] Initial session check:', session?.user?.email || 'no session');
      
      // The auth state change listener will handle the session data
      // Just ensure loading is set to false if no session
      if (!session?.user) {
        setLoading(false);
      }
    });

    return () => {
      console.log('[Auth] Cleaning up auth subscription');
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // Safety timeout to prevent hanging loading state on edge cases
  useEffect(() => {
    const timeout = setTimeout(() => {
      setLoading((prev) => {
        if (prev && !user) {
          console.warn('[Auth] Safety timeout: no session detected, ending loading state');
          return false;
        }
        return prev;
      });
    }, 2000);
    return () => clearTimeout(timeout);
  }, [user]);

  const signIn = async (email: string, password: string) => {
    console.log('Attempting sign in for:', email);
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    console.log('Sign in result:', { user: data?.user?.email, error });
    return { error };
  };

  const signInWithGoogle = async () => {
    console.log('Attempting Google sign in');
    
    try {
      // For Lovable projects, use the current origin without /auth path
      const redirectUrl = window.location.origin;
      
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });
      
      if (error) {
        console.error('Google sign in error:', error);
        return { error };
      }
      
      console.log('Google sign in initiated successfully');
      return { error: null };
    } catch (err) {
      console.error('Google sign in exception:', err);
      return { error: err };
    }
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    console.log('Attempting sign up for:', email);

    const redirectUrl = `${window.location.origin}/`;

    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
        emailRedirectTo: redirectUrl,
      },
    });

    console.log('Sign up result:', { user: signUpData?.user?.email, session: !!signUpData?.session, error: signUpError });

    if (signUpError) {
      return { error: signUpError };
    }

    if (signUpData?.session) {
      console.log('Sign up returned active session, user is logged in.');
      return { error: null };
    }

    console.log('No active session from sign up, attempting immediate sign in...');
    const signInResult = await signIn(email, password);

    if (signInResult.error && String(signInResult.error.message || '').toLowerCase().includes('email not confirmed')) {
      console.log('Email confirmation required by Supabase project settings.');
    }

    return signInResult;
  };

  const updateProfile = async (updates: Partial<UserProfile>) => {
    if (!user) return { error: 'No user logged in' };

    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', user.id)
      .select()
      .single();

    if (!error && data) {
      const updatedProfile: UserProfile = {
        id: data.id,
        email: data.email,
        full_name: data.full_name || '',
        avatar_url: data.avatar_url
      };
      setProfile(updatedProfile);
    }

    return { error };
  };

  const updateUserRole = async (role: 'admin' | 'employee') => {
    if (!user) return { error: 'No user logged in' };

    const { data, error } = await supabase
      .from('user_roles')
      .update({ role, updated_at: new Date().toISOString() })
      .eq('user_id', user.id)
      .select()
      .single();

    if (!error && data) {
      setUserRole(data as UserRole);
    }

    return { error };
  };

  const signOut = async () => {
    console.log('Signing out');
    await supabase.auth.signOut();
  };

  const value = {
    user,
    session,
    profile,
    userRole,
    loading,
    signIn,
    signInWithGoogle,
    signUp,
    signOut,
    updateProfile,
    updateUserRole,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
