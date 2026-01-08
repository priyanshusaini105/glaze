'use client';

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { User, Session, AuthError } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase-auth';
import { getEmailValidationError, isCompanyEmail } from '@/lib/email-validation';

// Credit info from the seat API
interface CreditInfo {
  credits: number;
  totalCreditsUsed: number;
  maxCredits: number;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  // Credit info (MVP)
  creditInfo: CreditInfo | null;
  creditLoading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: AuthError | Error | null }>;
  signUp: (email: string, password: string) => Promise<{ error: AuthError | Error | null }>;
  signOut: () => Promise<void>;
  refreshCredits: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [creditInfo, setCreditInfo] = useState<CreditInfo | null>(null);
  const [creditLoading, setCreditLoading] = useState(false);

  const supabase = createClient();

  // Fetch credit info from the API
  const fetchCredits = useCallback(async (accessToken: string) => {
    setCreditLoading(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const response = await fetch(`${apiUrl}/me/credits`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setCreditInfo({
          credits: data.credits,
          totalCreditsUsed: data.totalCreditsUsed,
          maxCredits: data.maxCredits,
        });
      } else {
        // User might not have a seat yet
        console.log('[Auth] No credits found, user may need onboarding');
        setCreditInfo(null);
      }
    } catch (error) {
      console.error('[Auth] Error fetching credits:', error);
      setCreditInfo(null);
    } finally {
      setCreditLoading(false);
    }
  }, []);

  // Refresh credits - can be called after enrichment
  const refreshCredits = useCallback(async () => {
    if (session?.access_token) {
      await fetchCredits(session.access_token);
    }
  }, [session?.access_token, fetchCredits]);

  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setSession(session);
        setUser(session?.user ?? null);
        
        // Fetch credits if logged in
        if (session?.access_token) {
          await fetchCredits(session.access_token);
        }
      } catch (error) {
        console.error('Error getting session:', error);
      } finally {
        setLoading(false);
      }
    };

    getInitialSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event: string, session: Session | null) => {
        console.log('[Auth] State change:', event);
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
        
        // Fetch credits on login, clear on logout
        if (session?.access_token) {
          await fetchCredits(session.access_token);
        } else {
          setCreditInfo(null);
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase.auth, fetchCredits]);

  const signIn = useCallback(async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      return { error };
    } catch (error) {
      return { error: error as Error };
    }
  }, [supabase.auth]);

  const signUp = useCallback(async (email: string, password: string) => {
    // Validate company email before attempting signup
    const emailError = getEmailValidationError(email);
    if (emailError) {
      return { error: new Error(emailError) };
    }

    if (!isCompanyEmail(email)) {
      return { error: new Error('Please use your company email address.') };
    }

    try {
      // Get the current origin for the redirect URL
      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${origin}/auth/callback`,
        },
      });
      return { error };
    } catch (error) {
      return { error: error as Error };
    }
  }, [supabase.auth]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setCreditInfo(null);
  }, [supabase.auth]);

  const value: AuthContextType = {
    user,
    session,
    loading,
    creditInfo,
    creditLoading,
    signIn,
    signUp,
    signOut,
    refreshCredits,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

