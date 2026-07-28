# Development Queue

| Priority | Status | Task | Acceptance criteria | Security / tests | Next action |
|---:|---|---|---|---|---|
| 9.4 | Blocked on real-GPU proof | Clean-host WebGPU run | Download, warmup, generate, stop, clear, reload/cache evidence | No prompt requests in network log; record browser/GPU/model revision | Run on supported desktop GPU |
| 8.8 | Complete | Harden model output rendering | No scripts, handlers, media embeds, or unsafe URL schemes | `npm test` sanitizer assertions | Keep regression in CI |
| 8.3 | Planned | Vendor external runtime assets | No Google Fonts/jsDelivr/esm.sh dependency | CSP + offline smoke test | Decide packaged asset/model origin |
| 7.7 | External tracker pending | Campaign dependency integration | Repo present in Kickstarter list and dependency map with truthful readiness | Link this status and blocker | Update portfolio trackers |

Owner is the THOX engineering team unless assigned otherwise.
