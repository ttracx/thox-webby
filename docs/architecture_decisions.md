# Architecture Decisions

## ADR-001: Treat generated markdown as untrusted local content

- **Decision:** Render model markdown through a strict element, attribute, and URL-protocol
  allowlist. Do not permit media or embed elements.
- **Context:** A local model can emit arbitrary markdown. An image or media URL would cause the
  browser to contact an external host automatically even though inference itself is local.
- **Options considered:** trust local output; block all formatting; sanitize an allowlisted subset.
- **Tradeoffs:** rich media and raw HTML are unavailable, while common technical formatting and
  explicit links remain supported.
- **Security impact:** prevents response-triggered external media fetches and active HTML.
- **Local-first impact:** protects the prompt/response boundary after local generation.
- **Compliance impact:** reduces an uncontrolled egress path but does not establish compliance.
- **Final choice:** `safe-markdown.js` owns the rendering boundary and `test/smoke.mjs` guards it.
- **Follow-up:** add a strict CSP after runtime and model assets are vendored.

## ADR-002: Describe the product as local inference

- **Decision:** Separate local inference claims from network distribution claims.
- **Context:** the app downloads UI/runtime assets and model files from third-party origins.
- **Final choice:** user-facing copy and documentation state that prompts are not sent to an
  inference API while listing the external download boundary.
- **Follow-up:** produce clean-host offline proof before claiming an air-gapped release.

## ADR-003: Pin secret-consuming reusable workflows

- **Decision:** reference the THOX repo janitor reusable workflow by immutable commit SHA.
- **Context:** the caller forwards GitHub and model-provider secrets; a moving `main` reference
  could change executed code without a review in this repository.
- **Security impact:** adopted workflow code is stable until an explicit reviewed SHA update.
- **Tradeoff:** janitor updates are manual.
- **Final choice:** pin `ttracx/thox-repo-janitor` at
  `372a48107029172cb28ca5f1f4baf658a282449a`.

## ADR-004: Keep public-repository maintenance self-contained

- **Decision:** run this public repository's scheduled smoke check locally in its own workflow.
- **Context:** scheduled runs `30524262188` and `30433510395` failed before creating a job.
  Removing an undeclared secret exposed the remaining GitHub boundary: a public repository cannot
  call the private janitor workflow at its pinned SHA.
- **Security impact:** the replacement uses read-only contents permission and forwards no
  repository or provider secrets. The private janitor repository remains private with reusable
  access disabled.
- **Tradeoff:** fleet-wide mutation and issue automation stay centralized in the private janitor
  repository; this workflow only proves the Webby smoke contract.
- **Final choice:** replace the unusable cross-repository call with `npm ci`, installation of the
  lockfile-pinned Playwright Chromium runtime, and `npm test` on a scheduled or manual Ubuntu
  runner. Run `30545432073` proved the browser install is required on a clean runner.
- **Follow-up:** confirm the replacement run; it does not establish clean-host GPU, offline, or
  release readiness.
