import React from 'react';
import { Database, Wand2, RefreshCw, Send } from 'lucide-react';

export function HowItWorksIridescent() {
  const steps = [
    {
      icon: Database,
      number: '1',
      title: 'Input Data',
      description: ['Import CSV, connect', 'generic APIs, or start', 'from scratch.'],
    },
    {
      icon: Wand2,
      number: '2',
      title: 'Agents Run',
      description: ['Select a column and', 'define your prompt or', 'workflow.'],
    },
    {
      icon: RefreshCw,
      number: '3',
      title: 'Streaming Results',
      description: ['Watch as cells', 'populate in real-time,', 'row by row.'],
    },
    {
      icon: Send,
      number: '4',
      title: 'Enriched & Ready',
      description: ['Export your clean,', 'enriched dataset to', 'your CRM.'],
    }
  ];

  return (
    <section className="py-24 bg-surface-light border-t border-border-light">
      <div className="max-w-[1280px] mx-auto px-6">
        {/* Title - No subtitle */}
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold text-text-main">
            How Glaze works
          </h2>
        </div>

        {/* Steps Grid */}
        <div className="relative">
          {/* Horizontal connecting line */}
          <div className="hidden lg:block absolute top-12 left-0 right-0 h-[2px] bg-border-light z-0" />

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 relative">
            {steps.map((step, index) => {
              const Icon = step.icon;
              return (
                <div key={index} className="relative flex flex-col items-center">
                  {/* Icon Circle with Number Badge */}
                  <div className="relative mb-6 z-10">
                    <div className="w-24 h-24 rounded-full bg-white border-2 border-border-light shadow-sm flex items-center justify-center">
                      <Icon className="w-9 h-9 text-text-muted transform scale-y-[-1]" strokeWidth={1.5} />
                    </div>
                    {/* Number Badge */}
                    <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-surface-light border border-border-light shadow-sm flex items-center justify-center">
                      <span className="text-sm font-bold text-text-main">{step.number}</span>
                    </div>
                  </div>

                  {/* Title */}
                  <h3 className="text-lg font-bold text-text-main mb-4 text-center">
                    {step.title}
                  </h3>

                  {/* Description */}
                  <div className="text-sm text-text-muted text-center leading-5">
                    {step.description.map((line, i) => (
                      <p key={i} className={i < step.description.length - 1 ? 'mb-0' : ''}>{line}</p>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
