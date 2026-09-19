<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Process only the audio region that an explicitly requested crossfade changes

Full identity: `R068.process-only-the-audio-region-that-an-explicitly-requested-crossfade-changes`. Reused R-numbers are separate mechanisms.

Current imported decision: **DEFER_SETUP** (full-completion).

Current API exposes filters/gain and sequential queue playback, not an authorized crossfade source-to-presentation map or hybrid copied/new FLAC seam construction. Processing only a seam requires independent FLAC numbering/configuration and audio/video/caption overlap semantics. General allow-lossy admission is not that authorization.

Next action: Define one explicit equal-rate PCM/FLAC crossfade contract; compare a frame-aligned copied/processed seam with a full-render integer-rounding oracle, rejecting mixed rates and preserving unchanged video/audio outside the seam.

## Definition and contract

New selective-processing route · P3 · Risk: High · PROPOSED / NOT TESTED First environment: Host audio construction + sandbox MSE pilot; maintained Wasm cost and integration are local-only. Related cards: R35, R36, R53. Proposed mechanism. For a requested transition between compatible queue items, packet-copy the unchanged audio before and after the seam, decode/mix/encode only a bounded seam region, and preserve original video packets. Start with equal-rate integer PCM/FLAC so codec-lossy re-encoding is not required outside the intentional effect. What is new. R35 switched tracks without a requested mix, R36 concatenated items, and R53 ramped gain on one signal. This creates a small processed audio bridge for a real crossfade rather than processing every sample in both clips.

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
| decision | passed | Historical decision imported verbatim: DEFER_SETUP. No integration or qualification inferred. |

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

- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R068.process-only-the-audio-region-that-an-explicitly-requested-crossfade-changes.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R068.process-only-the-audio-region-that-an-explicitly-requested-crossfade-changes.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/proposals/Demuxe_R58_R69_Research_Backlog.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/proposals/Demuxe_R58_R69_Research_Backlog.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/root3/audits/R068.process-only-the-audio-region-that-an-explicitly-requested-crossfade-changes.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/root3/audits/R068.process-only-the-audio-region-that-an-explicitly-requested-crossfade-changes.md)
