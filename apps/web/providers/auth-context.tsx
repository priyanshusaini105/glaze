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
  seatError: string | null;
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
  const [seatError, setSeatError] = useState<string | null>(null);

  const supabase = createClient();

  // Fetch credit info from the API - Auto-creates seat if missing
  const fetchCredits = useCallback(async (accessToken: string, email?: string) => {
    setCreditLoading(true);
    setSeatError(null);
    
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      
      // 1. Try to get credits
      let response = await fetch(`${apiUrl}/me/credits`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      // 2. If 404 (No seat) and we have email, try to create seat
      if (response.status === 404 && email) {
        console.log('[Auth] No seat found, attempting to create one...');
        
        const createResponse = await fetch(`${apiUrl}/me/seat`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email })
        });
        
        if (!createResponse.ok) {
            const errorData = await createResponse.json();
            if (createResponse.status === 403) {
                // Seats full
                setSeatError(errorData.error || 'Alpha program is full');
            } else {
                console.error('[Auth] Failed to create seat:', errorData);
            }
            // Cannot proceed to get credits if seat creation failed
            setCreditInfo(null);
            return;
        }

        console.log('[Auth] Seat created successfully');
        
        // Retry fetching credits now that seat exists
        response = await fetch(`${apiUrl}/me/credits`, {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
            },
        });
      }

      if (response.ok) {
        const data = await response.json();
        setCreditInfo({
          credits: data.credits,
          totalCreditsUsed: data.totalCreditsUsed,
          maxCredits: data.maxCredits,
        });
      } else {
        // Still failed or other error
        if (response.status !== 404) {
             console.log('[Auth] Failed to fetch credits:', response.status);
        }
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
      await fetchCredits(session.access_token, session.user?.email);
    }
  }, [session?.access_token, session?.user?.email, fetchCredits]);

  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setSession(session);
        setUser(session?.user ?? null);
        
        // Fetch credits if logged in
        if (session?.access_token) {
          await fetchCredits(session.access_token, session.user?.email);
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
          await fetchCredits(session.access_token, session.user?.email);
        } else {
          setCreditInfo(null);
          setSeatError(null);
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
    setSeatError(null);
  }, [supabase.auth]);

  const value: AuthContextType = {
    user,
    session,
    loading,
    creditInfo,
    creditLoading,
    seatError,
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
