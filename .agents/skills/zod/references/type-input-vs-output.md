---
title: Distinguish z.input from z.infer for Transforms
impact: HIGH
impactDescription: Using wrong type with transforms causes TypeScript errors; z.input captures pre-transform shape, z.infer captures post-transform
tags: type, input, output, transform
---

## Distinguish z.input from z.infer for Transforms

When schemas use `.transform()`, the input and output types differ. `z.infer` (same as `z.output`) gives the post-transform type, while `z.input` gives the pre-transform type. Using the wrong one causes confusing TypeScript errors.

**Incorrect (using infer for input type):**

```typescript
<<<<<<< HEAD
import { z } from "zod";

const dateSchema = z.string().transform((s) => new Date(s));

type DateOutput = z.infer<typeof dateSchema>;
=======
import { z } from 'zod'

const dateSchema = z.string().transform(s => new Date(s))

type DateOutput = z.infer<typeof dateSchema>
>>>>>>> devel
// Date (post-transform)

// Wrong! Expecting Date but should accept string
function handleDate(input: DateOutput) {
<<<<<<< HEAD
  return dateSchema.parse(input); // Error: Argument of type 'Date' is not assignable to type 'string'
}

// Caller passes string, but type says Date
handleDate("2024-01-15"); // TypeScript error
=======
  return dateSchema.parse(input)  // Error: Argument of type 'Date' is not assignable to type 'string'
}

// Caller passes string, but type says Date
handleDate('2024-01-15')  // TypeScript error
>>>>>>> devel
```

**Correct (using z.input for pre-transform type):**

```typescript
<<<<<<< HEAD
import { z } from "zod";

const dateSchema = z.string().transform((s) => new Date(s));

// Input type = what parse() accepts
type DateInput = z.input<typeof dateSchema>;
// string (pre-transform)

// Output type = what parse() returns
type DateOutput = z.output<typeof dateSchema>;
=======
import { z } from 'zod'

const dateSchema = z.string().transform(s => new Date(s))

// Input type = what parse() accepts
type DateInput = z.input<typeof dateSchema>
// string (pre-transform)

// Output type = what parse() returns
type DateOutput = z.output<typeof dateSchema>
>>>>>>> devel
// Date (post-transform)

// Use input type for function parameters
function handleDate(input: DateInput) {
<<<<<<< HEAD
  const parsed = dateSchema.parse(input); // parsed is Date
  return parsed;
}

handleDate("2024-01-15"); // Works - string input
=======
  const parsed = dateSchema.parse(input)  // parsed is Date
  return parsed
}

handleDate('2024-01-15')  // Works - string input
>>>>>>> devel
```

**Complex example with object transforms:**

```typescript
const apiUserSchema = z.object({
  id: z.string(),
<<<<<<< HEAD
  created_at: z.string().transform((s) => new Date(s)),
  tags: z.string().transform((s) => s.split(",")),
  is_active: z
    .union([z.boolean(), z.literal(1), z.literal(0)])
    .transform((v) => Boolean(v)),
});

// What the API sends
type ApiUserInput = z.input<typeof apiUserSchema>;
=======
  created_at: z.string().transform(s => new Date(s)),
  tags: z.string().transform(s => s.split(',')),
  is_active: z.union([z.boolean(), z.literal(1), z.literal(0)])
    .transform(v => Boolean(v)),
})

// What the API sends
type ApiUserInput = z.input<typeof apiUserSchema>
>>>>>>> devel
// {
//   id: string
//   created_at: string
//   tags: string
//   is_active: boolean | 1 | 0
// }

// What your code works with
<<<<<<< HEAD
type ApiUser = z.infer<typeof apiUserSchema>;
=======
type ApiUser = z.infer<typeof apiUserSchema>
>>>>>>> devel
// {
//   id: string
//   created_at: Date
//   tags: string[]
//   is_active: boolean
// }

// API response handler
function handleApiResponse(rawData: ApiUserInput) {
<<<<<<< HEAD
  const user = apiUserSchema.parse(rawData);
  // user.created_at is Date
  // user.tags is string[]
  // user.is_active is boolean
  return user;
=======
  const user = apiUserSchema.parse(rawData)
  // user.created_at is Date
  // user.tags is string[]
  // user.is_active is boolean
  return user
>>>>>>> devel
}
```

**Using with function types:**

```typescript
const formSchema = z.object({
<<<<<<< HEAD
  amount: z.string().transform((s) => parseFloat(s)),
  quantity: z.string().transform((s) => parseInt(s, 10)),
});

type FormInput = z.input<typeof formSchema>;
type FormOutput = z.output<typeof formSchema>;

// Form handler receives raw strings
type FormHandler = (input: FormInput) => Promise<void>;

// Business logic receives parsed values
type OrderProcessor = (order: FormOutput) => Promise<void>;
```

**When NOT to use this pattern:**

=======
amount: z.string().transform(s => parseFloat(s)),
quantity: z.string().transform(s => parseInt(s, 10)),
})

type FormInput = z.input<typeof formSchema>
type FormOutput = z.output<typeof formSchema>

// Form handler receives raw strings
type FormHandler = (input: FormInput) => Promise<void>

// Business logic receives parsed values
type OrderProcessor = (order: FormOutput) => Promise<void>

```

**When NOT to use this pattern:**
>>>>>>> devel
- Schemas without transforms (input and output are identical)
- When you only work with validated data (just use z.infer)

Reference: [Zod - Type Inference](https://zod.dev/api#type-inference)
```
