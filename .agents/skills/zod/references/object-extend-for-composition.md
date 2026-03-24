---
title: Use extend() for Adding Fields
impact: MEDIUM-HIGH
impactDescription: Merging objects manually loses type information; extend() preserves types and allows overriding fields safely
tags: object, extend, composition, inheritance
---

## Use extend() for Adding Fields

When building on existing schemas, use `.extend()` to add new fields rather than manually spreading. Extend preserves type information, allows overriding existing fields, and keeps the schema relationship explicit.

**Incorrect (manual object spreading):**

```typescript
<<<<<<< HEAD
import { z } from 'zod'
=======
import { z } from "zod";
>>>>>>> main

const baseUserSchema = z.object({
  id: z.string(),
  name: z.string(),
<<<<<<< HEAD
})

// Manual spreading loses Zod's schema relationship
const adminUserSchema = z.object({
  ...baseUserSchema.shape,  // Accessing internal .shape
  role: z.literal('admin'),
  permissions: z.array(z.string()),
})
=======
});

// Manual spreading loses Zod's schema relationship
const adminUserSchema = z.object({
  ...baseUserSchema.shape, // Accessing internal .shape
  role: z.literal("admin"),
  permissions: z.array(z.string()),
});
>>>>>>> main

// Problems:
// 1. If baseUserSchema changes, TypeScript might not catch issues
// 2. Can't override fields easily
// 3. Loses schema methods and metadata
```

**Correct (using extend):**

```typescript
<<<<<<< HEAD
import { z } from 'zod'
=======
import { z } from "zod";
>>>>>>> main

const baseUserSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
<<<<<<< HEAD
})

// Extend to add fields
const adminUserSchema = baseUserSchema.extend({
  role: z.literal('admin'),
  permissions: z.array(z.string()),
})

type AdminUser = z.infer<typeof adminUserSchema>
=======
});

// Extend to add fields
const adminUserSchema = baseUserSchema.extend({
  role: z.literal("admin"),
  permissions: z.array(z.string()),
});

type AdminUser = z.infer<typeof adminUserSchema>;
>>>>>>> main
// {
//   id: string;
//   name: string;
//   email: string;
//   role: 'admin';
//   permissions: string[];
// }

// Override existing fields
const strictEmailSchema = baseUserSchema.extend({
<<<<<<< HEAD
  email: z.string().email().endsWith('@company.com'),  // Stricter validation
})
=======
  email: z.string().email().endsWith("@company.com"), // Stricter validation
});
>>>>>>> main
```

**Building hierarchies with extend:**

```typescript
// Base entity with common fields
const entitySchema = z.object({
  id: z.string().uuid(),
  createdAt: z.date(),
  updatedAt: z.date(),
<<<<<<< HEAD
})
=======
});
>>>>>>> main

// User extends entity
const userSchema = entitySchema.extend({
  email: z.string().email(),
  name: z.string(),
<<<<<<< HEAD
})
=======
});
>>>>>>> main

// Product extends entity
const productSchema = entitySchema.extend({
  name: z.string(),
  price: z.number().positive(),
  sku: z.string(),
<<<<<<< HEAD
})
=======
});
>>>>>>> main

// Order extends entity with references
const orderSchema = entitySchema.extend({
  userId: z.string().uuid(),
<<<<<<< HEAD
  items: z.array(z.object({
    productId: z.string().uuid(),
    quantity: z.number().int().positive(),
  })),
  total: z.number().positive(),
})
=======
  items: z.array(
    z.object({
      productId: z.string().uuid(),
      quantity: z.number().int().positive(),
    }),
  ),
  total: z.number().positive(),
});
>>>>>>> main
```

**Combining extend with other methods:**

```typescript
const baseSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
<<<<<<< HEAD
})

// Create input: no id, add password
const createSchema = baseSchema
  .omit({ id: true })
  .extend({
    password: z.string().min(8),
  })

// Update input: all optional except id
const updateSchema = baseSchema
  .partial()
  .extend({
    id: z.string(),  // Override to make required
  })
=======
});

// Create input: no id, add password
const createSchema = baseSchema.omit({ id: true }).extend({
  password: z.string().min(8),
});

// Update input: all optional except id
const updateSchema = baseSchema.partial().extend({
  id: z.string(), // Override to make required
});
>>>>>>> main
```

**Merge for combining independent schemas:**

```typescript
const addressSchema = z.object({
  street: z.string(),
  city: z.string(),
<<<<<<< HEAD
})
=======
});
>>>>>>> main

const contactSchema = z.object({
  email: z.string().email(),
  phone: z.string(),
<<<<<<< HEAD
})

// Merge combines two schemas (both required)
const customerSchema = addressSchema.merge(contactSchema)
=======
});

// Merge combines two schemas (both required)
const customerSchema = addressSchema.merge(contactSchema);
>>>>>>> main
// { street: string; city: string; email: string; phone: string }
```

**When NOT to use this pattern:**
<<<<<<< HEAD
=======

> > > > > > > main

- When schemas are genuinely independent (use merge or intersection)
- When you need to remove fields (use omit)

Reference: [Zod API - extend](https://zod.dev/api#extend)
