'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Mail, Lock, Sparkles } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [warning, setWarning] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setWarning('Login is temporarily disabled while the server is under maintenance.');
  };

  return (
    <div className="bg-white rounded-2xl shadow-xl border border-slate-200/60 p-8 backdrop-blur-sm">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-600 to-purple-700 shadow-lg shadow-purple-500/25 mb-4">
          <Sparkles className="w-7 h-7 text-white" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Welcome back</h1>
        <p className="text-slate-500 text-sm">Sign in to your Glaze account</p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Email */}
        <div className="space-y-2">
          <label htmlFor="email" className="block text-sm font-medium text-slate-700">
            Email
          </label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              id="email"
              type="email"
              placeholder="you@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="pl-10 h-11 bg-slate-50 border-slate-200 focus:bg-white focus:border-purple-500 focus:ring-purple-500/20 transition-colors"
              required
              disabled={loading}
            />
          </div>
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
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="pl-10 h-11 bg-slate-50 border-slate-200 focus:bg-white focus:border-purple-500 focus:ring-purple-500/20 transition-colors"
              required
              disabled={loading}
            />
          </div>
        </div>

        <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-sm">
          Server is under maintenance. Login is temporarily unavailable.
        </div>

        {/* Warning Message */}
        {warning && (
          <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-sm">
            {warning}
          </div>
        )}

        {/* Submit Button */}
        <Button
          type="submit"
          aria-disabled="true"
          className="w-full h-11 bg-slate-400 text-white font-medium rounded-lg shadow-md cursor-not-allowed"
        >
          Sign in
        </Button>
      </form>

      {/* Footer */}
      <div className="mt-6 text-center">
        <p className="text-sm text-slate-500">
          Don&apos;t have an account?{' '}
          <Link href="/signup" className="text-purple-600 hover:text-purple-700 font-medium transition-colors">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
