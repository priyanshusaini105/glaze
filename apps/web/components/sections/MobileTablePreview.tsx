'use client';

import React from 'react';

/**
 * MobileTablePreview - A simplified static table shown only on mobile
 * when the animated TableDemo is hidden.
 */
export function MobileTablePreview() {
  return (
    <div className="md:hidden w-full max-w-sm mx-auto">
      <div className="rounded-xl border border-border-light bg-white shadow-xl overflow-hidden">
        {/* Window controls */}
        <div className="flex items-center gap-2 px-3 py-2 border-b border-border-light bg-surface-light">
          <div className="flex gap-1">
            <div className="w-2 h-2 rounded-full bg-[#ff5f57]" />
            <div className="w-2 h-2 rounded-full bg-[#febc2e]" />
            <div className="w-2 h-2 rounded-full bg-[#28c840]" />
          </div>
          <div className="mx-auto text-[10px] font-mono text-text-muted">
            leads.glaze
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex items-center gap-2 px-3 py-1.5 border-b border-border-light bg-white text-[10px] text-text-muted">
          <div className="flex items-center gap-1 text-text-main">
            <div className="w-3 h-3 rounded-full bg-gradient-to-br from-accent-blue to-accent-purple flex items-center justify-center">
              <svg className="w-1.5 h-1.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <span className="font-medium">AI Active</span>
          </div>
          <div className="flex-1" />
          <span className="text-accent-blue font-medium">Streaming...</span>
        </div>

        {/* Simple Table */}
        <div className="overflow-hidden">
          <table className="w-full text-[10px]">
            <thead>
              <tr className="text-text-muted border-b border-border-light bg-surface-light/50">
                <th className="p-2 text-left font-medium">Company</th>
                <th className="p-2 text-left font-medium">Status</th>
                <th className="p-2 text-left font-medium text-accent-blue">AI Insight</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-light text-text-main">
              <tr>
                <td className="p-2 font-medium">Acme Corp</td>
                <td className="p-2">
                  <span className="inline-flex px-1.5 py-0.5 rounded text-[8px] font-medium bg-green-100 text-green-700">
                    Enriched
                  </span>
                </td>
                <td className="p-2 text-text-muted truncate max-w-[100px]">
                  Enterprise logistics...
                </td>
              </tr>
              <tr>
                <td className="p-2 font-medium">Linear</td>
                <td className="p-2">
                  <span className="inline-flex px-1.5 py-0.5 rounded text-[8px] font-medium bg-green-100 text-green-700">
                    Enriched
                  </span>
                </td>
                <td className="p-2 text-text-muted truncate max-w-[100px]">
                  Issue tracking tool...
                </td>
              </tr>
              <tr className="bg-accent-blue/5">
                <td className="p-2 font-bold">Glaze</td>
                <td className="p-2">
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[8px] font-medium bg-white text-accent-blue border border-accent-blue/20">
                    <span className="w-1 h-1 rounded-full bg-accent-blue animate-pulse" />
                    Processing
                  </span>
                </td>
                <td className="p-2 text-text-main">
                  Agentic spreadsheet...
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Footer hint */}
        <div className="px-3 py-2 bg-gradient-to-r from-accent-blue/5 to-accent-purple/5 border-t border-border-light">
          <p className="text-[9px] text-text-muted text-center">
            ✨ AI agents enrich your data in real-time
          </p>
        </div>
      </div>
    </div>
  );
}
