import React from "react";
import { Twitter, Github, Linkedin } from "lucide-react";
import Image from "next/image";

export function FooterIridescent() {
  return (
    <footer className="py-12 border-t border-border-light bg-white">
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Left: Logo + Copyright */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              {/* <Image
                src="/img/glaze-abs.png"
                alt="Glaze Logo"
                width={64}
                height={64}
                className="rounded-lg group-hover:scale-105 transition-transform"
              /> */}
              <Image
                src="/img/glaze-text.png"
                alt="Glaze Logo"
                width={132}
                height={132}
                className="rounded-lg group-hover:scale-105 transition-transform"
              />
            </div>
            <span className="text-text-muted text-sm">© 2025</span>
          </div>

          {/* Center: Links */}
          <nav className="flex items-center gap-8">
            <a
              href="/docs"
              className="text-sm text-text-muted hover:text-text-main transition-colors"
            >
              Docs
            </a>
            <a
              href="/pricing"
              className="text-sm text-text-muted hover:text-text-main transition-colors"
            >
              Pricing
            </a>
            <a
              href="/blog"
              className="text-sm text-text-muted hover:text-main transition-colors"
            >
              Blog
            </a>
            <a
              href="https://github.com/glaze/glaze"
              className="text-sm text-text-muted hover:text-text-main transition-colors"
            >
              GitHub
            </a>
          </nav>

          {/* Right: Social */}
          <div className="flex items-center gap-4">
            <a
              href="https://twitter.com/glaze"
              target="_blank"
              rel="noopener noreferrer"
              className="w-9 h-9 rounded-lg bg-surface-light border border-border-light flex items-center justify-center text-text-muted hover:text-text-main hover:border-slate-300 transition-all"
            >
              <Twitter className="w-4 h-4" />
            </a>
            <a
              href="https://github.com/glaze"
              target="_blank"
              rel="noopener noreferrer"
              className="w-9 h-9 rounded-lg bg-surface-light border border-border-light flex items-center justify-center text-text-muted hover:text-text-main hover:border-slate-300 transition-all"
            >
              <Github className="w-4 h-4" />
            </a>
            <a
              href="https://linkedin.com/company/glaze"
              target="_blank"
              rel="noopener noreferrer"
              className="w-9 h-9 rounded-lg bg-surface-light border border-border-light flex items-center justify-center text-text-muted hover:text-text-main hover:border-slate-300 transition-all"
            >
              <Linkedin className="w-4 h-4" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
