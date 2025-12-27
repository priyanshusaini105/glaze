'use client';

import { motion } from 'framer-motion';
import { Github, Menu, X } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

export function Navigation() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <motion.nav 
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: "spring", damping: 20, stiffness: 100 }}
      className="fixed top-5 left-0 right-0 z-50 flex justify-center px-4"
    >
      <div className="backdrop-blur-xl bg-white/70 dark:bg-black/70 border border-black/[0.08] dark:border-white/[0.08] shadow-[0px_4px_20px_rgba(0,0,0,0.05)] rounded-full px-6 py-3 flex items-center justify-between w-full max-w-5xl">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-500 to-violet-500" />
          <span className="font-bold text-lg tracking-tight text-black dark:text-white">Glaze</span>
        </div>

        {/* Desktop Links */}
        <div className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-500 dark:text-gray-400">
          <Link href="#features" className="hover:text-black dark:hover:text-white transition-colors">Features</Link>
          <Link href="#docs" className="hover:text-black dark:hover:text-white transition-colors">Docs</Link>
          <Link href="https://github.com/priyanshusaini105/glaze" target="_blank" className="hover:text-black dark:hover:text-white transition-colors">GitHub</Link>
        </div>

        {/* Right Actions */}
        <div className="hidden md:flex items-center gap-4">
          <button className="px-4 py-2 rounded-full bg-black dark:bg-white text-white dark:text-black text-sm font-bold hover:opacity-90 transition-opacity flex items-center gap-2">
            <Github className="w-4 h-4" />
            <span>Star on GitHub</span>
          </button>
        </div>

        {/* Mobile Menu Toggle */}
        <button className="md:hidden text-black dark:text-white" onClick={() => setIsOpen(!isOpen)}>
          {isOpen ? <X /> : <Menu />}
        </button>
      </div>
      
      {/* Mobile Menu (Simplified) */}
      {isOpen && (
        <div className="absolute top-20 left-4 right-4 bg-white/90 dark:bg-black/90 backdrop-blur-xl border border-gray-200 dark:border-zinc-800 rounded-2xl p-4 flex flex-col gap-4 md:hidden shadow-xl">
           <Link href="#features" className="p-2 text-black dark:text-white">Features</Link>
           <Link href="#docs" className="p-2 text-black dark:text-white">Docs</Link>
           <Link href="https://github.com/priyanshusaini105/glaze" className="p-2 text-black dark:text-white">GitHub</Link>
        </div>
      )}
    </motion.nav>
  );
}
