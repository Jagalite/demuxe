<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# exact subtitle font subsetting

Full identity: `R179.exact-subtitle-font-subsetting`. Reused R-numbers are separate mechanisms.

Current imported decision: **STOP_PROFILE** (full-completion).

The full report shows a concrete decomposed combining-acute mismatch for the subset recipe. Current libass receives complete supplied fonts under byte/cache limits; reducing these fonts with that failed recipe cannot preserve the exact subtitle contract. This is a historical experimental rejection, not a new test or an environment blocker.

Next action: Reopen only with a corrected font-subset recipe retaining the missing combining-mark behavior; compare isolated glyphs and the full ASS composition.

## Definition and contract

Two Noto fonts totaling 756,780 bytes were subset for the controlled ASS track to 112,164 bytes, or 14.82% of the original footprint. Tests included Latin ligatures, AV kerning, decomposed combining acute, Greek, Cyrillic, Arabic shaping, and an explicit line break. The exactness gate failed. The composite libass frame differs in 162 RGBA bytes with a maximum channel delta of 43. Isolated rendering found the mismatch in decomposed A + combining acute; the office/affine/AV/naïve/Greek/Cyrillic/Arabic controls were exact. This should be treated as a useful rejection, not rounded into a success because the visible difference is small. Integration implication: a prepared font subset is acceptable only with a track-specific shaping/raster witness suite. This current subset recipe is rejected for exact playback.

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
| decision | passed | Historical decision imported verbatim: STOP_PROFILE. No integration or qualification inferred. |

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

- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R179.exact-subtitle-font-subsetting.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R179.exact-subtitle-font-subsetting.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/reports/R172-R182-report.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/reports/R172-R182-report.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_f/audits/R179.exact-subtitle-font-subsetting.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_f/audits/R179.exact-subtitle-font-subsetting.md)
