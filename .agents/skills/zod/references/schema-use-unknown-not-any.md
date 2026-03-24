---
title: Use z.unknown() Instead of z.any()
impact: CRITICAL
impactDescription: z.any() bypasses TypeScript's type system entirely; z.unknown() forces type narrowing before use
tags: schema, unknown, any, type-safety
---

## Use z.unknown() Instead of z.any()

`z.any()` infers to `any` type, disabling TypeScript's type checking for that value. `z.unknown()` infers to `unknown`, which forces you to narrow the type before using it. This preserves type safety while still allowing any input.

**Incorrect (using z.any):**

<<<<<<< HEAD
```typescript
<<<<<<< HEAD
import { z } from "zod";
=======
```typescriptimport { z } from "zod";
>>>>>>> devel

const eventSchema = z.object({
  type: z.string(),
  payload: z.any(), // Infers to 'any'
});

<<<<<<< HEAD
type Event = z.infer<typeof eventSchema>;
=======
import { z } from 'zod'

const eventSchema = z.object({
  type: z.string(),
  payload: z.any(),  // Infers to 'any'
})

type Event = z.infer<typeof eventSchema>
>>>>>>> devel
// { type: string; payload: any }

function handleEvent(event: Event) {
  // No type error - TypeScript allows anything
<<<<<<< HEAD
  console.log(event.payload.foo.bar.baz); // Runtime crash if structure is wrong
=======
  console.log(event.payload.foo.bar.baz)  // Runtime crash if structure is wrong
>>>>>>> devel
}
=======
type Event = z.infer<typeof eventSchema>;// { type: string; payload: any }

function handleEvent(event: Event) {
  // No type error - TypeScript allows anything  console.log(event.payload.foo.bar.baz); // Runtime crash if structure is wrong}
>>>>>>> devel
```

**Correct (using z.unknown):**

<<<<<<< HEAD
```typescript
<<<<<<< HEAD
import { z } from "zod";
=======
```typescriptimport { z } from "zod";
>>>>>>> devel

const eventSchema = z.object({
  type: z.string(),
  payload: z.unknown(), // Infers to 'unknown'
});

<<<<<<< HEAD
type Event = z.infer<typeof eventSchema>;
=======
import { z } from 'zod'

const eventSchema = z.object({
  type: z.string(),
  payload: z.unknown(),  // Infers to 'unknown'
})

type Event = z.infer<typeof eventSchema>
>>>>>>> devel
// { type: string; payload: unknown }

function handleEvent(event: Event) {
  // TypeScript error: Object is of type 'unknown'
<<<<<<< HEAD
  console.log(event.payload.foo); // Won't compile

  // Must narrow type first
  if (typeof event.payload === "object" && event.payload !== null) {
=======
  console.log(event.payload.foo)  // Won't compile

  // Must narrow type first
  if (typeof event.payload === 'object' && event.payload !== null) {
>>>>>>> devel
    // Now TypeScript knows it's an object
=======
type Event = z.infer<typeof eventSchema>;// { type: string; payload: unknown }

function handleEvent(event: Event) {
  // TypeScript error: Object is of type 'unknown'  console.log(event.payload.foo); // Won't compile

  // Must narrow type first
  if (typeof event.payload === "object" && event.payload !== null) {    // Now TypeScript knows it's an object
>>>>>>> devel
  }
}
```

**Better approach with discriminated unions:**

<<<<<<< HEAD
```typescript
<<<<<<< HEAD
import { z } from "zod";

const userCreatedSchema = z.object({
  type: z.literal("user.created"),
=======
import { z } from 'zod'

const userCreatedSchema = z.object({
  type: z.literal('user.created'),
>>>>>>> devel
  payload: z.object({
    userId: z.string(),
    email: z.string().email(),
  }),
<<<<<<< HEAD
});

const orderPlacedSchema = z.object({
  type: z.literal("order.placed"),
=======
})

const orderPlacedSchema = z.object({
  type: z.literal('order.placed'),
>>>>>>> devel
  payload: z.object({
    orderId: z.string(),
    amount: z.number(),
  }),
<<<<<<< HEAD
});
=======
```typescriptimport { z } from "zod";

const userCreatedSchema = z.object({
  type: z.literal("user.created"),  payload: z.object({
    userId: z.string(),
    email: z.string().email(),
  }),});

const orderPlacedSchema = z.object({
  type: z.literal("order.placed"),  payload: z.object({
    orderId: z.string(),
    amount: z.number(),
  }),});
>>>>>>> devel

const eventSchema = z.discriminatedUnion("type", [
  userCreatedSchema,
  orderPlacedSchema,
]);
<<<<<<< HEAD
=======
})

const eventSchema = z.discriminatedUnion('type', [
  userCreatedSchema,
  orderPlacedSchema,
])
>>>>>>> devel

=======
>>>>>>> devel
// Full type safety for each event type
```

**When NOT to use this pattern:**
<<<<<<< HEAD
<<<<<<< HEAD

=======

> > > > > > > devel

=======


>>>>>>> devel
- When you're consuming a third-party API where you truly don't know the shape
- When prototyping and will add proper types later

Reference: [Zod API - unknown](https://zod.dev/api#unknown)
