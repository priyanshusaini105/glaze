'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Menu, X } from 'lucide-react';

export function Navigation() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 glass-panel">
      <div className="max-w-[1280px] mx-auto px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-3">
          <Image 
            src="/img/glaze-abs.png" 
            alt="Glaze Logo" 
            width={32} 
            height={32}
            className="rounded"
          />
          <h2 className="text-text-main text-xl font-bold tracking-tight">Glaze</h2>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-8">
          <Link href="#features" className="text-text-muted hover:text-primary text-sm font-medium transition-colors">
            Features
          </Link>
          <Link href="#how-it-works" className="text-text-muted hover:text-primary text-sm font-medium transition-colors">
            How it Works
          </Link>
          <Link href="#open-source" className="text-text-muted hover:text-primary text-sm font-medium transition-colors">
            Open Source
          </Link>
          <Link href="#docs" className="text-text-muted hover:text-primary text-sm font-medium transition-colors">
            Docs
          </Link>
        </nav>

        {/* CTA Buttons */}
        <div className="flex gap-3 items-center">
          <Link
            href="https://github.com/priyanshusaini105/glaze"
            className="hidden sm:flex h-9 items-center justify-center rounded-lg px-4 bg-white border border-border-light text-text-main text-sm font-bold hover:bg-surface-hover transition-colors shadow-sm"
          >
            <span className="mr-2">GitHub</span>
            <span className="text-text-muted font-normal">2.4k</span>
          </Link>
          <button className="h-9 flex items-center justify-center rounded-lg px-4 bg-primary text-white text-sm font-bold hover:bg-primary-dark transition-colors shadow-lg shadow-primary/30">
            View Demo
          </button>

          {/* Mobile Menu Toggle */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="md:hidden p-2 text-text-main"
            aria-label="Toggle menu"
          >
            {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {isOpen && (
        <div className="md:hidden absolute top-16 left-0 right-0 bg-white/95 backdrop-blur-xl border-t border-border-light shadow-xl">
          <nav className="flex flex-col p-4 gap-2 max-w-[1280px] mx-auto">
            <Link
              href="#features"
              className="p-3 text-text-main hover:bg-surface-subtle rounded-lg transition-colors"
              onClick={() => setIsOpen(false)}
            >
              Features
            </Link>
            <Link
              href="#how-it-works"
              className="p-3 text-text-main hover:bg-surface-subtle rounded-lg transition-colors"
              onClick={() => setIsOpen(false)}
            >
              How it Works
            </Link>
            <Link
              href="#open-source"
              className="p-3 text-text-main hover:bg-surface-subtle rounded-lg transition-colors"
              onClick={() => setIsOpen(false)}
            >
              Open Source
            </Link>
            <Link
              href="#docs"
              className="p-3 text-text-main hover:bg-surface-subtle rounded-lg transition-colors"
              onClick={() => setIsOpen(false)}
            >
              Docs
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}
