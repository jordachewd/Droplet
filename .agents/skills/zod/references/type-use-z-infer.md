---
title: Use z.infer Instead of Manual Types
impact: HIGH
impactDescription: Manual type definitions drift from schemas over time; z.infer guarantees types match validation exactly
tags: type, infer, typescript, dry
---

## Use z.infer Instead of Manual Types

Defining TypeScript types separately from Zod schemas creates duplication that inevitably drifts. When you update a schema, you must remember to update the type—and you will forget. Use `z.infer<typeof schema>` to derive types from schemas automatically.

**Incorrect (manual type definitions):**

```typescript
<<<<<<< HEAD
import { z } from "zod";

// Manual type definition
interface User {
  id: string;
  name: string;
  email: string;
  age: number;
=======
import { z } from 'zod'

// Manual type definition
interface User {
  id: string
  name: string
  email: string
  age: number
>>>>>>> devel
}

// Separate schema
const userSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  email: z.string().email(),
  age: z.number().int().positive(),
<<<<<<< HEAD
  role: z.enum(["admin", "user"]), // Added to schema, forgot to add to interface!
});

// Type and schema are now out of sync
function createUser(user: User) {
  const validated = userSchema.parse(user); // Has role
  saveToDb(user); // Missing role - TypeScript doesn't warn
=======
  role: z.enum(['admin', 'user']),  // Added to schema, forgot to add to interface!
})

// Type and schema are now out of sync
function createUser(user: User) {
  const validated = userSchema.parse(user)  // Has role
  saveToDb(user)  // Missing role - TypeScript doesn't warn
>>>>>>> devel
}
```

**Correct (using z.infer):**

```typescript
<<<<<<< HEAD
import { z } from "zod";
=======
import { z } from 'zod'
>>>>>>> devel

// Schema is the single source of truth
const userSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  email: z.string().email(),
  age: z.number().int().positive(),
<<<<<<< HEAD
  role: z.enum(["admin", "user"]),
});

// Type is always in sync with schema
type User = z.infer<typeof userSchema>;
=======
  role: z.enum(['admin', 'user']),
})

// Type is always in sync with schema
type User = z.infer<typeof userSchema>
>>>>>>> devel
// { id: string; name: string; email: string; age: number; role: 'admin' | 'user' }

function createUser(user: User) {
  // user.role exists because type is derived from schema
<<<<<<< HEAD
  const validated = userSchema.parse(user);
  saveToDb(validated);
=======
  const validated = userSchema.parse(user)
  saveToDb(validated)
>>>>>>> devel
}
```

**Input vs Output types with transforms:**

```typescript
const userSchema = z.object({
  name: z.string(),
<<<<<<< HEAD
  createdAt: z.string().transform((s) => new Date(s)), // String in, Date out
});

// z.infer gives output type (after transforms)
type User = z.infer<typeof userSchema>;
// { name: string; createdAt: Date }

// z.input gives input type (before transforms)
type UserInput = z.input<typeof userSchema>;
=======
  createdAt: z.string().transform(s => new Date(s)),  // String in, Date out
})

// z.infer gives output type (after transforms)
type User = z.infer<typeof userSchema>
// { name: string; createdAt: Date }

// z.input gives input type (before transforms)
type UserInput = z.input<typeof userSchema>
>>>>>>> devel
// { name: string; createdAt: string }

// Use input type for function parameters accepting raw data
function processUser(input: UserInput) {
<<<<<<< HEAD
  const user = userSchema.parse(input); // user is User type
  return user.createdAt.getTime(); // Date methods available
=======
  const user = userSchema.parse(input)  // user is User type
  return user.createdAt.getTime()  // Date methods available
>>>>>>> devel
}
```

**Naming convention:**

```typescript
// Schema named with Schema suffix
const UserSchema = z.object({
  id: z.string(),
  name: z.string(),
<<<<<<< HEAD
});

// Type named without suffix
type User = z.infer<typeof UserSchema>;

// Alternative: lowercase schema, uppercase type
const userSchema = z.object({
  /*...*/
});
type User = z.infer<typeof userSchema>;
```

**When NOT to use this pattern:**

=======
})

// Type named without suffix
type User = z.infer<typeof UserSchema>

// Alternative: lowercase schema, uppercase type
const userSchema = z.object({/_..._/})
type User = z.infer<typeof userSchema>

```

**When NOT to use this pattern:**
>>>>>>> devel
- When you need a type that's different from the validation schema
- When interfacing with external types you don't control

Reference: [Zod - Type Inference](https://zod.dev/api#type-inference)
```
