'use client';

import { useEffect, useState } from 'react';
import { Coins, Sparkles } from 'lucide-react';
import { useAuth } from '@/providers/auth-context';

interface CreditsInfo {
  credits: number;
  totalCreditsUsed: number;
  maxCredits: number;
}

interface CreditsDisplayProps {
  className?: string;
  variant?: 'default' | 'compact' | 'expanded';
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

/**
 * Displays the user's remaining credits
 * Fetches from /me/credits API endpoint (requires authentication)
 */
export function CreditsDisplay({ className = '', variant = 'default' }: CreditsDisplayProps) {
  const { session } = useAuth();
  const [credits, setCredits] = useState<CreditsInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchCredits() {
      if (!session?.access_token) {
        setLoading(false);
        return;
      }

      try {
        const res = await fetch(`${API_BASE_URL}/me/credits`, {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
        });

        if (!res.ok) {
          if (res.status === 404) {
            // No seat yet - user hasn't completed onboarding
            setCredits(null);
          } else {
            throw new Error('Failed to fetch credits');
          }
        } else {
          const data = await res.json();
          setCredits(data);
        }
      } catch (err) {
        console.error('Error fetching credits:', err);
        setError('Unable to load credits');
      } finally {
        setLoading(false);
      }
    }

    fetchCredits();
  }, [session?.access_token]);

  if (loading) {
    return (
      <div className={`animate-pulse bg-slate-100 rounded-lg h-8 w-20 ${className}`} />
    );
  }

  if (error || !credits) {
    return null; // Silently fail
  }

  const { credits: remaining, maxCredits } = credits;
  const usedPercent = ((maxCredits - remaining) / maxCredits) * 100;
  const isLow = remaining <= 5;
  const isCritical = remaining <= 2;

  if (variant === 'compact') {
    return (
      <div className={`inline-flex items-center gap-1 text-xs font-medium ${
        isCritical ? 'text-red-600' : isLow ? 'text-amber-600' : 'text-slate-600'
      } ${className}`}>
        <Coins className="w-3 h-3" />
        <span>{remaining}</span>
      </div>
    );
  }

  if (variant === 'expanded') {
    return (
      <div className={`p-4 rounded-xl border ${
        isCritical ? 'bg-red-50 border-red-200' : isLow ? 'bg-amber-50 border-amber-200' : 'bg-slate-50 border-slate-200'
      } ${className}`}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Sparkles className={`w-4 h-4 ${
              isCritical ? 'text-red-500' : isLow ? 'text-amber-500' : 'text-purple-500'
            }`} />
            <span className="text-sm font-medium text-slate-700">Enrichment Credits</span>
          </div>
          <span className={`text-sm font-bold ${
            isCritical ? 'text-red-600' : isLow ? 'text-amber-600' : 'text-slate-900'
          }`}>
            {remaining} / {maxCredits}
          </span>
        </div>
        <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-300 ${
              isCritical ? 'bg-red-500' : isLow ? 'bg-amber-500' : 'bg-purple-500'
            }`}
            style={{ width: `${100 - usedPercent}%` }}
          />
        </div>
        {isCritical && (
          <p className="mt-2 text-xs text-red-600">Low credits! Contact support to get more.</p>
        )}
      </div>
    );
  }

  // Default variant
  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border ${
      isCritical ? 'bg-red-50 border-red-200' : isLow ? 'bg-amber-50 border-amber-200' : 'bg-slate-50 border-slate-200'
    } ${className}`}>
      <Coins className={`w-4 h-4 ${
        isCritical ? 'text-red-500' : isLow ? 'text-amber-500' : 'text-slate-500'
      }`} />
      <span className={`text-sm font-medium ${
        isCritical ? 'text-red-700' : isLow ? 'text-amber-700' : 'text-slate-700'
      }`}>
        {remaining} credits
      </span>
    </div>
  );
}
