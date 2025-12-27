'use client';

import React from 'react';
import { Database, Brain, CheckCircle } from 'lucide-react';

export function HowItWorksSection() {
  return (
    <section className="w-full py-24 max-w-[1280px] mx-auto px-6 bg-white">
      <div className="text-center mb-16">
        <h2 className="text-3xl md:text-4xl font-bold text-text-main mb-4">
          Transparent workflows. Real-time results.
        </h2>
        <p className="text-text-muted">Glaze turns waiting into watching. See the AI think, row by row.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
        {/* Connecting Line */}
        <div className="hidden md:block absolute top-12 left-[16%] right-[16%] h-0.5 bg-gradient-to-r from-border-light via-blue-200 to-border-light z-0" />

        {/* Step 1 */}
        <div className="relative z-10 flex flex-col items-center text-center group">
          <div className="size-24 rounded-2xl bg-white border border-border-light flex items-center justify-center mb-6 shadow-xl shadow-gray-100 group-hover:-translate-y-2 transition-transform duration-300">
            <Database className="w-10 h-10 text-text-main" />
          </div>
          <div className="bg-blue-50 text-primary text-xs font-bold px-2 py-1 rounded mb-3 border border-blue-100">
            STEP 01
          </div>
          <h3 className="text-text-main font-bold text-lg">Input Data</h3>
          <p className="text-text-muted text-sm mt-2 max-w-xs">
            Paste domains, emails, or questions directly into the grid.
          </p>
        </div>

        {/* Step 2 */}
        <div className="relative z-10 flex flex-col items-center text-center group">
          <div className="size-24 rounded-2xl bg-white border border-border-light flex items-center justify-center mb-6 shadow-xl shadow-blue-50 group-hover:-translate-y-2 transition-transform duration-300 relative overflow-hidden">
            <div className="absolute inset-0 bg-blue-50/50 animate-pulse" />
            <Brain className="w-10 h-10 text-primary z-10 animate-pulse" />
          </div>
          <div className="bg-blue-50 text-primary text-xs font-bold px-2 py-1 rounded mb-3 border border-blue-100">
            STEP 02
          </div>
          <h3 className="text-text-main font-bold text-lg">Agents Run</h3>
          <p className="text-text-muted text-sm mt-2 max-w-xs">
            AI agents process each row concurrently, streaming their thoughts.
          </p>
        </div>

        {/* Step 3 */}
        <div className="relative z-10 flex flex-col items-center text-center group">
          <div className="size-24 rounded-2xl bg-white border border-border-light flex items-center justify-center mb-6 shadow-xl shadow-gray-100 group-hover:-translate-y-2 transition-transform duration-300">
            <CheckCircle className="w-10 h-10 text-emerald-500" />
          </div>
          <div className="bg-blue-50 text-primary text-xs font-bold px-2 py-1 rounded mb-3 border border-blue-100">
            STEP 03
          </div>
          <h3 className="text-text-main font-bold text-lg">Enriched & Ready</h3>
          <p className="text-text-muted text-sm mt-2 max-w-xs">
            Data is populated instantly. Export to CSV or sync via API.
          </p>
        </div>
      </div>
    </section>
  );
}
