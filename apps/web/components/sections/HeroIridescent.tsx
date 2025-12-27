'use client';

import React from 'react';
import { ArrowRight, Github, Code2 } from 'lucide-react';

export function HeroIridescent() {
  return (
    <section className="relative pt-20 pb-16 md:pt-32 md:pb-24 overflow-hidden">
      {/* Animated blob backgrounds - More visible as per Figma */}
      <div className="absolute top-0 -left-20 w-96 h-96 bg-accent-blue/20 rounded-full mix-blend-multiply filter blur-2xl opacity-70 animate-blob" />
      <div className="absolute top-0 -right-20 w-96 h-96 bg-accent-purple/20 rounded-full mix-blend-multiply filter blur-2xl opacity-70 animate-blob" style={{ animationDelay: '2s' }} />
      <div className="absolute -bottom-32 left-20 w-96 h-96 bg-accent-gold/20 rounded-full mix-blend-multiply filter blur-2xl opacity-70 animate-blob" style={{ animationDelay: '4s' }} />

      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 flex flex-col items-center text-center relative z-10">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-surface-light border border-border-light mb-8 shadow-sm">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent-blue opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-accent-blue" />
          </span>
          <span className="text-xs font-medium text-text-muted">v0.1 Beta is now live</span>
        </div>

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
          <button className="flex items-center justify-center gap-2 h-12 px-8 rounded-lg bg-text-main text-white font-bold text-base transition-all active:scale-95 shadow-lg shadow-slate-300 hover:shadow-xl hover:bg-black hover:-translate-y-0.5">
            <span>Start Enrichment</span>
            <ArrowRight className="w-5 h-5" />
          </button>
          <button className="flex items-center justify-center gap-2 h-12 px-8 rounded-lg bg-white border border-border-light text-text-main font-bold text-base hover:bg-surface-light hover:border-slate-300 transition-all active:scale-95 shadow-sm">
            <Code2 className="w-5 h-5" />
            <span>Open Source</span>
          </button>
        </div>

        {/* Table Demo */}
        <div className="w-full max-w-5xl rounded-xl border border-border-light bg-white shadow-2xl shadow-slate-200/50 overflow-hidden relative group cursor-default">
          {/* Window controls */}
          <div className="flex items-center gap-2 px-4 py-3 border-b border-border-light bg-surface-light">
            <div className="flex gap-1.5">
              <div className="w-3 h-3 rounded-full bg-[#ff5f57] border border-black/5" />
              <div className="w-3 h-3 rounded-full bg-[#febc2e] border border-black/5" />
              <div className="w-3 h-3 rounded-full bg-[#28c840] border border-black/5" />
            </div>
            <div className="mx-auto text-xs font-mono text-text-muted">enrich_leads_Q3.glaze</div>
          </div>

          {/* Toolbar */}
          <div className="flex items-center gap-4 px-4 py-2 border-b border-border-light bg-white text-xs text-text-muted">
            <div className="flex items-center gap-1 hover:text-text-main cursor-pointer">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              Search
            </div>
            <div className="h-4 w-px bg-border-light" />
            <div className="flex items-center gap-1 text-text-main">
              <svg className="w-4 h-4 text-accent-purple" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              Agents: Active
            </div>
            <div className="flex-1" />
            <div className="text-accent-blue flex items-center gap-1 font-medium">
              <svg className="w-3.5 h-3.5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Streaming...
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm text-left font-mono">
              <thead>
                <tr className="text-text-muted border-b border-border-light bg-surface-light/50">
                  <th className="w-12 p-2 text-center border-r border-border-light font-normal">#</th>
                  <th className="p-3 border-r border-border-light font-normal min-w-[200px]">Company</th>
                  <th className="p-3 border-r border-border-light font-normal min-w-[200px]">Website</th>
                  <th className="p-3 border-r border-border-light font-normal min-w-[150px]">Status</th>
                  <th className="p-3 font-normal text-text-main bg-accent-blue/5 w-full min-w-[300px]">AI Insight (Streaming)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-light text-text-main">
                <tr className="hover:bg-surface-hover">
                  <td className="text-center text-text-muted border-r border-border-light bg-surface-light/30">1</td>
                  <td className="p-3 border-r border-border-light font-medium">Acme Corp</td>
                  <td className="p-3 border-r border-border-light text-accent-blue hover:underline underline-offset-4 cursor-pointer">acme.co</td>
                  <td className="p-3 border-r border-border-light">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700 border border-green-200">Enriched</span>
                  </td>
                  <td className="p-3 text-text-muted">Focuses on high-scale logistics solutions for enterprise e-commerce...</td>
                </tr>
                <tr className="hover:bg-surface-hover">
                  <td className="text-center text-text-muted border-r border-border-light bg-surface-light/30">2</td>
                  <td className="p-3 border-r border-border-light font-medium">Linear</td>
                  <td className="p-3 border-r border-border-light text-accent-blue hover:underline underline-offset-4 cursor-pointer">linear.app</td>
                  <td className="p-3 border-r border-border-light">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700 border border-green-200">Enriched</span>
                  </td>
                  <td className="p-3 text-text-muted">Issue tracking tool built for high-performance product teams.</td>
                </tr>
                <tr className="bg-accent-blue/5">
                  <td className="text-center text-text-muted border-r border-border-light bg-accent-blue/10 border-l-2 border-l-accent-blue">3</td>
                  <td className="p-3 border-r border-border-light font-bold text-text-main">Glaze</td>
                  <td className="p-3 border-r border-border-light text-accent-blue hover:underline underline-offset-4 cursor-pointer">glaze.so</td>
                  <td className="p-3 border-r border-border-light">
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium bg-white text-accent-blue border border-accent-blue/20 shadow-sm">
                      <span className="w-1.5 h-1.5 rounded-full bg-accent-blue animate-pulse" />
                      Processing
                    </span>
                  </td>
                  <td className="p-3 relative border-2 border-accent-blue/50 shadow-[0_0_25px_rgba(14,165,233,0.15)] bg-white">
                    <span className="text-text-main">An agentic spreadsheet that transforms static rows into dynamic workflo</span>
                    <span className="w-2 h-4 inline-block align-middle bg-accent-blue animate-pulse ml-0.5" />
                    <div className="absolute -top-3 right-2 bg-gradient-to-r from-accent-blue to-accent-purple text-white text-[10px] font-bold px-2 py-0.5 rounded shadow-sm">AGENT RUNNING</div>
                  </td>
                </tr>
                <tr className="hover:bg-surface-hover opacity-60">
                  <td className="text-center text-text-muted border-r border-border-light bg-surface-light/30">4</td>
                  <td className="p-3 border-r border-border-light font-medium">Vercel</td>
                  <td className="p-3 border-r border-border-light text-accent-blue hover:underline underline-offset-4 cursor-pointer">vercel.com</td>
                  <td className="p-3 border-r border-border-light">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-500 border border-gray-200">Queued</span>
                  </td>
                  <td className="p-3" />
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
}
