---
title: Optimize Large Array Validation
impact: LOW-MEDIUM
impactDescription: Validating 10,000 items takes ~100ms; early exits, sampling, or batching reduce time for large datasets
tags: perf, arrays, batch, large-data
---

## Optimize Large Array Validation

Validating large arrays (thousands of items) can become a performance bottleneck. For batch imports, streaming data, or large datasets, consider strategies like early exit, sampling, or batched validation.

**Baseline performance:**

```typescript
<<<<<<< HEAD
import { z } from "zod";
=======
import { z } from 'zod'
>>>>>>> devel

const itemSchema = z.object({
  id: z.string(),
  value: z.number(),
<<<<<<< HEAD
});

const arraySchema = z.array(itemSchema);

// 10,000 items: ~100ms
// 100,000 items: ~1000ms
arraySchema.parse(largeArray);
=======
})

const arraySchema = z.array(itemSchema)

// 10,000 items: ~100ms
// 100,000 items: ~1000ms
arraySchema.parse(largeArray)
>>>>>>> devel
```

**Early exit on first error:**

```typescript
<<<<<<< HEAD
import { z } from "zod";

function validateArrayFastFail<T>(
  schema: z.ZodType<T>,
  items: unknown[],
):
  | { success: true; data: T[] }
  | { success: false; error: z.ZodError; index: number } {
  const validated: T[] = [];

  for (let i = 0; i < items.length; i++) {
    const result = schema.safeParse(items[i]);
    if (!result.success) {
      return { success: false, error: result.error, index: i };
    }
    validated.push(result.data);
  }

  return { success: true, data: validated };
=======
import { z } from 'zod'

function validateArrayFastFail<T>(
  schema: z.ZodType<T>,
  items: unknown[]
): { success: true; data: T[] } | { success: false; error: z.ZodError; index: number } {
  const validated: T[] = []

  for (let i = 0; i < items.length; i++) {
    const result = schema.safeParse(items[i])
    if (!result.success) {
      return { success: false, error: result.error, index: i }
    }
    validated.push(result.data)
  }

  return { success: true, data: validated }
>>>>>>> devel
}

// Stops at first invalid item instead of validating all
```

**Sample validation for large datasets:**

```typescript
function validateSample<T>(
  schema: z.ZodType<T>,
  items: unknown[],
<<<<<<< HEAD
  sampleSize: number = 100,
): { valid: boolean; sampleErrors?: z.ZodIssue[] } {
  // Validate random sample
  const indices = new Set<number>();
  while (indices.size < Math.min(sampleSize, items.length)) {
    indices.add(Math.floor(Math.random() * items.length));
  }

  const errors: z.ZodIssue[] = [];

  for (const i of indices) {
    const result = schema.safeParse(items[i]);
    if (!result.success) {
      errors.push(...result.error.issues);
=======
  sampleSize: number = 100
): { valid: boolean; sampleErrors?: z.ZodIssue[] } {
  // Validate random sample
  const indices = new Set<number>()
  while (indices.size < Math.min(sampleSize, items.length)) {
    indices.add(Math.floor(Math.random() * items.length))
  }

  const errors: z.ZodIssue[] = []

  for (const i of indices) {
    const result = schema.safeParse(items[i])
    if (!result.success) {
      errors.push(...result.error.issues)
>>>>>>> devel
    }
  }

  return errors.length > 0
    ? { valid: false, sampleErrors: errors }
<<<<<<< HEAD
    : { valid: true };
}

// Check 100 random items from 100,000 - very fast
const check = validateSample(itemSchema, hugeArray);
=======
    : { valid: true }
}

// Check 100 random items from 100,000 - very fast
const check = validateSample(itemSchema, hugeArray)
>>>>>>> devel
```

**Batched validation with progress:**

```typescript
async function validateInBatches<T>(
  schema: z.ZodType<T>,
  items: unknown[],
  batchSize: number = 1000,
<<<<<<< HEAD
  onProgress?: (percent: number) => void,
): Promise<z.SafeParseReturnType<unknown, T[]>> {
  const validated: T[] = [];
  const errors: z.ZodIssue[] = [];

  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);

    // Validate batch
    for (let j = 0; j < batch.length; j++) {
      const result = schema.safeParse(batch[j]);
      if (result.success) {
        validated.push(result.data);
      } else {
        errors.push(
          ...result.error.issues.map((issue) => ({
            ...issue,
            path: [i + j, ...issue.path],
          })),
        );
=======
  onProgress?: (percent: number) => void
): Promise<z.SafeParseReturnType<unknown, T[]>> {
  const validated: T[] = []
  const errors: z.ZodIssue[] = []

  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize)

    // Validate batch
    for (let j = 0; j < batch.length; j++) {
      const result = schema.safeParse(batch[j])
      if (result.success) {
        validated.push(result.data)
      } else {
        errors.push(...result.error.issues.map(issue => ({
          ...issue,
          path: [i + j, ...issue.path],
        })))
>>>>>>> devel
      }
    }

    // Report progress and yield to event loop
<<<<<<< HEAD
    onProgress?.(Math.min(100, ((i + batchSize) / items.length) * 100));
    await new Promise((resolve) => setTimeout(resolve, 0));
  }

  if (errors.length > 0) {
    return { success: false, error: new z.ZodError(errors) };
  }
  return { success: true, data: validated };
=======
    onProgress?.(Math.min(100, ((i + batchSize) / items.length) * 100))
    await new Promise(resolve => setTimeout(resolve, 0))
  }

  if (errors.length > 0) {
    return { success: false, error: new z.ZodError(errors) }
  }
  return { success: true, data: validated }
>>>>>>> devel
}

// Use with progress reporting
await validateInBatches(itemSchema, largeArray, 1000, (percent) => {
<<<<<<< HEAD
  console.log(`Validating: ${percent.toFixed(1)}%`);
});
=======
  console.log(`Validating: ${percent.toFixed(1)}%`)
})
>>>>>>> devel
```

**Streaming validation:**

```typescript
async function* validateStream<T>(
  schema: z.ZodType<T>,
<<<<<<< HEAD
  items: AsyncIterable<unknown>,
): AsyncGenerator<T, void, unknown> {
  for await (const item of items) {
    yield schema.parse(item); // Throws on invalid
=======
  items: AsyncIterable<unknown>
): AsyncGenerator<T, void, unknown> {
  for await (const item of items) {
    yield schema.parse(item)  // Throws on invalid
>>>>>>> devel
  }
}

// Process items as they arrive
for await (const validItem of validateStream(itemSchema, dataStream)) {
<<<<<<< HEAD
  await processItem(validItem);
=======
  await processItem(validItem)
>>>>>>> devel
}
```

**When NOT to use this pattern:**
<<<<<<< HEAD

=======

> > > > > > > devel

- Small arrays (< 1000 items) - standard validation is fine
- When all items must be validated for correctness guarantees

Reference: [Zod Performance](https://zod.dev/v4#performance)
