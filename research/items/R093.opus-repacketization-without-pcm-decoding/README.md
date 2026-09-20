<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Opus repacketization without PCM decoding

Full key: `R093.opus-repacketization-without-pcm-decoding`

Current decision: **pursue** (2026-09-19T20:56:27.118329+00:00).

Matched20ms versus40ms codec packets with one packet per Ogg page preserve pinned full host/browser PCM and split-back frames. Real paced HTTP delivery reduces audio packet/page submissions101→51 (0.50495 ratio) and bytes5.8920%; median browser first audio2036.1→2040.8ms (+4.7ms) passes80ms budget. Measured complete adapter setup23.705→27.470ms yields cold first-output totals2060.440→2068.904ms, still within budget. Actual trials reach EOF with full response and cleanup.

Pursue restricted40ms grouping when packet/page submission reduction is valuable. This is a submission/byte/availability tradeoff versus one-packet-page20ms baseline, not a CPU or earlier-start claim; original FFmpeg Ogg mux remains smaller. Production routing, multistream and universal page policies are outside this profile.

No production integration or release qualification. Original provisional directory renamed after capture; replay into a new output directory. Exact original protocol and all measured samples retained.

| Stage | Status |
| --- | --- |
| define | passed |
| prepare | passed |
| screen | passed |
| correctness | passed |
| performance | passed |
| results | passed |
| decision | passed |

[Run](../../shared/runs/20260919T205627Z-opus-group-delivery/run.json) · [Analysis](../../shared/runs/20260919T205627Z-opus-group-delivery/analysis.md) · [Manifest](../../shared/runs/20260919T205627Z-opus-group-delivery/manifest.json) · [History](history.jsonl) · [Evidence](evidence/index.json)
