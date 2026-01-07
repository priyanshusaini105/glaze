# Workflows

> **✨ New Architecture!** The workflow system has been completely restructured for scalability and ease of extension.

Trigger.dev v3 workflows for enrichment pipeline orchestration with a plugin-based architecture.

## 🚀 Quick Start

### Use the Unified Enrichment Task

```typescript
import { enrichTask } from '@workflows/tasks/enrich';

const result = await enrichTask.trigger({
  input: { linkedinUrl: 'https://linkedin.com/in/example' },
  fields: ['email', 'company', 'title'],
  budgetCents: 100,
});
```

### Add a New Tool (in 2 steps!)

1. Create `tools/providers/my-tool.ts`:
```typescript
import { defineProvider } from '../../core/registry';

export const myTool = defineProvider({
  name: 'my-tool',
  description: 'What this tool does',
  costMultiplier: 1.0,
  supportedFields: ['email'],
  async execute(input, context) {
    return { email: 'found@example.com' };
  }
});
```

2. Register in `tools/providers/registry.ts`:
```typescript
import './my-tool';
```

**Done!** Your tool is now available to all plans.

### Add a New Plan (Strategy)

1. Create `plans/my-plan.ts`:
```typescript
import { definePlan } from '../core/plan-registry';

export const myPlan = definePlan({
  name: 'my-plan',
  priority: 5,
  canHandle: (input, fields) => !!input.email,
  generateSteps: async (input, fields, budget) => [
    { tool: 'my-tool', field: 'email', reason: 'Custom logic' }
  ]
});
```

2. Register in `plans/index.ts`:
```typescript
import './my-plan';
```

**Done!** Your plan is now available.

## 📚 Documentation

- **[Architecture Guide](../../docs/WORKFLOW_ARCHITECTURE.md)** - Complete system overview
- **[Quick Reference](../../docs/WORKFLOW_QUICK_START.md)** - Cheat sheet for adding tools/plans

## 📁 Structure

```
src/
├── core/              # Core system (registry, orchestrator)
├── tools/             # Tool implementations
│   └── providers/     # Data providers (add new tools here!)
├── plans/             # Execution strategies (add new plans here!)
├── tasks/             # Trigger.dev tasks
├── config/            # Configuration
└── index.ts           # Main entry point
```

## 🏗️ Architecture Overview

The new architecture is based on three core concepts:

### 1. Tools (Providers)
Self-contained modules that fetch data from various sources.

- Auto-discovered and registered
- Simple interface: `execute(input, context) => data`
- Cost tracking via `costMultiplier`

### 2. Plans (Strategies)
Define how to orchestrate tools for specific scenarios.

- Auto-discovered and registered
- Priority-based selection
- Generate execution steps dynamically

### 3. Orchestrator
Single unified entry point that:

- Selects the best plan
- Executes steps in order
- Tracks costs and provenance
- Handles errors and cancellation

## 🔧 Development

### Install Dependencies

```bash
pnpm install
```

### Run Development Server

```bash
pnpm dev
```

### Deploy to Trigger.dev

```bash
pnpm deploy
```

## 🎯 Available Tasks

### New Unified Task (Recommended)

- **`enrich`** - Unified enrichment with plugin system

### Production Tasks

- **`process-enrichment-job`** - Cell-level enrichment orchestration
- **`enrich-cell`** - Single cell enrichment
- **`process-entity-enrichment`** - Entity-based enrichment

### Legacy Tasks (Deprecated)

- **`enrich-data`** - Old URL enrichment
- **`batch-enrich`** - Old batch enrichment
- **`multi-agent-enrichment`** - Old multi-agent system

## 🧪 Testing

### Test a Provider

```typescript
import { getRegistry } from './src/core/registry';

const provider = getRegistry().get('github');
const result = await provider.execute(
  { linkedinUrl: 'https://...' },
  { budgetCents: 100 }
);
```

### Test a Plan

```typescript
import { getPlanRegistry } from './src/core/plan-registry';

const plan = getPlanRegistry().get('linkedin-focused');
const steps = await plan.generateSteps(input, fields, 100);
```

## 📊 Cost Management

Each provider has a `costMultiplier`:

- **0** - Free (GitHub, Wikipedia, OpenCorporates)
- **0.5-1** - Cheap (Serper, Prospeo free tiers)
- **2-5** - Premium (LinkedIn API)

Budget is tracked automatically and execution stops when exceeded.

## 🔄 Migration Guide

### From Old Code

```typescript
// OLD
import { simpleEnrich } from './simple-enrichment';
const result = await simpleEnrich(input, fields, options);

// NEW
import { orchestrator } from './core/orchestrator';
const result = await orchestrator.enrich(input, {
  fields,
  budgetCents: options.maxCostCents || 100,
});
```

## 🌟 Examples

### LinkedIn Profile Enrichment

```typescript
const result = await enrichTask.trigger({
  input: { linkedinUrl: 'https://linkedin.com/in/johndoe' },
  fields: ['name', 'title', 'company', 'email'],
  budgetCents: 50,
});
// Uses 'linkedin-focused' plan automatically
```

### Company Domain Enrichment

```typescript
const result = await enrichTask.trigger({
  input: { domain: 'example.com' },
  fields: ['company', 'industry', 'size'],
  budgetCents: 30,
});
// Uses 'company-focused' plan automatically
```

### Custom Plan Selection

```typescript
const result = await enrichTask.trigger({
  input: { email: 'john@example.com' },
  fields: ['company', 'name'],
  budgetCents: 20,
  planName: 'my-custom-plan', // Explicit selection
});
```

## 🛠️ Troubleshooting

### Provider Not Found

Ensure it's imported in `tools/providers/registry.ts`

### Plan Not Selected

Check `canHandle()` logic and priority value

### Budget Exceeded

Increase `budgetCents` or use cheaper providers

## 📝 Contributing

1. Add new tools in `tools/providers/`
2. Add new plans in `plans/`
3. Update tests
4. Document your changes

## 📄 License

See root LICENSE file.

---

**For detailed documentation, see [docs/WORKFLOW_ARCHITECTURE.md](../../docs/WORKFLOW_ARCHITECTURE.md)**
