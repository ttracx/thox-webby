# Security Model

## Threat model and trust boundaries

User prompts, generated text, and GPU buffers are sensitive local data. Remote application/model
hosts are distribution dependencies, not trusted inference processors. Model output is untrusted
content even when the model runs locally.

## Controls

- No authentication, account, telemetry, prompt upload, or inference API exists in this app.
- WebGPU availability is gated before model load.
- User messages use `textContent`.
- Model markdown passes through an element/attribute/protocol allowlist.
- Media and embed elements are removed to prevent response-triggered network requests.
- External generated links require an explicit click and receive `noopener noreferrer`.
- Chat state is memory-only and cleared on reload; model files may remain in browser cache.
- The reusable janitor workflow is pinned to an immutable commit before receiving secrets.

## Known risks and limitations

- Initial page/runtime/model loading contacts third-party distribution hosts.
- Runtime assets are not vendored and no strict CSP is currently enforced.
- Browser cache encryption, retention, quota, and eviction are controlled by the browser/OS.
- CI stubs WebGPU adapter outcomes; it does not prove real-GPU model execution.
- No clean-host offline, supply-chain hash manifest, or packaged ThoxKey-origin proof exists yet.
- Updating the pinned janitor workflow requires manual review and an explicit SHA change.

These boundaries support security review but are not evidence of HIPAA, GDPR, SOC 2, or other
completed compliance certification.
