# Phase 112.1 Unit Test Audit and Classification

Date: 2026-03-23
Scope: all unit test suites under `tests/unit/**/*.test.ts` and `tests/unit/**/*.test.tsx`
Total suites audited: `72`

## Classification Criteria

- `KEEP`: behavioral assertions with meaningful product/contract coverage and acceptable structure.
- `REFACTOR`: valuable behavioral coverage exists, but structure is too mock/cast-heavy, oversized, or tightly coupled to implementation details.
- `REBUILD`: low-signal test shape for target area; rewrite from scratch with user-visible behavior as primary oracle.

## Classification Summary

- `KEEP`: 51
- `REFACTOR`: 19
- `REBUILD`: 2

## KEEP (51)

- `tests/unit/actions/admin-audit-trail.test.ts`
- `tests/unit/actions/checkout-plan.test.ts`
- `tests/unit/actions/transaction-actions.test.ts`
- `tests/unit/components/admin-transactions-table.test.tsx`
- `tests/unit/components/admin-users-table.test.tsx`
- `tests/unit/components/alert-message.test.tsx`
- `tests/unit/components/audio-player.test.tsx`
- `tests/unit/components/checkout-form.test.tsx`
- `tests/unit/components/checkout-success-page.test.tsx`
- `tests/unit/components/confirmation-modal.test.tsx`
- `tests/unit/components/droplet-theme.test.tsx`
- `tests/unit/components/library-tabs-media-cards.test.tsx`
- `tests/unit/components/persona-card.test.tsx`
- `tests/unit/components/plan-card.test.tsx`
- `tests/unit/constants/assistant-personas.test.ts`
- `tests/unit/constants/faqs.test.ts`
- `tests/unit/constants/next-config.test.ts`
- `tests/unit/constants/persona-prompts.test.ts`
- `tests/unit/constants/plans.test.ts`
- `tests/unit/models/data-model-foundation.test.ts`
- `tests/unit/models/user-model.test.ts`
- `tests/unit/routes/aws-route.test.ts`
- `tests/unit/routes/download-route.test.ts`
- `tests/unit/routes/status-routes.test.tsx`
- `tests/unit/routes/upload-route.test.ts`
- `tests/unit/stores/use-chat-store.test.ts`
- `tests/unit/stores/use-preferences-store.test.tsx`
- `tests/unit/stores/use-ui-store.test.ts`
- `tests/unit/utils/ai-model-policy.test.ts`
- `tests/unit/utils/check-usage-limit.test.ts`
- `tests/unit/utils/classify-task-complexity.test.ts`
- `tests/unit/utils/download-url-allowlist.test.ts`
- `tests/unit/utils/effective-model-config.test.ts`
- `tests/unit/utils/effective-persona-config.test.ts`
- `tests/unit/utils/effective-plan-config.test.ts`
- `tests/unit/utils/filter-assistant-msg.test.ts`
- `tests/unit/utils/generate-string.test.ts`
- `tests/unit/utils/generate-title.test.ts`
- `tests/unit/utils/get-formatted-date.test.ts`
- `tests/unit/utils/get-full-name.test.ts`
- `tests/unit/utils/get-plan-status.test.ts`
- `tests/unit/utils/map-date-to-label.test.ts`
- `tests/unit/utils/message-policy.test.ts`
- `tests/unit/utils/normalize-public-asset-url.test.ts`
- `tests/unit/utils/rate-limit.test.ts`
- `tests/unit/utils/resolve-entitlements.test.ts`
- `tests/unit/utils/s3-file-reference.test.ts`
- `tests/unit/utils/serialize-for-client.test.ts`
- `tests/unit/utils/upload-file-to-aws.test.ts`
- `tests/unit/utils/upload-file-validation.test.ts`
- `tests/unit/utils/validation-schemas.test.ts`

## REFACTOR (19)

- `tests/unit/actions/task-actions.test.ts`
- `tests/unit/actions/task-queries.test.ts`
- `tests/unit/actions/user-actions.test.ts`
- `tests/unit/components/chat-input.test.tsx`
- `tests/unit/components/library-delete-button.test.tsx`
- `tests/unit/components/profile-hero.test.tsx`
- `tests/unit/routes/clerk-webhook-route.test.ts`
- `tests/unit/routes/openai-route.test.ts`
- `tests/unit/routes/proxy.test.ts`
- `tests/unit/routes/stripe-webhook-route.test.ts`
- `tests/unit/utils/admin-queries.test.ts`
- `tests/unit/utils/check-daily-conversations.test.ts`
- `tests/unit/utils/ensure-user-synced.test.ts`
- `tests/unit/utils/generate-audio.test.ts`
- `tests/unit/utils/generate-image.test.ts`
- `tests/unit/utils/generate-response.test.ts`
- `tests/unit/utils/generate-streaming-response.test.ts`
- `tests/unit/utils/generate-video.test.ts`
- `tests/unit/utils/openai-retry.test.ts`

## REBUILD (2)

- `tests/unit/components/chat-body.test.tsx`
- `tests/unit/components/chat-wrapper.test.tsx`

## Missing Test Files / Missing Dedicated Suites

- `src/lib/utils/effective-persona-access.ts` (missing test suite)
- `src/lib/utils/handleError.tsx` (missing test suite)
- `src/lib/utils/aws/deleteFileFromAWS.tsx` (missing test suite)
- `src/lib/database/mongoose.tsx` (missing test suite)
- `src/lib/actions/admin.actions.tsx` (no dedicated action suite; current audit-trail tests cover only mutation logging paths)
- `src/components/chat/sidebar/chat-sidebar-shell.tsx` (missing component suite)
- `src/components/admin/settings/admin-settings-tabs.tsx` (missing component suite)
- `src/components/layout/header.tsx` (missing component suite)
- `src/components/chat/library-tabs.tsx` (tab logic/keyboard-navigation suite missing; current `library-tabs-media-cards.test.tsx` only covers media card rendering)

## Notes for Phase 112.2+

- Highest refactor priority by risk and size: `openai-route.test.ts`, `clerk-webhook-route.test.ts`, `task-actions.test.ts`, `user-actions.test.ts`, `generate-response.test.ts`.
- Existing high-value business logic suites are retained as behavioral anchors: entitlements, model policy, usage-limit checks, validation schemas, and upload/download allowlist tests.
