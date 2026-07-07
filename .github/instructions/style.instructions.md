---
applyTo: "**/*.ts,**/*.tsx,**/*.js,**/*.mjs,**/*.wgsl"
---

# Style instructions - Tommy''s stack

## House stack

Tommy''s house stack across projects:

- **Rust** for systems / native code (prefer `Result<T, E>` + `thiserror`;
  no `unwrap()` in library code).
- **SwiftUI** for Apple platforms (state-first, `@Observable` / `@State`,
  avoid `AnyView`, prefer view builders).
- **TypeScript + Next.js 14 (app router) + Tailwind CSS**, **dark-mode-first**,
  **WCAG AA** minimum for anything user-facing.
- **Python** + Claude API for AI backends (use `uv`, type-hint everything,
  `httpx` over `requests`).
- **Supabase** for auth + Postgres + storage (RLS on by default; never
  disable RLS to "make it work" - fix the policy).
- **Stripe** for payments (Elements / Checkout, verified webhooks,
  idempotency keys).
- Package managers: **pnpm** (JS/TS monorepos), **uv** (Python), **cargo**
  (Rust). **This repo uses `npm`** because it is a static zero-build site
  and a single lockfile is simpler than a workspace - respect that here.

## JavaScript / TypeScript

- ES modules only. No CommonJS (`require`/`module.exports`).
- Prefer `const`; use `let` only when reassignment is needed.
- Named exports over default exports (grep-ability).
- Async/await over raw promise chains. Handle rejection explicitly.
- Small, pure functions. Extract when a function exceeds ~40 lines or grows
  a second responsibility.
- **No `any` in new TypeScript.** Prefer `unknown` + narrowing.
- JSDoc for exported functions in JS files (this repo is JS, not TS - keep
  types in comments so editors can still infer).
- Two-space indent, semicolons, single quotes for strings, backticks for
  interpolation.
- Use `structuredClone` over `JSON.parse(JSON.stringify(...))`.

## UI (if UI is added)

- Tailwind utility classes over ad-hoc CSS. Extract to a component when a
  class-string repeats.
- Dark-mode-first: define colors in the dark palette, then add a light
  override if needed. This repo''s design tokens live in `index.html`
  `:root`.
- WCAG AA: 4.5:1 text contrast, 3:1 for large text and UI. Every
  interactive element gets a visible focus ring.
- Semantic HTML (`<button>`, `<nav>`, `<main>`) before ARIA. ARIA only when
  semantic HTML cannot express the pattern.
- Respect `prefers-reduced-motion` for any animation.

## WebGPU

- **Feature-detect and fall back to CPU with a clear user-facing message.**
  Never assume `navigator.gpu` exists.
- Boot sequence: check `navigator.gpu`, call `requestAdapter()` (may return
  `null`), then `requestDevice()` (may throw). Every step needs a graceful
  failure path that surfaces a plain-language banner to the user.
- On adapter loss (`device.lost`), surface it - do not silently reload the
  page.
- WGSL: keep shader entry points single-purpose; comment binding groups;
  align struct fields explicitly. Do not construct WGSL from untrusted
  strings.
- Prefer compute pipelines over render pipelines for inference work.
- Free GPU buffers explicitly when a pipeline unloads.

## Errors

- Throw `Error` (or a subclass) with a message that includes the failing
  operation and any actionable context. Never `throw "string"`.
- Catch narrowly. Do not wrap a whole handler in `try` to swallow errors.
- Log with enough context to debug from the log alone; redact user input.

## Testing

- Playwright smoke covers the happy path. If you add a new UI banner or
  boot-time gate, add an assertion to `test/smoke.mjs`.
- Keep tests deterministic. No time-based flakes; use fake timers if
  needed.

## Comments

- Comments explain *why*, not *what*. If the code needs a *what*-comment,
  the code is unclear - rename or refactor.
- TODO comments include an owner and a link to a tracking issue.