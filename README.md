---
title: ThoxWeb
emoji: 🟢
colorFrom: green
colorTo: gray
sdk: static
pinned: true
header: mini
license: other
tags:
- thox-ai
- thoxkey
- ThoxWeb
- webgpu
- browser
- local-first
- gemma-4
- qat
models:
- google/gemma-4-E2B-it-qat-mobile-transformers
- Thox-ai/ThoxWeb-Gemma-4-E2B
---

# ThoxWeb

**In-browser THOX assistant. WebGPU. No servers. No telemetry. Local-first.**

ThoxWeb is the browser-native chat surface for the **ThoxKey** product from **Thox.ai LLC**.
It runs Google's Gemma 4 E2B (QAT Mobile) entirely on the user's device via WebGPU — the model,
the tokenizer, and every compute kernel execute inside the browser. Nothing you type leaves
your machine.

- Live Space: https://huggingface.co/spaces/Thox-ai/ThoxWeb
- Source: https://github.com/ttracx/thox-webby
- Product page: https://thox.ai/thoxkey
- Model mirror: https://huggingface.co/Thox-ai/ThoxWeb-Gemma-4-E2B

## How it works

1. Plug your **ThoxKey** into any modern browser (Chrome, Edge, or another WebGPU-capable
   browser).
2. The ThoxKey landing page loads ThoxWeb.
3. The Gemma 4 E2B (QAT Mobile) weights are downloaded once, cached locally, then executed
   entirely on-device with WebGPU compute shaders.
4. No servers. No telemetry. No account required.

## Model

This build is a rebrand-and-configuration wrap of Google's
[`google/gemma-4-E2B-it-qat-mobile-transformers`](https://huggingface.co/google/gemma-4-E2B-it-qat-mobile-transformers).
The THOX-branded model repo at
[`Thox-ai/ThoxWeb-Gemma-4-E2B`](https://huggingface.co/Thox-ai/ThoxWeb-Gemma-4-E2B) mirrors
the base for THOX use. Weights themselves are pulled from the upstream Google repo until the
THOX-hosted weights ship.

## Attribution

- Base model: `google/gemma-4-E2B-it-qat-mobile-transformers` — Google (Gemma license).
- WebGPU kernel authoring: original kernels by Fable 5, upstream Space
  [`webml-community/gemma-4-webgpu-kernels`](https://huggingface.co/spaces/webml-community/gemma-4-webgpu-kernels).
- Rebrand, THOX house voice, and product integration: **Thox.ai LLC**.

## Standards

- Owner: **Thox.ai LLC**
- Product surface: **ThoxKey**
- Independence: THOX is an independent AI company. This project is **not affiliated with,
  endorsed by, or sponsored by** Google, Meta, Alibaba, Anthropic, OpenAI, Mistral, or Qwen.
  It applies THOX branding, THOX house voice, and THOX product wiring to an open-source model
  released by Google.
- License: Base model weights are governed by the upstream Gemma license. THOX-authored code
  in this Space (index.html, README, THOX configuration) is provided **AS-IS** with no
  warranty, express or implied.

_Your AI. Your Data. Your Rules._
