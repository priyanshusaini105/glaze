import React from 'react';
import { Table, HourglassIcon, EyeOff } from 'lucide-react';

export function WhyItFailsSection() {
  return (
    <section className="w-full bg-surface-subtle py-20 border-y border-border-light">
      <div className="max-w-[1280px] mx-auto px-6">
        <div className="flex flex-col md:flex-row gap-12 items-start">
          {/* Left: Title */}
          <div className="md:w-1/3 pt-4">
            <h2 className="text-3xl md:text-4xl font-bold text-text-main mb-4">
              Why traditional tools fail
            </h2>
            <p className="text-text-muted text-lg leading-relaxed">
              Data dies in static tables. You&apos;re left waiting for spinners and opaque processes that don&apos;t tell you when they&apos;ll finish.
            </p>
          </div>

          {/* Right: Cards */}
          <div className="md:w-2/3 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-white p-6 rounded-xl border border-border-light hover:border-gray-400 shadow-sm transition-colors group">
              <div className="size-12 rounded-lg bg-red-50 flex items-center justify-center text-red-500 mb-4 group-hover:scale-110 transition-transform">
                <Table className="w-6 h-6" />
              </div>
              <h3 className="text-text-main text-lg font-bold mb-2">Static Graveyards</h3>
              <p className="text-text-muted text-sm">
                Spreadsheets that don&apos;t update themselves are just digital storage units. They require manual upkeep.
              </p>
            </div>

            <div className="bg-white p-6 rounded-xl border border-border-light hover:border-gray-400 shadow-sm transition-colors group">
              <div className="size-12 rounded-lg bg-orange-50 flex items-center justify-center text-orange-500 mb-4 group-hover:scale-110 transition-transform">
                <HourglassIcon className="w-6 h-6" />
              </div>
              <h3 className="text-text-main text-lg font-bold mb-2">Spinner Hell</h3>
              <p className="text-text-muted text-sm">
                Waiting endlessly for batch processes without progress indicators or intermediate results.
              </p>
            </div>

            <div className="bg-white p-6 rounded-xl border border-border-light hover:border-gray-400 shadow-sm transition-colors group sm:col-span-2">
              <div className="size-12 rounded-lg bg-purple-50 flex items-center justify-center text-purple-600 mb-4 group-hover:scale-110 transition-transform">
                <EyeOff className="w-6 h-6" />
              </div>
              <h3 className="text-text-main text-lg font-bold mb-2">Black-box AI</h3>
              <p className="text-text-muted text-sm">
                Most AI tools hide the reasoning. You get an answer, but you can&apos;t see the work, making debugging impossible.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
