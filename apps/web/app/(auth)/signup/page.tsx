'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/providers/auth-context';
import { getEmailValidationError } from '@/lib/email-validation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SeatCounter } from '@/components/seat-counter';
import { Loader2, Mail, Lock, Sparkles, AlertCircle, CheckCircle2, Users, Clock } from 'lucide-react';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export default function SignupPage() {
  const router = useRouter();
  const { signUp } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  
  // Seat availability state
  const [seatsAvailable, setSeatsAvailable] = useState<boolean | null>(null);
  const [availableSeats, setAvailableSeats] = useState<number>(0);
  const [seatCheckLoading, setSeatCheckLoading] = useState(true);
  const [waitlistSubmitted, setWaitlistSubmitted] = useState(false);
  const [waitlistEmail, setWaitlistEmail] = useState('');

  // Check seat availability on mount
  useEffect(() => {
    async function checkSeats() {
      try {
        const res = await fetch(`${API_BASE_URL}/seats/status`);
        if (res.ok) {
          const data = await res.json();
          setSeatsAvailable(data.isAvailable);
          setAvailableSeats(data.availableSeats);
        }
      } catch (err) {
        console.error('Error checking seat availability:', err);
        // Assume seats available on error to not block signup
        setSeatsAvailable(true);
      } finally {
        setSeatCheckLoading(false);
      }
    }
    checkSeats();
  }, []);

  // Real-time email validation
  useEffect(() => {
    if (email) {
      const validationError = getEmailValidationError(email);
      setEmailError(validationError);
    } else {
      setEmailError(null);
    }
  }, [email]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Validate passwords match
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    // Validate password strength
    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      setLoading(false);
      return;
    }

    // Check email validation
    if (emailError) {
      setError(emailError);
      setLoading(false);
      return;
    }

    const { error } = await signUp(email, password);
    
    if (error) {
      setError(error.message || 'Failed to create account');
      setLoading(false);
    } else {
      setSuccess(true);
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200/60 p-8 backdrop-blur-sm">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-green-100 mb-4">
            <CheckCircle2 className="w-7 h-7 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Check your email</h1>
          <p className="text-slate-500 text-sm mb-6">
            We&apos;ve sent a confirmation link to <span className="font-medium text-slate-700">{email}</span>
          </p>
          <Link href="/login">
            <Button
              variant="outline"
              className="w-full h-11 border-slate-200 hover:bg-slate-50 transition-colors"
            >
              Back to login
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  // Waitlist submitted confirmation
  if (waitlistSubmitted) {
    return (
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200/60 p-8 backdrop-blur-sm">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-purple-100 mb-4">
            <Clock className="w-7 h-7 text-purple-600" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">You&apos;re on the list!</h1>
          <p className="text-slate-500 text-sm mb-6">
            We&apos;ll notify <span className="font-medium text-slate-700">{waitlistEmail}</span> when a seat becomes available.
          </p>
          <Link href="/">
            <Button
              variant="outline"
              className="w-full h-11 border-slate-200 hover:bg-slate-50 transition-colors"
            >
              Back to home
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  // Show waitlist form when seats are full
  if (!seatCheckLoading && seatsAvailable === false) {
    const handleWaitlistSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      // For MVP, just show success - can add API call later
      setWaitlistSubmitted(true);
    };

    return (
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200/60 p-8 backdrop-blur-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 shadow-lg shadow-orange-500/25 mb-4">
            <Users className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Alpha program is full</h1>
          <p className="text-slate-500 text-sm">All 10 seats have been claimed. Join the waitlist to be notified when a spot opens.</p>
        </div>

        <form onSubmit={handleWaitlistSubmit} className="space-y-5">
          <div className="space-y-2">
            <label htmlFor="waitlistEmail" className="block text-sm font-medium text-slate-700">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                id="waitlistEmail"
                type="email"
                placeholder="you@company.com"
                value={waitlistEmail}
                onChange={(e) => setWaitlistEmail(e.target.value)}
                className="pl-10 h-11 bg-slate-50 border-slate-200 focus:bg-white focus:border-purple-500 focus:ring-purple-500/20 transition-colors"
                required
              />
            </div>
          </div>

          <Button
            type="submit"
            className="w-full h-11 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-medium rounded-lg shadow-md shadow-orange-500/20 transition-all"
          >
            Join Waitlist
          </Button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-slate-500">
            Already on the list?{' '}
            <Link href="/login" className="text-purple-600 hover:text-purple-700 font-medium transition-colors">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    );
  }

  // Loading state while checking seats
  if (seatCheckLoading) {
    return (
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200/60 p-8 backdrop-blur-sm">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-purple-600" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-xl border border-slate-200/60 p-8 backdrop-blur-sm">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-600 to-purple-700 shadow-lg shadow-purple-500/25 mb-4">
          <Sparkles className="w-7 h-7 text-white" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Create your account</h1>
        <p className="text-slate-500 text-sm">Start enriching your data with Glaze</p>
      </div>

      {/* Company Email Notice */}
      <div className="mb-6 p-3 rounded-lg bg-purple-50 border border-purple-200 text-purple-700 text-sm flex items-start gap-2">
        <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
        <span>Only company email addresses are allowed. Personal and temporary emails are not accepted.</span>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Email */}
        <div className="space-y-2">
          <label htmlFor="email" className="block text-sm font-medium text-slate-700">
            Company Email
          </label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              id="email"
              type="email"
              placeholder="you@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={`pl-10 h-11 bg-slate-50 border-slate-200 focus:bg-white transition-colors ${
                emailError && email ? 'border-red-400 focus:border-red-500 focus:ring-red-500/20' : 'focus:border-purple-500 focus:ring-purple-500/20'
              }`}
              required
              disabled={loading}
            />
          </div>
          {emailError && email && (
            <p className="text-sm text-red-600 flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5" />
              {emailError}
            </p>
          )}
        </div>

        {/* Password */}
        <div className="space-y-2">
          <label htmlFor="password" className="block text-sm font-medium text-slate-700">
            Password
          </label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              id="password"
              type="password"
              placeholder="Minimum 8 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="pl-10 h-11 bg-slate-50 border-slate-200 focus:bg-white focus:border-purple-500 focus:ring-purple-500/20 transition-colors"
              required
              disabled={loading}
              minLength={8}
            />
          </div>
        </div>

        {/* Confirm Password */}
        <div className="space-y-2">
          <label htmlFor="confirmPassword" className="block text-sm font-medium text-slate-700">
            Confirm Password
          </label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              id="confirmPassword"
              type="password"
              placeholder="Confirm your password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className={`pl-10 h-11 bg-slate-50 border-slate-200 focus:bg-white transition-colors ${
                confirmPassword && password !== confirmPassword
                  ? 'border-red-400 focus:border-red-500 focus:ring-red-500/20'
                  : 'focus:border-purple-500 focus:ring-purple-500/20'
              }`}
              required
              disabled={loading}
            />
          </div>
          {confirmPassword && password !== confirmPassword && (
            <p className="text-sm text-red-600 flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5" />
              Passwords do not match
            </p>
          )}
        </div>

        {/* Error Message */}
        {error && (
          <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm flex items-start gap-2">
            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            {error}
          </div>
        )}

        {/* Submit Button */}
        <Button
          type="submit"
          disabled={loading || !!emailError}
          className="w-full h-11 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white font-medium rounded-lg shadow-md shadow-purple-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Creating account...
            </>
          ) : (
            'Create account'
          )}
        </Button>
      </form>

      {/* Footer */}
      <div className="mt-6 text-center">
        <p className="text-sm text-slate-500">
          Already have an account?{' '}
          <Link href="/login" className="text-purple-600 hover:text-purple-700 font-medium transition-colors">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
