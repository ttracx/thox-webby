# ThoxWebby WebGPU smoke harness

Playwright checks that verify the graceful WebGPU-unavailable UX in
`ttracx/thox-webby` (`index.html`).

## Requirements

- Node 20+
- Playwright browsers installed: `npx playwright install chromium`
- System Google Chrome for the real-browser check

## Run

Serve the static site, then run the checks:

```bash
# from repo root
python -m http.server 8731 --bind 127.0.0.1 &
cd .smoke && npm install
SMOKE_URL=http://127.0.0.1:8731/index.html node smoke.mjs headless   # expects banner
SMOKE_URL=http://127.0.0.1:8731/index.html node smoke.mjs real        # expects no banner, no regression
```

Focused checks (each asserts one spec item in the unavailable state):

- `check-placeholder.mjs` - composer placeholder = actionable message
- `check-loadbtn.mjs`     - Load buttons disabled with explanatory tooltip
- `check-banner-header.mjs`   - inline banner above chat panel, header "WebGPU not available"
- `check-banner-pitch.mjs`    - pitch copy present and visible
- `check-banner-checklist.mjs` - actionable checklist (Chrome/Edge/Safari, chrome://gpu, corp policies)

Headless Chromium exposes `navigator.gpu` but returns no adapter, so the
detected reason is `no-adapter`; the `no-webgpu-api` and `error` paths are
covered by `checkWebGPU()` in `index.html`.
