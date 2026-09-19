<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Cache subtitle tiles and schedule only useful redraws

Full identity: `R021.cache-subtitle-tiles-and-schedule-only-useful-redraws`. Reused R-numbers are separate mechanisms.

Current imported decision: **PURSUE** (top100).

Built isolated pinned libass runtime, then real static/karaoke tiles rendered exactly with bounded cache through time changes, rewind and resize:28 cache hits/20 misses,145496 peak retained bytes. Value is repeated-tile allocation avoidance, not proven CPU saving.

Next action: Identify the exact subtitle representation, maintained renderer and existing cache behavior. Distinguish an oracle discrepancy from a player defect.

## Definition and contract

Subtitles · New optimization hypothesis · P1 · Risk: Medium First environment: Existing NativeASS + browser. Dependencies: None; verify prerequisites locally. Status: Untested hypothesis. Proposed mechanism. Cache unchanged alpha/color tiles and reuse surfaces instead of expanding and allocating every tile on each bitmap update. Add safe static-cue scheduling while retaining continuous rendering for unknown/animated ASS constructs. Source basis. The current NativeASS source expands tile alpha to RGBA, creates OffscreenCanvas tiles and checks media time through requestAnimationFrame. It already handles an unchanged response; the proposal targets remaining allocation/composition work. [D2] First agent experiment. Compare static dialogue, karaoke, transforms and paused resize. Record render RPCs, allocation/bitmap bytes and UI work, not only total CPU. Key invalidation by track, fonts, source geometry and render revision.

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

- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R021.cache-subtitle-tiles-and-schedule-only-useful-redraws.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R021.cache-subtitle-tiles-and-schedule-only-useful-redraws.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/proposals/Demuxe_Routing_Optimization_Ideas.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/proposals/Demuxe_Routing_Optimization_Ideas.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_b/audits/R021.cache-subtitle-tiles-and-schedule-only-useful-redraws.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_b/audits/R021.cache-subtitle-tiles-and-schedule-only-useful-redraws.md)
- [results/full-completion/r21/result.json](../../../results/full-completion/r21/result.json)
- [results/top100/ass-build.log](../../../results/top100/ass-build.log)
- [results/top100/subtitles/result.json](../../../results/top100/subtitles/result.json)
