---
applyTo: "**/*.env,**/*secrets*,**/auth/**,**/payment/**,.github/workflows/**"
---

# Security instructions

These paths handle secrets, credentials, auth flows, payment logic, or CI
configuration. Apply extra scrutiny.

## Secrets

- **Never commit secrets.** No API keys, tokens, private keys, JWT signing
  secrets, or webhook signing secrets in source, tests, fixtures, docs, or
  example files.
- **Never log secrets.** Redact tokens and PII before writing to console,
  telemetry, or error reports. ThoxWebby claims "no telemetry" - do not
  introduce any network beacon that could exfiltrate user input.
- **Use environment variables + a secret manager.** In CI, use GitHub Actions
  secrets (`${{ secrets.NAME }}`), never plain `env:` literals.
- **`.env*` files are gitignored.** If you need to document required env
  vars, add a `.env.example` with placeholders only.
- **Rotate on suspicion.** If a secret is committed, assume compromise -
  rotate immediately and force-push is not sufficient (git history and forks
  persist).

## Auth

- Validate all inputs at the trust boundary. Never trust client-supplied
  identifiers, roles, or claims without server-side verification.
- Use constant-time comparisons for tokens/HMAC signatures.
- Prefer short-lived tokens with refresh over long-lived bearer tokens.
- CSRF: state-changing endpoints require CSRF protection (SameSite=Lax
  cookies + double-submit token, or an equivalent).
- Session cookies: `HttpOnly`, `Secure`, `SameSite=Lax` minimum.

## Payment

- Never handle raw card numbers. Use Stripe Elements / Checkout so PANs
  never touch our servers.
- Verify Stripe webhook signatures (`Stripe-Signature` header) on every
  webhook handler. Reject unsigned or mis-signed requests before doing any
  work.
- Idempotency keys on all charge/refund calls.
- Log the Stripe event id, not the full event body.

## CI / GitHub Actions

- Pin third-party actions to a **commit SHA**, not a floating tag
  (`uses: owner/action@<sha>  # v1.2.3`).
- Give `GITHUB_TOKEN` the minimum permissions needed
  (`permissions:` block at job or workflow level).
- Do not run untrusted code from PRs on `pull_request_target`. If you must,
  strictly gate on `github.event.pull_request.head.repo.fork == false` or
  require an approving label from a maintainer.
- Never `echo` a secret. Never write a secret to an artifact or a step
  summary.
- Prefer OIDC over long-lived cloud credentials.

## WebGPU / browser-specific

- No `eval` on user input. Do not construct WGSL shaders from untrusted
  strings.
- CSP: keep the site''s inline-script surface minimal; if adding a new
  `<script>` block, note why it cannot be an external module.
- The model runs client-side - a compromised page can exfiltrate any prompt
  the user types. Preserve the "no network egress at inference time"
  guarantee: audit any new `fetch()` / `XHR` / `WebSocket` in inference
  paths.

## Review

Flag any change in these paths for a second reviewer. Do not merge a
security-sensitive change with only Copilot approval.