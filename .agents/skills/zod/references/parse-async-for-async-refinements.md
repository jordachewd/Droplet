---
title: Use parseAsync for Async Refinements
impact: CRITICAL
impactDescription: Using parse() with async refinements throws an error; async validation silently fails or crashes the application
tags: parse, async, parseAsync, refinement
---

## Use parseAsync for Async Refinements

If your schema uses `refine()` or `superRefine()` with async validation (like database lookups), you must use `parseAsync()` or `safeParseAsync()`. Using synchronous `parse()` with async refinements throws an error.

**Incorrect (sync parse with async refinement):**

```typescript
<<<<<<< HEAD
import { z } from "zod";

const userSchema = z
  .object({
    email: z.string().email(),
    username: z.string().min(3),
  })
  .refine(
    async (data) => {
      // Async database check
      const exists = await db.users.findByEmail(data.email);
      return !exists;
    },
    { message: "Email already registered" },
  );

// This throws an error!
const user = userSchema.parse(formData);
=======
import { z } from 'zod'

const userSchema = z.object({
  email: z.string().email(),
  username: z.string().min(3),
}).refine(
  async (data) => {
    // Async database check
    const exists = await db.users.findByEmail(data.email)
    return !exists
  },
  { message: 'Email already registered' }
)

// This throws an error!
const user = userSchema.parse(formData)
>>>>>>> devel
// Error: Async refinement encountered during synchronous parse operation.
// Use .parseAsync instead.
```

**Correct (using parseAsync):**

```typescript
<<<<<<< HEAD
import { z } from "zod";

const userSchema = z
  .object({
    email: z.string().email(),
    username: z.string().min(3),
  })
  .refine(
    async (data) => {
      const exists = await db.users.findByEmail(data.email);
      return !exists;
    },
    { message: "Email already registered" },
  );

// Use parseAsync for async refinements
const user = await userSchema.parseAsync(formData);

// Or safeParseAsync for error handling
const result = await userSchema.safeParseAsync(formData);
if (!result.success) {
  console.log(result.error.issues);
=======
import { z } from 'zod'

const userSchema = z.object({
  email: z.string().email(),
  username: z.string().min(3),
}).refine(
  async (data) => {
    const exists = await db.users.findByEmail(data.email)
    return !exists
  },
  { message: 'Email already registered' }
)

// Use parseAsync for async refinements
const user = await userSchema.parseAsync(formData)

// Or safeParseAsync for error handling
const result = await userSchema.safeParseAsync(formData)
if (!result.success) {
  console.log(result.error.issues)
>>>>>>> devel
}
```

**Async transforms also require parseAsync:**

```typescript
<<<<<<< HEAD
const enrichedUserSchema = z
  .object({
    userId: z.string().uuid(),
  })
  .transform(async (data) => {
    // Async data enrichment
    const user = await db.users.findById(data.userId);
    return {
      ...data,
      email: user.email,
      name: user.name,
    };
  });

// Must use parseAsync
const enrichedUser = await enrichedUserSchema.parseAsync({ userId: "123" });
=======
const enrichedUserSchema = z.object({
  userId: z.string().uuid(),
}).transform(async (data) => {
  // Async data enrichment
  const user = await db.users.findById(data.userId)
  return {
    ...data,
    email: user.email,
    name: user.name,
  }
})

// Must use parseAsync
const enrichedUser = await enrichedUserSchema.parseAsync({ userId: '123' })
>>>>>>> devel
```

**Pattern for API routes:**

```typescript
<<<<<<< HEAD
import { z } from "zod";
import { NextRequest, NextResponse } from "next/server";

const registerSchema = z
  .object({
    email: z.string().email(),
    password: z.string().min(8),
  })
  .superRefine(async (data, ctx) => {
    const existingUser = await db.users.findByEmail(data.email);
    if (existingUser) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["email"],
        message: "Email already registered",
      });
    }
  });

export async function POST(req: NextRequest) {
  const body = await req.json();

  // Always use safeParseAsync with async schemas
  const result = await registerSchema.safeParseAsync(body);

  if (!result.success) {
    return NextResponse.json({ errors: result.error.issues }, { status: 400 });
=======
import { z } from 'zod'
import { NextRequest, NextResponse } from 'next/server'

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
}).superRefine(async (data, ctx) => {
  const existingUser = await db.users.findByEmail(data.email)
  if (existingUser) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['email'],
      message: 'Email already registered',
    })
  }
})

export async function POST(req: NextRequest) {
  const body = await req.json()

  // Always use safeParseAsync with async schemas
  const result = await registerSchema.safeParseAsync(body)

  if (!result.success) {
    return NextResponse.json({ errors: result.error.issues }, { status: 400 })
>>>>>>> devel
  }

  // Proceed with registration
}
```

**When NOT to use this pattern:**
<<<<<<< HEAD

=======

> > > > > > > devel

- Schemas with only synchronous validation (use parse/safeParse)
- When async validation can be moved outside Zod (validate, then check)

Reference: [Zod API - parseAsync](https://zod.dev/api#parseasync)
