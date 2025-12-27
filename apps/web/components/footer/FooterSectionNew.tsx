import React from 'react';
import Link from 'next/link';

export function FooterSection() {
  return (
    <footer className="w-full border-t border-border-light bg-surface-subtle pt-20 pb-12 px-6">
      <div className="max-w-[1280px] mx-auto flex flex-col items-center text-center">
        <h2 className="text-4xl md:text-5xl font-bold text-text-main mb-6 tracking-tight">
          Stop waiting on spinners.
        </h2>
        <p className="text-xl text-text-muted mb-10 max-w-2xl">
          Build with AI that shows its work. Start enriching your data with Glaze today.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 mb-20">
          <button className="h-12 px-8 rounded-lg bg-primary text-white text-base font-bold hover:bg-primary-dark transition-all shadow-lg shadow-primary/30">
            Get Started for Free
          </button>
          <Link
            href="#docs"
            className="h-12 px-8 rounded-lg bg-white border border-border-light text-text-main text-base font-bold hover:bg-gray-50 transition-all hover:border-gray-300 shadow-sm flex items-center justify-center"
          >
            Read the Docs
          </Link>
        </div>

        {/* Footer Bottom */}
        <div className="w-full border-t border-border-light pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-text-muted">
          <div>© 2024 Glaze Inc. Open source under MIT License.</div>
          <div className="flex gap-6">
            <Link href="https://twitter.com" className="hover:text-primary transition-colors">
              Twitter
            </Link>
            <Link href="https://github.com/priyanshusaini105/glaze" className="hover:text-primary transition-colors">
              GitHub
            </Link>
            <Link href="#" className="hover:text-primary transition-colors">
              Discord
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
