'use client';

import React from 'react';
import { Twitter, Github, Linkedin } from 'lucide-react';

export function FooterIridescent() {
  return (
    <footer className="py-12 border-t border-border-light bg-white">
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Left: Logo + Copyright */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <linearGradient id="footer-logo-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" style={{ stopColor: '#0ea5e9', stopOpacity: 1 }} />
                    <stop offset="50%" style={{ stopColor: '#8b5cf6', stopOpacity: 1 }} />
                    <stop offset="100%" style={{ stopColor: '#f59e0b', stopOpacity: 1 }} />
                  </linearGradient>
                </defs>
                <rect x="3" y="3" width="7" height="7" rx="1.5" fill="url(#footer-logo-gradient)" />
                <rect x="3" y="14" width="7" height="7" rx="1.5" fill="url(#footer-logo-gradient)" opacity="0.6" />
                <rect x="14" y="3" width="7" height="7" rx="1.5" fill="url(#footer-logo-gradient)" opacity="0.6" />
                <rect x="14" y="14" width="7" height="7" rx="1.5" fill="url(#footer-logo-gradient)" opacity="0.3" />
              </svg>
              <span className="text-xl font-black text-text-main">glaze</span>
            </div>
            <span className="text-text-muted text-sm">© 2025</span>
          </div>

          {/* Center: Links */}
          <nav className="flex items-center gap-8">
            <a href="/docs" className="text-sm text-text-muted hover:text-text-main transition-colors">Docs</a>
            <a href="/pricing" className="text-sm text-text-muted hover:text-text-main transition-colors">Pricing</a>
            <a href="/blog" className="text-sm text-text-muted hover:text-main transition-colors">Blog</a>
            <a href="https://github.com/glaze/glaze" className="text-sm text-text-muted hover:text-text-main transition-colors">GitHub</a>
          </nav>

          {/* Right: Social */}
          <div className="flex items-center gap-4">
            <a href="https://twitter.com/glaze" target="_blank" rel="noopener noreferrer" className="w-9 h-9 rounded-lg bg-surface-light border border-border-light flex items-center justify-center text-text-muted hover:text-text-main hover:border-slate-300 transition-all">
              <Twitter className="w-4 h-4" />
            </a>
            <a href="https://github.com/glaze" target="_blank" rel="noopener noreferrer" className="w-9 h-9 rounded-lg bg-surface-light border border-border-light flex items-center justify-center text-text-muted hover:text-text-main hover:border-slate-300 transition-all">
              <Github className="w-4 h-4" />
            </a>
            <a href="https://linkedin.com/company/glaze" target="_blank" rel="noopener noreferrer" className="w-9 h-9 rounded-lg bg-surface-light border border-border-light flex items-center justify-center text-text-muted hover:text-text-main hover:border-slate-300 transition-all">
              <Linkedin className="w-4 h-4" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
