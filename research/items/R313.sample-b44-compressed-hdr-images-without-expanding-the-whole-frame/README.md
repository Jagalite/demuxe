<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Sample B44-compressed HDR images without expanding the whole frame

Full key: `R313.sample-b44-compressed-hdr-images-without-expanding-the-whole-frame`

Current decision: **stop_current_profile** (2026-09-20T00:25:45.238923+00:00).

Actual OpenEXR B44 single HALF-Y/pLinearfalse130x98 file parsed into825four-by-four blocks including right/bottom padding. All12740 reconstructed half bit patterns exactly match independent OpenEXR decoder; encoded output intentionally differs from precompression pixels. Actual WebGPU direct block sampling1066queried pixels matches the same half bits and identical HDR grayscale consumer output versus GPU expanding only87selected unique blocks into compact half storage. Truncated/version/wrong-pixel controls pass; stale epoch prevents readback publication and all GPU resources close. Five alternating cold device/read/hash/upload/pipeline/sample/consumer/readback medians6.9vs7.2ms ratio0.95833 fails0.9. Initial shader/pipeline startup is separately retained and variable; no stable speedup claim.

Stop this sparse-view B44 sampler at its declared latency gate. Capability and retained compressed representation are real; different repeated access or memory budget may reopen with full measured costs. Baseline already expands only selected blocks, not full frame. B44A, pLinear conversion, RGB and general EXR layouts remain excluded; no pre-encoding lossless claim.

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

[Run](../../shared/runs/20260920T002545Z-b44/run.json) · [Analysis](../../shared/runs/20260920T002545Z-b44/analysis.md) · [Manifest](../../shared/runs/20260920T002545Z-b44/manifest.json) · [History](history.jsonl) · [Evidence](evidence/index.json)
