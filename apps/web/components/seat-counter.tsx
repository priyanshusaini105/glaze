'use client';

import { useEffect, useState } from 'react';
import { Users } from 'lucide-react';

interface SeatStatus {
  totalSeats: number;
  usedSeats: number;
  availableSeats: number;
  isAvailable: boolean;
  creditsPerSeat: number;
}

interface SeatCounterProps {
  className?: string;
  variant?: 'default' | 'compact' | 'hero';
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

/**
 * Displays the number of seats available in the alpha program
 * Fetches from the public /seats/status API endpoint
 */
export function SeatCounter({ className = '', variant = 'default' }: SeatCounterProps) {
  const [status, setStatus] = useState<SeatStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchSeatStatus() {
      try {
        const res = await fetch(`${API_BASE_URL}/seats/status`);
        if (!res.ok) throw new Error('Failed to fetch seat status');
        const data = await res.json();
        setStatus(data);
      } catch (err) {
        console.error('Error fetching seat status:', err);
        setError('Unable to load seat info');
      } finally {
        setLoading(false);
      }
    }

    fetchSeatStatus();
  }, []);

  if (loading) {
    return (
      <div className={`animate-pulse bg-slate-100 rounded-full h-6 w-24 ${className}`} />
    );
  }

  if (error || !status) {
    return null; // Silently fail - don't break the UI
  }

  const { availableSeats, totalSeats, isAvailable } = status;
  const urgentThreshold = 3;

  if (variant === 'compact') {
    return (
      <div className={`inline-flex items-center gap-1 text-xs font-medium ${className}`}>
        <Users className="w-3 h-3" />
        <span>{availableSeats}/{totalSeats}</span>
      </div>
    );
  }

  if (variant === 'hero') {
    return (
      <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full border ${
        !isAvailable 
          ? 'bg-red-50 border-red-200 text-red-700'
          : availableSeats <= urgentThreshold
          ? 'bg-amber-50 border-amber-200 text-amber-700'
          : 'bg-green-50 border-green-200 text-green-700'
      } ${className}`}>
        <Users className="w-4 h-4" />
        <span className="font-semibold">
          {!isAvailable 
            ? 'Alpha is full!'
            : `${availableSeats} of ${totalSeats} seats left`
          }
        </span>
        {availableSeats <= urgentThreshold && isAvailable && (
          <span className="text-xs">— Join now!</span>
        )}
      </div>
    );
  }

  // Default variant
  return (
    <div className={`inline-flex items-center gap-2 text-sm text-text-muted ${className}`}>
      <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full ${
        !isAvailable 
          ? 'bg-red-100 text-red-700'
          : availableSeats <= urgentThreshold
          ? 'bg-amber-100 text-amber-700'
          : 'bg-slate-100 text-slate-700'
      }`}>
        <Users className="w-3.5 h-3.5" />
        <span className="font-medium">{availableSeats} seats left</span>
      </div>
    </div>
  );
}
