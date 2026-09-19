<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Compile simple ASS animations into reusable timeline programs

Full identity: `R144.compile-simple-ass-animations-into-reusable-timeline-programs`. Reused R-numbers are separate mechanisms.

Current imported decision: **PURSUE** (top100).

Restricted fad animation reused two opacity-regime mask templates plus piecewise alpha; matches actual libass geometry/masks with at most one alpha unit at seven times including rewind. Single-mask variant fails because libass changes outline mask when fill becomes opaque. No general ASS compiler or measured gain.

Next action: Identify the exact subtitle representation, maintained renderer and existing cache behavior. Distinguish an oracle discrepancy from a player defect.

## Definition and contract

Reuse stable glyph masks with a compiled time-dependent fade/clip program for a supported ASS subset. Match libass ordering, rounding and blending across seeks; unsupported effects continue through the maintained renderer.

Output contract: Independent rendering or browser-owned reference appropriate to the same contract, including hidden state, timing, ordering and clear events.

Primary metric: Required caption capability or total render/extraction cost and retained cue/atlas memory.

Adverse control: Seek into an active cue, change fonts/layout/source, or omit a required style/control. No silent simplification or stale overlay.

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

- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R144.compile-simple-ass-animations-into-reusable-timeline-programs.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R144.compile-simple-ass-animations-into-reusable-timeline-programs.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/conversation/PROPOSAL_SCOPE_EXTRACTS.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/conversation/PROPOSAL_SCOPE_EXTRACTS.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_c/audits/R144.compile-simple-ass-animations-into-reusable-timeline-programs.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_c/audits/R144.compile-simple-ass-animations-into-reusable-timeline-programs.md)
- [results/top100/subtitles/fade-result.json](../../../results/top100/subtitles/fade-result.json)
- [results/top100/subtitles/fade-single-mask-failure.json](../../../results/top100/subtitles/fade-single-mask-failure.json)
