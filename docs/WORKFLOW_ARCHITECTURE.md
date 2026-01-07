# Workflow Architecture Guide

## Overview

The workflow system has been restructured for scalability, maintainability, and ease of extension. The new architecture is based on a plugin system with automatic discovery and registration.

## Architecture Principles

### 1. **Plugin-Based Tools**
Tools (providers) are self-contained modules that register themselves automatically.

### 2. **Strategy Pattern for Plans**
Plans define how to orchestrate tools for specific scenarios.

### 3. **Single Orchestrator**
One unified entry point handles all enrichment operations.

### 4. **Automatic Discovery**
No manual registration needed - just import and the system discovers it.

## Directory Structure

```
apps/workflows/src/
├── core/                      # Core system components
│   ├── registry.ts            # Tool registry
│   ├── plan-registry.ts       # Plan registry
│   ├── orchestrator.ts        # Execution engine
│   └── index.ts               # Barrel export
│
├── tools/                     # Tool implementations
│   └── providers/             # Data providers
│       ├── registry.ts        # Auto-registration
│       ├── github-provider.ts # Individual providers...
│       └── ...
│
├── plans/                     # Execution strategies
│   ├── index.ts               # Auto-registration
│   ├── default.ts             # Default strategy
│   ├── linkedin.ts            # LinkedIn-focused
│   ├── company.ts             # Company-focused
│   └── ...                    # Add more here!
│
├── tasks/                     # Trigger.dev tasks
│   ├── enrich.ts              # Unified enrichment task
│   └── index.ts               # Task exports
│
├── config/                    # Configuration
│   └── enrichment.ts          # System config
│
└── index.ts                   # Main entry point
```

## Adding a New Tool (Provider)

### Step 1: Create Provider File

Create a new file in `tools/providers/`:

```typescript
// tools/providers/my-new-provider.ts
import { defineProvider } from '../../core/registry';

export const myNewProvider = defineProvider({
  name: 'my-new-provider',
  description: 'Description of what this provider does',
  costMultiplier: 1.0, // 0 = free, 1 = normal, 2 = expensive
  supportedFields: ['email', 'company', 'name'],
  requiredInputs: ['linkedinUrl'], // Optional
  
  async execute(input, context) {
    // Implementation here
    const result = await fetchFromAPI(input.linkedinUrl);
    
    return {
      email: result.email,
      company: result.company,
      name: result.name,
    };
  },
  
  // Optional: validate if this provider can handle the input
  validate(input) {
    return !!input.linkedinUrl;
  },
});
```

### Step 2: Register the Provider

Add the import to `tools/providers/registry.ts`:

```typescript
// tools/providers/registry.ts
import './my-new-provider'; // That's it!
```

The provider is now automatically available to all plans!

## Adding a New Plan (Strategy)

### Step 1: Create Plan File

Create a new file in `plans/`:

```typescript
// plans/my-custom-plan.ts
import { definePlan } from '../core/plan-registry';

export const myCustomPlan = definePlan({
  name: 'my-custom-plan',
  description: 'Specialized strategy for X scenario',
  priority: 8, // Higher = more preferred (1-10)
  
  // When should this plan be used?
  canHandle(input, fields) {
    return !!input.email && fields.includes('company');
  },
  
  // Generate execution steps
  async generateSteps(input, fields, budgetCents) {
    const steps = [];
    
    // Use email to find company
    if (fields.includes('company')) {
      steps.push({
        tool: 'my-new-provider',
        field: 'company',
        reason: 'Extract company from email domain',
      });
    }
    
    // Add more steps...
    
    return steps;
  },
  
  // Optional: estimate cost
  estimateCost(input, fields) {
    return fields.length * 2; // 2 cents per field
  },
});
```

### Step 2: Register the Plan

Add the import to `plans/index.ts`:

```typescript
// plans/index.ts
import './my-custom-plan'; // That's it!

export { myCustomPlan } from './my-custom-plan'; // Optional export
```

The plan is now automatically available!

## Using the System

### From a Trigger.dev Task

```typescript
import { enrichTask } from './tasks/enrich';

// Trigger enrichment
const result = await enrichTask.trigger({
  input: {
    linkedinUrl: 'https://linkedin.com/in/example',
    name: 'John Doe',
  },
  fields: ['email', 'company', 'title'],
  budgetCents: 100,
  planName: 'linkedin-focused', // Optional: specify plan
});
```

### Programmatic Usage

```typescript
import { orchestrator } from './core/orchestrator';

const result = await orchestrator.enrich(
  {
    linkedinUrl: 'https://linkedin.com/in/example',
    name: 'John Doe',
  },
  {
    fields: ['email', 'company', 'title'],
    budgetCents: 100,
    planName: 'linkedin-focused', // Optional
  }
);
```

## Plan Selection Logic

