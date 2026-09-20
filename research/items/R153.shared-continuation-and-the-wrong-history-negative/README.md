<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Shared continuation and the wrong-history negative

Current decision: **pursue**. Two actual one-second H264 red/green histories append the identical SHA-pinned blue RAP fragment on one SourceBuffer.48 queried branch pictures and both continuous plays equal independent standalone full-source native oracles; backward/forward seeks, EOF, stale-generation rejection and cleanup pass. Identical configuration and continuous timing do not rescue non-RAP long-GOP continuation: native MSE accepts it but wrong-history output has meanRGBA error80.4796/max255. Scoped RAP reuse capability, no arbitrary-state merge or network saving.

| Stage | Status | Basis |
| --- | --- | --- |
| define | passed | Existing source-grounded definition imported; acceptance criteria must be reviewed before a new run. |
| prepare | passed | New executable probe and declared workload/controls registered with source/input/runtime evidence. |
| screen | passed | Two actual one-second H264 red/green histories append the identical SHA-pinned blue RAP fragment on one SourceBuffer.48 queried branch pictures and both continuous plays equal independent standalone full-source native oracles; backward/forward seeks, EOF, stale-generation rejection and cleanup pass. Identical configuration and continuous timing do not rescue non-RAP long-GOP continuation: native MSE accepts it but wrong-history output has meanRGBA error80.4796/max255. Scoped RAP reuse capability, no arbitrary-state merge or network saving. |
| correctness | passed | Actual Chrome MSE, one retained SourceBuffer per branch.24 full RGBA queries per branch plus continuous callbacks, independent reference files, reverse/forward seeks, EOF and stale-generation control. All4avcC hashes identical. Adverse non-RAP source packet12 is not a keyframe; MSE accepts its second fragment after unrelated green but target image differs substantially from full long-source oracle. Video-only synthetic AVC profile; no audio/3D/general merge claim. |
| performance | not_applicable | Literal source defines bounded shared-continuation capability and wrong-history negative, explicitly excludes network prefetch saving. No performance claim or forced speed benchmark; physical reuse bytes hash recorded. |
| results | passed | Actual new execution raw outcomes, controls and scoped interpretation retained. |
| decision | passed | pursue: Two actual one-second H264 red/green histories append the identical SHA-pinned blue RAP fragment on one SourceBuffer.48 queried branch pictures and both continuous plays equal independent standalone full-source native oracles; backward/forward seeks, EOF, stale-generation rejection and cleanup pass. Identical configuration and continuous timing do not rescue non-RAP long-GOP continuation: native MSE accepts it but wrong-history output has meanRGBA error80.4796/max255. Scoped RAP reuse capability, no arbitrary-state merge or network saving. |

Next/reopen: Only admit shared continuation with a verified clean RAP and compatible full media configuration. Production branch owner, audio continuity, admission validation and network economics require separate integration profile; never infer decoder-history identity from timestamp/config matches.

[Current contract](item.json) · [History](history.jsonl) · [Evidence](evidence/index.json)
