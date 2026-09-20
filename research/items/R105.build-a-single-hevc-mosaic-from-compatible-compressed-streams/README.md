<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Build a single HEVC mosaic from compatible compressed streams

Current decision: **pursue**. Two synchronized CTU-aligned all-intra Main HEVC sources become one512x128 mosaic using strict GPAC merge plus necessary cross-tile-filter PPS correction. All12CABAC payloads remain original, six full independently composed YUV pictures and packet timing are exact. Native six fullRGBA pictures match a separately authored, byte-exact wholeYUV-mosaic reference; seeks/EOF pass. Wrong bitdepth rejects. Tiny-tile native failure and incorrect filter/reference variants remain visible. Scoped compressed-mosaic capability; no arbitrary motion or cost claim.

| Stage | Status | Basis |
| --- | --- | --- |
| define | passed | Existing source-grounded definition imported; acceptance criteria must be reviewed before a new run. |
| prepare | passed | New executable probe and declared workload/controls registered with source/input/runtime evidence. |
| screen | passed | Two synchronized CTU-aligned all-intra Main HEVC sources become one512x128 mosaic using strict GPAC merge plus necessary cross-tile-filter PPS correction. All12CABAC payloads remain original, six full independently composed YUV pictures and packet timing are exact. Native six fullRGBA pictures match a separately authored, byte-exact wholeYUV-mosaic reference; seeks/EOF pass. Wrong bitdepth rejects. Tiny-tile native failure and incorrect filter/reference variants remain visible. Scoped compressed-mosaic capability; no arbitrary motion or cost claim. |
| correctness | passed | Actual pinned strict merger, independent FFmpeg fullYUV and bit-aligned CABAC payload observer, all12payloads unchanged and all6timing tuples exact. Cross-tile-filter-on negative changes edge pixels; one-bit traced correction restores exactness. Real mismatched10bit source rejected. Final256x128-source native complete512x128RGBA oracle is exact for all6pictures plus backward/forward seeks/EOF/cleanup.64x64merged native seek failure remains unqualified; no inter-picture motion in admitted inputs. |
| performance | not_applicable | Source asks whether compressed compatible regions can form one coded mosaic. This bounded capability is established without a speed/memory/power claim; source encoding, isolated GPAC build and oracle generation are disclosed. No performance benchmark applies to the current endpoint. |
| results | passed | Actual new execution raw outcomes, controls and scoped interpretation retained. |
| decision | passed | pursue: Two synchronized CTU-aligned all-intra Main HEVC sources become one512x128 mosaic using strict GPAC merge plus necessary cross-tile-filter PPS correction. All12CABAC payloads remain original, six full independently composed YUV pictures and packet timing are exact. Native six fullRGBA pictures match a separately authored, byte-exact wholeYUV-mosaic reference; seeks/EOF pass. Wrong bitdepth rejects. Tiny-tile native failure and incorrect filter/reference variants remain visible. Scoped compressed-mosaic capability; no arbitrary motion or cost claim. |

Next/reopen: Require strict compatible configuration, synchronized frames, certified motion independence and disabled cross-boundary filtering. Use complete-picture YUV semantics for reference. Qualify actual intended predictive clips and native tile geometry before integration; never infer pixel identity from a strict-merger return code alone.

[Current contract](item.json) · [History](history.jsonl) · [Evidence](evidence/index.json)
