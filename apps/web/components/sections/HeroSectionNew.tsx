'use client';

import React from 'react';
import { ArrowRight, Github, Play } from 'lucide-react';
import Link from 'next/link';

export function HeroSection() {
  return (
    <section className="w-full max-w-[1280px] mx-auto px-6 py-12 md:py-20 flex flex-col items-center text-center relative mt-16">
      {/* Background Blur */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-primary/10 rounded-full blur-[100px] pointer-events-none z-0" />

      {/* Content */}
      <div className="relative z-10 max-w-4xl flex flex-col items-center gap-6 mb-16">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-100 text-primary text-xs font-bold uppercase tracking-wider mb-2 shadow-sm">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
          </span>
          v2.0 is now live
        </div>

        {/* Headline */}
        <h1 className="text-5xl md:text-7xl font-bold leading-[1.1] tracking-tight text-text-main drop-shadow-sm">
          The agentic spreadsheet <br className="hidden md:block" /> that feels alive.
        </h1>

        {/* Subheadline */}
        <p className="text-lg md:text-xl text-text-muted max-w-2xl font-body leading-relaxed">
          An open-source Freckle.io alternative that enriches your data with transparent, streaming AI workflows. Stop waiting on spinners.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-wrap justify-center gap-4 pt-4">
          <button className="h-12 px-8 rounded-lg bg-primary text-white text-base font-bold hover:bg-primary-dark transition-all shadow-lg shadow-primary/30 hover:shadow-primary/40 flex items-center gap-2">
            <Play className="w-5 h-5" fill="currentColor" />
            View Demo
          </button>
          <Link
            href="https://github.com/priyanshusaini105/glaze"
            className="h-12 px-8 rounded-lg bg-white border border-border-light text-text-main text-base font-bold hover:bg-surface-hover hover:border-gray-300 transition-all flex items-center gap-2 shadow-sm"
          >
            <Github className="w-5 h-5" />
            Open Source on GitHub
          </Link>
        </div>
      </div>

      {/* Spreadsheet Demo */}
      <div className="relative w-full max-w-5xl aspect-video md:aspect-[2/1] rounded-xl border border-border-light bg-white shadow-2xl shadow-gray-200/50 overflow-hidden group">
        {/* Window Controls */}
        <div className="h-10 border-b border-border-light bg-surface-subtle flex items-center px-4 gap-4">
          <div className="flex gap-1.5">
            <div className="size-3 rounded-full bg-[#ff5f57] border border-[#e0443e]" />
            <div className="size-3 rounded-full bg-[#febc2e] border border-[#d89e24]" />
            <div className="size-3 rounded-full bg-[#28c840] border border-[#1aab29]" />
          </div>
          <div className="h-6 w-px bg-border-light mx-2" />
          <div className="flex items-center gap-4 text-xs font-mono text-text-muted">
            <span className="px-2 py-0.5 rounded bg-white border border-gray-200 shadow-sm text-text-main">
              leads_enrichment_v2
            </span>
            <span>1,240 rows</span>
            <span className="text-emerald-600 flex items-center gap-1 font-bold">
              <span className="size-1.5 rounded-full bg-emerald-500" />
              Online
            </span>
          </div>
        </div>

        {/* Column Headers */}
        <div className="flex border-b border-border-light bg-surface-subtle text-xs font-mono text-text-muted font-bold">
          <div className="w-10 border-r border-border-light p-2 text-center bg-gray-100/50">#</div>
          <div className="w-48 border-r border-border-light p-2 flex items-center gap-2">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
            Domain
          </div>
          <div className="w-40 border-r border-border-light p-2 flex items-center gap-2">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            Company
          </div>
          <div className="w-32 border-r border-border-light p-2 flex items-center gap-2">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            Employees
          </div>
          <div className="flex-1 p-2 flex items-center gap-2 text-primary">
            <svg className="w-3.5 h-3.5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            AI Analysis (Streaming)
          </div>
        </div>

        {/* Table Rows */}
        <div className="font-mono text-xs text-slate-700 bg-white">
          {/* Row 1 */}
          <div className="flex border-b border-border-light hover:bg-slate-50 transition-colors">
            <div className="w-10 border-r border-border-light p-3 text-center text-text-muted">1</div>
            <div className="w-48 border-r border-border-light p-3">vercel.com</div>
            <div className="w-40 border-r border-border-light p-3 flex items-center gap-2">
              <div className="w-5 h-5 rounded-sm bg-black flex items-center justify-center text-white text-[8px] font-bold">▲</div>
              Vercel
            </div>
            <div className="w-32 border-r border-border-light p-3">500-1000</div>
            <div className="flex-1 p-3 text-text-muted">Cloud platform for frontend frameworks...</div>
          </div>

          {/* Row 2 */}
          <div className="flex border-b border-border-light hover:bg-slate-50 transition-colors">
            <div className="w-10 border-r border-border-light p-3 text-center text-text-muted">2</div>
            <div className="w-48 border-r border-border-light p-3">linear.app</div>
            <div className="w-40 border-r border-border-light p-3 flex items-center gap-2">
              <div className="w-5 h-5 rounded-sm bg-[#5E6AD2] flex items-center justify-center">
                <svg className="w-3 h-3 text-white" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M1.5 1.5L8 15l6.5-13.5h-13z" />
                </svg>
              </div>
              Linear
            </div>
            <div className="w-32 border-r border-border-light p-3">50-200</div>
            <div className="flex-1 p-3 text-text-muted">Issue tracking tool built for speed...</div>
          </div>

          {/* Row 3 - Active/Streaming */}
          <div className="flex border-b border-border-light bg-blue-50/50">
            <div className="w-10 border-r border-border-light p-3 text-center text-primary font-bold">3</div>
            <div className="w-48 border-r border-border-light p-3 text-text-main font-medium">raycast.com</div>
            <div className="w-40 border-r border-border-light p-3 text-text-muted italic">Processing...</div>
            <div className="w-32 border-r border-border-light p-3 text-text-muted italic">...</div>
            <div className="flex-1 p-3 text-primary relative">
              <span className="bg-primary/10 px-1 rounded text-primary-700">
                Productivity tool for macOS that repla
              </span>
              <span className="w-2 h-4 bg-primary inline-block align-middle ml-1 cursor-blink" />
            </div>
          </div>

          {/* Row 4 - Queued */}
          <div className="flex border-b border-border-light opacity-40">
            <div className="w-10 border-r border-border-light p-3 text-center text-text-muted">4</div>
            <div className="w-48 border-r border-border-light p-3">notion.so</div>
            <div className="w-40 border-r border-border-light p-3" />
            <div className="w-32 border-r border-border-light p-3" />
            <div className="flex-1 p-3" />
          </div>

          {/* Row 5 - Queued */}
          <div className="flex border-b border-border-light opacity-40">
            <div className="w-10 border-r border-border-light p-3 text-center text-text-muted">5</div>
            <div className="w-48 border-r border-border-light p-3">figma.com</div>
            <div className="w-40 border-r border-border-light p-3" />
            <div className="w-32 border-r border-border-light p-3" />
            <div className="flex-1 p-3" />
          </div>
        </div>

        {/* Agent Status Badge */}
        <div className="absolute bottom-6 right-6 bg-white border border-border-light rounded-lg shadow-xl p-2 flex items-center gap-3 animate-pulse">
          <svg className="w-4 h-4 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <span className="text-xs font-mono text-slate-500">Running enrichment agent...</span>
          <div className="h-1.5 w-16 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-primary w-2/3" />
          </div>
        </div>
      </div>
    </section>
  );
}
