'use client';

import React from 'react';
import { Check } from 'lucide-react';
import { HoverBorderGradient } from './ui/hover-border-gradient';

export function PricingSection() {
  return (
    <section className="py-24 bg-white dark:bg-black" id="pricing">
      <div className="max-w-7xl mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold text-black dark:text-white mb-4">
            Enrich everything, everywhere.
          </h2>
          <p className="text-gray-500 dark:text-gray-400">
            Only pay based on results, not inputs. One credit = one output.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {/* Free Plan */}
          <div className="rounded-3xl p-8 border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 flex flex-col">
            <div className="mb-8">
              <h3 className="text-xl font-bold text-black dark:text-white mb-2">Free</h3>
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-bold text-black dark:text-white">$0</span>
                <span className="text-gray-500">/month</span>
              </div>
              <p className="text-sm text-gray-500 mt-2">500 credits included</p>
            </div>

            <ul className="space-y-4 mb-8 flex-1">
              {features.map((feature, i) => (
                <li key={i} className="flex items-start gap-3 text-sm text-gray-600 dark:text-gray-300">
                  <Check className="w-5 h-5 text-green-500 shrink-0" />
                  {feature}
                </li>
              ))}
            </ul>

            <button className="w-full py-3 rounded-xl bg-gray-100 dark:bg-zinc-800 text-black dark:text-white font-medium hover:bg-gray-200 dark:hover:bg-zinc-700 transition-colors">
              Get started for free
            </button>
          </div>

          {/* Pro Plan */}
          <div className="relative rounded-3xl p-8 border border-blue-200 dark:border-blue-900 bg-blue-50/50 dark:bg-blue-900/10 flex flex-col">
            <div className="absolute top-0 right-0 bg-blue-500 text-white text-xs font-bold px-3 py-1 rounded-bl-xl rounded-tr-2xl">
              POPULAR
            </div>
            <div className="mb-8">
              <h3 className="text-xl font-bold text-black dark:text-white mb-2">Pro</h3>
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-bold text-black dark:text-white">$99</span>
                <span className="text-gray-500">/month</span>
              </div>
              <p className="text-sm text-gray-500 mt-2">Scale with your team</p>
            </div>

            <ul className="space-y-4 mb-8 flex-1">
              {features.map((feature, i) => (
                <li key={i} className="flex items-start gap-3 text-sm text-gray-600 dark:text-gray-300">
                  <Check className="w-5 h-5 text-blue-500 shrink-0" />
                  {feature}
                </li>
              ))}
              <li className="flex items-start gap-3 text-sm text-gray-900 dark:text-white font-medium">
                <Check className="w-5 h-5 text-blue-500 shrink-0" />
                Premium support
              </li>
            </ul>

            <HoverBorderGradient
              containerClassName="rounded-xl w-full"
              as="button"
              className="w-full py-3 bg-black dark:bg-white text-white dark:text-black font-medium flex items-center justify-center"
            >
              Get started for free
            </HoverBorderGradient>
          </div>
        </div>
      </div>
    </section>
  );
}

const features = [
  "Unlimited users",
  "Agent columns",
  "Exporting",
  "Web search & scraping",
  "Email address enrichments",
  "Phone number enrichments [5 credits]",
  "Waterfall enrichments",
  "Inbound & outbound webhooks",
  "Integrations with Zapier, HeyReach, Instantly & more",
  "Native CRM integrations"
];
