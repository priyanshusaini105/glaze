'use client';

import React from "react";
import { BentoGrid, BentoGridItem } from "../ui/bento-grid";
import { TextGenerateEffect } from "../ui/text-generate-effect";
import { motion } from "framer-motion";
import { Database, Layers, Search, Table2 } from "lucide-react";

export function FeaturesSection() {
  return (
    <section className="py-24 px-4 max-w-7xl mx-auto bg-white dark:bg-black" id="features">
      <div className="mb-16 text-center max-w-3xl mx-auto">
        <h2 className="text-3xl font-bold tracking-tight text-black dark:text-white sm:text-5xl mb-6">
          Ask for any data point in natural language
        </h2>
        <p className="text-xl text-gray-500 dark:text-gray-400 leading-relaxed">
          Go beyond standard firmographics. Glaze&apos;s AI research agent uses the web and 40+ providers to find ultra-specific data like ISO certs, job openings, and LinkedIn URLs.
        </p>
      </div>
      
      <BentoGrid className="max-w-6xl mx-auto md:auto-rows-[24rem]">
        {items.map((item, i) => (
          <BentoGridItem
            key={i}
            title={item.title}
            description={item.description}
            header={item.header}
            className={i === 0 || i === 3 ? "md:col-span-2" : ""}
            icon={item.icon}
          />
        ))}
      </BentoGrid>
    </section>
  );
}

const AIConsole = () => {
  const words = `> User: Find the CEO's LinkedIn URL
> Agent: Searching LinkedIn for "Acme Corp CEO"...
> Found: "John Doe"
> Verifying current role...
> Confirmed.
> Result: linkedin.com/in/johndoe`;
  
  return (
    <div className="flex flex-1 w-full h-full min-h-[6rem] rounded-xl bg-gray-900 border border-gray-800 p-6 font-mono text-sm overflow-hidden shadow-2xl">
      <div className="flex gap-2 mb-4">
        <div className="w-3 h-3 rounded-full bg-red-500" />
        <div className="w-3 h-3 rounded-full bg-yellow-500" />
        <div className="w-3 h-3 rounded-full bg-green-500" />
      </div>
      <div className="text-green-400">
        <TextGenerateEffect words={words} className="text-green-400" />
      </div>
    </div>
  );
};

const GapFillerVisual = () => {
  return (
    <div className="flex flex-1 w-full h-full min-h-[6rem] rounded-xl bg-white dark:bg-neutral-900 border border-gray-100 dark:border-neutral-800 items-center justify-center relative overflow-hidden p-8">
      <div className="w-full max-w-xs space-y-4">
        <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-100">
          <span className="text-red-800 font-medium">Missing Email</span>
          <span className="text-red-500">❌</span>
        </div>
        <div className="flex justify-center">
          <div className="h-8 w-0.5 bg-gray-200"></div>
        </div>
        <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-100 shadow-sm">
          <span className="text-green-800 font-medium">Found: john@acme.com</span>
          <span className="text-green-500">✅</span>
        </div>
      </div>
    </div>
  );
};

const SpreadsheetVisual = () => {
  return (
    <div className="flex flex-1 w-full h-full min-h-[6rem] rounded-xl bg-white dark:bg-neutral-900 border border-gray-100 dark:border-neutral-800 p-4 overflow-hidden relative">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-white dark:to-black z-10" />
      <div className="grid grid-cols-3 gap-4 opacity-50">
        {[...Array(10)].map((_, i) => (
          <React.Fragment key={i}>
            <div className="h-8 bg-gray-100 dark:bg-zinc-800 rounded w-full" />
            <div className="h-8 bg-gray-100 dark:bg-zinc-800 rounded w-full" />
            <div className="h-8 bg-gray-100 dark:bg-zinc-800 rounded w-full" />
          </React.Fragment>
        ))}
      </div>
      <div className="absolute inset-0 flex items-center justify-center z-20">
        <div className="bg-white dark:bg-zinc-800 px-6 py-3 rounded-full shadow-xl border border-gray-200 dark:border-zinc-700 font-medium text-sm flex items-center gap-2">
          <Table2 className="w-4 h-4 text-blue-500" />
          Spreadsheet Interface
        </div>
      </div>
    </div>
  );
};

const IntegrationVisual = () => {
  return (
    <div className="flex flex-1 w-full h-full min-h-[6rem] items-center justify-center bg-dot-black/[0.2] dark:bg-dot-white/[0.2]">
      <div className="relative flex items-center justify-center">
        <div className="w-16 h-16 bg-white rounded-2xl shadow-lg flex items-center justify-center z-10 border border-gray-100">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-500 to-violet-500" />
        </div>
        {[0, 1, 2, 3].map((i) => (
          <motion.div
            key={i}
            className="absolute w-32 h-32 border border-dashed border-gray-300 rounded-full"
            animate={{ rotate: 360 }}
            transition={{ duration: 20, repeat: Infinity, ease: "linear", delay: i * -5 }}
          >
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-white rounded-full shadow-md border border-gray-100 flex items-center justify-center text-xs">
              {["CRM", "CSV", "API", "Web"][i]}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

const items = [
  {
    title: "Real-time thought streaming",
    description: "Watch the AI reason about your data in real-time. It's not a black box.",
    header: <AIConsole />,
    icon: <Search className="h-4 w-4 text-neutral-500" />,
  },
  {
    title: "Glaze isn’t scared of gaps",
    description: "Other tools fail if you don’t have a work email. Glaze uses whatever you have to find what you need.",
    header: <GapFillerVisual />,
    icon: <Database className="h-4 w-4 text-neutral-500" />,
  },
  {
    title: "Work in rows and columns",
    description: "CRMs are great for storing data – not working with it. Manipulate records in a spreadsheet-style interface.",
    header: <SpreadsheetVisual />,
    icon: <Table2 className="h-4 w-4 text-neutral-500" />,
  },
  {
    title: "No record escapes enrichment",
    description: "Use our CRM integrations, webhooks, or CSV uploads to connect every data source.",
    header: <IntegrationVisual />,
    icon: <Layers className="h-4 w-4 text-neutral-500" />,
  },
];
