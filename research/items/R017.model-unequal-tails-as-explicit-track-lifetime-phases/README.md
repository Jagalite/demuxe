<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Model unequal tails as explicit track-lifetime phases

Full identity: `R017.model-unequal-tails-as-explicit-track-lifetime-phases`. Reused R-numbers are separate mechanisms.

Current imported decision: **DEFER_SETUP** (full-completion).

Current implementation already supports a bounded unequal-tail window with known ends and EOS/resume logic; it does not retire an ended SourceBuffer as proposed. The existing working approach must be baseline, not historical bounded rejection.

Next action: Identify measured residual cost in current windowed tails before a retirement variant; if justified, test one audio-long tail and backward restoration, with a midstream gap forbidden from being treated as finality.

## Definition and contract

Timeline · Follow-on architecture experiment · P2 · Risk: High First environment: Browser-only first. Dependencies: R15. Status: Untested hypothesis. Proposed mechanism. Explore AV → audio-only or AV → video-only phases by retiring an ended track’s buffer, then restoring it or rebuilding on a backward seek. Keep media-end, subtitle-end and seekable-end as different facts. Source basis. MSE buffered ranges intersect active buffers, with different ended-state handling. Splitting SourceBuffers alone does not remove that intersection. Removal changes ownership and may constrain later restoration. [M1] First agent experiment. Use both tail directions, a temporary midstream gap as a negative control, and seeks across each boundary. Compare explicit track retirement with the current bounded rejection. Validate the visible-frame policy when video ends first.

Output contract: Actual output identity and timeline, surviving consumers, committed generations and cleanup; candidate execution must be visible.

Primary metric: User-visible operation latency, duplicated work or peak/steady live resource ownership; not object counts alone.

Adverse control: Cancel or replace a source at the changed boundary and delay a stale callback/consumer; reject late publication and premature reuse.

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

- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R017.model-unequal-tails-as-explicit-track-lifetime-phases.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R017.model-unequal-tails-as-explicit-track-lifetime-phases.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/proposals/Demuxe_Routing_Optimization_Ideas.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/proposals/Demuxe_Routing_Optimization_Ideas.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/reports/RESULTS.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/reports/RESULTS.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_d/audits/R017.model-unequal-tails-as-explicit-track-lifetime-phases.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_d/audits/R017.model-unequal-tails-as-explicit-track-lifetime-phases.md)
