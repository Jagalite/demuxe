<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# independent AAC channel assembly

Full key: `R196.independent-aac-channel-assembly`

Current decision: **stop_current_profile** (2026-09-19T23:03:56.060985+00:00).

Actual independent AAC-LC48k mono sources parsed at coded SCE boundaries and assembled into stereo PCE with two front SCEs, channel_configuration0 and only second tag renamed. Source hash/rate/origin/priming/input-length/frame-count certificates validated. All49152 samples per channel match both independent originals exactly in FFmpeg and Chrome; native render/end/closed pass. Priming, origin, hash, frame-count mismatches and cancellation reject; dependency parser controls pinned from actual R268 run. Five alternating cold table-load/source-read/identity/parser/PCE-write/single-stereo-decode jobs74.677ms versus two original mono decodes plus PCM interleave57.193ms ratio1.30570 fails<=0.9.

Stop this cold Python independent-SCE assembly cost profile. Exact compressed assembly capability is demonstrated for aligned independent AAC-LC only; consumer startup/output fidelity do not justify arbitrary priming, CPE halves, coupling or SBR admission. Prepared or transfer-constrained workloads require new declared cost tests; no production integration.

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

[Run](../../shared/runs/20260919T230356Z-aac-stereo/run.json) · [Analysis](../../shared/runs/20260919T230356Z-aac-stereo/analysis.md) · [Manifest](../../shared/runs/20260919T230356Z-aac-stereo/manifest.json) · [History](history.jsonl) · [Evidence](evidence/index.json)
