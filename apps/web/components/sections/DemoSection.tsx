'use client';

import React, { useState } from "react";
import { MultiStepLoader } from "../ui/multi-step-loader";
import { HoverBorderGradient } from "../ui/hover-border-gradient";
import { Sparkles } from "lucide-react";

const loadingStates = [
  { text: "Spinning up Agent..." },
  { text: "Browsing Web..." },
  { text: "Extracting Data..." },
  { text: "Verifying Sources..." },
  { text: "Glazing..." },
];

export function DemoSection() {
  const [loading, setLoading] = useState(false);

  const handleEnrich = () => {
    setLoading(true);
    setTimeout(() => setLoading(false), 5000);
  };

  return (
    <section className="py-20 bg-white dark:bg-black flex flex-col items-center justify-center relative overflow-hidden">
      <div className="w-full max-w-3xl mx-auto px-4 text-center z-10">
        <h2 className="text-3xl font-bold mb-8 text-black dark:text-white">
          Try it live
        </h2>
        
        <div className="flex flex-col sm:flex-row items-center gap-4 justify-center">
          <input 
            type="text" 
            placeholder="Enter a domain (e.g. vercel.com)" 
            className="w-full sm:w-96 px-4 py-3 rounded-full border border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-900 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 transition-all"
          />
          
          <HoverBorderGradient
            containerClassName="rounded-full"
            as="button"
            className="dark:bg-black bg-white text-black dark:text-white flex items-center space-x-2 px-6 py-3"
            onClick={handleEnrich}
          >
            <Sparkles className="w-4 h-4 text-cyan-500" />
            <span>Enrich Row</span>
          </HoverBorderGradient>
        </div>

        <p className="mt-4 text-sm text-gray-400">
          Proves the &ldquo;Latency&rdquo; claim instantly.
        </p>
      </div>

      <MultiStepLoader loadingStates={loadingStates} loading={loading} duration={1000} />
      
      {/* Background Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-cyan-500/5 rounded-full blur-3xl -z-10 pointer-events-none" />
    </section>
  );
}
