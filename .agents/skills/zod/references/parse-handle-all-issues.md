---
title: Handle All Validation Issues Not Just First
impact: CRITICAL
impactDescription: Showing only the first error forces users to fix-submit-fix repeatedly; collecting all errors improves UX dramatically
tags: parse, errors, issues, user-experience
---

## Handle All Validation Issues Not Just First

Zod collects all validation failures, not just the first one. When displaying errors to users, show all issues so they can fix everything at once instead of playing whack-a-mole with one error at a time.

**Incorrect (showing only first error):**

```typescript
<<<<<<< HEAD
import { z } from 'zod'

const formSchema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(8, 'Password must be 8+ characters'),
  confirmPassword: z.string(),
  age: z.number().min(18, 'Must be 18 or older'),
})

function validateForm(data: unknown) {
  const result = formSchema.safeParse(data)

  if (!result.success) {
    // Only shows first error - terrible UX
    return { error: result.error.issues[0].message }
  }

  return { data: result.data }
}

// User submits empty form
validateForm({})
=======
import { z } from "zod";

const formSchema = z.object({
  email: z.string().email("Invalid email"),
  password: z.string().min(8, "Password must be 8+ characters"),
  confirmPassword: z.string(),
  age: z.number().min(18, "Must be 18 or older"),
});

function validateForm(data: unknown) {
  const result = formSchema.safeParse(data);

  if (!result.success) {
    // Only shows first error - terrible UX
    return { error: result.error.issues[0].message };
  }

  return { data: result.data };
}

// User submits empty form
validateForm({});
>>>>>>> main
// Returns: { error: 'Invalid email' }
// User fixes email, submits again
// Returns: { error: 'Password must be 8+ characters' }
// User fixes password, submits again...
// 4 round trips to fix 4 errors!
```

**Correct (showing all errors):**

```typescript
<<<<<<< HEAD
import { z } from 'zod'

const formSchema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(8, 'Password must be 8+ characters'),
  confirmPassword: z.string(),
  age: z.number().min(18, 'Must be 18 or older'),
})

function validateForm(data: unknown) {
  const result = formSchema.safeParse(data)

  if (!result.success) {
    // Collect errors by field for form display
    const fieldErrors: Record<string, string[]> = {}

    for (const issue of result.error.issues) {
      const field = issue.path.join('.')
      if (!fieldErrors[field]) {
        fieldErrors[field] = []
      }
      fieldErrors[field].push(issue.message)
    }

    return { errors: fieldErrors }
  }

  return { data: result.data }
}

// User submits empty form
validateForm({})
=======
import { z } from "zod";

const formSchema = z.object({
  email: z.string().email("Invalid email"),
  password: z.string().min(8, "Password must be 8+ characters"),
  confirmPassword: z.string(),
  age: z.number().min(18, "Must be 18 or older"),
});

function validateForm(data: unknown) {
  const result = formSchema.safeParse(data);

  if (!result.success) {
    // Collect errors by field for form display
    const fieldErrors: Record<string, string[]> = {};

    for (const issue of result.error.issues) {
      const field = issue.path.join(".");
      if (!fieldErrors[field]) {
        fieldErrors[field] = [];
      }
      fieldErrors[field].push(issue.message);
    }

    return { errors: fieldErrors };
  }

  return { data: result.data };
}

// User submits empty form
validateForm({});
>>>>>>> main
// Returns: {
//   errors: {
//     email: ['Invalid email'],
//     password: ['Password must be 8+ characters'],
//     confirmPassword: ['Required'],
//     age: ['Expected number, received undefined']
//   }
// }
// User sees ALL errors, fixes everything, submits once!
```

**Using flatten() for simpler error structure:**

```typescript
<<<<<<< HEAD
const result = formSchema.safeParse(data)

if (!result.success) {
  const flattened = result.error.flatten()
=======
const result = formSchema.safeParse(data);

if (!result.success) {
  const flattened = result.error.flatten();
>>>>>>> main
  // {
  //   formErrors: [],  // Top-level errors
  //   fieldErrors: {
  //     email: ['Invalid email'],
  //     password: ['Password must be 8+ characters'],
  //     ...
  //   }
  // }
<<<<<<< HEAD
  return { errors: flattened.fieldErrors }
=======
  return { errors: flattened.fieldErrors };
>>>>>>> main
}
```

**With React Hook Form integration:**

```typescript
<<<<<<< HEAD
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
=======
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
>>>>>>> main

const form = useForm({
  resolver: zodResolver(formSchema),
  // All errors are automatically collected and displayed
<<<<<<< HEAD
})
```

# **When NOT to use this pattern:**

});

```

**When NOT to use this pattern:**

>>>>>>> main
- Rate-limited APIs where you want to fail fast on first error
- Large batch processing where full validation is expensive

Reference: [Zod Error Handling](https://zod.dev/error-handling)
```
