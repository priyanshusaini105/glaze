import React from 'react';
import { Terminal, Eye, Zap } from 'lucide-react';

export function AIInsideGridSection() {
  return (
    <section className="py-20 md:py-32">
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left: Content */}
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent-purple/10 border border-accent-purple/20 mb-6">
              <Zap className="w-4 h-4 text-accent-purple" />
              <span className="text-sm font-medium text-accent-purple">Real-time visibility</span>
            </div>
            <h2 className="text-4xl md:text-5xl font-black text-text-main mb-6 tracking-tight leading-tight">
              AI inside the grid, <br />not behind a curtain
            </h2>
            <p className="text-lg text-text-muted mb-8 leading-relaxed">
              Watch your agents work in real-time. Each row is an orchestrated workflow—streaming, transparent, and fully customizable. No more &ldquo;please wait&rdquo; modals.
            </p>
            <ul className="space-y-4">
              <li className="flex items-start gap-3">
                <div className="mt-1 w-5 h-5 rounded-full bg-accent-blue/10 flex items-center justify-center flex-shrink-0">
                  <svg className="w-3 h-3 text-accent-blue" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
                <div>
                  <span className="font-semibold text-text-main">Streaming token output</span>
                  <p className="text-text-muted text-sm mt-1">Results appear token by token. No loading bars, no waiting.</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <div className="mt-1 w-5 h-5 rounded-full bg-accent-blue/10 flex items-center justify-center flex-shrink-0">
                  <svg className="w-3 h-3 text-accent-blue" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
                <div>
                  <span className="font-semibold text-text-main">Visible reasoning steps</span>
                  <p className="text-text-muted text-sm mt-1">Expand any cell to view the full agent chain and API logs.</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <div className="mt-1 w-5 h-5 rounded-full bg-accent-blue/10 flex items-center justify-center flex-shrink-0">
                  <svg className="w-3 h-3 text-accent-blue" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
                <div>
                  <span className="font-semibold text-text-main">Pause/Resume agents anytime</span>
                  <p className="text-text-muted text-sm mt-1">Tweak agent logic without leaving the spreadsheet interface.</p>
                </div>
              </li>
            </ul>
            <div className="mt-8">
              <button className="flex items-center gap-2 px-6 py-3 rounded-lg bg-white border border-border-light text-text-main font-bold text-sm hover:bg-surface-light transition-all shadow-sm">
                <Eye className="w-4 h-4" />
                <span>See how it works</span>
              </button>
            </div>
          </div>

          {/* Right: Agent Demo */}
          <div className="glass-card p-6 rounded-xl">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-border-light">
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-accent-purple" />
                <span className="text-sm font-mono font-semibold text-text-main">Agent Runtime</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-accent-green font-mono">RUNNING</span>
                <div className="w-2 h-2 rounded-full bg-accent-green animate-pulse" />
              </div>
            </div>

            {/* Agent Log */}
            <div className="space-y-3 font-mono text-xs">
              <div className="flex items-start gap-3">
                <span className="text-text-muted shrink-0">12:45:01</span>
                <div className="flex-1">
                  <span className="text-accent-blue">[AGENT]</span> <span className="text-text-main">Initiated enrichment for row #3</span>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-text-muted shrink-0">12:45:02</span>
                <div className="flex-1">
                  <span className="text-accent-purple">[HTTP]</span> <span className="text-text-main">GET glaze.so → 200 OK</span>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-text-muted shrink-0">12:45:03</span>
                <div className="flex-1">
                  <span className="text-accent-gold">[LLM]</span> <span className="text-text-main">Streaming analysis...</span>
                </div>
              </div>
              <div className="pl-16 py-3 bg-surface-light rounded border-l-2 border-accent-gold">
                <p className="text-text-main leading-relaxed">
                  An agentic spreadsheet that transforms static rows into dynamic workflows. Built for data teams who need transparency, not black boxes<span className="animate-pulse">▊</span>
                </p>
              </div>
              <div className="flex items-start gap-3 opacity-50">
                <span className="text-text-muted shrink-0">12:45:08</span>
                <div className="flex-1">
                  <span className="text-accent-green">[DONE]</span> <span className="text-text-main">Row #3 enriched successfully</span>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-border-light flex items-center justify-between text-xs">
              <span className="text-text-muted">Duration: 7.2s</span>
              <button className="flex items-center gap-1 text-accent-blue hover:text-accent-purple transition-colors">
                <Eye className="w-3.5 h-3.5" />
                View Full Trace
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
