import React from 'react';
import { Keyboard, Sparkles, Zap, Key } from 'lucide-react';

export function PowerUsersSection() {
  return (
    <section className="py-20 md:py-32">
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-black text-text-main mb-4 tracking-tight">
            Built for power users
          </h2>
          <p className="text-lg md:text-xl text-text-muted max-w-2xl mx-auto">
            Speed, transparency, and control. No compromises.
          </p>
        </div>

        {/* Bento Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Keyboard-first - Large */}
          <div className="lg:col-span-2 glass-card p-10 rounded-xl hover:-translate-y-1 transition-transform duration-300 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-accent-blue/20 rounded-full blur-2xl opacity-70" />
            <Keyboard className="w-10 h-10 text-accent-blue mb-6" />
            <h3 className="text-2xl font-black text-text-main mb-3">Keyboard-first</h3>
            <p className="text-text-muted text-base leading-relaxed max-w-lg mb-6">
              Navigate your grid like Vim. <kbd className="px-2 py-1 bg-surface-light border border-border-light rounded text-xs font-mono">Ctrl+K</kbd> to search, <kbd className="px-2 py-1 bg-surface-light border border-border-light rounded text-xs font-mono">Ctrl+E</kbd> to enrich. Every action is one keystroke away.
            </p>
            <div className="flex gap-2 flex-wrap">
              {['⌘ K', 'Ctrl E', '/ Search', 'G G Top'].map((key, i) => (
                <div key={i} className="px-3 py-1.5 bg-white border border-border-light rounded text-xs font-mono text-text-main shadow-sm">
                  {key}
                </div>
              ))}
            </div>
          </div>

          {/* Liquid Motion */}
          <div className="glass-card p-8 rounded-xl hover:-translate-y-1 transition-transform duration-300">
            <Sparkles className="w-8 h-8 text-accent-purple mb-5" />
            <h3 className="text-xl font-black text-text-main mb-3">Liquid Motion</h3>
            <p className="text-text-muted text-sm leading-relaxed">
              Butter-smooth 60fps animations. Cells fade in, agents pulse, streams flow. It feels alive because it is.
            </p>
          </div>

          {/* Concurrency */}
          <div className="glass-card p-8 rounded-xl hover:-translate-y-1 transition-transform duration-300">
            <Zap className="w-8 h-8 text-accent-gold mb-5" />
            <h3 className="text-xl font-black text-text-main mb-3">Concurrency</h3>
            <p className="text-text-muted text-sm leading-relaxed">
              Run 1000 agents in parallel. Built on async Rust core—no bottlenecks, no rate limits.
            </p>
          </div>

          {/* BYOK - Large */}
          <div className="lg:col-span-2 glass-card p-10 rounded-xl hover:-translate-y-1 transition-transform duration-300 relative overflow-hidden">
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-accent-purple/20 rounded-full blur-2xl opacity-70" />
            <Key className="w-10 h-10 text-accent-purple mb-6" />
            <h3 className="text-2xl font-black text-text-main mb-3">Bring your own API Keys</h3>
            <p className="text-text-muted text-base leading-relaxed max-w-lg">
              Use OpenAI, Anthropic, local models, or your own fine-tuned LLMs. Your keys, your models, your data. We&apos;re just the interface.
            </p>
            <div className="mt-6 flex gap-3 items-center">
              <div className="px-3 py-1.5 bg-white border border-border-light rounded-lg text-xs font-mono text-text-main flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500" />
                OpenAI Connected
              </div>
              <div className="px-3 py-1.5 bg-surface-light border border-border-light rounded-lg text-xs font-mono text-text-muted flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-gray-300" />
                Anthropic
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
