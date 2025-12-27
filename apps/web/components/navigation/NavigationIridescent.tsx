'use client';

import React from 'react';
import Link from 'next/link';

export function NavigationIridescent() {
  return (
    <header className="sticky top-0 left-0 right-0 z-50 border-b border-border-light backdrop-blur-[6px] bg-white/80">
      <div className="max-w-[1280px] mx-auto px-8">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-2 group cursor-pointer">
            <div className="size-8 rounded-lg bg-surface-light border border-border-light flex items-center justify-center group-hover:border-accent-purple/50 transition-colors shadow-sm">
              <svg className="w-6 h-6" viewBox="0 0 24 24" fill="url(#iridescent)" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <linearGradient id="iridescent" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#0ea5e9" />
                    <stop offset="50%" stopColor="#8b5cf6" />
                    <stop offset="100%" stopColor="#f59e0b" />
                  </linearGradient>
                </defs>
                <rect x="3" y="3" width="18" height="18" rx="2"/>
                <path d="M9 3v18M15 3v18M3 9h18M3 15h18" stroke="white" strokeWidth="1.5"/>
              </svg>
            </div>
            <span className="text-text-main text-lg font-bold tracking-tight">Glaze</span>
          </Link>

          <nav className="hidden md:flex items-center gap-8">
            <Link href="#features" className="text-sm font-medium text-text-muted hover:text-primary transition-colors">
              Features
            </Link>
            <Link href="#how-it-works" className="text-sm font-medium text-text-muted hover:text-primary transition-colors">
              How it Works
            </Link>
            <Link href="#open-source" className="text-sm font-medium text-text-muted hover:text-primary transition-colors">
              Open Source
            </Link>
          </nav>

          <div className="flex items-center gap-3">
            <Link
              href="https://github.com/priyanshusaini105/glaze"
              className="hidden sm:flex items-center gap-2 text-sm font-medium text-text-muted hover:text-text-main transition-colors"
            >
              <span className="truncate">GitHub</span>
            </Link>
            <button className="bg-text-main hover:bg-black text-white text-sm font-bold px-4 py-2 rounded-lg transition-all active:scale-95 shadow-[0px_4px_6px_-1px_#e2e8f0,0px_2px_4px_-2px_#e2e8f0]">
              View Demo
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
