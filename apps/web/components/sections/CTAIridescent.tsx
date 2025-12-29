import React from 'react';
import { ArrowRight, Play } from 'lucide-react';

export function CTAIridescent() {
  return (
    <section className="relative py-20 md:py-32 bg-white overflow-hidden">
      {/* Gradient Blur Background */}
      <div 
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full blur-2xl filter opacity-100"
        style={{ 
          background: "linear-gradient(45deg, rgba(14, 165, 233, 0.1) 0%, rgba(139, 92, 246, 0.1) 50%, rgba(245, 158, 11, 0.1) 100%)" 
        }}
      />

      {/* Container */}
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center max-w-3xl mx-auto">
          {/* Headline */}
          <h2 className="text-4xl md:text-5xl font-black text-text-main mb-6 tracking-tight leading-tight">
            Stop waiting on spinners.
          </h2>

          {/* Description */}
          <p className="text-lg md:text-xl text-text-muted mb-10 leading-relaxed">
            Build with AI that shows its work. Get started with Glaze today.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            {/* Primary Button */}
            <button className="flex items-center justify-center gap-2 h-14 px-8 rounded-lg bg-text-main text-white font-bold text-lg transition-all active:scale-95 shadow-lg shadow-slate-300 hover:shadow-xl hover:bg-black hover:-translate-y-0.5">
              <span>View Demo</span>
            </button>

            {/* Secondary Button */}
            <button className="flex items-center justify-center gap-3 h-14 px-8 rounded-lg bg-white border border-border-light text-text-main font-bold text-lg hover:bg-surface-light hover:border-slate-300 transition-all active:scale-95 shadow-sm">
              <Play className="w-5 h-5 fill-text-main" />
              <span>Start Enrichment</span>
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
