'use client';

import React from 'react';
import { Star } from 'lucide-react';
import Link from 'next/link';

export function OpenSourceSection() {
  return (
    <section className="w-full py-24 px-6 max-w-[960px] mx-auto" id="open-source">
      <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden shadow-2xl">
        {/* Terminal Header */}
        <div className="bg-slate-950 px-4 py-3 border-b border-slate-800 flex items-center gap-2">
          <div className="flex gap-1.5 mr-4">
            <div className="size-3 rounded-full bg-red-500/20 border border-red-500/50" />
            <div className="size-3 rounded-full bg-yellow-500/20 border border-yellow-500/50" />
            <div className="size-3 rounded-full bg-green-500/20 border border-green-500/50" />
          </div>
          <div className="text-xs text-slate-500 font-mono">bash — 80x24</div>
        </div>

        {/* Content */}
        <div className="p-8 md:p-12 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="flex-1">
            <h2 className="text-3xl font-bold text-white mb-4">Open Source & Transparent</h2>
            <p className="text-slate-400 mb-6">
              Glaze is built on a modern stack with TypeScript and Next.js. Self-host it, modify the agents, or contribute back to the community.
            </p>
            <div className="font-mono bg-slate-950 p-4 rounded-lg border border-slate-800 text-sm text-slate-300 inline-block">
              <span className="text-green-400">$</span> git clone https://github.com/priyanshusaini105/glaze
            </div>
          </div>
          <div>
            <Link
              href="https://github.com/priyanshusaini105/glaze"
              className="h-14 px-8 rounded-lg bg-white text-black text-base font-bold hover:bg-gray-100 transition-all flex items-center gap-3"
            >
              <Star className="w-5 h-5" />
              Star on GitHub
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
