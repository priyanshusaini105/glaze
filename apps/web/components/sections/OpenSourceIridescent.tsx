import React from 'react';
import { Github, Terminal } from 'lucide-react';

export function OpenSourceIridescent() {
  return (
    <section id="open-source" className="py-20 md:py-32 bg-surface-light">
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left: Terminal */}
          <div className="order-2 lg:order-1">
            <div className="glass-card rounded-xl overflow-hidden shadow-xl">
              {/* Terminal Header */}
              <div className="flex items-center gap-2 px-4 py-3 bg-slate-800 border-b border-slate-700">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-500" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500" />
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                </div>
                <div className="flex-1 text-center">
                  <span className="text-xs font-mono text-slate-400">terminal — bash</span>
                </div>
              </div>

              {/* Terminal Content */}
              <div className="bg-slate-900 p-6 font-mono text-sm overflow-x-auto">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-green-400">→</span>
                    <span className="text-slate-300">git clone https://github.com/priyanshusaini105/glaze.git</span>
                  </div>
                  <div className="text-slate-500 pl-4">Cloning into &apos;glaze&apos;...</div>
                  <div className="text-slate-500 pl-4">remote: Enumerating objects: 12543, done.</div>
                  <div className="text-slate-500 pl-4 mb-4">Receiving objects: 100% (12543/12543), done.</div>

                  <div className="flex items-center gap-2">
                    <span className="text-green-400">→</span>
                    <span className="text-slate-300">cd glaze && pnpm install</span>
                  </div>
                  <div className="text-slate-500 pl-4">Lockfile is up to date, resolution step is skipped</div>
                  <div className="text-slate-500 pl-4 mb-4">Packages: +847</div>

                  <div className="flex items-center gap-2">
                    <span className="text-green-400">→</span>
                    <span className="text-slate-300">pnpm dev</span>
                  </div>
                  <div className="text-accent-blue pl-4 flex items-center gap-2">
                    <span>▲ Next.js ready on http://localhost:3000</span>
                    <span className="animate-pulse">▊</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Content */}
          <div className="order-1 lg:order-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 border border-slate-200 mb-6">
              <Github className="w-4 h-4 text-slate-700" />
              <span className="text-sm font-medium text-slate-700">MIT License</span>
            </div>
            <h2 className="text-4xl md:text-5xl font-black text-text-main mb-6 tracking-tight leading-tight">
              100% open source, <br />zero lock-in
            </h2>
            <p className="text-lg text-text-muted mb-8 leading-relaxed">
              Fork it, extend it, self-host it. The entire codebase is yours to inspect and modify. No proprietary APIs, no vendor lock-in, no surprises.
            </p>
            <ul className="space-y-4 mb-8">
              <li className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full bg-accent-blue/10 flex items-center justify-center flex-shrink-0">
                  <svg className="w-3 h-3 text-accent-blue" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
                <span className="text-text-main">MIT license — do whatever you want</span>
              </li>
              <li className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full bg-accent-blue/10 flex items-center justify-center flex-shrink-0">
                  <svg className="w-3 h-3 text-accent-blue" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
                <span className="text-text-main">Self-host on your infrastructure</span>
              </li>
              <li className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full bg-accent-blue/10 flex items-center justify-center flex-shrink-0">
                  <svg className="w-3 h-3 text-accent-blue" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
                <span className="text-text-main">Contribute features and integrations</span>
              </li>
            </ul>
            <div className="flex gap-4">
              <a href="https://github.com/priyanshusaini105/glaze" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 h-12 px-6 rounded-lg bg-slate-900 text-white font-semibold hover:bg-slate-800 transition-colors">
                <Github className="w-5 h-5" />
                Star on GitHub
              </a>
              <a href="/coming-soon" className="inline-flex items-center gap-2 h-12 px-6 rounded-lg border border-border-light bg-white text-text-main font-semibold hover:bg-surface-light transition-colors">
                <Terminal className="w-5 h-5" />
                Read Docs
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
