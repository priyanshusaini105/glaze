'use client';

import React from 'react';
import { InfiniteMovingCards } from '../ui/infinite-moving-cards';

export function TrustedBySection() {
  return (
    <section className="py-10 bg-white dark:bg-black border-b border-gray-100 dark:border-zinc-800">
      <div className="max-w-7xl mx-auto px-4 text-center">
        <p className="text-sm font-medium text-gray-500 mb-8 uppercase tracking-widest">
          Trusted by 3,000+ RevOps teams using HubSpot and Salesforce
        </p>
        <InfiniteMovingCards
          items={testimonials}
          direction="right"
          speed="slow"
          className="py-4"
        />
      </div>
    </section>
  );
}

const testimonials = [
  {
    quote: "HubSpot",
    name: "HubSpot",
    title: "HubSpot",
  },
  {
    quote: "Salesforce",
    name: "Salesforce",
    title: "Salesforce",
  },
  {
    quote: "Linear",
    name: "Linear",
    title: "Linear",
  },
  {
    quote: "Stripe",
    name: "Stripe",
    title: "Stripe",
  },
  {
    quote: "Raycast",
    name: "Raycast",
    title: "Raycast",
  },
];
