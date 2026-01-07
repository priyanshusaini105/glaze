import React from 'react';
import Link from 'next/link';
import { ArrowLeft, Clock, Sparkles } from 'lucide-react';

export default function ComingSoon() {
  return (
    <main className="min-h-screen relative overflow-visible selection:bg-accent-blue/20 selection:text-accent-blue bg-white text-text-main antialiased">
      {/* Animated blob backgrounds */}
      <div className="absolute top-0 -left-20 w-96 h-96 bg-accent-blue/20 rounded-full mix-blend-multiply filter blur-2xl opacity-70 animate-blob" />
      <div className="absolute top-0 -right-20 w-96 h-96 bg-accent-purple/20 rounded-full mix-blend-multiply filter blur-2xl opacity-70 animate-blob" style={{ animationDelay: '2s' }} />
      <div className="absolute -bottom-32 left-20 w-96 h-96 bg-accent-gold/20 rounded-full mix-blend-multiply filter blur-2xl opacity-70 animate-blob" style={{ animationDelay: '4s' }} />

      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Navigation */} 
        <header className="sticky top-0 left-0 right-0 z-50 border-b border-border-light backdrop-blur-[6px] bg-white/80">
          <div className="max-w-[1280px] mx-auto px-8">
            <div className="flex items-center justify-between h-16">
              <Link href="/" className="flex items-center gap-1 group cursor-pointer">
                <img
                  src="/img/glaze-abs3.png"
                  alt="Glaze Logo"
                  className="rounded-lg group-hover:scale-105 transition-transform w-12"
                />
                <img
                  src="/img/glaze-text.png"
                  alt="Glaze Logo"
                  className="rounded-lg group-hover:scale-105 transition-transform h-8 w-auto"
                />
              </Link>

              <Link
                href="/"
                className="flex items-center gap-2 text-sm font-medium text-text-muted hover:text-primary transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back to Home</span>
              </Link>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <div className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mx-auto text-center">
            {/* Icon */}
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-surface-light border border-border-light mb-8">
              <Clock className="w-10 h-10 text-accent-blue" />
            </div>

            {/* Title */}
            <h1 className="text-5xl md:text-6xl font-black text-text-main mb-6 tracking-tight leading-tight">
              Coming <span className="text-iridescent">Soon</span>
            </h1>

            {/* Description */}
            <p className="text-lg md:text-xl text-text-muted mb-12 leading-relaxed max-w-xl mx-auto">
              We're working hard to bring you something amazing. This feature is currently under development and will be available soon.
            </p>

            {/* Features Preview */}
            <div className="glass-card rounded-xl p-8 mb-12 max-w-lg mx-auto">
              <div className="flex items-center justify-center gap-2 mb-6">
                <Sparkles className="w-5 h-5 text-accent-gold" />
                <span className="text-sm font-medium text-text-muted">What to expect</span>
              </div>
              <ul className="space-y-3 text-left">
                <li className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-accent-blue flex-shrink-0" />
                  <span className="text-text-main">Full open source codebase</span>
                </li>
                <li className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-accent-purple flex-shrink-0" />
                  <span className="text-text-main">Community contributions</span>
                </li>
                <li className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-accent-gold flex-shrink-0" />
                  <span className="text-text-main">Self-hosting capabilities</span>
                </li>
                <li className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-accent-green flex-shrink-0" />
                  <span className="text-text-main">Extensive documentation</span>
                </li>
              </ul>
            </div>

            {/* CTA */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/"
                className="inline-flex items-center justify-center gap-2 h-12 px-8 rounded-lg bg-text-main text-white font-bold text-base transition-all active:scale-95 shadow-lg shadow-slate-300 hover:shadow-xl hover:bg-black hover:-translate-y-0.5"
              >
                <span>Back to Home</span>
                <ArrowLeft className="w-5 h-5" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}