---
title: Validate at System Boundaries
impact: CRITICAL
impactDescription: Validating deep in business logic allows corrupt data to propagate; validating at boundaries catches issues before they spread
tags: parse, boundaries, architecture, defense-in-depth
---

## Validate at System Boundaries

Validate external data immediately when it enters your system—at API endpoints, form handlers, message queue consumers, and configuration loaders. Validating deep in business logic allows corrupt data to propagate and makes debugging harder.

**Incorrect (validating deep in business logic):**

```typescript
<<<<<<< HEAD
import { z } from "zod";

// No validation at API boundary
export async function POST(req: NextRequest) {
  const body = await req.json();
  // Raw unknown data passed through
  return await processOrder(body);
=======
import { z } from 'zod'

// No validation at API boundary
export async function POST(req: NextRequest) {
  const body = await req.json()
  // Raw unknown data passed through
  return await processOrder(body)
>>>>>>> devel
}

async function processOrder(data: unknown) {
  // Data passed around unvalidated
<<<<<<< HEAD
  const items = await calculateTotals(data);
  return await chargeCustomer(data, items);
=======
  const items = await calculateTotals(data)
  return await chargeCustomer(data, items)
>>>>>>> devel
}

async function calculateTotals(data: unknown) {
  // Finally validating way too late
<<<<<<< HEAD
  const order = orderSchema.parse(data); // Throws here, far from entry point
=======
  const order = orderSchema.parse(data)  // Throws here, far from entry point
>>>>>>> devel
  // ...
}
// Hard to trace where bad data came from
```

**Correct (validating at boundary):**

```typescript
<<<<<<< HEAD
import { z } from "zod";

const orderSchema = z.object({
  customerId: z.string().uuid(),
  items: z
    .array(
      z.object({
        productId: z.string(),
        quantity: z.number().int().positive(),
      }),
    )
    .min(1),
=======
import { z } from 'zod'

const orderSchema = z.object({
  customerId: z.string().uuid(),
  items: z.array(z.object({
    productId: z.string(),
    quantity: z.number().int().positive(),
  })).min(1),
>>>>>>> devel
  shippingAddress: z.object({
    street: z.string(),
    city: z.string(),
    country: z.string(),
  }),
<<<<<<< HEAD
});

type Order = z.infer<typeof orderSchema>;

// Validate immediately at boundary
export async function POST(req: NextRequest) {
  const body = await req.json();

  const result = orderSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json(
      { error: "Invalid order", issues: result.error.issues },
      { status: 400 },
    );
  }

  // Now data is validated and typed
  return await processOrder(result.data);
=======
})

type Order = z.infer<typeof orderSchema>

// Validate immediately at boundary
export async function POST(req: NextRequest) {
  const body = await req.json()

  const result = orderSchema.safeParse(body)
  if (!result.success) {
    return NextResponse.json(
      { error: 'Invalid order', issues: result.error.issues },
      { status: 400 }
    )
  }

  // Now data is validated and typed
  return await processOrder(result.data)
>>>>>>> devel
}

// Business logic receives typed, validated data
async function processOrder(order: Order) {
  // order is guaranteed to match schema
<<<<<<< HEAD
  const items = await calculateTotals(order);
  return await chargeCustomer(order, items);
=======
  const items = await calculateTotals(order)
  return await chargeCustomer(order, items)
>>>>>>> devel
}

async function calculateTotals(order: Order) {
  // No validation needed - type guarantees shape
<<<<<<< HEAD
  return order.items.map((item) => ({
    ...item,
    total: item.quantity * getPrice(item.productId),
  }));
=======
  return order.items.map(item => ({
    ...item,
    total: item.quantity * getPrice(item.productId),
  }))
>>>>>>> devel
}
```

**Boundaries to validate:**

```typescript
// API endpoints
export async function POST(req: NextRequest) {
<<<<<<< HEAD
  const data = await req.json();
  const validated = requestSchema.safeParse(data);
=======
  const data = await req.json()
  const validated = requestSchema.safeParse(data)
>>>>>>> devel
  // ...
}

// Message queue consumers
async function handleMessage(rawMessage: string) {
<<<<<<< HEAD
  const data = JSON.parse(rawMessage);
  const validated = messageSchema.safeParse(data);
=======
  const data = JSON.parse(rawMessage)
  const validated = messageSchema.safeParse(data)
>>>>>>> devel
  // ...
}

// Configuration loading
<<<<<<< HEAD
const config = configSchema.parse(JSON.parse(process.env.CONFIG!));

// External API responses
const response = await fetch("/api/users");
const data = await response.json();
const users = usersResponseSchema.parse(data);
```

**When NOT to use this pattern:**

=======
const config = configSchema.parse(JSON.parse(process.env.CONFIG!))

// External API responses
const response = await fetch('/api/users')
const data = await response.json()
const users = usersResponseSchema.parse(data)

```

**When NOT to use this pattern:**
>>>>>>> devel
- Internal function calls with already-validated data
- Performance-critical hot paths (validate once, trust afterward)

Reference: [Zod with TypeScript for Server-side Validation](https://stack.convex.dev/typescript-zod-function-validation)
```
