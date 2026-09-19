<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Keep explicit channel processing on the Native audio graph

Full identity: `R061.keep-explicit-channel-processing-on-the-native-audio-graph`. Reused R-numbers are separate mechanisms.

Current imported decision: **PURSUE** (full-completion).

Explicit six-index channel permutation produces exact Float32 samples in browser audio graph; deliberately wrong index wiring fails oracle. Combined with six-channel decoded destination evidence, an explicitly requested matrix is viable without speaker guessing.

Next action: Write the exact requested signal operation, codec tool constraints, state and rounding contract. Check whether an optimized existing library already performs it.

## Definition and contract

New audio-effect candidate · P1 · Risk: Medium · PROPOSED / NOT TESTED First environment: Sandbox Web Audio graph and digital-output pilot, building on the saved six-channel fixture. Related cards: R57, R53. Proposed mechanism. For supported Native A/V, implement explicitly requested channel attenuation, solo/mute, channel swapping or a defined stereo mix with ChannelSplitterNode, per-channel gain and ChannelMergerNode. Keep browser video presentation and avoid an audio re-encode or a move to the mpv video path solely for these operations. What is new. R57 observed six separate channels and R53 smoothed a scalar gain. Neither tested a semantic channel-processing request or proved that a complete channel matrix can preserve the intended output.

Output contract: Exact PCM/encoded output where claimed; otherwise declared numeric tolerance against a stronger independent reference, including delay, tails and state.

Primary metric: Complete specified audio operation, output sample count/phase and practical CPU/memory or repeated-query cost.

Adverse control: Extrema, invalid precision, changed predictor/phase/history or a nonlinear stage must invalidate assumptions. No covert resampling/downmix/quality change.

## Stages

| Stage | Status | Basis |
| --- | --- | --- |
| define | passed | Existing source-grounded definition imported; acceptance criteria must be reviewed before a new run. |
| prepare | pending | Historical evidence retained; stage-specific acceptance has not been reconciled into this checklist. |
| screen | passed | Historical bounded screening disposition recorded. This is completion of screening, not candidate correctness. |
| correctness | pending | Historical evidence retained; stage-specific acceptance has not been reconciled into this checklist. |
| performance | pending | Historical evidence retained; stage-specific acceptance has not been reconciled into this checklist. |
| results | passed | Existing results indexed with current byte identities; historical mismatches are separately retained in the migration record. |
| decision | passed | Historical decision imported verbatim: PURSUE. No integration or qualification inferred. |

Pending preparation/correctness/performance means the historical evidence has not
been converted into a stage acceptance record; it does not erase historical passes
or require rerunning them. Read the evidence before updating these fields.

## Working files

- [Item state and original definition](item.json): authoritative current metadata; update this README when changing it.
- [Decision history](history.jsonl): imported records and their exact ledger locations; append future decisions.
- [Evidence index](evidence/index.json): paths, hashes, and historical hash declarations.
- [Research process](../../PROCESS.md): run layout, gates, fixture and license requirements.

Create `tests/` and `fixtures/` only when this item needs its own code or data.
Shared historical harnesses remain in `tests/` at repository root; commands and
fixture references are in the linked evidence. No unverified harness-to-item
association was invented during migration.

## Archived evidence and definitions

- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R061.keep-explicit-channel-processing-on-the-native-audio-graph.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R061.keep-explicit-channel-processing-on-the-native-audio-graph.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/proposals/Demuxe_R58_R69_Research_Backlog.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/proposals/Demuxe_R58_R69_Research_Backlog.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_f/audits/R061.keep-explicit-channel-processing-on-the-native-audio-graph.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_f/audits/R061.keep-explicit-channel-processing-on-the-native-audio-graph.md)
- [results/full-completion/audio-components/result.json](../../../results/full-completion/audio-components/result.json)
