'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase-auth';
import { Sparkles, CheckCircle2, XCircle, Loader2 } from 'lucide-react';

function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleCallback = async () => {
      const supabase = createClient();
      
      // Get the code from URL (Supabase sends this after email verification)
      const code = searchParams.get('code');
      const errorParam = searchParams.get('error');
      const errorDescription = searchParams.get('error_description');

      if (errorParam) {
        setStatus('error');
        setError(errorDescription || 'Authentication failed');
        return;
      }

      if (code) {
        try {
          // Exchange the code for a session
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          
          if (error) {
            setStatus('error');
            setError(error.message);
            return;
          }

          setStatus('success');
          
          // Redirect to tables page after a short delay
          setTimeout(() => {
            router.push('/tables');
          }, 2000);
        } catch (err) {
          setStatus('error');
          setError('Failed to verify email. Please try again.');
        }
      } else {
        // No code, might be a direct access or different flow
        // Check if user is already authenticated
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session) {
          setStatus('success');
          setTimeout(() => {
            router.push('/tables');
          }, 1500);
        } else {
          setStatus('error');
          setError('Invalid verification link. Please try signing up again.');
        }
      }
    };

    handleCallback();
  }, [router, searchParams]);

  return (
    <div className="bg-white rounded-2xl shadow-xl border border-slate-200/60 p-8 backdrop-blur-sm">
      {/* Logo */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-600 to-purple-700 shadow-lg shadow-purple-500/25 mb-4">
          <Sparkles className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900 mb-1">Glaze</h1>
        <p className="text-sm text-slate-500">The Agentic Spreadsheet</p>
      </div>

      {/* Status */}
      <div className="text-center">
        {status === 'loading' && (
          <div className="space-y-4">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-purple-100">
              <Loader2 className="w-7 h-7 text-purple-600 animate-spin" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Verifying your email...</h2>
              <p className="text-sm text-slate-500 mt-1">Please wait while we confirm your account</p>
            </div>
          </div>
        )}

        {status === 'success' && (
          <div className="space-y-4">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-green-100">
              <CheckCircle2 className="w-7 h-7 text-green-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Email verified!</h2>
              <p className="text-sm text-slate-500 mt-1">
                Welcome to Glaze. Redirecting you to your tables...
              </p>
            </div>
            <div className="flex items-center justify-center gap-1 text-purple-600">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm">Redirecting...</span>
            </div>
          </div>
        )}

        {status === 'error' && (
          <div className="space-y-4">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-red-100">
              <XCircle className="w-7 h-7 text-red-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Verification failed</h2>
              <p className="text-sm text-red-600 mt-1">{error}</p>
            </div>
            <div className="pt-2">
              <a
                href="/signup"
                className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-purple-600 hover:text-purple-700 hover:bg-purple-50 rounded-lg transition-colors"
              >
                Try signing up again
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Loading fallback - matches the loading state
function LoadingFallback() {
  return (
    <div className="bg-white rounded-2xl shadow-xl border border-slate-200/60 p-8 backdrop-blur-sm">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-600 to-purple-700 shadow-lg shadow-purple-500/25 mb-4">
          <Sparkles className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900 mb-1">Glaze</h1>
        <p className="text-sm text-slate-500">The Agentic Spreadsheet</p>
      </div>
      <div className="text-center">
        <div className="space-y-4">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-purple-100">
            <Loader2 className="w-7 h-7 text-purple-600 animate-spin" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Loading...</h2>
            <p className="text-sm text-slate-500 mt-1">Please wait</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-purple-50">
      <div className="w-full max-w-md px-4">
        <Suspense fallback={<LoadingFallback />}>
          <AuthCallbackContent />
        </Suspense>
      </div>
    </div>
  );
}
