import React from 'react';
import { Workflow } from 'lucide-react';

export function FeaturesSection() {
  return (
    <section className="w-full bg-surface-subtle py-24 border-y border-border-light" id="features">
      <div className="max-w-[1280px] mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-3 grid-rows-2 gap-4 h-auto md:h-[600px]">
          {/* Large Card: Streaming AI Output */}
          <div className="md:col-span-2 row-span-2 bg-white rounded-2xl border border-border-light p-8 flex flex-col overflow-hidden group shadow-sm hover:shadow-md transition-shadow">
            <div className="mb-auto">
              <div className="size-10 rounded-lg bg-blue-50 text-primary flex items-center justify-center mb-4">
                <Workflow className="w-6 h-6" />
              </div>
              <h3 className="text-2xl font-bold text-text-main mb-2">Streaming AI Output</h3>
              <p className="text-text-muted max-w-md">
                Don&apos;t wait for the whole batch. Glaze streams tokens as they are generated, so you can verify quality immediately.
              </p>
            </div>
            <div className="mt-8 bg-slate-50 rounded-lg border border-border-light p-4 font-mono text-sm text-slate-600 h-64 overflow-hidden relative shadow-inner">
              <div className="absolute top-0 left-0 w-full h-1 bg-primary/50" />
              <div className="flex gap-2 mb-2 text-xs text-slate-400">
                <span>agent-1: thinking...</span>
              </div>
              <div className="typewriter text-slate-800">
                &gt; Analyzing company structure...<br />
                &gt; Found 3 key decision makers.<br />
                &gt; Drafting personalized outreach...<br />
                &gt;{' '}
                <span className="bg-blue-100 text-slate-900 px-1">
                  Hi Sarah, noticed your recent Series B...
                </span>
                <span className="animate-pulse border-l-2 border-primary ml-1 h-4 align-middle" />
              </div>
            </div>
          </div>

          {/* Small Card: Keyboard First */}
          <div className="bg-white rounded-2xl border border-border-light p-6 flex flex-col justify-between group hover:border-primary/40 transition-colors shadow-sm hover:shadow-md">
            <div>
              <h3 className="text-xl font-bold text-text-main mb-2">Keyboard First</h3>
              <p className="text-text-muted text-sm">
                Built for speed. Navigate, edit, and run agents without touching your mouse.
              </p>
            </div>
            <div className="mt-4 flex items-center justify-center">
              <div className="bg-white rounded px-3 py-1.5 text-slate-700 font-mono text-sm border border-gray-200 shadow-[0_4px_0_0_rgba(226,232,240,1)] active:shadow-none active:translate-y-[4px] transition-all">
                ⌘ K
              </div>
            </div>
          </div>

          {/* Small Card: Massive Concurrency */}
          <div className="bg-white rounded-2xl border border-border-light p-6 flex flex-col justify-between group hover:border-emerald-400/50 transition-colors shadow-sm hover:shadow-md">
            <div>
              <h3 className="text-xl font-bold text-text-main mb-2">Massive Concurrency</h3>
              <p className="text-text-muted text-sm">
                Run hundreds of agents in parallel. Visualized queues keep you in control.
              </p>
            </div>
            <div className="mt-4 space-y-2">
              <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden border border-gray-100">
                <div className="h-full bg-emerald-500 w-[85%] rounded-full shadow-[0_0_10px_rgba(16,185,129,0.4)]" />
              </div>
              <div className="flex justify-between text-xs font-mono text-text-muted">
                <span>850/1000 processed</span>
                <span>150 pending</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
