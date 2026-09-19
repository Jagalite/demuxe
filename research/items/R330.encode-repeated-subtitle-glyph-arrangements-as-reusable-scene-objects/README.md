<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Encode repeated subtitle glyph arrangements as reusable scene objects

Full identity: `R330.encode-repeated-subtitle-glyph-arrangements-as-reusable-scene-objects`. Reused R-numbers are separate mechanisms.

Current imported decision: **DEFER_SETUP** (full-completion).

libass already owns renderer caches and unchanged bitmap suppression, but the browser bridge exports final tiles, not reusable fully shaped scene objects. No repeated-layout frequency or shaping-bound observer exists at that boundary. A new shaping/layout API cannot be inferred from bitmap cache reuse.

Next action: First measure repeated shaping/layout within one existing libass track without changing font/wrap semantics; only expose a scene representation if actual repeated work remains, using fallback-font/layout-change invalidation.

## Definition and contract

Cache fully shaped and positioned glyph arrangements plus styles/timing parameters beyond glyph bitmap reuse. Compare exact maintained rendering, font fallback and line wrapping; profile actual repeated-layout frequency.

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

- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R330.encode-repeated-subtitle-glyph-arrangements-as-reusable-scene-objects.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R330.encode-repeated-subtitle-glyph-arrangements-as-reusable-scene-objects.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/conversation/PROPOSAL_SCOPE_EXTRACTS.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/conversation/PROPOSAL_SCOPE_EXTRACTS.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/root2/audits/R330.encode-repeated-subtitle-glyph-arrangements-as-reusable-scene-objects.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/root2/audits/R330.encode-repeated-subtitle-glyph-arrangements-as-reusable-scene-objects.md)
