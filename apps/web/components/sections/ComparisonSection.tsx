'use client';

import React from 'react';
import { Check, X, Minus } from 'lucide-react';

export function ComparisonSection() {
  return (
    <section className="py-24 bg-gray-50 dark:bg-zinc-900/50">
      <div className="max-w-5xl mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold text-black dark:text-white mb-4">
            Why Glaze over Clay for CRM Enrichment?
          </h2>
          <p className="text-gray-500 dark:text-gray-400">
            Built for teams who need reliable data, not just signals.
          </p>
        </div>

        <div className="bg-white dark:bg-black rounded-2xl shadow-sm border border-gray-200 dark:border-zinc-800 overflow-hidden">
          <div className="grid grid-cols-3 border-b border-gray-200 dark:border-zinc-800">
            <div className="p-6 border-r border-gray-200 dark:border-zinc-800 bg-gray-50/50 dark:bg-zinc-900/50"></div>
            <div className="p-6 border-r border-gray-200 dark:border-zinc-800 text-center">
              <div className="font-bold text-xl text-gray-400">Clay</div>
            </div>
            <div className="p-6 text-center bg-blue-50/30 dark:bg-blue-900/10">
              <div className="font-bold text-xl text-black dark:text-white flex items-center justify-center gap-2">
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-cyan-500 to-violet-500" />
                Glaze
              </div>
            </div>
          </div>

          {rows.map((row, i) => (
            <div key={i} className="grid grid-cols-3 border-b border-gray-100 dark:border-zinc-800 last:border-0 hover:bg-gray-50/50 dark:hover:bg-zinc-900/50 transition-colors">
              <div className="p-6 border-r border-gray-100 dark:border-zinc-800 font-medium text-gray-700 dark:text-gray-300 flex items-center">
                {row.feature}
              </div>
              <div className="p-6 border-r border-gray-100 dark:border-zinc-800 text-center text-gray-500 flex items-center justify-center">
                {row.clay}
              </div>
              <div className="p-6 text-center font-medium text-black dark:text-white bg-blue-50/10 dark:bg-blue-900/5 flex items-center justify-center">
                {row.glaze}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

const rows = [
  {
    feature: "Primary Focus",
    clay: "Signal-based GTM plays",
    glaze: <span className="flex items-center gap-2"><Check className="w-4 h-4 text-green-500" /> CRM & GTM data enrichment</span>
  },
  {
    feature: "CRM Integration",
    clay: "Plans over $800/month",
    glaze: <span className="flex items-center gap-2"><Check className="w-4 h-4 text-green-500" /> Included for all users</span>
  },
  {
    feature: "Learning Curve",
    clay: "Steep / Agency required",
    glaze: <span className="flex items-center gap-2"><Check className="w-4 h-4 text-green-500" /> Simple natural language</span>
  },
  {
    feature: "Pricing Model",
    clay: "Complex credits",
    glaze: <span className="flex items-center gap-2"><Check className="w-4 h-4 text-green-500" /> Pay for results, not inputs</span>
  }
];
