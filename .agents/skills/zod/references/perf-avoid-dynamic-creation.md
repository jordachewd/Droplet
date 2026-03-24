---
title: Avoid Dynamic Schema Creation in Hot Paths
impact: LOW-MEDIUM
impactDescription: Zod 4's JIT compilation makes schema creation slower; creating schemas in loops adds ~0.15ms per creation
tags: perf, dynamic, hot-path, optimization
---

## Avoid Dynamic Schema Creation in Hot Paths

Zod 4 uses JIT (Just-In-Time) compilation to speed up repeated parsing, but this makes initial schema creation slower. Avoid creating schemas inside loops or frequently-called functions—pre-create them instead.

**Incorrect (schema creation in hot path):**

```typescript
<<<<<<< HEAD
import { z } from 'zod'

async function validateBatch(items: unknown[]) {
  const results = []
=======
import { z } from "zod";

async function validateBatch(items: unknown[]) {
  const results = [];
>>>>>>> main

  for (const item of items) {
    // Schema created for EACH item - slow!
    const schema = z.object({
      id: z.string(),
      value: z.number(),
<<<<<<< HEAD
    })

    results.push(schema.safeParse(item))
  }

  return results
=======
    });

    results.push(schema.safeParse(item));
  }

  return results;
>>>>>>> main
}

// 1000 items = 1000 schema creations = ~150ms overhead
```

**Correct (pre-created schema):**

```typescript
<<<<<<< HEAD
import { z } from 'zod'
=======
import { z } from "zod";
>>>>>>> main

// Schema created ONCE
const itemSchema = z.object({
  id: z.string(),
  value: z.number(),
<<<<<<< HEAD
})

async function validateBatch(items: unknown[]) {
  // Reuse the same schema instance
  return items.map(item => itemSchema.safeParse(item))
=======
});

async function validateBatch(items: unknown[]) {
  // Reuse the same schema instance
  return items.map((item) => itemSchema.safeParse(item));
>>>>>>> main
}

// 1000 items = 1 schema creation + 1000 fast parses
```

**Dynamic schemas with caching:**

```typescript
<<<<<<< HEAD
import { z } from 'zod'

// Cache for dynamically-configured schemas
const schemaCache = new WeakMap<object, z.ZodType>()
=======
import { z } from "zod";

// Cache for dynamically-configured schemas
const schemaCache = new WeakMap<object, z.ZodType>();
>>>>>>> main

function getSchemaForConfig(config: { fields: string[] }) {
  // Check cache first
  if (schemaCache.has(config)) {
<<<<<<< HEAD
    return schemaCache.get(config)!
  }

  // Create and cache
  const shape: Record<string, z.ZodString> = {}
  for (const field of config.fields) {
    shape[field] = z.string()
  }

  const schema = z.object(shape)
  schemaCache.set(config, schema)
  return schema
=======
    return schemaCache.get(config)!;
  }

  // Create and cache
  const shape: Record<string, z.ZodString> = {};
  for (const field of config.fields) {
    shape[field] = z.string();
  }

  const schema = z.object(shape);
  schemaCache.set(config, schema);
  return schema;
>>>>>>> main
}

// Subsequent calls with same config reuse cached schema
```

**Lazy schema creation:**

```typescript
<<<<<<< HEAD
import { z } from 'zod'

// Schema created only when first used
let _userSchema: z.ZodObject<any> | null = null
=======
import { z } from "zod";

// Schema created only when first used
let _userSchema: z.ZodObject<any> | null = null;
>>>>>>> main

function getUserSchema() {
  if (!_userSchema) {
    _userSchema = z.object({
      id: z.string().uuid(),
      email: z.string().email(),
      profile: z.object({
        name: z.string(),
        avatar: z.string().url().optional(),
      }),
<<<<<<< HEAD
    })
  }
  return _userSchema
=======
    });
  }
  return _userSchema;
>>>>>>> main
}

// Or use a getter
const schemas = {
  _user: null as z.ZodType | null,
  get user() {
    if (!this._user) {
<<<<<<< HEAD
      this._user = z.object({ /* ... */ })
    }
    return this._user
  }
}
=======
      this._user = z.object({
        /* ... */
      });
    }
    return this._user;
  },
};
>>>>>>> main
```

**Benchmark considerations:**

```typescript
// Zod 4 JIT compilation:
// - Schema creation: ~0.15ms per schema
// - First parse: triggers JIT compile
// - Subsequent parses: 7-14x faster

// For schemas used once:
// - Creation + parse: ~0.15ms + first-parse overhead
// - Consider if validation is even needed

// For schemas used many times:
// - Create once, parse many: optimal
// - JIT compilation amortized over all parses
```

**When NOT to use this pattern:**
<<<<<<< HEAD
=======

> > > > > > > main

- One-off validation where schema is used once
- Dynamically generated forms where fields change per request
- Test files where performance doesn't matter

Reference: [Zod v4 Performance](https://zod.dev/v4#performance)
