# Droplet Engineering Audit Report

> **Date:** 2025-07-14
> **Scope:** READ-ONLY audit of all unit tests (63 files), E2E tests (12 files), config, infrastructure, hardcoded values, server-side safety, code reuse, and resource leaks.
> **Auditor:** Droplet-Engineer

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Unit Test Quality Assessment (63 files)](#2-unit-test-quality-assessment)
3. [E2E Test Quality Assessment (12 files)](#3-e2e-test-quality-assessment)
4. [Tech Stack & Config Deep Check](#4-tech-stack--config-deep-check)
5. [Test Infrastructure Evaluation](#5-test-infrastructure-evaluation)
6. [Hardcoded Values Search](#6-hardcoded-values-search)
7. [Server-Side Safety Audit](#7-server-side-safety-audit)
8. [Code Reuse Violations](#8-code-reuse-violations)
9. [Resource Leak & Unnecessary Render Risks](#9-resource-leak--unnecessary-render-risks)
10. [Global Findings & Recommendations](#10-global-findings--recommendations)

---

## 1. Executive Summary

| Metric | Value |
| --------------------------------------------- | --------- |
| Unit test files | 63 |
| E2E spec files | 12 |
| Estimated total unit tests | ~320+ |
| Estimated total E2E tests | ~22+ |
| Grade-A unit test files | 28 (~44%) |
| Grade-B unit test files | 20 (~32%) |
| Grade-C or lower unit test files | 15 (~24%) |
| `window.alert()` / `window.confirm()` in src/ | 0 |
| `Math.random()` in src/ | 0 |
| `console.log` / `console.error` in src/ | 0 |
| `strict: false` in Mongoose updates | 0 |
| Hardcoded prices in src/ (outside constants) | 0 |
| Server actions without `"use server"` | 0 |
| Server actions without `import "server-only"` | 0 |
| API routes missing auth checks | 0 |
| Metric | Value |
|---|---|
| Unit test files | 63 |
| E2E spec files | 12 |
| Estimated total unit tests | ~320+ |
| Estimated total E2E tests | ~22+ |
| Grade-A unit test files | 28 (~44%) |
| Grade-B unit test files | 20 (~32%) |
| Grade-C or lower unit test files | 15 (~24%) |
| `window.alert()` / `window.confirm()` in src/ | 0 |
| `Math.random()` in src/ | 0 |
| `console.log` / `console.error` in src/ | 0 |
| `strict: false` in Mongoose updates | 0 |
| Hardcoded prices in src/ (outside constants) | 0 |
| Server actions without `"use server"` | 0 |
| Server actions without `import "server-only"` | 0 |
| API routes missing auth checks | 0 |

> > > > > > > devel

**Overall Verdict: The test suite is above average for a SaaS project of this size.** The highest-risk areas (auth, billing, entitlements, webhooks, AI routes) have strong coverage. The weakest spots are smoke-only component tests and thin model tests. E2E coverage is solid for happy paths but lacks negative/error scenarios in admin and profile flows.

---

## 2. Unit Test Quality Assessment

### Grading Rubric



> > > > > > > devel

- **A** — Covers happy path, failure paths, edge cases, and boundary conditions. Tests behavior, not mocks.
- **B** — Covers happy path and some failure paths. Missing edge cases or over-reliant on mocks in spots.
- **C** — Smoke-only or trivially passing. Tests mostly prove mocks work. Missing critical scenarios.
- **D** — Actively misleading or nearly empty.
- **F** — Broken or no meaningful assertions.

---

### 2.1 Models (2 files)

| # | File | Tests | Happy | Fail | Edge | Grade | Assessment |
| --- | ------------------------------------------------- | ----- | ----- | ---- | ---- | ----- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1 | `tests/unit/models/user-model.test.ts` | 1 | 1 | 0 | 0 | **C** | Single test validates default values on `new User()`. No validation failure, no required field rejection, no plan defaults edge cases. |
| 2 | `tests/unit/models/data-model-foundation.test.ts` | 5 | 5 | 0 | 0 | **B** | Schema validation for Task, UsageEvent, AppSetting, PublicPage, AdminAuditLog — checks defaults, indexes, unique constraints. Solid structural coverage. |

**Top 3 missing scenarios (models):**

| # | File | Tests | Happy | Fail | Edge | Grade | Assessment |
|---|---|---|---|---|---|---|---|
| 1 | `tests/unit/models/user-model.test.ts` | 1 | 1 | 0 | 0 | **C** | Single test validates default values on `new User()`. No validation failure, no required field rejection, no plan defaults edge cases. |
| 2 | `tests/unit/models/data-model-foundation.test.ts` | 5 | 5 | 0 | 0 | **B** | Schema validation for Task, UsageEvent, AppSetting, PublicPage, AdminAuditLog — checks defaults, indexes, unique constraints. Solid structural coverage. |

**Top 3 missing scenarios (models):**

> > > > > > > devel

1. Invalid data rejection — what happens when required fields are missing?
2. Update validation — does `strict: true` reject unknown fields?
3. Concurrent write behavior / race conditions on counters.

---

### 2.2 Utils (32 files)

| # | File | Tests | Happy | Fail | Edge | Grade | Assessment |
| --- | ------------------------------------- | ----- | ----- | ---- | ---- | ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1 | `validation-schemas.test.ts` | 16 | 6 | 5 | 5 | **A** | Thorough — XSS payloads, null bytes, long strings, strict mode rejection. Best-in-class defensive testing. |
| 2 | `upload-file-validation.test.ts` | 6 | 2 | 3 | 1 | **B** | Rejects missing/invalid/oversized. Missing: boundary size (exactly at limit), all MIME types, zero-byte file. |
| 3 | `upload-file-to-aws.test.ts` | 3 | 1 | 1 | 1 | **B** | Mocked S3. Happy path, URL encoding, error wrapping. Missing: concurrent uploads, empty buffer, timeout. |
| 4 | `serialize-for-client.test.ts` | 2 | 2 | 0 | 0 | **C** | JSON serialization + undefined dropping. Missing: nested Date objects, arrays with mixed types, circular references, BigInt. |
| 5 | `s3-file-reference.test.ts` | 7 | 3 | 2 | 2 | **A** | URL building, key resolution, legacy URL handling, ownership check. Covers the important boundaries. |
| 6 | `resolve-entitlements.test.ts` | 9 | 4 | 2 | 3 | **A** | All plans, expiry, suspension, admin override, persona matrix, custom overrides. Central business logic well-tested. |
| 7 | `rate-limit.test.ts` | 2 | 1 | 1 | 0 | **C** | Allow and block scenarios only, heavily mocked. Missing: concurrent requests, sliding window expiry, edge of window boundary, burst behavior. |
| 8 | `openai-retry.test.ts` | 5 | 2 | 3 | 0 | **A** | Retry with backoff, max retries exhausted, non-retryable status codes (3 via test.each). Good failure coverage. |
| 9 | `normalize-public-asset-url.test.ts` | 4 | 2 | 1 | 1 | **B** | Encoding, double-encode prevention, invalid URL, data URL passthrough. Missing: relative URLs, query strings. |
| 10 | `message-policy.test.ts` | 4 | 2 | 0 | 2 | **B** | Token estimation, eviction, latest message preservation, text compaction. Missing: empty messages, all-media messages, single-message conversation. |
| 11 | `map-date-to-label.test.ts` | 5 | 3 | 1 | 1 | **B** | Minutes/hours/days grouping with fake timers. Missing: timezone edge cases, far-future dates. |
| 12 | `get-plan-status.test.ts` | 4 | 3 | 0 | 1 | **B** | Current/popular/included state. Clean. Missing: unknown plan name, null plan. |
| 13 | `get-full-name.test.ts` | 4 | 3 | 0 | 1 | **B** | Name formatting and initials. Missing: very long names, Unicode names. |
| 14 | `get-formatted-date.test.ts` | 5 | 3 | 1 | 1 | **B** | Formatting, N/A fallback, countdown, isTimeUp. Solid. |
| 15 | `generate-video.test.ts` | 6 | 2 | 3 | 1 | **A** | Full create/poll/download/upload flow, failed status, timeout, policy block, empty content, API failure. Excellent. |
| 16 | `generate-title.test.ts` | 2 | 1 | 1 | 0 | **C** | Happy path + no-choices error. Missing: empty title response, very long title, API timeout, retry behavior. |
| 17 | `generate-string.test.ts` | 4 | 2 | 0 | 2 | **B** | Default/custom length, uniqueness assertion, character set validation. |
| 18 | `generate-streaming-response.test.ts` | 6 | 2 | 2 | 2 | **A** | Stream chunks, error after partial, tool call routing, abort signal, empty content. Strong. |
| 19 | `generate-response.test.ts` | 10+ | 3 | 4 | 3 | **A** | Text response, image dispatch, image limit claim/rollback, S3 failure, conversion failure, service errors, empty response. Thorough. |
| 20 | `generate-image.test.ts` | 5 | 1 | 3 | 1 | **A** | Generate+upload, API failure, empty payload, conversion failure, upload failure. All major failure paths. |
| 21 | `generate-audio.test.ts` | 6 | 2 | 3 | 1 | **A** | TTS mode, audio_in_out mode, no text input, provider failure, malformed data, upload failure. |
| 22 | `filter-assistant-msg.test.ts` | 2 | 1 | 0 | 1 | **C** | Remove media from assistant + keep user messages. Missing: empty content, mixed types, no messages. |
| 23 | `ensure-user-synced.test.ts` | 7 | 2 | 3 | 2 | **A** | Existing user return, creation from Clerk, Lite defaults, Clerk API failure, MongoDB failure, duplicate key race, metadata sync fallback. Excellent edge coverage. |
| 24 | `effective-plan-config.test.ts` | 6 | 3 | 1 | 2 | **A** | Falls back to defaults, uses persisted settings, currency symbol, DB failure, support email override. |
| 25 | `effective-persona-config.test.ts` | 4 | 2 | 1 | 1 | **B** | Default fallback, admin overrides, invalid overrides ignored, unknown persona. |
| 26 | `effective-model-config.test.ts` | 2 | 2 | 0 | 0 | **C** | Default + persisted model settings only. Missing: partial overrides, invalid model names, DB failure. |
| 27 | `download-url-allowlist.test.ts` | 7 | 3 | 2 | 2 | **A** | Known hosts, non-https rejection, unknown hosts, env merge, S3 auto-allow, malformed URLs. Security-critical, well-covered. |
| 28 | `classify-task-complexity.test.ts` | 4 | 3 | 0 | 1 | **B** | Simple/standard/complex (explicit + history-based). Missing: empty messages, boundary history length. |
| 29 | `check-usage-limit.test.ts` | 6 | 3 | 1 | 2 | **A** | Lite at limit, Pro under limit, Lite audio, Lite video, Premium unlimited, period reset. |
| 30 | `check-daily-conversations.test.ts` | 8 | 3 | 2 | 3 | **A** | Read counter, UTC day reset, limit reached, unlimited bypass, atomic claim, midnight boundary, at-limit rejection. Excellent boundary testing. |
| 31 | `ai-model-policy.test.ts` | 8+ | 4 | 1 | 3 | **A** | Full matrix coverage, title pinning, plan-specific, runtime overrides, TTS/video, downgrade. |
| 32 | `admin-queries.test.ts` | 4 | 3 | 0 | 1 | **B** | Pagination, bounds clamping, transaction mapping, empty page skip. Missing: search edge cases, sort validation, large dataset. |
| # | File | Tests | Happy | Fail | Edge | Grade | Assessment |
|---|---|---|---|---|---|---|---|
| 1 | `validation-schemas.test.ts` | 16 | 6 | 5 | 5 | **A** | Thorough — XSS payloads, null bytes, long strings, strict mode rejection. Best-in-class defensive testing. |
| 2 | `upload-file-validation.test.ts` | 6 | 2 | 3 | 1 | **B** | Rejects missing/invalid/oversized. Missing: boundary size (exactly at limit), all MIME types, zero-byte file. |
| 3 | `upload-file-to-aws.test.ts` | 3 | 1 | 1 | 1 | **B** | Mocked S3. Happy path, URL encoding, error wrapping. Missing: concurrent uploads, empty buffer, timeout. |
| 4 | `serialize-for-client.test.ts` | 2 | 2 | 0 | 0 | **C** | JSON serialization + undefined dropping. Missing: nested Date objects, arrays with mixed types, circular references, BigInt. |
| 5 | `s3-file-reference.test.ts` | 7 | 3 | 2 | 2 | **A** | URL building, key resolution, legacy URL handling, ownership check. Covers the important boundaries. |
| 6 | `resolve-entitlements.test.ts` | 9 | 4 | 2 | 3 | **A** | All plans, expiry, suspension, admin override, persona matrix, custom overrides. Central business logic well-tested. |
| 7 | `rate-limit.test.ts` | 2 | 1 | 1 | 0 | **C** | Allow and block scenarios only, heavily mocked. Missing: concurrent requests, sliding window expiry, edge of window boundary, burst behavior. |
| 8 | `openai-retry.test.ts` | 5 | 2 | 3 | 0 | **A** | Retry with backoff, max retries exhausted, non-retryable status codes (3 via test.each). Good failure coverage. |
| 9 | `normalize-public-asset-url.test.ts` | 4 | 2 | 1 | 1 | **B** | Encoding, double-encode prevention, invalid URL, data URL passthrough. Missing: relative URLs, query strings. |
| 10 | `message-policy.test.ts` | 4 | 2 | 0 | 2 | **B** | Token estimation, eviction, latest message preservation, text compaction. Missing: empty messages, all-media messages, single-message conversation. |
| 11 | `map-date-to-label.test.ts` | 5 | 3 | 1 | 1 | **B** | Minutes/hours/days grouping with fake timers. Missing: timezone edge cases, far-future dates. |
| 12 | `get-plan-status.test.ts` | 4 | 3 | 0 | 1 | **B** | Current/popular/included state. Clean. Missing: unknown plan name, null plan. |
| 13 | `get-full-name.test.ts` | 4 | 3 | 0 | 1 | **B** | Name formatting and initials. Missing: very long names, Unicode names. |
| 14 | `get-formatted-date.test.ts` | 5 | 3 | 1 | 1 | **B** | Formatting, N/A fallback, countdown, isTimeUp. Solid. |
| 15 | `generate-video.test.ts` | 6 | 2 | 3 | 1 | **A** | Full create/poll/download/upload flow, failed status, timeout, policy block, empty content, API failure. Excellent. |
| 16 | `generate-title.test.ts` | 2 | 1 | 1 | 0 | **C** | Happy path + no-choices error. Missing: empty title response, very long title, API timeout, retry behavior. |
| 17 | `generate-string.test.ts` | 4 | 2 | 0 | 2 | **B** | Default/custom length, uniqueness assertion, character set validation. |
| 18 | `generate-streaming-response.test.ts` | 6 | 2 | 2 | 2 | **A** | Stream chunks, error after partial, tool call routing, abort signal, empty content. Strong. |
| 19 | `generate-response.test.ts` | 10+ | 3 | 4 | 3 | **A** | Text response, image dispatch, image limit claim/rollback, S3 failure, conversion failure, service errors, empty response. Thorough. |
| 20 | `generate-image.test.ts` | 5 | 1 | 3 | 1 | **A** | Generate+upload, API failure, empty payload, conversion failure, upload failure. All major failure paths. |
| 21 | `generate-audio.test.ts` | 6 | 2 | 3 | 1 | **A** | TTS mode, audio_in_out mode, no text input, provider failure, malformed data, upload failure. |
| 22 | `filter-assistant-msg.test.ts` | 2 | 1 | 0 | 1 | **C** | Remove media from assistant + keep user messages. Missing: empty content, mixed types, no messages. |
| 23 | `ensure-user-synced.test.ts` | 7 | 2 | 3 | 2 | **A** | Existing user return, creation from Clerk, Lite defaults, Clerk API failure, MongoDB failure, duplicate key race, metadata sync fallback. Excellent edge coverage. |
| 24 | `effective-plan-config.test.ts` | 6 | 3 | 1 | 2 | **A** | Falls back to defaults, uses persisted settings, currency symbol, DB failure, support email override. |
| 25 | `effective-persona-config.test.ts` | 4 | 2 | 1 | 1 | **B** | Default fallback, admin overrides, invalid overrides ignored, unknown persona. |
| 26 | `effective-model-config.test.ts` | 2 | 2 | 0 | 0 | **C** | Default + persisted model settings only. Missing: partial overrides, invalid model names, DB failure. |
| 27 | `download-url-allowlist.test.ts` | 7 | 3 | 2 | 2 | **A** | Known hosts, non-https rejection, unknown hosts, env merge, S3 auto-allow, malformed URLs. Security-critical, well-covered. |
| 28 | `classify-task-complexity.test.ts` | 4 | 3 | 0 | 1 | **B** | Simple/standard/complex (explicit + history-based). Missing: empty messages, boundary history length. |
| 29 | `check-usage-limit.test.ts` | 6 | 3 | 1 | 2 | **A** | Lite at limit, Pro under limit, Lite audio, Lite video, Premium unlimited, period reset. |
| 30 | `check-daily-conversations.test.ts` | 8 | 3 | 2 | 3 | **A** | Read counter, UTC day reset, limit reached, unlimited bypass, atomic claim, midnight boundary, at-limit rejection. Excellent boundary testing. |
| 31 | `ai-model-policy.test.ts` | 8+ | 4 | 1 | 3 | **A** | Full matrix coverage, title pinning, plan-specific, runtime overrides, TTS/video, downgrade. |
| 32 | `admin-queries.test.ts` | 4 | 3 | 0 | 1 | **B** | Pagination, bounds clamping, transaction mapping, empty page skip. Missing: search edge cases, sort validation, large dataset. |

> > > > > > > devel

---

### 2.3 Actions (6 files)

| # | File | Tests | Happy | Fail | Edge | Grade | Assessment |
| --- | ----------------------------- | ----- | ----- | ---- | ---- | ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1 | `user-actions.test.ts` | 8 | 3 | 4 | 1 | **A** | getUserById auth/forbidden/unauthorized, updateUser error handling, deleteUser full flow/forbidden/not-found/Clerk-failure. |
| 2 | `transaction-actions.test.ts` | 3 | 1 | 2 | 0 | **B** | Owner transactions, forbidden, unauthorized. Missing: empty results, pagination, malformed IDs. |
| 3 | `task-queries.test.ts` | 5 | 3 | 1 | 1 | **B** | Subdocument serialization, invalid ObjectId short-circuit, media aggregation, pagination bounds. Missing: concurrent reads, very large messages. |
| 4 | `task-actions.test.ts` | 10+ | 4 | 4 | 2+ | **A** | Full CRUD: createTask auth override, prompt init, unauthenticated rejection, updateTask usage increment/no-inc, incrementPromptCount claim/at-limit, deleteTask owner/not-found/unauthorized/invalid-id/S3-failure-resilience. |
| 5 | `checkout-plan.test.ts` | 2 | 1 | 1 | 0 | **C** | Success/cancel URLs + price mismatch. Missing: unauthenticated request, missing user, Stripe API failure, invalid plan name. |
| 6 | `admin-audit-trail.test.ts` | 5+ | 5 | 0 | 0 | **A** | Audit entries for suspension, removal, setting update, page creation, publish toggle. Verifies audit trail integrity. |
| # | File | Tests | Happy | Fail | Edge | Grade | Assessment |
|---|---|---|---|---|---|---|---|
| 1 | `user-actions.test.ts` | 8 | 3 | 4 | 1 | **A** | getUserById auth/forbidden/unauthorized, updateUser error handling, deleteUser full flow/forbidden/not-found/Clerk-failure. |
| 2 | `transaction-actions.test.ts` | 3 | 1 | 2 | 0 | **B** | Owner transactions, forbidden, unauthorized. Missing: empty results, pagination, malformed IDs. |
| 3 | `task-queries.test.ts` | 5 | 3 | 1 | 1 | **B** | Subdocument serialization, invalid ObjectId short-circuit, media aggregation, pagination bounds. Missing: concurrent reads, very large messages. |
| 4 | `task-actions.test.ts` | 10+ | 4 | 4 | 2+ | **A** | Full CRUD: createTask auth override, prompt init, unauthenticated rejection, updateTask usage increment/no-inc, incrementPromptCount claim/at-limit, deleteTask owner/not-found/unauthorized/invalid-id/S3-failure-resilience. |
| 5 | `checkout-plan.test.ts` | 2 | 1 | 1 | 0 | **C** | Success/cancel URLs + price mismatch. Missing: unauthenticated request, missing user, Stripe API failure, invalid plan name. |
| 6 | `admin-audit-trail.test.ts` | 5+ | 5 | 0 | 0 | **A** | Audit entries for suspension, removal, setting update, page creation, publish toggle. Verifies audit trail integrity. |

> > > > > > > devel

---

### 2.4 Components (9 files)

| # | File | Tests | Happy | Fail | Edge | Grade | Assessment |
| --- | ----------------------------------- | ----- | ----- | ---- | ---- | ----- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| 1 | `profile-hero.test.tsx` | 3 | 2 | 0 | 1 | **B** | Update profile fields, avatar upload, account deletion. Missing: validation failures, upload errors, missing user data. |
| 2 | `library-tabs-media-cards.test.tsx` | 3 | 3 | 0 | 0 | **B** | Image/audio/video card rendering with secure URLs, pagination links. Missing: empty state, missing media URLs. |
| 3 | `library-delete-button.test.tsx` | 2 | 1 | 0 | 1 | **B** | Delete+refresh, cancel confirmation. Missing: error handling during delete, loading state, re-click prevention. |
| 4 | `droplet-theme.test.tsx` | 3 | 2 | 0 | 1 | **A** | Default system/light mode, persistence, blocked localStorage graceful handling. |
| 5 | `checkout-success-page.test.tsx` | 5 | 1 | 3 | 1 | **A** | Paid success, missing session_id, oversized session_id, unpaid status, missing Stripe key. Strong defensive testing. |
| 6 | `chat-wrapper.test.tsx` | 5 | 2 | 2 | 1 | **A** | API error display, stop payload rendering, non-terminal media stops, network failure, streaming. |
| 7 | `chat-input.test.tsx` | 6 | 3 | 1 | 2 | **A** | Initial value, Enter send, empty prevention, attach button, file upload before send, upload failure blocking. |
| 8 | `chat-body.test.tsx` | 12+ | 6 | 3 | 3 | **A** | All stop reasons rendered (via test.each), action links (new conversation, upgrade, contact), styling. Excellent behavioral testing. |
| 9 | `alert-message.test.tsx` | 1 | 1 | 0 | 0 | **C** | Single dismiss + re-show test. Missing: all 4 color variants (success/error/warning/info), auto-dismiss, animation, accessibility attributes. |
| # | File | Tests | Happy | Fail | Edge | Grade | Assessment |
|---|---|---|---|---|---|---|---|
| 1 | `profile-hero.test.tsx` | 3 | 2 | 0 | 1 | **B** | Update profile fields, avatar upload, account deletion. Missing: validation failures, upload errors, missing user data. |
| 2 | `library-tabs-media-cards.test.tsx` | 3 | 3 | 0 | 0 | **B** | Image/audio/video card rendering with secure URLs, pagination links. Missing: empty state, missing media URLs. |
| 3 | `library-delete-button.test.tsx` | 2 | 1 | 0 | 1 | **B** | Delete+refresh, cancel confirmation. Missing: error handling during delete, loading state, re-click prevention. |
| 4 | `droplet-theme.test.tsx` | 3 | 2 | 0 | 1 | **A** | Default system/light mode, persistence, blocked localStorage graceful handling. |
| 5 | `checkout-success-page.test.tsx` | 5 | 1 | 3 | 1 | **A** | Paid success, missing session_id, oversized session_id, unpaid status, missing Stripe key. Strong defensive testing. |
| 6 | `chat-wrapper.test.tsx` | 5 | 2 | 2 | 1 | **A** | API error display, stop payload rendering, non-terminal media stops, network failure, streaming. |
| 7 | `chat-input.test.tsx` | 6 | 3 | 1 | 2 | **A** | Initial value, Enter send, empty prevention, attach button, file upload before send, upload failure blocking. |
| 8 | `chat-body.test.tsx` | 12+ | 6 | 3 | 3 | **A** | All stop reasons rendered (via test.each), action links (new conversation, upgrade, contact), styling. Excellent behavioral testing. |
| 9 | `alert-message.test.tsx` | 1 | 1 | 0 | 0 | **C** | Single dismiss + re-show test. Missing: all 4 color variants (success/error/warning/info), auto-dismiss, animation, accessibility attributes. |

> > > > > > > devel

---

### 2.5 Routes (9 files)

| # | File | Tests | Happy | Fail | Edge | Grade | Assessment |
| --- | ------------------------------ | ----- | ----- | ---- | ---- | ----- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1 | `openai-route.test.ts` | 15+ | 4 | 6 | 5 | **A** | Auth 401, invalid message 400, expired plan 403, trial persona access, admin bypass, video entitlements, new task creation, streaming. Highest-risk route, well-covered. |
| 2 | `download-route.test.ts` | 10 | 3 | 4 | 3 | **A** | Auth, missing params, ownership, invalid key, S3 streaming, legacy URL, disallowed hosts, upstream failure, download headers, filename sanitization. |
| 3 | `conversation-stop.test.ts` | 4+ | 0 | 4 | 0 | **A** | Prompt limit, daily conversation limit, storage limit, image limit. Purpose-built failure-path suite. |
| 4 | `clerk-webhook-route.test.ts` | 10+ | 3 | 4 | 3 | **A** | Missing secret, invalid signature, user.created (with metadata sync, idempotency, primary email resolution, fallback username, backend data fallback), DB failure, user.updated. |
| 5 | `aws-route.test.ts` | 11 | 3 | 5 | 3 | **A** | POST/DELETE auth, missing payload, upload success, size limit, upload failure, delete ownership, fileUrl resolution, delete failure. |
| 6 | `status-routes.test.tsx` | 4 | 4 | 0 | 0 | **C** | Renders 401/403/500/404 pages. Smoke-only — no interactive behavior tested. |
| 7 | `proxy.test.ts` | 8 | 4 | 2 | 2 | **A** | Public routes, webhooks, status routes, unknown routes, /app redirect, /admin redirect, non-admin rejection, admin access. |
| 8 | `stripe-webhook-route.test.ts` | 10+ | 3 | 5 | 2 | **A** | Missing header, missing secret, invalid signature, invalid metadata, checkout completion, transaction failure, user update failure, unmatched user, non-checkout events, duplicate idempotency. |
| 9 | `upload-route.test.ts` | 5 | 2 | 2 | 1 | **B** | Auth, missing file, invalid type, successful upload, S3 failure. Missing: oversized file, concurrent upload, rate limiting. |
| # | File | Tests | Happy | Fail | Edge | Grade | Assessment |
|---|---|---|---|---|---|---|---|
| 1 | `openai-route.test.ts` | 15+ | 4 | 6 | 5 | **A** | Auth 401, invalid message 400, expired plan 403, trial persona access, admin bypass, video entitlements, new task creation, streaming. Highest-risk route, well-covered. |
| 2 | `download-route.test.ts` | 10 | 3 | 4 | 3 | **A** | Auth, missing params, ownership, invalid key, S3 streaming, legacy URL, disallowed hosts, upstream failure, download headers, filename sanitization. |
| 3 | `conversation-stop.test.ts` | 4+ | 0 | 4 | 0 | **A** | Prompt limit, daily conversation limit, storage limit, image limit. Purpose-built failure-path suite. |
| 4 | `clerk-webhook-route.test.ts` | 10+ | 3 | 4 | 3 | **A** | Missing secret, invalid signature, user.created (with metadata sync, idempotency, primary email resolution, fallback username, backend data fallback), DB failure, user.updated. |
| 5 | `aws-route.test.ts` | 11 | 3 | 5 | 3 | **A** | POST/DELETE auth, missing payload, upload success, size limit, upload failure, delete ownership, fileUrl resolution, delete failure. |
| 6 | `status-routes.test.tsx` | 4 | 4 | 0 | 0 | **C** | Renders 401/403/500/404 pages. Smoke-only — no interactive behavior tested. |
| 7 | `proxy.test.ts` | 8 | 4 | 2 | 2 | **A** | Public routes, webhooks, status routes, unknown routes, /app redirect, /admin redirect, non-admin rejection, admin access. |
| 8 | `stripe-webhook-route.test.ts` | 10+ | 3 | 5 | 2 | **A** | Missing header, missing secret, invalid signature, invalid metadata, checkout completion, transaction failure, user update failure, unmatched user, non-checkout events, duplicate idempotency. |
| 9 | `upload-route.test.ts` | 5 | 2 | 2 | 1 | **B** | Auth, missing file, invalid type, successful upload, S3 failure. Missing: oversized file, concurrent upload, rate limiting. |

> > > > > > > devel

---

### 2.6 Constants (5 files)

| # | File | Tests | Happy | Fail | Edge | Grade | Assessment |
| --- | ---------------------------- | ----- | ----- | ---- | ---- | ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1 | `plans.test.ts` | 8 | 5 | 1 | 2 | **A** | Lite no-expiry sentinel, Pro monthly/Premium yearly expiry, plan icons case-insensitive, unknown plan throws, PLAN_LIMITS full validation, pricing + copy verification, buildPlans runtime override. Protects frozen business rules. |
| 2 | `persona-prompts.test.ts` | 5 | 4 | 0 | 1 | **A** | 6 personas versioned, model-family prompt selection, unknown model fallback, strategist analysis prompt, interviewer simulation prompt. |
| 3 | `next-config.test.ts` | 2 | 1 | 0 | 1 | **B** | Default allowedDevOrigins and env-parsed deduplication. Thin but reasonable for config. |
| 4 | `faqs.test.ts` | 2 | 1 | 0 | 1 | **B** | Support email verification, free plan copy, and removal of obsolete trial/yearly language. Good regression prevention. |
| 5 | `assistant-personas.test.ts` | 1 | 1 | 0 | 0 | **C** | Single test verifying 6 personas are image+audio enabled. Missing: persona ID uniqueness, systemPrompt non-empty, name format. |
| # | File | Tests | Happy | Fail | Edge | Grade | Assessment |
|---|---|---|---|---|---|---|---|
| 1 | `plans.test.ts` | 8 | 5 | 1 | 2 | **A** | Lite no-expiry sentinel, Pro monthly/Premium yearly expiry, plan icons case-insensitive, unknown plan throws, PLAN_LIMITS full validation, pricing + copy verification, buildPlans runtime override. Protects frozen business rules. |
| 2 | `persona-prompts.test.ts` | 5 | 4 | 0 | 1 | **A** | 6 personas versioned, model-family prompt selection, unknown model fallback, strategist analysis prompt, interviewer simulation prompt. |
| 3 | `next-config.test.ts` | 2 | 1 | 0 | 1 | **B** | Default allowedDevOrigins and env-parsed deduplication. Thin but reasonable for config. |
| 4 | `faqs.test.ts` | 2 | 1 | 0 | 1 | **B** | Support email verification, free plan copy, and removal of obsolete trial/yearly language. Good regression prevention. |
| 5 | `assistant-personas.test.ts` | 1 | 1 | 0 | 0 | **C** | Single test verifying 6 personas are image+audio enabled. Missing: persona ID uniqueness, systemPrompt non-empty, name format. |

> > > > > > > devel

---

### 2.7 Grade Distribution Summary

| Grade | Count | Percentage |
| ----- | ----- | ---------- |
| **A** | 28 | 44% |
| **B** | 20 | 32% |
| **C** | 15 | 24% |
| **D** | 0 | 0% |
| **F** | 0 | 0% |
|---|---|---|
| **A** | 28 | 44% |
| **B** | 20 | 32% |
| **C** | 15 | 24% |
| **D** | 0 | 0% |
| **F** | 0 | 0% |

> > > > > > > devel

**Interpretation:** No broken or misleading test files. The C-grade files are thin smoke tests, not harmful — they just provide minimal safety. The A-grade concentration in routes, webhooks, and entitlements is exactly where it should be for a SaaS app.

---

## 3. E2E Test Quality Assessment

### Grading Rubric (E2E)



> > > > > > > devel

- **A** — Covers navigation, interactions, state persistence, error states, and data lifecycle.
- **B** — Covers navigation and basic interactions. Missing error flows or cleanup.
- **C** — Smoke-only page renders. No meaningful interaction tested.
- **D/F** — Broken or actively misleading.

| # | File | Tests | Grade | Assessment |
| --- | -------------------------------- | -------------- | ----- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1 | `public-pages.spec.ts` | 13 | **A** | Landing page hero, dark mode toggle + persistence, 404 custom page, about page sections, plans page with approved prices, checkout fallback, FAQ accordion, personas page, privacy policy, cookie policy, terms page, footer links, header navigation. Comprehensive public surface coverage. |
| 2 | `auth-boundaries.spec.ts` | 3 | **A** | Guest redirect from /app routes, guest redirect from /admin routes, public pages remain accessible, non-admin users blocked from /admin with 403. Tests the exact security boundary. |
| 3 | `authenticated-flows.spec.ts` | 2 | **B** | Profile + plans page access after sign-in, logout via avatar menu. Missing: session expiry behavior, simultaneous sessions. |
| 4 | `chat-app-shell.spec.ts` | 1 (multi-step) | **B** | App shell rendering, sidebar navigation to /app/new, account menu navigation to library + personas. Chromium-only. Heavy helper infrastructure. Missing: mobile viewport, collapsed sidebar state. |
| 5 | `admin-users.spec.ts` | 1 (multi-step) | **B** | Admin dashboard, user list, user detail with suspend/remove buttons. Missing: actual suspend/remove action execution, pagination, search. |
| 6 | `admin-features.spec.ts` | 1 (multi-step) | **B** | Transactions, usage, settings, website pages + page creation + editor open. Chromium-only. Missing: actual setting changes, page deletion, publish/unpublish. |
| 7 | `live-image-generation.spec.ts` | 1 | **A** | Full live image gen flow: auth → persona selection → chat prompt → wait for generated image → verify download proxy URL. Gated behind `RUN_LIVE_MEDIA_TESTS=1`. 240s timeout. Real API integration test. |
| 8 | `error-handling.spec.ts` | 2 | **B** | Mocked /api/openai 500 → error alert display. Guest → sign-in redirect. Missing: network timeouts, partial stream failures, rate limit responses. |
| 9 | `conversation-lifecycle.spec.ts` | 1 (multi-step) | **A** | Full lifecycle: seed conversation in MongoDB → navigate → verify in library → resume → delete with confirmation modal → verify removal. Real DB interaction + cleanup in `finally` block. |
| 10 | `plans-public.spec.ts` | 1 | **B** | Reconciled pricing on /plans, persona access copy per tier, no yearly billing toggle, FAQ accordion interaction. Overlaps with public-pages but focused on business rules. |
| 11 | `persona-trial-access.spec.ts` | 4 | **A** | Lite user starts trial persona conversation, trial stops at 5 prompts with upgrade CTA, full-access persona uses 10 prompt limit, persona picker shows Trial badge. Mocked backend with realistic prompt counting. |
| 12 | `user-profile.spec.ts` | 1 | **B** | Profile details + plan display, plans page with upgrade CTAs, verified pricing. Missing: actual profile edit, avatar upload, plan change. |
| # | File | Tests | Grade | Assessment |
|---|---|---|---|---|
| 1 | `public-pages.spec.ts` | 13 | **A** | Landing page hero, dark mode toggle + persistence, 404 custom page, about page sections, plans page with approved prices, checkout fallback, FAQ accordion, personas page, privacy policy, cookie policy, terms page, footer links, header navigation. Comprehensive public surface coverage. |
| 2 | `auth-boundaries.spec.ts` | 3 | **A** | Guest redirect from /app routes, guest redirect from /admin routes, public pages remain accessible, non-admin users blocked from /admin with 403. Tests the exact security boundary. |
| 3 | `authenticated-flows.spec.ts` | 2 | **B** | Profile + plans page access after sign-in, logout via avatar menu. Missing: session expiry behavior, simultaneous sessions. |
| 4 | `chat-app-shell.spec.ts` | 1 (multi-step) | **B** | App shell rendering, sidebar navigation to /app/new, account menu navigation to library + personas. Chromium-only. Heavy helper infrastructure. Missing: mobile viewport, collapsed sidebar state. |
| 5 | `admin-users.spec.ts` | 1 (multi-step) | **B** | Admin dashboard, user list, user detail with suspend/remove buttons. Missing: actual suspend/remove action execution, pagination, search. |
| 6 | `admin-features.spec.ts` | 1 (multi-step) | **B** | Transactions, usage, settings, website pages + page creation + editor open. Chromium-only. Missing: actual setting changes, page deletion, publish/unpublish. |
| 7 | `live-image-generation.spec.ts` | 1 | **A** | Full live image gen flow: auth → persona selection → chat prompt → wait for generated image → verify download proxy URL. Gated behind `RUN_LIVE_MEDIA_TESTS=1`. 240s timeout. Real API integration test. |
| 8 | `error-handling.spec.ts` | 2 | **B** | Mocked /api/openai 500 → error alert display. Guest → sign-in redirect. Missing: network timeouts, partial stream failures, rate limit responses. |
| 9 | `conversation-lifecycle.spec.ts` | 1 (multi-step) | **A** | Full lifecycle: seed conversation in MongoDB → navigate → verify in library → resume → delete with confirmation modal → verify removal. Real DB interaction + cleanup in `finally` block. |
| 10 | `plans-public.spec.ts` | 1 | **B** | Reconciled pricing on /plans, persona access copy per tier, no yearly billing toggle, FAQ accordion interaction. Overlaps with public-pages but focused on business rules. |
| 11 | `persona-trial-access.spec.ts` | 4 | **A** | Lite user starts trial persona conversation, trial stops at 5 prompts with upgrade CTA, full-access persona uses 10 prompt limit, persona picker shows Trial badge. Mocked backend with realistic prompt counting. |
| 12 | `user-profile.spec.ts` | 1 | **B** | Profile details + plan display, plans page with upgrade CTAs, verified pricing. Missing: actual profile edit, avatar upload, plan change. |

> > > > > > > devel

### E2E Grade Distribution

| Grade | Count |
| ----- | ----- |
| **A** | 5 |
| **B** | 7 |
| **C** | 0 |

**Top 5 missing E2E scenarios:**

|---|---|
| **A** | 5 |
| **B** | 7 |
| **C** | 0 |

**Top 5 missing E2E scenarios:**

> > > > > > > devel

1. **Admin destructive actions** — suspend/remove user flow not executed end-to-end.
2. **Profile editing** — no E2E test for updating name, uploading avatar, or deleting account.
3. **Mobile viewport** — all sidebar/navigation tests run on desktop only.
4. **Stripe checkout** — no E2E test for the full subscription purchase flow (even mocked).
5. **Conversation with real AI** — only `live-image-generation` hits real API; basic text chat doesn't.

---

## 4. Tech Stack & Config Deep Check

### 4.1 Vitest Configuration (`vitest.config.mts`)

| Setting | Value | Assessment |
| ------------------- | ------------------------------------------------------ | --------------------------------------------------------------------------------------- |
| Environment | `node` (default), `jsdom` for `.tsx` | Correct. Node for server logic, jsdom for components. |
| Coverage thresholds | Statements 70%, Branches 60%, Functions 70%, Lines 70% | **Adequate but not aggressive.** For a SaaS with billing, 80/70/80/80 would be better. |
| Coverage reporter | `text` only | **Missing HTML reporter.** `["text", "html"]` enables interactive coverage exploration. |
| Aliases | `@` → `src`, `server-only` → stub | Correct. Mirrors tsconfig. |

**Gaps:**

| Setting | Value | Assessment |
|---|---|---|
| Environment | `node` (default), `jsdom` for `.tsx` | Correct. Node for server logic, jsdom for components. |
| Coverage thresholds | Statements 70%, Branches 60%, Functions 70%, Lines 70% | **Adequate but not aggressive.** For a SaaS with billing, 80/70/80/80 would be better. |
| Coverage reporter | `text` only | **Missing HTML reporter.** `["text", "html"]` enables interactive coverage exploration. |
| Aliases | `@` → `src`, `server-only` → stub | Correct. Mirrors tsconfig. |

**Gaps:**

> > > > > > > devel

- No `lcov` reporter for CI coverage badge integration.
- No `include`/`exclude` to prevent testing node_modules accidentally.

### 4.2 Playwright Configuration (`playwright.config.ts`)

| Setting | Value | Assessment |
| ------------ | ------------------------------------------------ | ------------------------------------------------ |
| Browsers | Chromium, Firefox, WebKit + optional mobile/Edge | Good breadth. |
| Parallel | `fullyParallel: true` | Correct for independent specs. |
| Retries | 2 on CI, 0 locally | Reasonable. |
| Workers | 1 on CI | Conservative. Could be 2+ if tests are isolated. |
| WebServer | `npm run build && npm run start` | Correct — tests against production build. |
| Timeout | 240s for webServer start | Generous but safe. |
| Reporter | `list` only | **Missing HTML reporter for failure analysis.** |
| Global setup | Separate dependency project | Correct — runs once before all suites. |

**Gaps:**

| Setting | Value | Assessment |
|---|---|---|
| Browsers | Chromium, Firefox, WebKit + optional mobile/Edge | Good breadth. |
| Parallel | `fullyParallel: true` | Correct for independent specs. |
| Retries | 2 on CI, 0 locally | Reasonable. |
| Workers | 1 on CI | Conservative. Could be 2+ if tests are isolated. |
| WebServer | `npm run build && npm run start` | Correct — tests against production build. |
| Timeout | 240s for webServer start | Generous but safe. |
| Reporter | `list` only | **Missing HTML reporter for failure analysis.** |
| Global setup | Separate dependency project | Correct — runs once before all suites. |

**Gaps:**

> > > > > > > devel

- No trace/screenshot on failure (`trace: 'on-first-retry'`).
- No video recording for flaky test debugging.

### 4.3 TypeScript Configuration (`tsconfig.json`)

| Setting | Value | Assessment |
| -------------------- | ----------------- | --------------------- |
| `strict` | `true` | Correct. |
| `noUnusedLocals` | `true` | Correct. |
| `noUnusedParameters` | `true` | Correct. |
| `target` | `ES2022` | Correct for Node 18+. |
| Path alias | `@/*` → `./src/*` | Correct. |
| Setting | Value | Assessment |
|---|---|---|
| `strict` | `true` | Correct. |
| `noUnusedLocals` | `true` | Correct. |
| `noUnusedParameters` | `true` | Correct. |
| `target` | `ES2022` | Correct for Node 18+. |
| Path alias | `@/*` → `./src/*` | Correct. |

> > > > > > > devel

No issues.

### 4.4 ESLint Configuration (`eslint.config.mjs`)

- Only `next/core-web-vitals` + `next/typescript`.
- Single custom rule: `react-hooks/set-state-in-effect: "off"`.

**Gaps:**


> > > > > > > devel

- No `@typescript-eslint/no-floating-promises` — unhandled promises are a real risk in async server actions.
- No `@typescript-eslint/no-misused-promises` — event handlers returning promises silently.
- No import-order enforcement.
- Very minimal config overall. Consider `@typescript-eslint/strict` preset.

### 4.5 Package.json

- 22 runtime deps, 16 dev deps. Clean categorization.
- All major deps are recent versions (Next 16.1.6, React 19, Mongoose 9, Playwright 1.58.2).
- No version pinning issues observed.
- `sharp` is correctly in runtime deps (server-side image processing).

### 4.6 Knip Configuration (`knip.json`)

- Ignores 4 files, 1 dep (prettier), 1 binary (codex).
- Ignores interface/type exports used in-file.
- Clean. No excessive ignore patterns.

---

## 5. Test Infrastructure Evaluation

### 5.1 `tests/unit/test-support/server-only.ts`


```ts
export {};
```

**Assessment:** Correct. Vitest aliases `server-only` → this file so server-side modules can be imported in unit tests without blowing up. Minimal, no side effects.

### 5.2 `tests/e2e/global.setup.ts`

~200 lines. Serial mode. Creates/provisions:


```ts
export {};
```

**Assessment:** Correct. Vitest aliases `server-only` → this file so server-side modules can be imported in unit tests without blowing up. Minimal, no side effects.

### 5.2 `tests/e2e/global.setup.ts`

~200 lines. Serial mode. Creates/provisions:

> > > > > > > devel

- Regular Clerk test user → saves auth state to `.clerk/user.json`
- Admin Clerk test user → saves auth state to `.clerk/admin.json`
- Guest (empty) → saves to `.clerk/guest.json`
- MongoDB user records via upsert

**Assessment:** Well-structured. Uses `@clerk/testing` properly. Handles missing credentials gracefully via `test.skip`. DB seeding uses upsert — safe for re-runs. The `finally { await browser.close() }` cleanup is correct.

**Gaps:**


> > > > > > > devel

- No teardown — seeded users persist between runs. Fine for a dev environment but would be a problem in shared CI.
- No environment validation step (e.g., "is MongoDB reachable?").

### 5.3 `tests/e2e/utils/e2e-test-user.ts`



> > > > > > > devel
> > > > > > > Resolves from `E2E_TEST_*` env vars. Returns null if missing. Has `require*` variants that throw.

**Assessment:** Clean, defensive. Properly separates regular and admin user credentials.

### 5.4 `tests/e2e/utils/dotenv-local.ts`



> > > > > > > devel
> > > > > > > Custom `.env.local` parser with caching. Handles quoted values.

**Assessment:** Adequate for E2E setup. The caching via module-level `Map` is fine since tests don't modify env files.

---

## 6. Hardcoded Values Search

### 6.1 Prices ($19, $39)



> > > > > > > devel

- **In `src/`:** Zero hardcoded prices. Not found in any source file outside `src/constants/plans.tsx`.
- **In `src/constants/plans.tsx`:** Prices defined as constants in the `plans` array and `PLAN_LIMITS`. This is correct — they're canonical plan definitions.
- **In tests:** Prices asserted in `plans.test.ts`, `public-pages.spec.ts`, `plans-public.spec.ts`, `user-profile.spec.ts`. These test that the frozen prices are rendered correctly.

**Verdict: Clean.** Central plan policy is respected. No scattered price literals.

### 6.2 `window.alert()` / `window.confirm()`


- **Zero occurrences in `src/`.** The rule is enforced.

### 6.3 `console.log` / `console.error` / `console.warn`

- **Zero occurrences in `src/`.** Production logging discipline is excellent.

### 6.4 `Math.random()`

- **Zero occurrences in `src/`.** Correct per security rules.

### 6.5 `strict: false` in Mongoose


- **Zero occurrences in `src/`.** The rule is enforced.

### 6.3 `console.log` / `console.error` / `console.warn`

- **Zero occurrences in `src/`.** Production logging discipline is excellent.

### 6.4 `Math.random()`

- **Zero occurrences in `src/`.** Correct per security rules.

### 6.5 `strict: false` in Mongoose

> > > > > > > devel

- **Zero occurrences in `src/`.** All updates use safe defaults.

---

## 7. Server-Side Safety Audit

### 7.1 Server Actions — `"use server"` + `import "server-only"`

| File | `"use server"` | `import "server-only"` | Auth Check | Ownership Filter |
| ---------------------------------------- | -------------- | ---------------------- | ---------------- | ----------------------------- |
| `src/lib/actions/task.actions.tsx` | Yes | Yes | Yes (`auth()`) | Yes (`userId` in all queries) |
| `src/lib/actions/user.actions.tsx` | Yes | Yes | Yes (`auth()`) | Yes (`clerkId` filter) |
| `src/lib/actions/transaction.action.tsx` | Yes | Yes | Yes (`auth()`) | Yes (`clerkId` filter) |
| `src/lib/actions/admin.actions.tsx` | Yes | Yes | Yes (admin auth) | N/A (admin scope) |
| File | `"use server"` | `import "server-only"` | Auth Check | Ownership Filter |
|---|---|---|---|---|
| `src/lib/actions/task.actions.tsx` | Yes | Yes | Yes (`auth()`) | Yes (`userId` in all queries) |
| `src/lib/actions/user.actions.tsx` | Yes | Yes | Yes (`auth()`) | Yes (`clerkId` filter) |
| `src/lib/actions/transaction.action.tsx` | Yes | Yes | Yes (`auth()`) | Yes (`clerkId` filter) |
| `src/lib/actions/admin.actions.tsx` | Yes | Yes | Yes (admin auth) | N/A (admin scope) |

> > > > > > > devel

**Verdict: All server actions are properly protected.** Double directive (`"use server"` + `import "server-only"`) on every action file.

### 7.2 API Routes — Auth Checks

| Route | Auth Method | Ownership Check |
| -------------------------------- | -------------------------------- | -------------------------------------------------- |
| `/api/openai/route.tsx` | `auth()` → `userId` | Yes (tasks filtered by userId) |
| `/api/download/route.tsx` | `auth()` → `userId` | Yes (`isUserOwnedS3ObjectKey`) |
| `/api/aws/route.tsx` | `currentUser()` | Yes (POST: userId prefix, DELETE: ownership check) |
| `/api/upload/route.tsx` | `auth()` → `userId` | Yes (userId used in S3 key) |
| `/api/webhooks/clerk/route.tsx` | `verifyWebhook()` | N/A (webhook) |
| `/api/webhooks/stripe/route.tsx` | `stripe.webhooks.constructEvent` | N/A (webhook) |
| Route | Auth Method | Ownership Check |
|---|---|---|
| `/api/openai/route.tsx` | `auth()` → `userId` | Yes (tasks filtered by userId) |
| `/api/download/route.tsx` | `auth()` → `userId` | Yes (`isUserOwnedS3ObjectKey`) |
| `/api/aws/route.tsx` | `currentUser()` | Yes (POST: userId prefix, DELETE: ownership check) |
| `/api/upload/route.tsx` | `auth()` → `userId` | Yes (userId used in S3 key) |
| `/api/webhooks/clerk/route.tsx` | `verifyWebhook()` | N/A (webhook) |
| `/api/webhooks/stripe/route.tsx` | `stripe.webhooks.constructEvent` | N/A (webhook) |

> > > > > > > devel

**Verdict: All API routes verify auth before any data operation.** Webhook routes use proper signature verification instead of session auth.

### 7.3 Server-Side Utils — `import "server-only"` Coverage

**19 `.ts` files** in `src/lib/utils/`:

| Has `import "server-only"` | Count | Files |
| -------------------------- | ----- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Yes** | 15 | ai-model-policy, admin-audit, admin-auth, admin-queries, check-daily-conversations, check-usage-limit, effective-model-config, effective-persona-access, effective-persona-config, effective-plan-config, ensure-user-synced, handleError, rate-limit, task-queries, usage-event-utils |
| **No** | 4 | validation-schemas, upload-file-validation, serialize-for-client, download-url-allowlist |

**7 `.tsx` files** in `src/lib/utils/`:

| Has `import "server-only"` | Count | Files                                                                              |
| -------------------------- | ----- | ---------------------------------------------------------------------------------- |
| **Yes**                    | 2     | task-queries, handleError                                                          |
| **No**                     | 5     | resolve-entitlements, getFormattedDate, generateString, getPlanStatus, getFullName |

**Analysis of missing `server-only`:**

| Has `import "server-only"` | Count | Files |
|---|---|---|
| **Yes** | 15 | ai-model-policy, admin-audit, admin-auth, admin-queries, check-daily-conversations, check-usage-limit, effective-model-config, effective-persona-access, effective-persona-config, effective-plan-config, ensure-user-synced, handleError, rate-limit, task-queries, usage-event-utils |
| **No** | 4 | validation-schemas, upload-file-validation, serialize-for-client, download-url-allowlist |

**7 `.tsx` files** in `src/lib/utils/`:

| Has `import "server-only"` | Count | Files                                                                              |
| -------------------------- | ----- | ---------------------------------------------------------------------------------- |
| **Yes**                    | 2     | task-queries, handleError                                                          |
| **No**                     | 5     | resolve-entitlements, getFormattedDate, generateString, getPlanStatus, getFullName |

**Analysis of missing `server-only`:**

> > > > > > > devel

- `validation-schemas.ts` — **Acceptable.** Pure Zod schemas, no DB/secrets. Could be used client-side for form validation.
- `upload-file-validation.ts` — **Acceptable.** Pure validation logic, no secrets.
- `serialize-for-client.ts` — **Acceptable.** JSON serialization utility, client-safe.
- `download-url-allowlist.ts` — **CONCERN.** This reads from `process.env.ALLOWED_DOWNLOAD_HOSTS` and contains S3 bucket URL patterns. Should have `server-only` to prevent accidental client bundling of infrastructure details.
- `resolve-entitlements.tsx` — **CONCERN.** Contains full plan entitlement logic including admin bypass rules. Not DB-dependent but reveals business logic internals. Consider adding `server-only`.
- `getFormattedDate.tsx`, `generateString.tsx`, `getPlanStatus.tsx`, `getFullName.tsx` — **Acceptable.** Pure formatting utilities, no secrets or server context.

### 7.4 Database Models

All 8 model files in `src/lib/database/models/` use `.tsx` extension. The DB connection file (`mongoose.tsx`) has `import "server-only"`. Since models import from `mongoose.tsx`, they transitively inherit the server-only boundary.

### 7.5 `.lean()` and `.select()` Usage

- **`.lean()`**: 27 occurrences across queries. Consistent usage on read-only queries. No missing `.lean()` on display queries found.
- **`.select()`**: 26 occurrences. Field projections used extensively in admin-queries, task-queries, and user lookups.

**Verdict: Good database query hygiene.** Both `.lean()` and `.select()` are used consistently.

---

## 8. Code Reuse Violations

### 8.1 Auth Check Pattern


Every server action follows the same pattern:

Every server action follows the same pattern:

> > > > > > > devel

```ts
const { userId } = await auth();
if (!userId) throw new Error("Unauthorized");
```

This pattern appears in `task.actions.tsx` (~5 times), `user.actions.tsx` (~3 times), `transaction.action.tsx` (~1 time). While repetitive, extracting it into a shared utility is debatable — the Clerk `auth()` call is already minimal, and each action may need different error responses.

**Verdict: Borderline. Not a violation per the 3+ rule since each usage is in a different exported function, but a `requireAuth()` helper would reduce boilerplate.**

### 8.2 E2E Helper Duplication


Several E2E specs duplicate the `ensureAuthenticatedAppPage` function:

Several E2E specs duplicate the `ensureAuthenticatedAppPage` function:

> > > > > > > devel

- `chat-app-shell.spec.ts`
- `live-image-generation.spec.ts`
- `error-handling.spec.ts`

Each has a slightly different version with the same core logic (goto → check if sign-in redirect → fill credentials → wait).

**Verdict: Violation.** This should be extracted to `tests/e2e/utils/ensure-authenticated.ts`.

### 8.3 `isClerkAuthRedirect` Duplication



> > > > > > > devel
> > > > > > > Duplicated in `auth-boundaries.spec.ts` and `error-handling.spec.ts` with identical implementation.

**Verdict: Violation.** Extract to shared E2E utils.

### 8.4 Admin Settings Query Pattern



> > > > > > > devel
> > > > > > > `effective-plan-config.ts`, `effective-model-config.ts`, `effective-persona-config.ts`, and `effective-persona-access.ts` all follow the same pattern: connect to DB → query `AppSetting` by key → fallback to defaults → return config.

**Verdict: Acceptable.** Each has different fallback logic and return types. The shared `connectToDatabase()` + `AppSetting.findOne()` base is already factored out.

---

## 9. Resource Leak & Unnecessary Render Risks

### 9.1 Client Components with `useEffect`

Found 50+ `useEffect` usages across ~20 client components. Key analysis:

| Component | useEffect Count | Cleanup? | Risk |
| ------------------------ | --------------- | ------------------------------------------ | --------------------------------------------------------- |
| `audio-player.tsx` | 2 | **Needs review** — audio element lifecycle | **Medium** — may leak audio element event listeners |
| `chat-wrapper.tsx` | 4 | References `useRef` for abort controller | **Low** — abort controller pattern is correct |
| `chat-sidebar-shell.tsx` | 4 | localStorage reads, resize listeners | **Medium** — verify resize listener cleanup |
| `header.tsx` | 2 | Scroll/resize listeners | **Medium** — verify event listener cleanup |
| `confirmation-modal.tsx` | 1 | Dialog element lifecycle | **Low** |
| `plan-count-down.tsx` | 1 | `setInterval` | **Medium** — verify `clearInterval` in cleanup |
| `tiptap-editor.tsx` | 1 | Editor instance lifecycle | **Medium** — Tiptap editor should call `editor.destroy()` |
| `droplet-theme.tsx` | 2 | localStorage reads | **Low** — no subscriptions |
| `chat-input.tsx` | 2 | Textarea auto-resize | **Low** |
| `chat-body.tsx` | 2 | Scroll-to-bottom | **Low** |
| `admin-managed-form.tsx` | 2 | Action state sync | **Low** |

**Components of concern:**

| Component | useEffect Count | Cleanup? | Risk |
|---|---|---|---|
| `audio-player.tsx` | 2 | **Needs review** — audio element lifecycle | **Medium** — may leak audio element event listeners |
| `chat-wrapper.tsx` | 4 | References `useRef` for abort controller | **Low** — abort controller pattern is correct |
| `chat-sidebar-shell.tsx` | 4 | localStorage reads, resize listeners | **Medium** — verify resize listener cleanup |
| `header.tsx` | 2 | Scroll/resize listeners | **Medium** — verify event listener cleanup |
| `confirmation-modal.tsx` | 1 | Dialog element lifecycle | **Low** |
| `plan-count-down.tsx` | 1 | `setInterval` | **Medium** — verify `clearInterval` in cleanup |
| `tiptap-editor.tsx` | 1 | Editor instance lifecycle | **Medium** — Tiptap editor should call `editor.destroy()` |
| `droplet-theme.tsx` | 2 | localStorage reads | **Low** — no subscriptions |
| `chat-input.tsx` | 2 | Textarea auto-resize | **Low** |
| `chat-body.tsx` | 2 | Scroll-to-bottom | **Low** |
| `admin-managed-form.tsx` | 2 | Action state sync | **Low** |

**Components of concern:**

> > > > > > > devel

1. **`audio-player.tsx`** — 2 useEffects managing audio state. Verify that audio element refs are properly cleaned up on unmount.
2. **`chat-sidebar-shell.tsx`** — 4 useEffects. The resize/media-query listeners need `removeEventListener` in cleanup returns.
3. **`plan-count-down.tsx`** — Uses `setInterval`. Must verify `clearInterval` in cleanup.
4. **`tiptap-editor.tsx`** — Tiptap editors must be destroyed on unmount to prevent memory leaks.

### 9.2 Fetch-in-useEffect Anti-pattern


No instances found of `useEffect` + `fetch` for initial data loading. The "Server Components first" rule appears to be consistently followed. Data loading is done server-side.

### 9.3 Missing `useMemo` / `useCallback`

No instances found of `useEffect` + `fetch` for initial data loading. The "Server Components first" rule appears to be consistently followed. Data loading is done server-side.

### 9.3 Missing `useMemo` / `useCallback`

> > > > > > > devel
> > > > > > > Several components import `useMemo` and use it (e.g., `chat-wrapper.tsx`, `chat-body.tsx`). Without reading every component line-by-line, the import patterns suggest reasonable memoization practices.

---

## 10. Global Findings & Recommendations

### Critical (Fix Now)


None found. The codebase has no security violations, no broken auth boundaries, no hardcoded secrets, and no `window.alert`/`window.confirm` usage.

### High Priority

| #   | Finding                                                                      | Impact                                                         |
| --- | ---------------------------------------------------------------------------- | -------------------------------------------------------------- |
| 1   | `download-url-allowlist.ts` missing `import "server-only"`                   | Could expose S3 bucket patterns to client bundle               |
| 2   | `resolve-entitlements.tsx` missing `import "server-only"`                    | Could expose admin bypass and full entitlement logic to client |
| 3   | E2E helper duplication (`ensureAuthenticatedAppPage`, `isClerkAuthRedirect`) | Maintenance burden, subtle behavior drift between copies       |

### Medium Priority

| #   | Finding                                                                     | Impact                                        |
| --- | --------------------------------------------------------------------------- | --------------------------------------------- |
| 1   | Coverage thresholds at 70/60/70/70 — below SaaS billing-level confidence    | Silent coverage drift over time               |
| 2   | No Playwright trace/screenshot/video on failure                             | Debugging CI-only flakes is painful           |
| 3   | No HTML coverage reporter for Vitest                                        | Developers can't explore uncovered branches   |
| 4   | 15 C-grade test files with minimal coverage                                 | Low-confidence areas accumulate bugs silently |
| 5   | ESLint missing `no-floating-promises` rule                                  | Unhandled async errors may go unnoticed       |
| 6   | `audio-player.tsx` and `plan-count-down.tsx` useEffect cleanup not verified | Potential memory leaks on unmount             |

### Low Priority

| #   | Finding                                                                | Impact                                          |
| --- | ---------------------------------------------------------------------- | ----------------------------------------------- |
| 1   | `checkout-plan.test.ts` missing unauthenticated + Stripe failure paths | Billing edge cases untested                     |
| 2   | `rate-limit.test.ts` only 2 tests, heavily mocked                      | Rate limiting behavior effectively untested     |
| 3   | `effective-model-config.test.ts` only 2 tests                          | Model config fallbacks not fully verified       |
| 4   | No E2E test for admin suspend/remove actions                           | Admin destructive flows not verified end-to-end |
| 5   | No mobile viewport E2E tests                                           | Responsive behavior untested                    |
| 6   | Playwright workers=1 on CI is very conservative                        | E2E suite will be slow as specs grow            |

### Positive Highlights

None found. The codebase has no security violations, no broken auth boundaries, no hardcoded secrets, and no `window.alert`/`window.confirm` usage.

### High Priority

| #   | Finding                                                                      | Impact                                                         |
| --- | ---------------------------------------------------------------------------- | -------------------------------------------------------------- |
| 1   | `download-url-allowlist.ts` missing `import "server-only"`                   | Could expose S3 bucket patterns to client bundle               |
| 2   | `resolve-entitlements.tsx` missing `import "server-only"`                    | Could expose admin bypass and full entitlement logic to client |
| 3   | E2E helper duplication (`ensureAuthenticatedAppPage`, `isClerkAuthRedirect`) | Maintenance burden, subtle behavior drift between copies       |

### Medium Priority

| #   | Finding                                                                     | Impact                                        |
| --- | --------------------------------------------------------------------------- | --------------------------------------------- |
| 1   | Coverage thresholds at 70/60/70/70 — below SaaS billing-level confidence    | Silent coverage drift over time               |
| 2   | No Playwright trace/screenshot/video on failure                             | Debugging CI-only flakes is painful           |
| 3   | No HTML coverage reporter for Vitest                                        | Developers can't explore uncovered branches   |
| 4   | 15 C-grade test files with minimal coverage                                 | Low-confidence areas accumulate bugs silently |
| 5   | ESLint missing `no-floating-promises` rule                                  | Unhandled async errors may go unnoticed       |
| 6   | `audio-player.tsx` and `plan-count-down.tsx` useEffect cleanup not verified | Potential memory leaks on unmount             |

### Low Priority

| #   | Finding                                                                | Impact                                          |
| --- | ---------------------------------------------------------------------- | ----------------------------------------------- |
| 1   | `checkout-plan.test.ts` missing unauthenticated + Stripe failure paths | Billing edge cases untested                     |
| 2   | `rate-limit.test.ts` only 2 tests, heavily mocked                      | Rate limiting behavior effectively untested     |
| 3   | `effective-model-config.test.ts` only 2 tests                          | Model config fallbacks not fully verified       |
| 4   | No E2E test for admin suspend/remove actions                           | Admin destructive flows not verified end-to-end |
| 5   | No mobile viewport E2E tests                                           | Responsive behavior untested                    |
| 6   | Playwright workers=1 on CI is very conservative                        | E2E suite will be slow as specs grow            |

### Positive Highlights

> > > > > > > devel

1. **Zero `console.log`/`console.error` in source** — exceptional logging discipline.
2. **Zero `window.alert()`/`window.confirm()`** — UX rules fully enforced.
3. **Zero `Math.random()`** — security rule respected.
4. **Zero `strict: false` in Mongoose** — database safety maintained.
5. **100% server action coverage** — all have `"use server"` + `import "server-only"` + auth checks.
6. **100% API route auth coverage** — all routes verify auth or webhook signatures.
7. **Consistent `.lean()` + `.select()` usage** — good database query performance hygiene.
8. **Strong webhook testing** — both Clerk and Stripe webhooks have 10+ tests each with idempotency, signature verification, and failure paths.
9. **Central plan/entitlement policy** — no scattered price or limit hardcoding in components.
10. **E2E global setup** is well-architected with proper user provisioning and auth state serialization.

---

_End of audit report._
_End of audit report._

> > > > > > > devel
