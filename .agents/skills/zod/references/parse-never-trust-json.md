---
title: Never Trust JSON.parse Output
impact: CRITICAL
impactDescription: JSON.parse returns any type; unvalidated JSON allows type confusion attacks and runtime crashes
tags: parse, json, security, type-safety
---

## Never Trust JSON.parse Output

`JSON.parse()` returns `any` (or `unknown` in strict mode), providing no type guarantees. Always validate JSON output with Zod before using it, even if you control the JSON source. This catches corruption, version mismatches, and ensures type safety.

**Incorrect (trusting JSON.parse):**

```typescript
<<<<<<< HEAD
// JSON.parse returns any - no type safety
<<<<<<< HEAD
const config = JSON.parse(fs.readFileSync("config.json", "utf-8"));
=======
// JSON.parse returns any - no type safetyconst config = JSON.parse(fs.readFileSync("config.json", "utf-8"));
>>>>>>> devel
// config is 'any' - TypeScript allows anything

// This might crash at runtime if structure changed
console.log(config.database.host); // TypeError: Cannot read property 'host' of undefined

// API response - also unvalidated
const response = await fetch("/api/user");
const user = await response.json(); // any type
<<<<<<< HEAD
console.log(user.name.toUpperCase()); // Crash if name is null/undefined
=======
const config = JSON.parse(fs.readFileSync('config.json', 'utf-8'))
// config is 'any' - TypeScript allows anything

// This might crash at runtime if structure changed
console.log(config.database.host)  // TypeError: Cannot read property 'host' of undefined

// API response - also unvalidated
const response = await fetch('/api/user')
const user = await response.json()  // any type
console.log(user.name.toUpperCase())  // Crash if name is null/undefined
>>>>>>> devel
```

**Correct (validate after JSON.parse):**

```typescript
<<<<<<< HEAD
import { z } from "zod";
=======
import { z } from 'zod'
>>>>>>> devel

=======
console.log(user.name.toUpperCase()); // Crash if name is null/undefined```

**Correct (validate after JSON.parse):**

```typescriptimport { z } from "zod";
>>>>>>> devel
const configSchema = z.object({
  database: z.object({
    host: z.string(),
    port: z.number(),
    name: z.string(),
  }),
  api: z.object({
    key: z.string(),
    timeout: z.number().default(5000),
<<<<<<< HEAD
  }),
<<<<<<< HEAD
});

// Parse JSON then validate
const rawConfig = JSON.parse(fs.readFileSync("config.json", "utf-8"));
const config = configSchema.parse(rawConfig);
=======
})

// Parse JSON then validate
const rawConfig = JSON.parse(fs.readFileSync('config.json', 'utf-8'))
const config = configSchema.parse(rawConfig)
>>>>>>> devel
// config is fully typed: { database: { host: string, ... }, ... }
=======
  }),});

// Parse JSON then validate
const rawConfig = JSON.parse(fs.readFileSync("config.json", "utf-8"));
const config = configSchema.parse(rawConfig);// config is fully typed: { database: { host: string, ... }, ... }
>>>>>>> devel

// API response validation
const userSchema = z.object({
  id: z.string(),
  name: z.string(),
<<<<<<< HEAD
  email: z.string().email(),
<<<<<<< HEAD
});

const response = await fetch("/api/user");
const rawUser = await response.json();
const user = userSchema.parse(rawUser);
=======
})

const response = await fetch('/api/user')
const rawUser = await response.json()
const user = userSchema.parse(rawUser)
>>>>>>> devel
// user is fully typed and validated
=======
  email: z.string().email(),});

const response = await fetch("/api/user");
const rawUser = await response.json();
const user = userSchema.parse(rawUser);// user is fully typed and validated
>>>>>>> devel
```

**Helper for validated JSON parsing:**

```typescript
<<<<<<< HEAD
function parseJSON<T>(schema: z.ZodType<T>, json: string): T {
<<<<<<< HEAD
  return schema.parse(JSON.parse(json));
=======
  return schema.parse(JSON.parse(json))
>>>>>>> devel
}

function safeParseJSON<T>(schema: z.ZodType<T>, json: string) {
  try {
<<<<<<< HEAD
    return { success: true as const, data: schema.parse(JSON.parse(json)) };
=======
function parseJSON<T>(schema: z.ZodType<T>, json: string): T {  return schema.parse(JSON.parse(json));}

function safeParseJSON<T>(schema: z.ZodType<T>, json: string) {
  try {    return { success: true as const, data: schema.parse(JSON.parse(json)) };
>>>>>>> devel
  } catch (error) {
    if (error instanceof SyntaxError) {
      return { success: false as const, error: "Invalid JSON" };
    }
    if (error instanceof z.ZodError) {
      return { success: false as const, error: error.issues };
    }
<<<<<<< HEAD
    throw error;
=======
    return { success: true as const, data: schema.parse(JSON.parse(json)) }
  } catch (error) {
    if (error instanceof SyntaxError) {
      return { success: false as const, error: 'Invalid JSON' }
    }
    if (error instanceof z.ZodError) {
      return { success: false as const, error: error.issues }
    }
    throw error
>>>>>>> devel
  }
}

// Usage
<<<<<<< HEAD
const config = parseJSON(configSchema, fs.readFileSync("config.json", "utf-8"));
=======
const config = parseJSON(configSchema, fs.readFileSync('config.json', 'utf-8'))
>>>>>>> devel
```

**Validate localStorage/sessionStorage:**

```typescript
<<<<<<< HEAD
const cartSchema = z.array(
=======
    throw error;  }
}

// Usageconst config = parseJSON(configSchema, fs.readFileSync("config.json", "utf-8"));```

**Validate localStorage/sessionStorage:**

```typescriptconst cartSchema = z.array(
>>>>>>> devel
  z.object({
    productId: z.string(),
    quantity: z.number().int().positive(),
  }),
);

function getCart() {
  const raw = localStorage.getItem("cart");
  if (!raw) return [];

  const result = cartSchema.safeParse(JSON.parse(raw));
  if (!result.success) {
    // Corrupted cart data - clear it
    localStorage.removeItem("cart");
    return [];
  }
<<<<<<< HEAD
  return result.data;
=======
const cartSchema = z.array(z.object({
  productId: z.string(),
  quantity: z.number().int().positive(),
}))

function getCart() {
  const raw = localStorage.getItem('cart')
  if (!raw) return []

  const result = cartSchema.safeParse(JSON.parse(raw))
  if (!result.success) {
    // Corrupted cart data - clear it
    localStorage.removeItem('cart')
    return []
  }
  return result.data
>>>>>>> devel
}
```

**When NOT to use this pattern:**
<<<<<<< HEAD

=======

> > > > > > > devel

=======
  return result.data;}
```

**When NOT to use this pattern:**


>>>>>>> devel
- When you genuinely need to pass through arbitrary JSON without processing

Reference: [Zod API - parse](https://zod.dev/api#parse)
