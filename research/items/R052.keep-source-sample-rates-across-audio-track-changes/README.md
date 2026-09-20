<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Keep source sample rates across audio-track changes

Full key: `R052.keep-source-sample-rates-across-audio-track-changes`

Current decision: **stop_current_profile** (2026-09-19T21:16:53.043044+00:00).

Actual AudioWorklet render capture finds20ms/22.667ms quiet gaps at the uncorrected44.1→48/48→44.1k AAC boundary despite buffered ranges reporting continuous0–4s. Timestamp-only correction fails; timestamp plus appendWindow correction still leaves18.667/5.333ms. Edit-list priming with identical AAC packet hashes leaves20/5.333ms, failing the predeclared5ms gap gate. Unsupported replacement rejects without changing accepted ranges; same video owner, backward seek, EOF and cleanup pass.

Stop this gapless sample-rate-change profile in the tested Chrome MSE destination. Basic rate changes remain audible, but continuous buffered ranges and tones are insufficient fidelity evidence. Reopen with a destination-supported decoder preroll/priming path or explicitly allowed discontinuity; no performance benchmark before the boundary contract passes.

No production integration or release qualification. Original provisional directory renamed after capture; replay into a new output directory. Exact original protocol and all measured samples retained.

| Stage | Status |
| --- | --- |
| define | passed |
| prepare | passed |
| screen | passed |
| correctness | failed |
| performance | not_applicable |
| results | passed |
| decision | passed |

[Run](../../shared/runs/20260919T211653Z-rate-boundary/run.json) · [Analysis](../../shared/runs/20260919T211653Z-rate-boundary/analysis.md) · [Manifest](../../shared/runs/20260919T211653Z-rate-boundary/manifest.json) · [History](history.jsonl) · [Evidence](evidence/index.json)
