<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# dependency-aware corruption tracking

Current decision: **pursue**. Actual36-AU AVC fixture3I/18P/15B: dropping known nonreference B removes only that picture and35remaining hashes are exact. Dropping reference P corrupts8other pictures plus missingP; slice-header perturbation corrupts9. Conservative decode-order suffix trust flags every changed/missing picture and clears at independently parsed IDR1s; all24later pictures exact. PTS-only trust falsely cleared earlier-PTS dependent B and is retained as negative. Source/generation/retired-owner guards pass. Scoped trust semantics, no general liveness/concealment/performance claim.

| Stage | Status | Basis |
| --- | --- | --- |
| define | passed | Existing source-grounded definition imported; acceptance criteria must be reviewed before a new run. |
| prepare | passed | New executable probe and declared workload/controls registered with source/input/runtime evidence. |
| screen | passed | Actual36-AU AVC fixture3I/18P/15B: dropping known nonreference B removes only that picture and35remaining hashes are exact. Dropping reference P corrupts8other pictures plus missingP; slice-header perturbation corrupts9. Conservative decode-order suffix trust flags every changed/missing picture and clears at independently parsed IDR1s; all24later pictures exact. PTS-only trust falsely cleared earlier-PTS dependent B and is retained as negative. Source/generation/retired-owner guards pass. Scoped trust semantics, no general liveness/concealment/performance claim. |
| correctness | passed | Independent host decoded frameMD5 keyed by presentation timestamps, actual MP4 packet/NAL reference flags and IDR classification. Three36AU perturbations: nonref35remaining exact, refloss8changed+1missing, headerperturb9changed. Every affected output unknown, all24postIDR outputs clear/exact; no false-clear in profile. Actual naive PTS-only interval fails on B0.25 depending on future P0.333. Hash/generation-bound research trust owner rejects stale/wrong source and after retirement. |
| performance | not_applicable | Literal source establishes conservative correctness/trust behavior after known loss, not faster decoding or repaired output. Unknown pictures are not claimed reconstructed correctly; no performance gate applies to this capability. |
| results | passed | Actual new execution raw outcomes, controls and scoped interpretation retained. |
| decision | passed | pursue: Actual36-AU AVC fixture3I/18P/15B: dropping known nonreference B removes only that picture and35remaining hashes are exact. Dropping reference P corrupts8other pictures plus missingP; slice-header perturbation corrupts9. Conservative decode-order suffix trust flags every changed/missing picture and clears at independently parsed IDR1s; all24later pictures exact. PTS-only trust falsely cleared earlier-PTS dependent B and is retained as negative. Source/generation/retired-owner guards pass. Scoped trust semantics, no general liveness/concealment/performance claim. |

Next/reopen: Only expose clear output when source-bound decode-order provenance supports it; carry pending reordered picture tags across reset. Extend codec/reference/adverse profiles before maintained integration, and do not treat warnings or eventual IDR recovery as exact per-picture contamination proof.

[Current contract](item.json) · [History](history.jsonl) · [Evidence](evidence/index.json)
