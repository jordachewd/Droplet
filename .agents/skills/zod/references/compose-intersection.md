---
title: Use intersection() for Type Combinations
impact: MEDIUM
impactDescription: Manual field combination loses type relationships; intersection creates proper TypeScript intersection types
tags: compose, intersection, and, combination
---

## Use intersection() for Type Combinations

When you need an object that satisfies multiple schemas simultaneously (like combining a base type with mixins), use `.and()` or `z.intersection()`. This creates proper TypeScript intersection types and validates against all schemas.

**Incorrect (manual combination):**

```typescript
<<<<<<< HEAD
import { z } from 'zod'
=======
import { z } from "zod";
>>>>>>> main

const timestampsSchema = z.object({
  createdAt: z.date(),
  updatedAt: z.date(),
<<<<<<< HEAD
})
=======
});
>>>>>>> main

const softDeleteSchema = z.object({
  deletedAt: z.date().nullable(),
  deletedBy: z.string().nullable(),
<<<<<<< HEAD
})
=======
});
>>>>>>> main

const userSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
<<<<<<< HEAD
})
=======
});
>>>>>>> main

// Manual combination - verbose and error-prone
const fullUserSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
  createdAt: z.date(),
  updatedAt: z.date(),
  deletedAt: z.date().nullable(),
  deletedBy: z.string().nullable(),
<<<<<<< HEAD
})
=======
});
>>>>>>> main
```

**Correct (using intersection):**

```typescript
<<<<<<< HEAD
import { z } from 'zod'
=======
import { z } from "zod";
>>>>>>> main

const timestampsSchema = z.object({
  createdAt: z.date(),
  updatedAt: z.date(),
<<<<<<< HEAD
})
=======
});
>>>>>>> main

const softDeleteSchema = z.object({
  deletedAt: z.date().nullable(),
  deletedBy: z.string().nullable(),
<<<<<<< HEAD
})
=======
});
>>>>>>> main

const userSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
<<<<<<< HEAD
})

// Using .and() for intersection
const fullUserSchema = userSchema
  .and(timestampsSchema)
  .and(softDeleteSchema)
=======
});

// Using .and() for intersection
const fullUserSchema = userSchema.and(timestampsSchema).and(softDeleteSchema);
>>>>>>> main

// Or using z.intersection()
const fullUserSchema2 = z.intersection(
  z.intersection(userSchema, timestampsSchema),
<<<<<<< HEAD
  softDeleteSchema
)

type FullUser = z.infer<typeof fullUserSchema>
=======
  softDeleteSchema,
);

type FullUser = z.infer<typeof fullUserSchema>;
>>>>>>> main
// {
//   id: string;
//   name: string;
//   email: string;
//   createdAt: Date;
//   updatedAt: Date;
//   deletedAt: Date | null;
//   deletedBy: string | null;
// }
```

**Creating mixins:**

```typescript
// Reusable mixins
const auditable = z.object({
  createdBy: z.string(),
  updatedBy: z.string(),
<<<<<<< HEAD
})

const versioned = z.object({
  version: z.number().int().positive(),
})

const tagged = z.object({
  tags: z.array(z.string()),
})

// Apply mixins to any schema
function withAudit<T extends z.ZodRawShape>(schema: z.ZodObject<T>) {
  return schema.and(auditable).and(timestampsSchema)
}

function withVersioning<T extends z.ZodRawShape>(schema: z.ZodObject<T>) {
  return schema.and(versioned)
=======
});

const versioned = z.object({
  version: z.number().int().positive(),
});

const tagged = z.object({
  tags: z.array(z.string()),
});

// Apply mixins to any schema
function withAudit<T extends z.ZodRawShape>(schema: z.ZodObject<T>) {
  return schema.and(auditable).and(timestampsSchema);
}

function withVersioning<T extends z.ZodRawShape>(schema: z.ZodObject<T>) {
  return schema.and(versioned);
>>>>>>> main
}

// Usage
const documentSchema = z.object({
  id: z.string(),
  title: z.string(),
  content: z.string(),
<<<<<<< HEAD
})

const fullDocumentSchema = withAudit(withVersioning(documentSchema))
=======
});

const fullDocumentSchema = withAudit(withVersioning(documentSchema));
>>>>>>> main
```

**Intersection vs Merge:**

```typescript
// .merge() - replaces fields from first with second
<<<<<<< HEAD
const a = z.object({ x: z.string(), y: z.number() })
const b = z.object({ y: z.string() })  // y is string, not number

a.merge(b)  // { x: string, y: string } - b's y wins

// .and() - requires fields to be compatible
// If both have y with different types, intersection fails at runtime
a.and(b)  // Validation will fail - y can't be both number and string
```

# **When NOT to use this pattern:**

const a = z.object({ x: z.string(), y: z.number() });
const b = z.object({ y: z.string() }); // y is string, not number

a.merge(b); // { x: string, y: string } - b's y wins

// .and() - requires fields to be compatible
// If both have y with different types, intersection fails at runtime
a.and(b); // Validation will fail - y can't be both number and string

```

**When NOT to use this pattern:**

>>>>>>> main
- When schemas have overlapping fields with different types (use merge)
- When you need to override fields (use extend)
- Simple cases where extend works fine

Reference: [Zod API - intersection](https://zod.dev/api#intersection)
```
