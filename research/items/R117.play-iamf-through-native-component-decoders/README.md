<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Play IAMF through native component decoders

Full key: `R117.play-iamf-through-native-component-decoders`

Current decision: **pursue** (2026-09-19T21:49:20.302418+00:00).

Fresh actual IAMF admission reads stream groups from source through host ffprobe, rejects unsupported gain, copies qualified FLAC component, and native Chrome decodes/renders every96000stereo signed16samples exactly under one clock. Full offline render, unity gain, ended callback, closed context and truncated component rejection pass. Five alternating complete binary-delivery pairs including host admission/extraction or hostreference decode, source transfer, native render and cleanup cost168.838ms versus173.859ms, ratio0.97112 passes1.10 no-regression threshold. Earlier JSON transfer timings invalidated and preserved;404 transport failure preserved.

Pursue strict flatstereo one-element/layer zero-gain finite host-parser bridge. No general IAMF parameter automation/spatial rendering, browser-only parser, streaming seek or production admission. Cost is neutral at this bound, not proven speedup.

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

[Run](../../shared/runs/20260919T214920Z-iamf-cost/run.json) · [Analysis](../../shared/runs/20260919T214920Z-iamf-cost/analysis.md) · [Manifest](../../shared/runs/20260919T214920Z-iamf-cost/manifest.json) · [History](history.jsonl) · [Evidence](evidence/index.json)
