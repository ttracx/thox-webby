# GitHub Copilot instructions - thox-webby

## Summary

**ThoxWebby** is an in-browser THOX assistant that runs Google Gemma 4 E2B
(QAT Mobile) **entirely on the user''s device via WebGPU**. No servers, no
telemetry, local-first. The repo is a **static site** (plain HTML + ES
modules, served as a Hugging Face static Space) that boots a WebGPU compute
pipeline, loads model weights + tokenizer into the browser, and runs
inference in-page. No bundler, no framework, no server. Emphasis: WebGPU-
first, dark-mode-first, WCAG AA, zero telemetry.

## Repository info

- Type: **static browser app** (HTML + JS ES modules)
- Runtime: browsers with WebGPU (Chrome/Edge stable; Safari/FF behind flags)
- Language: JavaScript (ES modules), HTML, CSS
- Node: **v22** (used only for the Playwright smoke test)
- Package manager: **npm** (single `package-lock.json`, no pnpm workspace)
- Tests: Playwright headless Chromium smoke in `test/smoke.mjs`
- CI: `.github/workflows/webgpu-banner-smoke.yml` (Ubuntu, Node 22, `npm ci`,
  `npx playwright install --with-deps chromium`, `npm test`)
- Model source: `google/gemma-4-E2B-it-qat-mobile-transformers` (fetched from
  the HF Hub at runtime, cached by the browser)
- License: SEE LICENSE IN LICENSE (Gemma license governs weights)

## Build & validate

There is no build step - files are served as-is. Always in this order:

1. **Always `npm ci` before running tests.** Do not use pnpm here (there is
   no pnpm-lock.yaml). The lockfile is npm''s.
2. **Always `npx playwright install --with-deps chromium` before `npm test`
   on a fresh checkout.** Without the browser binary the smoke fails with
   `Executable doesn''t exist`.
3. **`npm test` runs the WebGPU-banner smoke.** It serves `index.html`, loads
   the page, and asserts critical banners/UI render. It does **not**
   exercise GPU inference - headless Chromium in CI has no WebGPU adapter.
   To exercise WebGPU locally, launch Chrome with `--enable-unsafe-webgpu`
   (or Chrome Canary on a machine with a supported GPU).
4. **No `lint` or `typecheck` script exists.** Do not invent one; do not add
   TypeScript or a bundler without an explicit ask - this is deliberately a
   zero-build project.
5. **`node --check` any modified `.js` file** before committing to catch
   syntax errors the test suite will miss.

Known workarounds:

- **Weights/tokenizer are large.** Never inline them - they are fetched from
  the HF Hub and cached by the browser. Do not add `.bin`/`.safetensors` to
  the tree; `.gitattributes` routes them through LFS but the intent is to
  keep them out entirely.
- **WASM shim loading:** transformers.js + WASM assets load from CDN via the
  importmap in `index.html`. If you change the importmap, verify URLs
  resolve in both Chrome and Firefox.
- **LFS budget:** `.gitattributes` claims many binary extensions for LFS.
  Check `git lfs ls-files -s` before committing any binary asset.
- **Playwright cold-cache flakes:** re-run once before assuming regression.

## Project layout

Root files (all load-bearing):

- `index.html` - app shell, THOX design tokens (dark-mode-first), importmap,
  boot script.
- `landing.js` - landing UI, WebGPU capability check, three.js background.
- `gemma-4-e2b.js` - model loader, tokenizer wiring, WebGPU inference driver.
- `package.json` - `playwright` devDep; scripts are `test` / `test:smoke`.
- `manifest.webmanifest`, `favicon.svg`, `apple-touch-icon.svg`, `og.svg` -
  PWA + social meta assets.
- `README.md` - HF Space frontmatter + product description.
- `.gitattributes` - LFS routing for model binaries.

One level down:

- `.github/workflows/webgpu-banner-smoke.yml` - the only workflow.
- `.github/instructions/` - path-scoped Copilot instructions.
- `test/smoke.mjs` - Playwright headless-Chromium smoke.

## Trust these instructions

Trust these instructions over ad-hoc exploration. Only search when a specific
instruction is missing or a command fails unexpectedly. When in doubt about
WebGPU behavior, feature-detect first and degrade gracefully - never assume
`navigator.gpu` or an adapter exists.