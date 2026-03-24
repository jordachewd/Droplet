---
title: Distinguish optional() from nullable()
impact: MEDIUM-HIGH
impactDescription: Confusing undefined and null semantics causes "property does not exist" vs "property is null" bugs; choose deliberately
tags: object, optional, nullable, undefined
---

## Distinguish optional() from nullable()

`.optional()` allows `undefined` (field can be missing), while `.nullable()` allows `null` (field must be present but can be null). Choosing the wrong one causes subtle bugs in database operations, JSON serialization, and API contracts.

**Incorrect (confusing optional and nullable):**

```typescript
<<<<<<< HEAD
import { z } from 'zod'
=======
import { z } from "zod";
>>>>>>> main

const userSchema = z.object({
  name: z.string(),
  // Intended: field might not exist
<<<<<<< HEAD
  nickname: z.string().nullable(),  // Wrong! Requires field to be present
  // Intended: field exists but might be null
  deletedAt: z.date().optional(),  // Wrong! Allows field to be missing
})

// This fails - nickname is required
userSchema.parse({ name: 'John' })
// ZodError: Required at "nickname"

// This passes but loses semantic meaning
userSchema.parse({ name: 'John', nickname: null, deletedAt: undefined })
=======
  nickname: z.string().nullable(), // Wrong! Requires field to be present
  // Intended: field exists but might be null
  deletedAt: z.date().optional(), // Wrong! Allows field to be missing
});

// This fails - nickname is required
userSchema.parse({ name: "John" });
// ZodError: Required at "nickname"

// This passes but loses semantic meaning
userSchema.parse({ name: "John", nickname: null, deletedAt: undefined });
>>>>>>> main
// Is deletedAt undefined because not deleted, or because data is incomplete?
```

**Correct (using optional and nullable deliberately):**

```typescript
<<<<<<< HEAD
import { z } from 'zod'
=======
import { z } from "zod";
>>>>>>> main

const userSchema = z.object({
  name: z.string(),

  // optional() - field might not exist in the object
  nickname: z.string().optional(),
  // Type: string | undefined

  // nullable() - field must exist, but value can be null
  deletedAt: z.date().nullable(),
  // Type: Date | null
<<<<<<< HEAD
})

// Field can be omitted
userSchema.parse({ name: 'John', deletedAt: null })  // Valid

// Field must be present (even if null)
userSchema.parse({ name: 'John', nickname: 'Johnny' })
=======
});

// Field can be omitted
userSchema.parse({ name: "John", deletedAt: null }); // Valid

// Field must be present (even if null)
userSchema.parse({ name: "John", nickname: "Johnny" });
>>>>>>> main
// ZodError: Required at "deletedAt"

// Correct usage
userSchema.parse({
<<<<<<< HEAD
  name: 'John',
  nickname: 'Johnny',  // Or omit entirely
  deletedAt: null,  // Must be present, null means "not deleted"
})
=======
  name: "John",
  nickname: "Johnny", // Or omit entirely
  deletedAt: null, // Must be present, null means "not deleted"
});
>>>>>>> main
```

**When to use each:**

```typescript
// optional() - field may not exist
// Use for: Optional form fields, sparse updates, optional config
z.object({
<<<<<<< HEAD
  bio: z.string().optional(),  // User might not have filled this
  middleName: z.string().optional(),  // Not everyone has one
})
=======
  bio: z.string().optional(), // User might not have filled this
  middleName: z.string().optional(), // Not everyone has one
});
>>>>>>> main

// nullable() - field exists but value can be null
// Use for: Database nullable columns, "cleared" values, explicit absence
z.object({
<<<<<<< HEAD
  deletedAt: z.date().nullable(),  // null = not deleted, Date = when deleted
  parentId: z.string().nullable(),  // null = root node, string = has parent
  approvedBy: z.string().nullable(),  // null = pending, string = approver
})
=======
  deletedAt: z.date().nullable(), // null = not deleted, Date = when deleted
  parentId: z.string().nullable(), // null = root node, string = has parent
  approvedBy: z.string().nullable(), // null = pending, string = approver
});
>>>>>>> main

// nullish() - either undefined or null
// Use for: Lenient APIs, legacy data, optional nullable DB columns
z.object({
<<<<<<< HEAD
  legacyField: z.string().nullish(),  // string | null | undefined
})
=======
  legacyField: z.string().nullish(), // string | null | undefined
});
>>>>>>> main
```

**API response patterns:**

```typescript
// API includes null for "no value" (good for explicit absence)
const apiResponseSchema = z.object({
  data: z.object({
<<<<<<< HEAD
    user: z.object({
      name: z.string(),
      avatar: z.string().nullable(),  // null = no avatar set
    }).nullable(),  // null = user not found
  }),
})
=======
    user: z
      .object({
        name: z.string(),
        avatar: z.string().nullable(), // null = no avatar set
      })
      .nullable(), // null = user not found
  }),
});
>>>>>>> main

// Type: { data: { user: { name: string; avatar: string | null } | null } }

// Partial updates send only changed fields
const updateSchema = z.object({
<<<<<<< HEAD
  name: z.string().optional(),  // Omitted = don't change
  avatar: z.string().nullable().optional(),  // null = clear avatar
})
```

# **When NOT to use this pattern:**

name: z.string().optional(), // Omitted = don't change
avatar: z.string().nullable().optional(), // null = clear avatar
});

```

**When NOT to use this pattern:**

>>>>>>> main
- When interacting with systems that treat null and undefined as equivalent
- When using nullish() for maximum flexibility is acceptable

Reference: [Zod API - optional/nullable](https://zod.dev/api#optional)
```
