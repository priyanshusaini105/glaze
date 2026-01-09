import React from 'react';
import Link from 'next/link';
import { ArrowRight, Code2 } from 'lucide-react';
import { TableDemo } from './TableDemo';
import { SeatCounter } from '../seat-counter';

export function HeroIridescent() {
  return (
    <section className="pt-20 pb-16 md:pt-32 md:pb-24 ">
      <div className="relative">
        {/* Animated blob backgrounds - More visible as per Figma */}
        <div className="absolute top-0 -left-20 w-96 h-96 bg-accent-blue/20 rounded-full mix-blend-multiply filter blur-2xl opacity-70 animate-blob" />
        <div className="absolute top-0 -right-20 w-96 h-96 bg-accent-purple/20 rounded-full mix-blend-multiply filter blur-2xl opacity-70 animate-blob" style={{ animationDelay: '2s' }} />
        <div className="absolute -bottom-32 left-20 w-96 h-96 bg-accent-gold/20 rounded-full mix-blend-multiply filter blur-2xl opacity-70 animate-blob" style={{ animationDelay: '4s' }} />

        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 flex flex-col items-center text-center z-10">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-surface-light border border-border-light mb-4 shadow-sm">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent-blue opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-accent-blue" />
          </span>
          <span className="text-xs font-medium text-text-muted">v0.1 Beta is now live</span>
        </div>

        {/* Seat Counter */}
        <SeatCounter variant="hero" className="mb-6" />

        {/* Headline */}
        <h1 className="text-5xl md:text-7xl lg:text-8xl font-semibold tracking-tight text-text-main mb-6 max-w-5xl leading-[1.05]">
          The agentic spreadsheet <br className="hidden md:block" /> that feels <span className="text-iridescent">alive</span>.
        </h1>

        {/* Subheadline */}
        <p className="text-lg md:text-xl text-text-muted max-w-3xl mb-10 leading-relaxed">
          AI agents work directly inside your grid, that enriches your data with transparent, streaming AI workflows. Stop waiting for spinners.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 mb-20">
          <Link href="/signup" className="flex items-center justify-center gap-2 h-12 px-8 rounded-lg bg-text-main text-white font-bold text-base transition-all active:scale-95 shadow-lg shadow-slate-300 hover:shadow-xl hover:bg-black hover:-translate-y-0.5">
            <span>Start Enrichment</span>
            <ArrowRight className="w-5 h-5" />
          </Link>
          <Link href="/coming-soon" className="flex items-center justify-center gap-2 h-12 px-8 rounded-lg bg-white border border-border-light text-text-main font-bold text-base hover:bg-surface-light hover:border-slate-300 transition-all active:scale-95 shadow-sm">
            <Code2 className="w-5 h-5" />
            <span>Open Source</span>
          </Link>
        </div>

        <TableDemo />
      </div>

      </div>
    </section>
  );
}
