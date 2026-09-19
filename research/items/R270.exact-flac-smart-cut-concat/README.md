<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# exact FLAC smart-cut/concat

Full identity: `R270.exact-flac-smart-cut-concat`.

Current decision: **pursue** (2026-09-19T20:13:17.931463+00:00).

Smart FLAC cut preserves 12 interior subframe payloads and reencodes only two edges. Variable sample-number headers/CRCs yield exact 63828 samples plus five libFLAC seeks; wrong fixed numbering fails two late seeks. Repeat-concat and boundary seek also match, with unknown rather than stale STREAMINFO MD5.

## Tested contract

Mono16 48kHz FLAC cut 41737:105565 and same-format repeat-concat, host FFmpeg baseline and independent libFLAC seeks

Next action: Expand channel/bit-depth/block-size/parser controls and browser consumer lifecycle only for a real cut/export consumer; benchmark full edge decode/reencode and authoring cost afterward.

## Stages

| Stage | Status | Basis |
| --- | --- | --- |
| define | passed | Exact mechanism and bounded profile distinguished from overlapping item keys. |
| prepare | passed | Fixtures, independent same-decoder output references, wrong-output controls and runtime/source hashes pinned. |
| screen | passed | Smart FLAC cut preserves 12 interior subframe payloads and reencodes only two edges. Variable sample-number headers/CRCs yield exact 63828 samples plus five libFLAC seeks; wrong fixed numbering fails two late seeks. Repeat-concat and boundary seek also match, with unknown rather than stale STREAMINFO MD5. |
| correctness | passed | Exact whole cut/concat PCM, preserved interior subframes, header/frame CRC checks, five sample seeks, boundary-crossing seek and wrong-numbering control passed. |
| performance | pending | No throughput/CPU/retention benchmark; packet reuse counts alone do not establish savings. |
| results | passed | New and reused execution identities, controls, limits, manifests and commands captured. |
| decision | passed | Scoped pursue disposition; integration and release qualification remain separate. |

[Shared run](../../shared/runs/20260919T201317Z-flac-smart-cut/run.json) · [Analysis](../../shared/runs/20260919T201317Z-flac-smart-cut/analysis.md) · [Manifest](../../shared/runs/20260919T201317Z-flac-smart-cut/manifest.json) · [Current metadata](item.json) · [History](history.jsonl) · [Evidence index](evidence/index.json)

Historical definitions/evidence remain intact. No production integration or release qualification.
