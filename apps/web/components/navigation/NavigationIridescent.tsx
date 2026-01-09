'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';

export function NavigationIridescent() {
  const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    if (href.startsWith('#')) {
      e.preventDefault();
      const id = href.substring(1);
      const element = document.getElementById(id);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  return (
    <header className="sticky top-0 left-0 right-0 z-50 border-b border-border-light backdrop-blur-[6px] bg-white/80">
      <div className="max-w-[1280px] mx-auto px-8">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-1 group cursor-pointer">
            <Image 
              src="/img/glaze-abs3.png" 
              alt="Glaze Logo" 
              width={80} 
              height={80}
              className="rounded-lg group-hover:scale-105 transition-transform w-12"
            />
             <Image 
              src="/img/glaze-text.png" 
              alt="Glaze Logo" 
              width={196} 
              height={96}
              className="rounded-lg group-hover:scale-105 transition-transform h-8 w-auto"
            />
            {/* <span className="text-text-main text-lg font-bold tracking-tight">Glaze</span> */}
          </Link>

          <nav className="hidden md:flex items-center gap-8">
            <Link href="#features" onClick={(e) => handleNavClick(e, '#features')} className="text-sm font-medium text-text-muted hover:text-primary transition-colors cursor-pointer">
              Features
            </Link>
            <Link href="#how-it-works" onClick={(e) => handleNavClick(e, '#how-it-works')} className="text-sm font-medium text-text-muted hover:text-primary transition-colors cursor-pointer">
              How it Works
            </Link>
            <Link href="#open-source" onClick={(e) => handleNavClick(e, '#open-source')} className="text-sm font-medium text-text-muted hover:text-primary transition-colors cursor-pointer">
              Open Source
            </Link>
          </nav>

          <div className="flex items-center gap-3">
            <Link
              href="/coming-soon"
              className="hidden sm:flex items-center gap-2 text-sm font-medium text-text-muted hover:text-text-main transition-colors"
            >
              <span className="truncate">GitHub</span>
            </Link>
            <Link
              href="/login"
              className="bg-text-main hover:bg-black text-white text-sm font-bold px-4 py-2 rounded-lg transition-all active:scale-95 shadow-[0px_4px_6px_-1px_#e2e8f0,0px_2px_4px_-2px_#e2e8f0]"
            >
              View Demo
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
