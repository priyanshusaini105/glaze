'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';

export function NavigationIridescent() {
  return (
    <header className="sticky top-0 left-0 right-0 z-50 border-b border-border-light backdrop-blur-[6px] bg-white/80">
      <div className="max-w-[1280px] mx-auto px-8">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-1 group cursor-pointer">
            <Image 
              src="/img/glaze-abs.png" 
              alt="Glaze Logo" 
              width={40} 
              height={40}
              className="rounded-lg group-hover:scale-105 transition-transform"
            />
             <Image 
              src="/img/glaze-text.png" 
              alt="Glaze Logo" 
              width={96} 
              height={96}
              className="rounded-lg group-hover:scale-105 transition-transform"
            />
            {/* <span className="text-text-main text-lg font-bold tracking-tight">Glaze</span> */}
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
