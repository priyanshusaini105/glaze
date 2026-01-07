# Quick Reference: Adding Tools and Plans

## Add a New Tool (Provider)

### 1. Create the provider file

```typescript
// apps/workflows/src/tools/providers/my-tool.ts
import { defineProvider } from '../../core/registry';

export const myTool = defineProvider({
  name: 'my-tool',
  description: 'What this tool does',
  costMultiplier: 1.0, // 0=free, 1=normal, 2=expensive
  supportedFields: ['email', 'company'],
  
  async execute(input, context) {
    // Your logic here
    return { email: 'found@example.com' };
  }
});
```

### 2. Register it

```typescript
// apps/workflows/src/tools/providers/registry.ts
import './my-tool'; // Add this line
```

**Done!** The tool is now available to all plans.

---

## Add a New Plan (Strategy)

### 1. Create the plan file

```typescript
// apps/workflows/src/plans/my-plan.ts
import { definePlan } from '../core/plan-registry';

export const myPlan = definePlan({
  name: 'my-plan',
  description: 'My custom strategy',
  priority: 5, // 1-10, higher = more preferred
  
  canHandle: (input, fields) => {
    return !!input.linkedinUrl; // When to use this plan
  },
  
  generateSteps: async (input, fields, budget) => {
    return [
      { tool: 'linkedin', field: 'name', reason: 'Get from LinkedIn' },
      { tool: 'github', field: 'email', reason: 'Free email lookup' },
    ];
  }
});
```

### 2. Register it

```typescript
// apps/workflows/src/plans/index.ts
import './my-plan'; // Add this line
export { myPlan } from './my-plan'; // Optional
```

**Done!** The plan is now available.

---

## Use the System

### From a Task

```typescript
import { enrichTask } from './tasks/enrich';

await enrichTask.trigger({
  input: { linkedinUrl: 'https://...' },
  fields: ['email', 'company'],
  budgetCents: 100,
  planName: 'my-plan', // Optional
});
```

### Programmatically

```typescript
import { orchestrator } from './core/orchestrator';

const result = await orchestrator.enrich(input, {
  fields: ['email', 'company'],
  budgetCents: 100,
});
```

---

## Common Patterns

### Free Tool (Scraping, Public APIs)

```typescript
costMultiplier: 0
```

### Cheap Tool (Limited Free Tier)

```typescript
costMultiplier: 0.5
```

### Premium Tool (Paid API)

```typescript
costMultiplier: 2.0
```

### Require Specific Input

```typescript
requiredInputs: ['linkedinUrl']
```

### Parallel Execution

```typescript
generateSteps: async () => [
  { tool: 'tool1', field: 'email', parallelGroup: 1, reason: '' },
  { tool: 'tool2', field: 'company', parallelGroup: 1, reason: '' },
  { tool: 'tool3', field: 'name', parallelGroup: 2, reason: '' },
]
// Group 1 runs in parallel, then group 2
```

---

## File Locations

```
apps/workflows/src/
├── tools/providers/    → Add new tools here
├── plans/              → Add new plans here
├── core/               → Core system (don't modify)
└── tasks/              → Trigger.dev tasks
```

---

## Need Help?

See [WORKFLOW_ARCHITECTURE.md](./WORKFLOW_ARCHITECTURE.md) for detailed guide.
