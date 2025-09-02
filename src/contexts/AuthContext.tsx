
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
        .single();

      if (error) {
        console.error('Error fetching profile:', error);
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
        .single();

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

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session?.user?.email);
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          // Defer profile and role fetch to avoid recursion
          setTimeout(async () => {
            const userProfile = await fetchUserProfile(session.user.id);
            const userRoleData = await fetchUserRole(session.user.id);
            if (userProfile) {
              setProfile(userProfile);
            }
            if (userRoleData) {
              setUserRole(userRoleData);
            }
          }, 0);
        } else {
          setProfile(null);
          setUserRole(null);
        }
        
        setLoading(false);
      }
    );

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      console.log('Current session:', session?.user?.email);
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        const userProfile = await fetchUserProfile(session.user.id);
        const userRoleData = await fetchUserRole(session.user.id);
        if (userProfile) {
          setProfile(userProfile);
        }
        if (userRoleData) {
          setUserRole(userRoleData);
        }
      }
      
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

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
    const redirectUrl = `${window.location.origin}/`;
    
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectUrl,
      },
    });
    
    console.log('Google sign in result:', { error });
    return { error };
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
