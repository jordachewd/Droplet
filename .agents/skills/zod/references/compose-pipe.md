---
title: Use pipe() for Multi-Stage Validation
impact: MEDIUM
impactDescription: Chaining transforms loses intermediate type info; pipe() explicitly shows data flow through validation stages
tags: compose, pipe, pipeline, transform
---

## Use pipe() for Multi-Stage Validation

When data needs to pass through multiple validation stages (coerce string to number, then validate range, then transform to currency), use `.pipe()` to chain schemas. This makes the data transformation pipeline explicit and each stage's type clear.

**Incorrect (unclear transformation chain):**

```typescript
<<<<<<< HEAD
import { z } from "zod";
=======
import { z } from 'zod'
>>>>>>> devel

// All transforms in one long chain - hard to understand stages
const priceSchema = z
  .string()
<<<<<<< HEAD
  .transform((s) => parseFloat(s.replace(/[$,]/g, "")))
  .refine((n) => !isNaN(n), "Invalid number")
  .refine((n) => n >= 0, "Must be positive")
  .refine((n) => n <= 1000000, "Too large")
  .transform((n) => Math.round(n * 100));
=======
  .transform((s) => parseFloat(s.replace(/[$,]/g, '')))
  .refine((n) => !isNaN(n), 'Invalid number')
  .refine((n) => n >= 0, 'Must be positive')
  .refine((n) => n <= 1000000, 'Too large')
  .transform((n) => Math.round(n * 100))
>>>>>>> devel

// What type is n at each stage? Hard to tell
```

**Correct (using pipe for clear stages):**

```typescript
<<<<<<< HEAD
import { z } from "zod";

// Stage 1: Coerce string to number
const parsePrice = z.string().transform((s) => {
  const cleaned = s.replace(/[$,]/g, "");
  const parsed = parseFloat(cleaned);
  if (isNaN(parsed)) throw new Error("Invalid number");
  return parsed;
});

// Stage 2: Validate number constraints
const validPrice = z
  .number()
  .min(0, "Must be positive")
  .max(1000000, "Too large");

// Stage 3: Transform to cents
const centsPrice = z.number().transform((n) => Math.round(n * 100));

// Pipe them together - clear data flow
const priceSchema = parsePrice.pipe(validPrice).pipe(centsPrice);
=======
import { z } from 'zod'

// Stage 1: Coerce string to number
const parsePrice = z.string().transform((s) => {
  const cleaned = s.replace(/[$,]/g, '')
  const parsed = parseFloat(cleaned)
  if (isNaN(parsed)) throw new Error('Invalid number')
  return parsed
})

// Stage 2: Validate number constraints
const validPrice = z.number().min(0, 'Must be positive').max(1000000, 'Too large')

// Stage 3: Transform to cents
const centsPrice = z.number().transform((n) => Math.round(n * 100))

// Pipe them together - clear data flow
const priceSchema = parsePrice.pipe(validPrice).pipe(centsPrice)
>>>>>>> devel

// Type at each stage is clear:
// string -> number (parsePrice)
// number -> number (validPrice)
// number -> number (centsPrice, but semantically cents)
```

**Coercion with validation:**

```typescript
// Without pipe - validation runs on raw input
<<<<<<< HEAD
const schema1 = z.coerce.number().min(1);
schema1.parse(""); // Passes! Empty string coerces to 0, but then... wait, 0 < 1

// With pipe - validation runs on coerced value
const schema2 = z.coerce.number().pipe(z.number().min(1));
schema2.parse(""); // Fails correctly: 0 is less than 1
=======
const schema1 = z.coerce.number().min(1)
schema1.parse('')  // Passes! Empty string coerces to 0, but then... wait, 0 < 1

// With pipe - validation runs on coerced value
const schema2 = z.coerce.number().pipe(z.number().min(1))
schema2.parse('')  // Fails correctly: 0 is less than 1
>>>>>>> devel
```

**Complex data transformation:**

```typescript
// Input: CSV string of emails
// Output: Array of normalized, validated email objects

const emailArraySchema = z
  .string()
  // Stage 1: Split CSV
<<<<<<< HEAD
  .transform((s) => s.split(",").map((e) => e.trim()))
=======
  .transform((s) => s.split(',').map((e) => e.trim()))
>>>>>>> devel
  // Stage 2: Validate as email array
  .pipe(z.array(z.string().email()))
  // Stage 3: Transform to objects
  .pipe(
    z.array(z.string()).transform((emails) =>
      emails.map((email) => ({
        address: email.toLowerCase(),
<<<<<<< HEAD
        domain: email.split("@")[1],
      })),
    ),
  );

emailArraySchema.parse("John@Example.com, jane@test.com");
=======
        domain: email.split('@')[1],
      }))
    )
  )

emailArraySchema.parse('John@Example.com, jane@test.com')
>>>>>>> devel
// [
//   { address: 'john@example.com', domain: 'Example.com' },
//   { address: 'jane@test.com', domain: 'test.com' }
// ]
```

**Type inference with pipe:**

```typescript
<<<<<<< HEAD
const schema = z.string().pipe(z.coerce.number()).pipe(z.number().positive());

type Input = z.input<typeof schema>; // string
type Output = z.output<typeof schema>; // number
=======
const schema = z.string().pipe(z.coerce.number()).pipe(z.number().positive())

type Input = z.input<typeof schema>  // string
type Output = z.output<typeof schema>  // number
>>>>>>> devel

// Each pipe stage has clear input/output types
```

**When NOT to use this pattern:**
<<<<<<< HEAD

=======

> > > > > > > devel

- Simple single-stage validation (adds unnecessary complexity)
- When `.refine()` chain is sufficient and readable

Reference: [Zod API - pipe](https://zod.dev/api#pipe)
