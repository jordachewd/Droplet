---
title: Use Discriminated Unions for Type Narrowing
impact: MEDIUM-HIGH
impactDescription: Regular unions require manual type guards; discriminated unions enable TypeScript's automatic narrowing and Zod's optimized parsing
tags: object, discriminatedUnion, narrowing, typescript
---

## Use Discriminated Unions for Type Narrowing

When a field's type depends on another field's value (e.g., `type: 'success'` means `data` exists, `type: 'error'` means `error` exists), use `z.discriminatedUnion()`. This enables TypeScript's automatic type narrowing and Zod's optimized O(1) parsing instead of trying each variant.

**Incorrect (regular union - no automatic narrowing):**

<<<<<<< HEAD
```typescript
<<<<<<< HEAD
import { z } from "zod";
=======
```typescriptimport { z } from "zod";
>>>>>>> devel

const successSchema = z.object({
  type: z.literal("success"),
  data: z.object({ id: z.string() }),
});

const errorSchema = z.object({
  type: z.literal("error"),
  message: z.string(),
});

// Regular union - Zod tries each option in order
const responseSchema = z.union([successSchema, errorSchema]);

type Response = z.infer<typeof responseSchema>;

function handleResponse(response: Response) {
  // TypeScript doesn't narrow automatically
  if (response.type === "success") {
<<<<<<< HEAD
    response.data; // Error: Property 'data' does not exist on type 'Response'
=======
import { z } from 'zod'

const successSchema = z.object({
  type: z.literal('success'),
  data: z.object({ id: z.string() }),
})

const errorSchema = z.object({
  type: z.literal('error'),
  message: z.string(),
})

// Regular union - Zod tries each option in order
const responseSchema = z.union([successSchema, errorSchema])

type Response = z.infer<typeof responseSchema>

function handleResponse(response: Response) {
  // TypeScript doesn't narrow automatically
  if (response.type === 'success') {
    response.data  // Error: Property 'data' does not exist on type 'Response'
>>>>>>> devel
    // Must cast or use type guards
=======
    response.data; // Error: Property 'data' does not exist on type 'Response'    // Must cast or use type guards
>>>>>>> devel
  }
}
```

**Correct (discriminated union):**

<<<<<<< HEAD
```typescript
<<<<<<< HEAD
import { z } from "zod";
=======
```typescriptimport { z } from "zod";
>>>>>>> devel

const successSchema = z.object({
  type: z.literal("success"),
  data: z.object({ id: z.string() }),
});

const errorSchema = z.object({
  type: z.literal("error"),
  message: z.string(),
});

// Discriminated union - Zod uses 'type' field for O(1) dispatch
const responseSchema = z.discriminatedUnion("type", [
  successSchema,
  errorSchema,
]);

type Response = z.infer<typeof responseSchema>;

function handleResponse(response: Response) {
  // TypeScript narrows automatically!
  if (response.type === "success") {
    response.data.id; // Works - TypeScript knows data exists
  } else {
<<<<<<< HEAD
    response.message; // Works - TypeScript knows message exists
=======
import { z } from 'zod'

const successSchema = z.object({
  type: z.literal('success'),
  data: z.object({ id: z.string() }),
})

const errorSchema = z.object({
  type: z.literal('error'),
  message: z.string(),
})

// Discriminated union - Zod uses 'type' field for O(1) dispatch
const responseSchema = z.discriminatedUnion('type', [
  successSchema,
  errorSchema,
])

type Response = z.infer<typeof responseSchema>

function handleResponse(response: Response) {
  // TypeScript narrows automatically!
  if (response.type === 'success') {
    response.data.id  // Works - TypeScript knows data exists
  } else {
    response.message  // Works - TypeScript knows message exists
>>>>>>> devel
  }
=======
    response.message; // Works - TypeScript knows message exists  }
>>>>>>> devel
}
```

**Common use cases:**

```typescript
<<<<<<< HEAD
// API responses
<<<<<<< HEAD
const apiResponse = z.discriminatedUnion("status", [
=======
// API responsesconst apiResponse = z.discriminatedUnion("status", [
>>>>>>> devel
  z.object({ status: z.literal("success"), data: z.unknown() }),
  z.object({ status: z.literal("error"), error: z.string(), code: z.number() }),
  z.object({ status: z.literal("loading") }),
]);

// Event types
const event = z.discriminatedUnion("type", [
  z.object({ type: z.literal("click"), x: z.number(), y: z.number() }),
  z.object({ type: z.literal("keypress"), key: z.string() }),
  z.object({ type: z.literal("scroll"), delta: z.number() }),
]);

// Database records with polymorphic types
const notification = z.discriminatedUnion("channel", [
  z.object({ channel: z.literal("email"), address: z.string().email() }),
  z.object({ channel: z.literal("sms"), phoneNumber: z.string() }),
  z.object({ channel: z.literal("push"), deviceToken: z.string() }),
<<<<<<< HEAD
]);
=======
const apiResponse = z.discriminatedUnion('status', [
  z.object({ status: z.literal('success'), data: z.unknown() }),
  z.object({ status: z.literal('error'), error: z.string(), code: z.number() }),
  z.object({ status: z.literal('loading') }),
])

// Event types
const event = z.discriminatedUnion('type', [
  z.object({ type: z.literal('click'), x: z.number(), y: z.number() }),
  z.object({ type: z.literal('keypress'), key: z.string() }),
  z.object({ type: z.literal('scroll'), delta: z.number() }),
])

// Database records with polymorphic types
const notification = z.discriminatedUnion('channel', [
  z.object({ channel: z.literal('email'), address: z.string().email() }),
  z.object({ channel: z.literal('sms'), phoneNumber: z.string() }),
  z.object({ channel: z.literal('push'), deviceToken: z.string() }),
])
>>>>>>> devel
```

**Type-safe handling:**

```typescript
<<<<<<< HEAD
const paymentSchema = z.discriminatedUnion("method", [
  z.object({
    method: z.literal("card"),
=======
const paymentSchema = z.discriminatedUnion('method', [
  z.object({
    method: z.literal('card'),
>>>>>>> devel
    cardNumber: z.string(),
    expiryDate: z.string(),
  }),
  z.object({
<<<<<<< HEAD
    method: z.literal("bank"),
=======
    method: z.literal('bank'),
>>>>>>> devel
    accountNumber: z.string(),
    routingNumber: z.string(),
  }),
  z.object({
<<<<<<< HEAD
    method: z.literal("crypto"),
=======
]);```

**Type-safe handling:**

```typescriptconst paymentSchema = z.discriminatedUnion("method", [
  z.object({
    method: z.literal("card"),    cardNumber: z.string(),
    expiryDate: z.string(),
  }),
  z.object({    method: z.literal("bank"),    accountNumber: z.string(),
    routingNumber: z.string(),
  }),
  z.object({    method: z.literal("crypto"),
>>>>>>> devel
    walletAddress: z.string(),
  }),
]);

type Payment = z.infer<typeof paymentSchema>;

function processPayment(payment: Payment) {
  switch (payment.method) {
    case "card":
      return chargeCard(payment.cardNumber, payment.expiryDate);
    case "bank":
      return initiateBankTransfer(payment.accountNumber, payment.routingNumber);
    case "crypto":
<<<<<<< HEAD
      return sendCrypto(payment.walletAddress);
=======
    method: z.literal('crypto'),
    walletAddress: z.string(),
  }),
])

type Payment = z.infer<typeof paymentSchema>

function processPayment(payment: Payment) {
  switch (payment.method) {
    case 'card':
      return chargeCard(payment.cardNumber, payment.expiryDate)
    case 'bank':
      return initiateBankTransfer(payment.accountNumber, payment.routingNumber)
    case 'crypto':
      return sendCrypto(payment.walletAddress)
>>>>>>> devel
    // TypeScript exhaustiveness check - no default needed
=======
      return sendCrypto(payment.walletAddress);    // TypeScript exhaustiveness check - no default needed
>>>>>>> devel
  }
}
```

**When NOT to use this pattern:**
<<<<<<< HEAD
<<<<<<< HEAD

=======

> > > > > > > devel

=======


>>>>>>> devel
- When variants don't share a common discriminator field
- When the discriminator isn't a literal type (use regular union)

Reference: [Zod API - Discriminated Unions](https://zod.dev/api#discriminated-unions)
