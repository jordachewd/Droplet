---
title: Enable TypeScript Strict Mode
impact: HIGH
impactDescription: Without strict mode, Zod's type inference is unreliable; undefined and null slip through, defeating the purpose of validation
tags: type, typescript, strict, configuration
---

## Enable TypeScript Strict Mode

Zod requires TypeScript's strict mode to work correctly. Without it, `undefined` sneaks into types, `null` checks are bypassed, and type inference becomes unreliable. This undermines the type safety that Zod provides.

**Incorrect (strict mode disabled):**

```json
// tsconfig.json
{
  "compilerOptions": {
    "strict": false
  }
}
```

```typescript
<<<<<<< HEAD
import { z } from "zod";
=======
import { z } from 'zod'
>>>>>>> devel

const userSchema = z.object({
  name: z.string(),
  email: z.string().email(),
<<<<<<< HEAD
});

type User = z.infer<typeof userSchema>;
=======
})

type User = z.infer<typeof userSchema>
>>>>>>> devel
// With strict:false, type might include undefined implicitly

function processUser(user: User) {
  // No error even if user.name could be undefined
<<<<<<< HEAD
  console.log(user.name.toUpperCase()); // Potential runtime crash
}

// TypeScript allows calling with undefined
processUser(undefined as any); // No warning
=======
  console.log(user.name.toUpperCase())  // Potential runtime crash
}

// TypeScript allows calling with undefined
processUser(undefined as any)  // No warning
>>>>>>> devel
```

**Correct (strict mode enabled):**

```json
// tsconfig.json
{
  "compilerOptions": {
    "strict": true
  }
}
```

```typescript
<<<<<<< HEAD
import { z } from "zod";
=======
import { z } from 'zod'
>>>>>>> devel

const userSchema = z.object({
  name: z.string(),
  email: z.string().email(),
<<<<<<< HEAD
});

type User = z.infer<typeof userSchema>;
=======
})

type User = z.infer<typeof userSchema>
>>>>>>> devel
// { name: string; email: string } - no implicit undefined

function processUser(user: User) {
  // TypeScript knows name is always string
<<<<<<< HEAD
  console.log(user.name.toUpperCase()); // Safe
}

// TypeScript catches potential undefined
processUser(undefined as any); // Error with strict null checks
=======
  console.log(user.name.toUpperCase())  // Safe
}

// TypeScript catches potential undefined
processUser(undefined as any)  // Error with strict null checks
>>>>>>> devel
```

**Minimum strict settings for Zod:**

```json
// tsconfig.json
{
  "compilerOptions": {
    // Full strict mode (recommended)
    "strict": true,

    // Or at minimum, enable these:
    "strictNullChecks": true,
    "noImplicitAny": true
  }
}
```

**Common errors when strict mode is disabled:**

```typescript
// Without strictNullChecks
<<<<<<< HEAD
const schema = z.string().optional();
type MaybeString = z.infer<typeof schema>;
=======
const schema = z.string().optional()
type MaybeString = z.infer<typeof schema>
>>>>>>> devel
// Should be: string | undefined
// Without strict: just string (undefined is implicit)

// Without noImplicitAny
<<<<<<< HEAD
const schema = z.object({ name: z.string() });
schema.parse(data); // data could be 'any', bypassing validation
=======
const schema = z.object({ name: z.string() })
schema.parse(data)  // data could be 'any', bypassing validation
>>>>>>> devel
```

**Migrating to strict mode:**

```typescript
// If enabling strict breaks existing code, fix issues incrementally
// Common fixes:

// 1. Add null checks
if (user.name !== undefined) {
<<<<<<< HEAD
  console.log(user.name.toUpperCase());
}

// 2. Add explicit types
function processData(data: unknown) {
  // Was implicit any
  const validated = schema.parse(data);
=======
  console.log(user.name.toUpperCase())
}

// 2. Add explicit types
function processData(data: unknown) {  // Was implicit any
  const validated = schema.parse(data)
>>>>>>> devel
}

// 3. Handle optional fields
const user: User = {
<<<<<<< HEAD
  name: "John",
  email: "john@example.com", // Now required, was optional without strict
};
```

**When NOT to use this pattern:**

=======
name: 'John',
email: 'john@example.com', // Now required, was optional without strict
}

```

**When NOT to use this pattern:**
>>>>>>> devel
- Never - always enable strict mode for Zod projects

Reference: [Zod Requirements](https://zod.dev/#requirements)
```
