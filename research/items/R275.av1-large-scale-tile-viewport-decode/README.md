<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# AV1 large-scale tile viewport decode

Full identity: `R275.av1-large-scale-tile-viewport-decode`.

Current decision: **pursue** (component_test).

Actual pinned libaom large-scale-tile decode returns a 256x256 selected tile whose Y, U and V exactly match the full 512x512 decode crop; wrong-quadrant control differs. Tile mode needs AV1D_EXT_TILE_DEBUG. Earlier zero-size and 16-bit-buffer layout mistakes are preserved as harness negatives. Prepared-source mechanism is viable; no browser, sparse transport or CPU claim. Review correction: temporal FFmpeg/Chrome evidence in the shared run does not qualify tile selection. Tile output comparison uses the same libaom implementation for selected/full decode. Keep full correctness pending an independent tile reference and malformed-input/lifecycle controls.

Next action: Obtain an independent decoded reference for the prepared tile profile; test malformed tile selection and ownership before measuring performance.

## Definition and contract

A controlled 512×512 AV1 keyframe was encoded as a prepared 2×2 large-scale-tile representation. The libaom decoder was then asked for one tile at row 1, column 1. The returned 256×256 tile matched all 65,536 Y samples of the corresponding bottom-right quadrant from a full-frame decode: zero differences. The selected coded tile was 10,126 bytes out of a 40,300-byte frame (25.13%). Across 12 host runs, full decode median was 7.144 ms and selected-tile decode median 1.565 ms, a 4.57× ratio. This is strong evidence for a prepared viewport representation and a decoder capable of tile selection. It is not evidence that arbitrary AV1 can be sparsely decoded, nor a browser/GPU performance claim.

Output contract: Configuration and ordered codec payloads where copy is intended; requested frames/audio/timeline/features at the declared output boundary.

Primary metric: Correct additional admitted source/destination capability; otherwise full startup and CPU/resource cost.

Adverse control: Alter one admission-critical configuration, remove a required dependency, or preserve video while making selected audio unsupported. Candidate must reject or use a declared fallback.

## Stages

| Stage | Status | Basis |
|---|---|---|
| define | passed | Prepared large-scale AV1 tile component scope. |
| prepare | passed | Pinned inputs, actual commands, tool identities and independent references captured in run manifest. |
| screen | passed | Actual pinned libaom large-scale-tile decode returns a 256x256 selected tile whose Y, U and V exactly match the full 512x512 decode crop; wrong-quadrant control differs. Tile mode needs AV1D_EXT_TILE_DEBUG. Earlier zero-size and 16-bit-buffer layout mistakes are preserved as harness negatives. Prepared-source mechanism is viable; no browser, sparse transport or CPU claim. Review correction: temporal FFmpeg/Chrome evidence in the shared run does not qualify tile selection. Tile output comparison uses the same libaom implementation for selected/full decode. Keep full correctness pending an independent tile reference and malformed-input/lifecycle controls. |
| correctness | pending | All three selected tile planes equal full-decode crop, and wrong quadrant differs. This is a same-library component oracle only. Shared temporal-layer browser/FFmpeg evidence does not apply to R275. |
| performance | not_applicable | Current endpoint is scoped feasibility, not a measured performance claim; reopen for a predeclared equivalent-work benchmark after complete relevant correctness. |
| results | passed | Positive/negative evidence and limitations captured in immutable run. |
| decision | passed | pursue: Actual pinned libaom large-scale-tile decode returns a 256x256 selected tile whose Y, U and V exactly match the full 512x512 decode crop; wrong-quadrant control differs. Tile mode needs AV1D_EXT_TILE_DEBUG. Earlier zero-size and 16-bit-buffer layout mistakes are preserved as harness negatives. Prepared-source mechanism is viable; no browser, sparse transport or CPU claim. Review correction: temporal FFmpeg/Chrome evidence in the shared run does not qualify tile selection. Tile output comparison uses the same libaom implementation for selected/full decode. Keep full correctness pending an independent tile reference and malformed-input/lifecycle controls. |

[New run](evidence/20260919T202700Z-tile-scope-review/run.json) · [Evidence index](evidence/index.json) · [Complete history](history.jsonl) · [Item contract](item.json)
