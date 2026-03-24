---
title: Use partial() for Update Schemas
impact: MEDIUM-HIGH
impactDescription: Creating separate update schemas duplicates definitions; partial() derives update schema from base, staying in sync
tags: object, partial, update, patch
---

## Use partial() for Update Schemas

When handling PATCH/PUT updates, you need a schema where all fields are optional. Instead of duplicating the schema with optional fields, use `.partial()` to derive it from your base schema. This keeps both schemas in sync automatically.

**Incorrect (duplicating schemas):**

<<<<<<< HEAD
```typescript
<<<<<<< HEAD
import { z } from "zod";
=======
import { z } from 'zod'
>>>>>>> devel

=======
```typescriptimport { z } from "zod";
>>>>>>> devel
// Base schema
const userSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
<<<<<<< HEAD
  age: z.number().int().positive(),
<<<<<<< HEAD
  role: z.enum(["admin", "user"]),
});
=======
  role: z.enum(['admin', 'user']),
})
>>>>>>> devel

=======
  age: z.number().int().positive(),  role: z.enum(["admin", "user"]),
});
>>>>>>> devel
// Manually duplicated for updates - will drift!
const updateUserSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  age: z.number().int().positive().optional(),
<<<<<<< HEAD
  // Forgot to add role - schemas out of sync!
<<<<<<< HEAD
});
=======
})
>>>>>>> devel

=======
  // Forgot to add role - schemas out of sync!});
>>>>>>> devel
// Later, you add a field to userSchema but forget updateUserSchema
// Now updates silently ignore the new field
```

**Correct (using partial):**

<<<<<<< HEAD
```typescript
<<<<<<< HEAD
import { z } from "zod";
=======
import { z } from 'zod'
>>>>>>> devel

=======
```typescriptimport { z } from "zod";
>>>>>>> devel
// Base schema - single source of truth
const userSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
<<<<<<< HEAD
  age: z.number().int().positive(),
<<<<<<< HEAD
  role: z.enum(["admin", "user"]),
=======
  age: z.number().int().positive(),  role: z.enum(["admin", "user"]),
>>>>>>> devel
});

// All fields optional for updates
const updateUserSchema = userSchema.partial();

type User = z.infer<typeof userSchema>;
// { name: string; email: string; age: number; role: 'admin' | 'user' }

type UpdateUser = z.infer<typeof updateUserSchema>;
// { name?: string; email?: string; age?: number; role?: 'admin' | 'user' }

// Validate partial updates
updateUserSchema.parse({ email: "new@example.com" }); // Valid
<<<<<<< HEAD
updateUserSchema.parse({}); // Valid - all fields optional
=======
  role: z.enum(['admin', 'user']),
})

// All fields optional for updates
const updateUserSchema = userSchema.partial()

type User = z.infer<typeof userSchema>
// { name: string; email: string; age: number; role: 'admin' | 'user' }

type UpdateUser = z.infer<typeof updateUserSchema>
// { name?: string; email?: string; age?: number; role?: 'admin' | 'user' }

// Validate partial updates
updateUserSchema.parse({ email: 'new@example.com' })  // Valid
updateUserSchema.parse({})  // Valid - all fields optional
>>>>>>> devel
```
=======
updateUserSchema.parse({}); // Valid - all fields optional```
>>>>>>> devel

**Partial specific fields only:**

```typescript
// Only name and email are optional for updates
const updateUserSchema = userSchema.partial({
  name: true,
<<<<<<< HEAD
  email: true,
<<<<<<< HEAD
});

type UpdateUser = z.infer<typeof updateUserSchema>;
=======
})

type UpdateUser = z.infer<typeof updateUserSchema>
>>>>>>> devel
// { name?: string; email?: string; age: number; role: 'admin' | 'user' }
=======
  email: true,});

type UpdateUser = z.infer<typeof updateUserSchema>;// { name?: string; email?: string; age: number; role: 'admin' | 'user' }
>>>>>>> devel
// age and role still required
```

**Deep partial for nested objects:**

```typescript
const addressSchema = z.object({
  street: z.string(),
  city: z.string(),
<<<<<<< HEAD
  country: z.string(),
<<<<<<< HEAD
});
=======
})
>>>>>>> devel

const userSchema = z.object({
  name: z.string(),
  address: addressSchema,
<<<<<<< HEAD
});

// .partial() only makes top-level fields optional
const shallowPartial = userSchema.partial();
=======
})

// .partial() only makes top-level fields optional
const shallowPartial = userSchema.partial()
>>>>>>> devel
// { name?: string; address?: { street: string; city: string; country: string } }
// If address is provided, all its fields are still required!

// Use deepPartial for nested optionality
<<<<<<< HEAD
const deepPartialSchema = userSchema.deepPartial();
=======
const deepPartialSchema = userSchema.deepPartial()
>>>>>>> devel
// { name?: string; address?: { street?: string; city?: string; country?: string } }
=======
  country: z.string(),});
const userSchema = z.object({
  name: z.string(),
  address: addressSchema,});

// .partial() only makes top-level fields optional
const shallowPartial = userSchema.partial();// { name?: string; address?: { street: string; city: string; country: string } }
// If address is provided, all its fields are still required!

// Use deepPartial for nested optionalityconst deepPartialSchema = userSchema.deepPartial();// { name?: string; address?: { street?: string; city?: string; country?: string } }
>>>>>>> devel
```

**Combining with required() for create vs update:**

```typescript
const baseSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  email: z.string().email(),
  createdAt: z.date(),
<<<<<<< HEAD
<<<<<<< HEAD
=======
})

// Create: id and createdAt are generated, rest required
const createSchema = baseSchema.omit({ id: true, createdAt: true })

// Update: all user-editable fields optional
const updateSchema = baseSchema.partial().omit({ id: true, createdAt: true })
```

# **When NOT to use this pattern:**

>>>>>>> devel
});

// Create: id and createdAt are generated, rest required
const createSchema = baseSchema.omit({ id: true, createdAt: true });

// Update: all user-editable fields optional
const updateSchema = baseSchema.partial().omit({ id: true, createdAt: true });

```

**When NOT to use this pattern:**
<<<<<<< HEAD

=======
})

// Create: id and createdAt are generated, rest required
const createSchema = baseSchema.omit({ id: true, createdAt: true })

// Update: all user-editable fields optional
const updateSchema = baseSchema.partial().omit({ id: true, createdAt: true })

```

**When NOT to use this pattern:**
>>>>>>> devel
=======
>>>>>>> devel
- When update logic differs significantly from create (different validations)
- When using GraphQL with explicit input types

Reference: [Zod API - partial](https://zod.dev/api#partial)
```
