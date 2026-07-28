# MVP Catalog

| MVP | Market Value | Feasibility | Time-to-Market | Strategic Importance | Priority | Status |
|---|---:|---:|---:|---:|---:|---|
| Safe local WebGPU chat | 9 | 8 | 9 | 10 | 8.8 | Host-tested |
| Air-gapped asset bundle | 9 | 6 | 5 | 10 | 7.5 | Planned |
| ThoxKey campaign launch integration | 8 | 7 | 7 | 9 | 7.7 | Tracker integration pending |

## Safe local WebGPU chat

- Problem: private prompts need inference without an inference server.
- Required modules: WebGPU gate, local model runtime, output sanitizer, browser smoke suite.
- Success criteria: deterministic unsupported-GPU behavior; no model-output-initiated network
  fetch; prompt generation runs locally on a supported real GPU.
- Risks: multi-gigabyte first load, browser storage eviction, CDN/model availability.
- Status boundary: browser behavior is host-tested with deterministic adapter stubs. A successful
  clean-host model download, warmup, and generated response on a real WebGPU adapter is not proven
  by CI.
