<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Unwrap AAC-LATM into a browser-decoded audio route

Full key: `R343.unwrap-aac-latm-into-a-browser-decoded-audio-route`

Current decision: **pursue** (2026-09-19T20:50:39.914275+00:00).

Restricted LATM parser preserves142 AAC payloads and exact581632 PCM bytes; truncation, sync and missing-config controls reject. End-to-end host candidate median35.914ms versus29.631ms baseline:1.21205 ratio fails predeclared1.10 cost ceiling.

Browser capability remains supported by earlier evidence; this Python plus host-FFmpeg implementation is not a cost winner. Reopen cost claim with a materially different implementation or real browser route workload.

Only this declared component/profile is decided. All failed variants retained. Run directory renamed after capture. Replay into a fresh output directory. No production integration or release qualification.

| Stage | Status |
| --- | --- |
| define | passed |
| prepare | passed |
| screen | passed |
| correctness | passed |
| performance | failed |
| results | passed |
| decision | passed |

[Run](../../shared/runs/20260919T205039Z-latm-performance/run.json) · [Analysis](../../shared/runs/20260919T205039Z-latm-performance/analysis.md) · [Manifest](../../shared/runs/20260919T205039Z-latm-performance/manifest.json) · [History](history.jsonl) · [Evidence](evidence/index.json)
