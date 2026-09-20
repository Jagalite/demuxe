<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Make independently resampled audio chunks join exactly

Full key: `R233.make-independently-resampled-audio-chunks-join-exactly`

Current decision: **pursue** (2026-09-19T20:59:29.963950+00:00).

New independent finite-polyphase resampler and exact biquad checkpoint components executed. Every PCM byte, randomrange, boundary and adverse-control gate passes. Resampler44.1k profile fails1.20 time overhead ceiling (1.22027x);32k passes (1.17926x). IIR cold checkpoint construction plus80 queries costs0.03814 of replay-from-zero baseline.

These are independent bounded algorithm components, not the maintained FFmpeg resampler or a shipping checkpoint ABI. Missing integration remains separate from feasibility. Changes to recurrence, precision, filter bank, state identity or denormal policy require new qualification.

No production integration or release qualification. Original provisional directory renamed after capture; replay into a new output directory. Exact original protocol and all measured samples retained.

| Stage | Status |
| --- | --- |
| define | passed |
| prepare | passed |
| screen | passed |
| correctness | passed |
| performance | failed |
| results | passed |
| decision | passed |

[Run](../../shared/runs/20260919T205929Z-continuity/run.json) · [Analysis](../../shared/runs/20260919T205929Z-continuity/analysis.md) · [Manifest](../../shared/runs/20260919T205929Z-continuity/manifest.json) · [History](history.jsonl) · [Evidence](evidence/index.json)
