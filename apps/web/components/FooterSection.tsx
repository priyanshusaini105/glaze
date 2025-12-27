'use client';

import React from "react";
import { SparklesCore } from "./ui/sparkles";

export function FooterSection() {
  return (
    <footer className="relative w-full bg-white dark:bg-black flex flex-col items-center justify-center overflow-hidden pt-20 pb-10 border-t border-gray-100 dark:border-zinc-800">
      
      <div className="w-full absolute inset-0 h-full pointer-events-none">
        <SparklesCore
          id="tsparticlesfullpage"
          background="transparent"
          minSize={0.6}
          maxSize={1.4}
          particleDensity={50}
          className="w-full h-full"
          particleColor="#06B6D4"
        />
      </div>

      <div className="relative z-10 w-full max-w-7xl mx-auto px-4">
        <div className="grid md:grid-cols-4 gap-8 mb-12">
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-500 to-violet-500" />
              <span className="font-bold text-xl text-black dark:text-white">Glaze</span>
            </div>
            <p className="text-gray-500 dark:text-gray-400 max-w-xs">
              The open-source, headless alternative to Clay. 100% Type-Safe. 0% Latency.
            </p>
          </div>
          
          <div>
            <h4 className="font-bold text-black dark:text-white mb-4">Product</h4>
            <ul className="space-y-2 text-sm text-gray-500 dark:text-gray-400">
              <li><a href="#" className="hover:text-cyan-500 transition-colors">Features</a></li>
              <li><a href="#" className="hover:text-cyan-500 transition-colors">Docs</a></li>
              <li><a href="#" className="hover:text-cyan-500 transition-colors">Changelog</a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-black dark:text-white mb-4">Company</h4>
            <ul className="space-y-2 text-sm text-gray-500 dark:text-gray-400">
              <li><a href="#" className="hover:text-cyan-500 transition-colors">About</a></li>
              <li><a href="#" className="hover:text-cyan-500 transition-colors">Blog</a></li>
              <li><a href="#" className="hover:text-cyan-500 transition-colors">Careers</a></li>
              <li><a href="#" className="hover:text-cyan-500 transition-colors">Contact</a></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-100 dark:border-zinc-800 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-gray-500">
          <div>
            © 2025 Glaze Inc.
          </div>
          <div className="flex gap-6">
            <a href="#" className="hover:text-black dark:hover:text-white transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-black dark:hover:text-white transition-colors">Terms of Service</a>
            <a href="#" className="hover:text-black dark:hover:text-white transition-colors">Trust Center</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
