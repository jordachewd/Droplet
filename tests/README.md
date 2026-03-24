# Tests Guide

This directory follows strict TDD:

1. Write a failing test for observable behavior.
2. Implement the minimum code to pass.
3. Refactor safely while keeping tests green.

## Shared Test Support

Use `tests/unit/test-support/index.ts` for reusable typed factories and mocks.

### Data factories

- `createTestUser()` for user records (`UserData` shape)
- `createTestTask()` for conversation/task records (`TaskConversation` shape)
- `createTestTransaction()` for transaction records
- `createTestClerkUser()` for Clerk user payloads

### HTTP helpers

- `buildMockRequest()` for JSON route requests
- `buildMockNextRequest()` for Next route handlers (supports `formData`)
- `readJsonResponse<T>()` for typed response body parsing

### Mock helpers

- `mockAuth()` for authenticated/unauthenticated Clerk auth responses
- `mockAdminAuth()` for admin auth context with role metadata
- `mockMongooseModel()` for typed Mongoose chain mocks (`select/sort/limit/skip/lean/exec`)
- `mockClerkUser()` for typed `clerkClient().users.getUser()` responses

## Example Pattern

```ts
import { auth } from "@clerk/nextjs/server";
import { vi } from "vitest";
import { mockAuth, mockMongooseModel, createTestUser } from "../test-support";

vi.mock("@clerk/nextjs/server", () => ({ auth: vi.fn() }));

mockAuth(vi.mocked(auth), { userId: "user_123" });
const userQuery = mockMongooseModel(createTestUser());
```

## Rule for New Tests

New tests must not use `as never`. If a mock requires casting, extend shared helpers first so the cast is centralized and typed.
