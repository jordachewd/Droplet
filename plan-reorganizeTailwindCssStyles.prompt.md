# Plan: Reorganize Tailwind CSS into `/styles` Folder

Split the monolithic `src/app/globals.css` (~300+ lines) into a modular `src/styles/` folder organized by category (theme tokens, base resets, component classes). Uses Tailwind v4's native `@import` directive for CSS inlining at build time — zero runtime cost, better DX.

---

### Current State

- **Single file**: `src/app/globals.css` contains everything — 6 color palettes (60 vars), 15+ component classes, base resets, chat markdown styles
- **Tailwind v4.2.1** CSS-first mode with `@theme`, `@import "tailwindcss"`, `@plugin`
- **Entry point**: `import "@/app/globals.css"` in `src/app/layout.tsx` (line 3)
- No `/styles` folder exists today

---

### Proposed Structure

```
src/styles/
  index.css                    — Entry: Tailwind import + orchestrator
  theme/
    colors.css                 — @theme: 6 palettes (nightIndigo → limeGreen, 60 vars)
    layout.css                 — @theme: breakpoints (xls/xxl/3xl) + container tokens
    typography.css             — @theme: extra-small sizes (--text-xxs, --text-2xs)
  base/
    compatibility.css          — @layer base: border-color v3→v4 compat + box-sizing
    elements.css               — @layer base: body, focus-visible, links, media resets, skip-link
    gradient.css               — .AppGradientBg (page-level radial gradient)
  components/
    typography.css             — @layer components: .heading-1..6, .body-1, .body-2
    buttons.css                — @layer components: .btn + sizes + variants, .icon-btn
    admin.css                  — @layer components: .admin-surface, .admin-table-shell
    chat.css                   — @layer components: .chat-markdown (full markdown + responsive)
    tooltip.css                — @layer components: .tooltip-content
```

---

### Steps

**Phase 1 — Create files (steps 1-5 run in parallel)**

1. Create `src/styles/index.css` — orchestrator importing `tailwindcss`, plugin, custom variant, then all partials in order
2. Extract `src/styles/theme/colors.css` — all 6 `@theme` color palettes
3. Extract `src/styles/theme/layout.css` — `@theme` breakpoints + layout tokens
4. Extract `src/styles/theme/typography.css` — `@theme` text size tokens
5. Extract `src/styles/base/compatibility.css` — border-color fix + box-sizing reset
6. Extract `src/styles/base/elements.css` — body, focus-visible, links, media resets, skip-link, `a.menu-item`
7. Extract `src/styles/base/gradient.css` — `.AppGradientBg`
8. Extract `src/styles/components/typography.css` — heading + body classes
9. Extract `src/styles/components/buttons.css` — all button classes + `.icon-btn`
10. Extract `src/styles/components/admin.css` — admin surface classes
11. Extract `src/styles/components/chat.css` — all chat-markdown styles + responsive table media query
12. Extract `src/styles/components/tooltip.css` — tooltip class

**Phase 2 — Switch entry point** (*depends on Phase 1*)

13. Update `src/app/layout.tsx` line 3: `import "@/app/globals.css"` → `import "@/styles/index.css"`
14. Delete `src/app/globals.css`

**Phase 3 — Validation** (*depends on Phase 2*)

15. Run validation workflow: `prettier` → `lint` → `tsc --noEmit` → `build` → `knip`
16. Visual spot-check: dark/light theme, gradient, headings, buttons, admin surfaces, chat markdown, tooltip, skip-link

---

### Verification

1. `npm run build` succeeds — Tailwind resolves all `@import`ed CSS
2. `npx tsc --noEmit` — layout.tsx import resolves via `@/*` alias
3. `grep -r "globals.css" src/` returns zero — no stale references
4. Visual check: all styled components render identically before/after
5. `npm run knip` — clean audit

---

### Decisions

- **Entry point moves** to `src/styles/index.css`; `globals.css` is deleted (not kept as wrapper)
- **`@theme` blocks split by concern** — colors are the largest block (60 vars), deserve their own file
- **Each component file owns its `@layer components` wrapper** — fully self-contained
- **Gradient in `base/`** not `components/` — page-level background, not a reusable pattern
- **No changes to inline Tailwind classes or `classnames` package** — out of scope
- **Zero visual changes** — pure structural refactor

---

### Further Considerations

1. **`cn()` utility (clsx + tailwind-merge)** — Industry standard for Tailwind class merging with conflict resolution. The project currently uses `classnames` which doesn't resolve Tailwind conflicts. Recommend adopting in a follow-up.
2. **CVA (Class Variance Authority)** — Button variants (`.btn-text/outlined/contained`) and sizes (`.btn-sm/md/lg`) are classic CVA candidates. Could migrate from CSS `@apply` to TypeScript component pattern.
3. **Repeated inline patterns** — `flex items-center gap-X` appears 30+ times across components. Future pass could extract most-repeated utility combos into component classes.
