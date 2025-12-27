'use client';

import React from 'react';
import { ContainerScroll } from '../ui/container-scroll-animation';
import { FlipWords } from '../ui/flip-words';
import { ArrowRight, CheckCircle2 } from 'lucide-react';

export function HeroSection() {
  const words = ["missing", "craving", "needing"];

  return (
    <div className="relative w-full bg-white dark:bg-black flex flex-col items-center justify-center overflow-hidden pt-32 pb-10">
      {/* Grid Background */}
      <div className="absolute inset-0 w-full h-full bg-white dark:bg-black bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]">
        <div className="absolute pointer-events-none inset-0 flex items-center justify-center dark:bg-black bg-white [mask-image:radial-gradient(ellipse_at_center,transparent_20%,black)]"></div>
      </div>

      <div className="relative z-10 flex flex-col items-center w-full px-4">
        
        <div className="flex flex-col items-center space-y-6 mb-10 text-center max-w-4xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-blue-100 bg-blue-50 text-blue-600 text-xs font-medium uppercase tracking-wider">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
            </span>
            v1.0 Public Beta
          </div>
          
          <h1 className="text-5xl md:text-7xl font-bold text-black dark:text-white leading-[1.1] tracking-tight">
            The data your CRM has been <br className="hidden md:block" />
            <FlipWords words={words} className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-500 to-violet-500" />
          </h1>
          
          <p className="text-lg md:text-xl text-gray-500 dark:text-gray-400 max-w-2xl mx-auto leading-relaxed">
            Glaze sits on top of your CRM, auto-enriching every record coming in from any source. 
            Ask for any attribute you can imagine, and our AI agents will scour the web & 40+ data providers to find it.
          </p>

          <div className="flex flex-col sm:flex-row items-center gap-4 pt-4">
            <button className="px-8 py-4 rounded-full bg-black dark:bg-white text-white dark:text-black font-bold text-lg hover:scale-105 transition-transform flex items-center gap-2 shadow-xl shadow-black/10">
              Get started for free
              <ArrowRight className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 text-sm text-gray-500 font-medium">
              <CheckCircle2 className="w-4 h-4 text-green-500" />
              No credit card required
            </div>
          </div>
        </div>

        <ContainerScroll
          titleComponent={<></>}
        >
          <div className="w-full h-full bg-white dark:bg-zinc-900 rounded-2xl border border-gray-200 dark:border-zinc-800 p-4 shadow-sm overflow-hidden flex flex-col">
             {/* Mock Browser Header */}
             <div className="h-8 flex items-center gap-2 px-2 border-b border-gray-100 dark:border-zinc-800 mb-4">
              <div className="w-3 h-3 rounded-full bg-red-400/80" />
              <div className="w-3 h-3 rounded-full bg-yellow-400/80" />
              <div className="w-3 h-3 rounded-full bg-green-400/80" />
              <div className="ml-4 h-5 w-64 bg-gray-100 dark:bg-zinc-800 rounded-md text-[10px] flex items-center px-2 text-gray-400">
                glaze.dev/app/enrichment
              </div>
            </div>
            
            {/* Mock Spreadsheet */}
            <div className="flex-1 overflow-hidden font-mono text-xs">
              <div className="grid grid-cols-[50px_1fr_1fr_1fr_100px] gap-0 border-b border-gray-100 dark:border-zinc-800 pb-2 text-gray-400 font-medium">
                <div className="px-2">#</div>
                <div className="px-2">Company</div>
                <div className="px-2">Website</div>
                <div className="px-2">CEO</div>
                <div className="px-2">Status</div>
              </div>
              
              {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                <div key={i} className="grid grid-cols-[50px_1fr_1fr_1fr_100px] gap-0 py-3 border-b border-gray-50 dark:border-zinc-800/50 items-center hover:bg-blue-50/50 dark:hover:bg-blue-900/10 transition-colors group">
                  <div className="px-2 text-gray-300">{i}</div>
                  <div className="px-2 text-gray-700 dark:text-gray-300">Acme Corp {i}</div>
                  <div className="px-2 text-blue-500">acme{i}.com</div>
                  <div className="px-2 text-gray-500 group-hover:text-gray-900 transition-colors">
                    {i === 1 ? (
                      <span className="inline-flex items-center gap-1 text-green-600 bg-green-50 px-2 py-0.5 rounded">
                        Found
                      </span>
                    ) : (
                      <span className="w-16 h-2 bg-gray-100 dark:bg-zinc-800 rounded animate-pulse block" />
                    )}
                  </div>
                  <div className="px-2">
                    <div className={`w-2 h-2 rounded-full ${i === 1 ? 'bg-green-500' : 'bg-gray-200'}`} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </ContainerScroll>
      </div>
    </div>
  );
}
