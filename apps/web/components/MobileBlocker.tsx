'use client';

import { Monitor, Smartphone } from 'lucide-react';

/**
 * MobileBlocker - Displays a full-screen overlay on mobile devices
 * prompting users to switch to a desktop/laptop for the dashboard.
 * Only visible on screens smaller than 1024px (lg breakpoint).
 */
export function MobileBlocker() {
  return (
    <div className="fixed inset-0 z-[9999] bg-gradient-to-br from-white via-gray-50 to-blue-50 flex items-center justify-center p-6 lg:hidden">
      {/* Background decoration */}
      <div className="absolute top-0 left-0 w-72 h-72 bg-accent-blue/10 rounded-full filter blur-3xl -translate-x-1/2 -translate-y-1/2" />
      <div className="absolute bottom-0 right-0 w-72 h-72 bg-accent-purple/10 rounded-full filter blur-3xl translate-x-1/2 translate-y-1/2" />
      
      <div className="relative bg-white rounded-2xl shadow-2xl border border-gray-100 p-8 max-w-md w-full text-center">
        {/* Icon */}
        <div className="relative inline-flex mb-6">
          <div className="relative">
            <Monitor className="w-20 h-20 text-accent-blue" strokeWidth={1.5} />
            <div className="absolute -bottom-1 -right-1 bg-green-500 rounded-full p-1.5">
              <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            </div>
          </div>
          <div className="absolute -top-2 -left-2 opacity-30">
            <Smartphone className="w-8 h-8 text-gray-400" strokeWidth={1.5} />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-10 h-0.5 bg-red-400 rotate-45 rounded-full" />
            </div>
          </div>
        </div>

        {/* Title */}
        <h2 className="text-2xl font-bold text-gray-900 mb-3">
          Desktop Required
        </h2>

        {/* Description */}
        <p className="text-gray-600 mb-6 leading-relaxed">
          Glaze is designed for desktop and laptop screens. Please open this page on a larger screen for the best experience.
        </p>

        {/* Features hint */}
        <div className="bg-gray-50 rounded-xl p-4 mb-6">
          <p className="text-sm text-gray-500">
            Our spreadsheet interface requires a minimum screen width of <span className="font-semibold text-gray-700">1024px</span> for proper editing and data management.
          </p>
        </div>

        {/* Logo/Branding */}
        <div className="flex items-center justify-center gap-2 text-gray-400">
          <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-accent-blue to-accent-purple flex items-center justify-center">
            <span className="text-white text-xs font-bold">G</span>
          </div>
          <span className="text-sm font-medium">Glaze</span>
        </div>
      </div>
    </div>
  );
}
