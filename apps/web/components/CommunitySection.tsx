import React from "react";
import { Github, Star, GitFork, Users } from "lucide-react";
import Link from "next/link";

export function CommunitySection() {
  return (
    <section className="py-24 relative bg-white dark:bg-black overflow-hidden" id="community">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight text-black dark:text-white mb-6">
            Built for developers, <br />
            <span className="text-cyan-500">backed by community.</span>
          </h2>
          <p className="text-lg text-zinc-600 dark:text-zinc-400">
            Glaze is 100% open source. Join us in building the future of data enrichment.
            Inspect the code, contribute features, or self-host it today.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
          <Card 
            icon={<Star className="w-6 h-6 text-cyan-500" />}
            title="Star on GitHub"
            description="Support the project and stay updated with the latest releases."
            stat="1.2k+"
            label="Stars"
            href="https://github.com/priyanshusaini105/glaze"
          />
          <Card 
            icon={<GitFork className="w-6 h-6 text-purple-500" />}
            title="Fork & Contribute"
            description="Submit PRs, fix bugs, or build your own custom integrations."
            stat="45+"
            label="Contributors"
            href="https://github.com/priyanshusaini105/glaze"
          />
          <Card 
            icon={<Users className="w-6 h-6 text-emerald-500" />}
            title="Join the Discussion"
            description="Connect with other developers and get help with your implementation."
            stat="500+"
            label="Community Members"
            href="#"
          />
        </div>

        <div className="relative rounded-3xl overflow-hidden bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-8 md:p-12 text-center">
          <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20"></div>
          <div className="relative z-10">
            <h3 className="text-3xl font-bold text-black dark:text-white mb-6">
              Ready to start building?
            </h3>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link 
                href="https://github.com/priyanshusaini105/glaze"
                className="px-8 py-4 rounded-full bg-black dark:bg-white text-white dark:text-black font-medium hover:opacity-90 transition-opacity flex items-center gap-2"
              >
                <Github className="w-5 h-5" />
                View Source Code
              </Link>
              <Link 
                href="#docs"
                className="px-8 py-4 rounded-full bg-white dark:bg-black text-black dark:text-white border border-zinc-200 dark:border-zinc-800 font-medium hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors"
              >
                Read Documentation
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Card({ icon, title, description, stat, label, href }: { icon: React.ReactNode, title: string, description: string, stat: string, label: string, href: string }) {
  return (
    <Link href={href} className="group block p-8 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:border-cyan-500/50 hover:shadow-lg hover:shadow-cyan-500/10 transition-all duration-300">
      <div className="mb-6 p-3 bg-zinc-50 dark:bg-zinc-800 rounded-xl w-fit group-hover:scale-110 transition-transform duration-300">
        {icon}
      </div>
      <h3 className="text-xl font-bold text-black dark:text-white mb-2">{title}</h3>
      <p className="text-zinc-600 dark:text-zinc-400 mb-6 h-12">{description}</p>
      <div className="flex items-baseline gap-2 border-t border-zinc-100 dark:border-zinc-800 pt-4">
        <span className="text-2xl font-bold text-black dark:text-white">{stat}</span>
        <span className="text-sm text-zinc-500">{label}</span>
      </div>
    </Link>
  );
}