1. **Explicit Plan**: If `planName` is specified, use that plan
2. **Auto-Select**: Find all compatible plans using `canHandle()`
3. **Priority Sort**: Sort by priority (highest first)
4. **Pick Best**: Use the highest priority plan

## Cost Management

- Each provider has a `costMultiplier`
- Cost = `base cost * costMultiplier`
- Free providers: multiplier = 0
- Cheap providers: multiplier = 0.5 - 1
- Premium providers: multiplier = 2 - 5

The orchestrator tracks costs and stops execution when budget is exceeded.

## Examples

### Example 1: LinkedIn Enrichment

```typescript
const result = await enrichTask.trigger({
  input: { linkedinUrl: 'https://linkedin.com/in/johndoe' },
  fields: ['name', 'title', 'company', 'email'],
  budgetCents: 50,
});

// Uses 'linkedin-focused' plan (priority 10)
// Steps:
// 1. LinkedIn provider for name, title, company
// 2. GitHub provider for email (free!)
// 3. Email inference for email candidates
```

### Example 2: Company Enrichment

```typescript
const result = await enrichTask.trigger({
  input: { domain: 'example.com' },
  fields: ['company', 'industry', 'size'],
  budgetCents: 30,
});

// Uses 'company-focused' plan (priority 8)
// Steps:
// 1. Company scraper for basic info
// 2. OpenCorporates for official data
// 3. Wikipedia for background
```

### Example 3: Custom Plan

```typescript
const result = await enrichTask.trigger({
  input: { email: 'john@example.com' },
  fields: ['company', 'name'],
  budgetCents: 20,
  planName: 'my-custom-plan', // Explicit plan selection
});
```

## Migration from Legacy Code

### Old Code
```typescript
import { simpleEnrich } from './simple-enrichment';

const result = await simpleEnrich(input, fields, options);
```

### New Code
```typescript
import { orchestrator } from './core/orchestrator';

const result = await orchestrator.enrich(input, {
  fields,
  budgetCents: options.maxCostCents || 100,
});
```

## Testing

### Test a Provider

```typescript
import { getRegistry } from './core/registry';

const provider = getRegistry().get('my-new-provider');
const result = await provider.execute(
  { linkedinUrl: 'https://...' },
  { budgetCents: 100 }
);
```

### Test a Plan

```typescript
import { getPlanRegistry } from './core/plan-registry';

const plan = getPlanRegistry().get('my-custom-plan');
const steps = await plan.generateSteps(input, fields, 100);
console.log('Generated steps:', steps);
```

## Best Practices

1. **Keep Providers Simple**: Each provider should do one thing well
2. **Make Plans Focused**: Create specialized plans for specific scenarios
3. **Use Cost Wisely**: Start with free providers, fallback to premium
4. **Document Providers**: Add clear descriptions and field mappings
5. **Test Incrementally**: Test providers individually before integration
6. **Handle Errors**: Providers should fail gracefully
7. **Cache Results**: Use caching for expensive operations

## Troubleshooting

### Provider Not Found

Make sure it's imported in `tools/providers/registry.ts`

### Plan Not Selected

Check the `canHandle()` logic and priority. Higher priority plans are preferred.

### Budget Exceeded

Increase `budgetCents` or use cheaper providers (lower `costMultiplier`)

### No Compatible Plan

Create a default plan or ensure at least one plan returns `true` from `canHandle()`

## Advanced Topics

### Parallel Execution

Group steps by `parallelGroup` to execute in parallel:

```typescript
return [
  { tool: 'provider1', field: 'email', parallelGroup: 1, reason: '...' },
  { tool: 'provider2', field: 'company', parallelGroup: 1, reason: '...' },
  { tool: 'provider3', field: 'title', parallelGroup: 2, reason: '...' },
];
// Group 1 executes in parallel, then group 2
```

### Dynamic Provider Selection

Use `getRegistry().getByCost(field)` in your plan to dynamically select the cheapest provider:

```typescript
import { getRegistry } from '../core/registry';

generateSteps: async (input, fields, budget) => {
  const steps = [];
  
  for (const field of fields) {
    const providers = getRegistry().getByCost(field);
    if (providers[0]) {
      steps.push({
        tool: providers[0].name,
        field,
        reason: 'Cheapest available provider',
      });
    }
  }
  
  return steps;
}
```

### Rate Limiting

Providers with `rateLimit` will be throttled automatically:

```typescript
export const rateLimitedProvider = defineProvider({
  name: 'rate-limited',
  rateLimit: 5, // 5 requests per second
  // ...
});
```

## Next Steps

1. **Add More Providers**: Expand the tool ecosystem
2. **Create Specialized Plans**: Add domain-specific strategies
3. **Implement Caching**: Add result caching for performance
4. **Add Monitoring**: Track usage, costs, and performance
5. **Build UI**: Create a dashboard for plan/provider management

---

**Questions?** Check the code examples in `/plans` and `/tools/providers` for reference implementations.
