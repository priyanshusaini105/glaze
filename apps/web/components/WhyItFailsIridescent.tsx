'use client';

import React from 'react';
import { Table2, Loader2, Lock } from 'lucide-react';

export function WhyItFailsIridescent() {
  return (
    <section className="py-20 md:py-32 bg-surface-light">
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-black text-text-main mb-4 tracking-tight">
            Why existing tools fail
          </h2>
          <p className="text-lg md:text-xl text-text-muted max-w-2xl mx-auto">
            Data shouldn't just sit there. It should work for you.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {/* Card 1 */}
          <div className="glass-card p-8 rounded-xl hover:-translate-y-1 transition-transform duration-300">
            <div className="w-12 h-12 rounded-lg bg-red-500/10 flex items-center justify-center mb-5">
              <Table2 className="w-6 h-6 text-red-500" />
            </div>
            <h3 className="text-xl font-bold text-text-main mb-3">Static Tables</h3>
            <p className="text-text-muted leading-relaxed">
              Importing CSVs, editing cells, re-exporting. The manual loop never ends. Your spreadsheet is a graveyard, not a tool.
            </p>
          </div>

          {/* Card 2 */}
          <div className="glass-card p-8 rounded-xl hover:-translate-y-1 transition-transform duration-300">
            <div className="w-12 h-12 rounded-lg bg-yellow-500/10 flex items-center justify-center mb-5">
              <Loader2 className="w-6 h-6 text-yellow-500 animate-spin" />
            </div>
            <h3 className="text-xl font-bold text-text-main mb-3">Spinner Fatigue</h3>
            <p className="text-text-muted leading-relaxed">
              Wait for job to finish. Download results. Upload again. Every enrichment is a black hole of time you'll never get back.
            </p>
          </div>

          {/* Card 3 */}
          <div className="glass-card p-8 rounded-xl hover:-translate-y-1 transition-transform duration-300">
            <div className="w-12 h-12 rounded-lg bg-purple-500/10 flex items-center justify-center mb-5">
              <Lock className="w-6 h-6 text-purple-500" />
            </div>
            <h3 className="text-xl font-bold text-text-main mb-3">Black Box AI</h3>
            <p className="text-text-muted leading-relaxed">
              "AI enrichment" locked in proprietary clouds. You don't see the prompts, you can't inspect the chain. Just trust the magic.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
