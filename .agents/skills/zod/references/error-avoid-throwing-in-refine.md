---
title: Return False Instead of Throwing in Refine
impact: HIGH
impactDescription: Throwing in refine stops validation early, hiding other errors; returning false allows Zod to collect all issues
tags: error, refine, validation, best-practices
---

## Return False Instead of Throwing in Refine

When using `.refine()` for custom validation, return `false` for invalid data instead of throwing an error. Throwing stops validation immediately, preventing Zod from collecting other validation errors. This results in poor UX where users fix one error only to discover another.

**Incorrect (throwing in refine):**

```typescript
<<<<<<< HEAD
import { z } from 'zod'

const passwordSchema = z.object({
  password: z.string().min(8),
  confirmPassword: z.string(),
}).refine((data) => {
  if (data.password !== data.confirmPassword) {
    // Throwing stops all further validation
    throw new Error('Passwords do not match')
  }
  return true
})
=======
import { z } from "zod";

const passwordSchema = z
  .object({
    password: z.string().min(8),
    confirmPassword: z.string(),
  })
  .refine((data) => {
    if (data.password !== data.confirmPassword) {
      // Throwing stops all further validation
      throw new Error("Passwords do not match");
    }
    return true;
  });
>>>>>>> main

const formSchema = z.object({
  email: z.string().email(),
  passwords: passwordSchema,
<<<<<<< HEAD
  terms: z.boolean().refine((v) => v === true, 'Must accept terms'),
})

// If passwords don't match, user never learns about other errors
formSchema.safeParse({
  email: 'bad-email',
  passwords: { password: '12345678', confirmPassword: 'different' },
  terms: false,
})
=======
  terms: z.boolean().refine((v) => v === true, "Must accept terms"),
});

// If passwords don't match, user never learns about other errors
formSchema.safeParse({
  email: "bad-email",
  passwords: { password: "12345678", confirmPassword: "different" },
  terms: false,
});
>>>>>>> main
// Only shows: "Passwords do not match"
// Hidden: "Invalid email", "Must accept terms"
```

**Correct (returning false in refine):**

```typescript
<<<<<<< HEAD
import { z } from 'zod'

const passwordSchema = z.object({
  password: z.string().min(8),
  confirmPassword: z.string(),
}).refine(
  (data) => data.password === data.confirmPassword,
  { message: 'Passwords do not match', path: ['confirmPassword'] }
)
=======
import { z } from "zod";

const passwordSchema = z
  .object({
    password: z.string().min(8),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });
>>>>>>> main

const formSchema = z.object({
  email: z.string().email(),
  passwords: passwordSchema,
<<<<<<< HEAD
  terms: z.boolean().refine((v) => v === true, 'Must accept terms'),
})

// All errors are collected
formSchema.safeParse({
  email: 'bad-email',
  passwords: { password: '12345678', confirmPassword: 'different' },
  terms: false,
})
=======
  terms: z.boolean().refine((v) => v === true, "Must accept terms"),
});

// All errors are collected
formSchema.safeParse({
  email: "bad-email",
  passwords: { password: "12345678", confirmPassword: "different" },
  terms: false,
});
>>>>>>> main
// Shows all errors:
// - "Invalid email"
// - "Passwords do not match"
// - "Must accept terms"
```

**For multiple validation rules, use superRefine:**

```typescript
const passwordSchema = z.string().superRefine((password, ctx) => {
  // Check multiple rules, report all failures
  if (password.length < 8) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
<<<<<<< HEAD
      message: 'Password must be at least 8 characters',
    })
=======
      message: "Password must be at least 8 characters",
    });
>>>>>>> main
  }

  if (!/[A-Z]/.test(password)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
<<<<<<< HEAD
      message: 'Password must contain an uppercase letter',
    })
=======
      message: "Password must contain an uppercase letter",
    });
>>>>>>> main
  }

  if (!/[0-9]/.test(password)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
<<<<<<< HEAD
      message: 'Password must contain a number',
    })
  }

  // Don't return anything - issues are added via ctx
})

passwordSchema.safeParse('weak')
=======
      message: "Password must contain a number",
    });
  }

  // Don't return anything - issues are added via ctx
});

passwordSchema.safeParse("weak");
>>>>>>> main
// All three errors reported at once
```

**Correct pattern for async validation:**

```typescript
<<<<<<< HEAD
const schema = z.object({
  email: z.string().email(),
}).refine(
  async (data) => {
    // Return boolean, don't throw
    const exists = await checkEmailExists(data.email)
    return !exists
  },
  { message: 'Email already registered', path: ['email'] }
)
```

# **When NOT to use this pattern:**

const schema = z
.object({
email: z.string().email(),
})
.refine(
async (data) => {
// Return boolean, don't throw
const exists = await checkEmailExists(data.email);
return !exists;
},
{ message: "Email already registered", path: ["email"] },
);

```

**When NOT to use this pattern:**

>>>>>>> main
- When you need to abort validation entirely (security issues)
- When subsequent validations depend on current check passing

Reference: [Zod API - Refine](https://zod.dev/api#refine)
```
