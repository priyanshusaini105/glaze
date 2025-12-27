'use client';

import { useState, useEffect } from 'react';
import { Search, Plus, Download, Settings2, Play, X, ChevronRight } from 'lucide-react';
import { TableSidebar } from '@/components/tables/table-sidebar';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { useDragSelect } from '@/hooks/use-drag-select';

export default function GlazeTablePage() {
  const [columnPanelOpen, setColumnPanelOpen] = useState(false);
  const [streamingRow, setStreamingRow] = useState<string | null>('2');

  const tables = [
    { id: '1', name: 'Q3 Outreach List', active: true },
    { id: '2', name: 'Competitor Analysis', active: false },
    { id: '3', name: 'Event Attendees', active: false },
  ];

  const data = [
    {
      id: '1',
      company: 'Acme Corp',
      website: 'acme.com',
      status: 'Qualified',
      statusColor: 'green',
      aiSummary: 'Market leader in anvil supplies. Recent Series B funding of $50M aimed at expanding logistics.',
      agentStatus: 'completed',
    },
    {
      id: '2',
      company: 'Globex Corporation',
      website: 'globex.com',
      status: 'Processing',
      statusColor: 'blue',
      aiSummary: 'Recently announced a strategic partnership with Cy',
      agentStatus: 'processing',
    },
    {
      id: '3',
      company: 'Soylent Corp',
      website: 'soylent.com',
      status: 'Queued',
      statusColor: 'gray',
      aiSummary: 'Waiting for agent...',
      agentStatus: 'queued',
    },
    {
      id: '4',
      company: 'Umbrella Inc',
      website: 'umbrella.com',
      status: 'Churned',
      statusColor: 'red',
      aiSummary: 'Pharmaceutical giant facing regulatory scrutiny. Stock down 15% YTD. No active hiring.',
      agentStatus: 'completed',
    },
    {
      id: '5',
      company: 'Stark Ind',
      website: 'stark.com',
      status: 'New Lead',
      statusColor: 'blue',
      aiSummary: 'Defense contractor pivoting to clean energy. CEO active on social media. High growth potential.',
      agentStatus: 'completed',
    },
  ];

  const allRowIds = data.map(row => row.id);

  const {
    selectedItems: selectedRows,
    isDragging,
    isRangeSelecting,
    selectAll,
    clearSelection,
    handleClick,
    handleMouseDown,
    handleMouseEnter,
    handleMouseUp,
  } = useDragSelect<string>();

  // Add global mouse up listener for drag select
  useEffect(() => {
    document.addEventListener('mouseup', handleMouseUp);
    return () => document.removeEventListener('mouseup', handleMouseUp);
  }, [handleMouseUp]);

  const getStatusStyles = (color: string) => {
    const styles = {
      green: 'bg-green-50 text-green-700 border-green-200/50',
      blue: 'bg-blue-50 text-blue-700 border-blue-200/50',
      gray: 'bg-gray-50 text-gray-600 border-gray-200/50',
      red: 'bg-red-50 text-red-700 border-red-200/50',
    };
    return styles[color as keyof typeof styles] || styles.gray;
  };

  return (
    <>
      <TableSidebar tables={tables} currentTableId="1" />
      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden p-2 md:pr-2 md:py-2">
        <div className="bg-white rounded-tl-xl border border-gray-200/60 shadow-[0_25px_50px_-12px_rgba(229,231,235,0.5)] flex flex-col flex-1 overflow-hidden">
          {/* Header */}
          <div className="backdrop-blur-sm bg-white/80 border-b border-gray-200 sticky top-0 z-40">
            <div className="px-3 md:px-5 h-14 flex items-center justify-between gap-3 md:gap-6">
              {/* Left: Breadcrumb */}
              <div className="flex items-center gap-2 flex-1">
                <SidebarTrigger className="md:hidden" />
                <span className="text-sm text-gray-600 font-medium hidden md:inline">Tables</span>
                <ChevronRight size={16} className="text-gray-300 hidden md:inline" />
                <span className="text-sm font-semibold text-gray-900 tracking-tight">
                  Q3 Outreach List
                </span>
              </div>

              {/* Center: Search */}
              <div className="max-w-lg flex-1 relative hidden lg:block">
                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  placeholder="Search rows or values..."
                  className="w-full pl-10 pr-3 py-1.5 text-sm bg-gray-50/80 border border-transparent rounded-lg focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none placeholder:text-gray-400"
                />
                <kbd className="absolute right-3 top-1/2 -translate-y-1/2 px-1.5 py-0.5 text-xs font-mono font-semibold text-gray-500 bg-white border border-gray-200 rounded shadow-sm hidden xl:inline">
                  ⌘K
                </kbd>
              </div>

              {/* Right: Actions */}
              <div className="flex items-center gap-2 md:gap-3">
                <div className="hidden lg:flex items-center gap-4 pr-4 border-r border-gray-100">
                  <div className="flex items-center gap-2 px-3 py-1 bg-green-50 border border-green-200/50 rounded-full">
                    <div className="w-1.5 h-1.5 bg-green-500 rounded-full relative">
                      <div className="absolute inset-0 bg-green-400 rounded-full opacity-75 animate-ping" />
                    </div>
                    <span className="text-xs font-medium text-green-700">Live</span>
                  </div>
                  <span className="text-xs text-gray-400 hidden xl:inline">|</span>
                  <span className="text-xs font-medium text-gray-600 hidden xl:inline">42 Columns</span>
                  <span className="text-xs font-medium text-gray-600 hidden xl:inline">1,204 Rows</span>
                </div>

                <div className="flex items-center gap-1">
                  <button className="p-1.5 hover:bg-gray-50 rounded-lg transition-colors hidden md:block">
                    <Settings2 size={18} className="text-gray-600" />
                  </button>
                  <button className="p-1.5 hover:bg-gray-50 rounded-lg transition-colors hidden md:block">
                    <Download size={18} className="text-gray-600" />
                  </button>
                </div>

                <button
                  onClick={() => setColumnPanelOpen(true)}
                  className="flex items-center gap-1.5 px-3 md:px-4 py-1.5 bg-cyan-500 hover:bg-cyan-600 text-white text-sm font-medium rounded-lg shadow-sm shadow-cyan-500/20 transition-colors"
                >
                  <Plus size={16} />
                  <span className="hidden sm:inline">Add Column</span>
                </button>
              </div>
            </div>
          </div>

          {/* Table Content */}
          <div className="flex-1 overflow-auto">
            <div className="inline-block min-w-full">
              <table className={`w-full text-sm ${isDragging ? 'select-none cursor-grabbing' : ''}`}>
                <thead className="bg-gray-50/80 backdrop-blur-sm sticky top-0 z-10">
                  <tr>
                    <th className="w-9 px-2 py-3.5 border-b border-gray-200">
                      <input
                        type="checkbox"
                        className="w-4 h-4 rounded border-gray-300 cursor-pointer"
                        checked={selectedRows.size === data.length && data.length > 0}
                        onChange={(e) => {
                          if (e.target.checked) {
                            selectAll(allRowIds);
                          } else {
                            clearSelection();
                          }
                        }}
                      />
                    </th>
                    <th className="w-6 px-2 py-3.5 text-center text-[11px] font-semibold text-gray-400 border-b border-gray-200">
                      #
                    </th>
                    <th className="min-w-[200px] px-4 py-3 text-left border-b border-r border-gray-200 bg-white">
                      <div className="flex items-center gap-2">
                        <span className="text-base">🏢</span>
                        <span className="text-[11px] font-semibold text-gray-600 uppercase tracking-wider">
                          Company
                        </span>
                      </div>
                    </th>
                    <th className="min-w-[180px] px-4 py-3 text-left border-b border-r border-gray-200 bg-white">
                      <div className="flex items-center gap-2">
                        <span className="text-base">🔗</span>
                        <span className="text-[11px] font-semibold text-gray-600 uppercase tracking-wider">
                          Website
                        </span>
                      </div>
                    </th>
                    <th className="min-w-[120px] px-4 py-3 text-left border-b border-r border-gray-200 bg-white">
                      <div className="flex items-center gap-2">
                        <span className="text-base">📊</span>
                        <span className="text-[11px] font-semibold text-gray-600 uppercase tracking-wider">
                          Status
                        </span>
                      </div>
                    </th>
                    <th className="min-w-[400px] px-4 py-3 text-left border-b border-gray-200 bg-cyan-500/5 relative">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-base">✨</span>
                          <span className="text-[11px] font-semibold text-cyan-500 uppercase tracking-wider">
                            AI Summary
                          </span>
                        </div>
                        <span className="px-2 py-0.5 text-[10px] font-bold bg-white/60 border border-cyan-500/10 rounded text-cyan-500/80">
                          GPT-4o
                        </span>
                      </div>
                      <div className="absolute top-0 right-0 px-2 py-0.5 bg-cyan-500 text-white text-[9px] font-bold uppercase shadow rounded-bl-lg">
                        Agent Active
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {data.map((row, idx) => (
                    <tr
                      key={row.id}
                      onClick={(e) => handleClick(row.id, e, allRowIds)}
                      onMouseDown={(e) => handleMouseDown(row.id, e)}
                      onMouseEnter={() => handleMouseEnter(row.id, allRowIds)}
                      className={`group hover:bg-blue-50/30 transition-colors cursor-pointer ${
                        selectedRows.has(row.id) ? 'bg-blue-50/20' : ''
                      } ${row.id === '2' ? 'bg-blue-50/10 border-l-2 border-l-cyan-500' : ''} ${
                        isDragging || isRangeSelecting ? 'select-none' : ''
                      }`}
                    >
                      <td 
                        className={`px-2 py-5 border-b border-gray-100 ${row.id === '2' ? 'border-b-gray-100' : ''}`}
                        onMouseDown={(e) => e.stopPropagation()}
                      >
                        <div
                          className={`w-4.5 h-4.5 rounded border-2 flex items-center justify-center transition-colors ${
                            selectedRows.has(row.id)
                              ? 'bg-cyan-500 border-cyan-500'
                              : 'border-gray-300 hover:border-cyan-400'
                          }`}
                        >
                          {selectedRows.has(row.id) && (
                            <svg
                              className="w-3 h-3 text-white"
                              fill="none"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </div>
                      </td>
                      <td className="px-2 py-5 text-center text-xs text-gray-400 font-mono border-b border-gray-100">
                        <span className={row.id === '2' ? 'text-cyan-500 font-bold' : ''}>{idx + 1}</span>
                      </td>
                      <td className="px-4 py-4 border-b border-r border-gray-100">
                        <span className="font-medium text-gray-900">{row.company}</span>
                      </td>
                      <td className="px-4 py-4 border-b border-r border-gray-100">
                        <span className="text-cyan-500">{row.website}</span>
                      </td>
                      <td className="px-4 py-5 border-b border-r border-gray-100">
                        {row.agentStatus === 'processing' ? (
                          <div className="flex items-center gap-1.5">
                            <div className="w-3.5 h-3.5 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
                            <span className="text-xs font-medium text-cyan-500">Processing</span>
                          </div>
                        ) : row.agentStatus === 'queued' ? (
                          <div className="flex items-center gap-1.5">
                            <div className="w-3.5 h-3.5 border-2 border-gray-400 border-t-transparent rounded-full opacity-30" />
                            <span className="text-xs text-gray-400">Queued</span>
                          </div>
                        ) : (
                          <span
                            className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium border ${getStatusStyles(row.statusColor)}`}
                          >
                            {row.status}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2 border-b border-gray-100 relative">
                        {row.agentStatus === 'processing' && streamingRow === row.id ? (
                          <div className="relative bg-white/50 shadow-inner rounded">
                            <p className="text-xs text-gray-900 font-mono leading-relaxed py-1.5">
                              {row.aiSummary}
                              <span className="inline-block w-0.5 h-3 bg-cyan-500 ml-0.5 animate-pulse" />
                            </p>
                          </div>
                        ) : row.agentStatus === 'queued' ? (
                          <p className="text-xs italic text-gray-300 py-1.5">{row.aiSummary}</p>
                        ) : (
                          <p className="text-xs text-gray-600 font-mono leading-relaxed py-1.5">
                            {row.aiSummary}
                          </p>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Column Creation Panel */}
      {columnPanelOpen && (
        <>
          <div
            onClick={() => setColumnPanelOpen(false)}
            className="fixed inset-0 bg-black/20 z-40 backdrop-blur-[2px]"
          />
          <div className="fixed right-0 top-0 bottom-0 w-[360px] bg-white border-l border-gray-200 z-50 shadow-lg flex flex-col">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-900">New Column</h3>
              <button
                onClick={() => setColumnPanelOpen(false)}
                className="p-1 hover:bg-gray-100 rounded-md"
              >
                <X size={18} className="text-gray-600" />
              </button>
            </div>

            <div className="flex-1 overflow-auto p-6 space-y-7">
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-gray-600 uppercase tracking-wider">
                  Column Name
                </label>
                <input
                  type="text"
                  placeholder="AI Summary"
                  defaultValue="AI Summary"
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:bg-white focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 outline-none"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-bold text-gray-600 uppercase tracking-wider">Type</label>
                <div className="flex gap-3">
                  <button className="flex-1 flex flex-col items-center gap-3 p-3 bg-cyan-500/5 border-2 border-cyan-500 rounded-xl shadow-sm shadow-cyan-500/10">
                    <span className="text-2xl">✨</span>
                    <span className="text-[11px] font-semibold text-cyan-500 uppercase tracking-wide">
                      AI Agent
                    </span>
                  </button>
                  <button className="flex-1 flex flex-col items-center gap-3 p-3 border border-gray-200 rounded-xl hover:bg-gray-50">
                    <span className="text-2xl">📝</span>
                    <span className="text-[11px] font-medium text-gray-600 uppercase tracking-wide">
                      Text
                    </span>
                  </button>
                  <button className="flex-1 flex flex-col items-center gap-3 p-3 border border-gray-200 rounded-xl hover:bg-gray-50">
                    <span className="text-2xl">🔗</span>
                    <span className="text-[11px] font-medium text-gray-600 uppercase tracking-wide">
                      URL
                    </span>
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold text-gray-600 uppercase tracking-wider">
                    Prompt Instructions
                  </label>
                  <span className="px-2.5 py-1 text-[10px] font-medium text-cyan-500 bg-cyan-500/10 border border-cyan-500/20 rounded-full">
                    GPT-4o
                  </span>
                </div>
                <div className="relative">
                  <textarea
                    rows={6}
                    placeholder="Describe what the agent should do..."
                    className="w-full px-3.5 py-3 bg-gray-50 border border-gray-200 rounded-lg text-sm font-mono placeholder:text-gray-400 focus:bg-white focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 outline-none resize-none"
                  />
                  <button className="absolute bottom-3 right-3 p-1.5 opacity-50 hover:opacity-100">
                    <span className="text-lg">✨</span>
                  </button>
                </div>
                <p className="text-xs text-gray-500">
                  Use <code className="px-1.5 py-0.5 bg-gray-100 border border-gray-200 rounded font-mono text-gray-700">@ColumnName</code> to reference data.
                </p>
              </div>

              <div className="pt-4 border-t border-dashed border-gray-200">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-900">Browsing Enabled</span>
                  <div className="w-9 h-5 bg-cyan-500 rounded-full p-0.5 cursor-pointer">
                    <div className="w-4 h-4 bg-white rounded-full ml-auto shadow" />
                  </div>
                </div>
              </div>
            </div>

            <div className="backdrop-blur-sm bg-gray-50/50 border-t border-gray-200 p-6">
              <button className="w-full flex items-center justify-center gap-2 h-11 bg-cyan-500 hover:bg-cyan-600 text-white text-sm font-semibold rounded-xl shadow-lg shadow-cyan-500/20 transition-colors">
                Create & Run
                <Play size={16} />
              </button>
            </div>
          </div>
        </>
      )}

      {/* Floating Selection Bar */}
      {selectedRows.size > 0 && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50">
          <div className="backdrop-blur-md bg-white/95 border border-gray-200 rounded-full shadow-xl shadow-black/10 flex items-center gap-1 p-1.5">
            <div className="px-4 py-2 text-sm font-semibold text-gray-900 border-r border-gray-100">
              {selectedRows.size} rows selected
            </div>
            <button className="flex items-center gap-2 px-5 py-2 hover:bg-gray-50 rounded-full text-sm font-medium text-gray-900 transition-colors">
              <Play size={18} className="text-cyan-500" />
              Run Agents
            </button>
            <button 
              onClick={() => clearSelection()}
              className="p-2 hover:bg-gray-50 rounded-full transition-colors"
            >
              <X size={18} className="text-gray-600" />
            </button>
          </div>
        </div>
      )}

      {/* Selection Hint */}
      {selectedRows.size === 0 && (
        <div className="fixed bottom-8 right-8 z-40 max-w-xs">
          <div className="backdrop-blur-md bg-white/90 border border-gray-200/80 rounded-lg shadow-lg p-3 text-xs text-gray-600">
            <div className="font-semibold text-gray-900 mb-2">💡 Selection Tips:</div>
            <ul className="space-y-1">
              <li>• <kbd className="px-1 py-0.5 bg-gray-100 rounded text-[10px] font-mono">Click</kbd> - Select single row</li>
              <li>• <kbd className="px-1 py-0.5 bg-gray-100 rounded text-[10px] font-mono">Shift+Click</kbd> - Select range</li>
              <li>• <kbd className="px-1 py-0.5 bg-gray-100 rounded text-[10px] font-mono">Ctrl+Click</kbd> - Toggle selection</li>
              <li>• <kbd className="px-1 py-0.5 bg-gray-100 rounded text-[10px] font-mono">Drag</kbd> - Paint selection</li>
            </ul>
          </div>
        </div>
      )}
    </>
  );
}
