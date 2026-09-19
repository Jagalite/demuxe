<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Share source reads and inspection across candidates

Full identity: `R001.share-source-reads-and-inspection-across-candidates`. Reused R-numbers are separate mechanisms.

Current imported decision: **STOP_CURRENT_VALUE** (top100).

Reconciled measured startup read duplication:277304 requested bytes,1.455-3.185ms read wall time in sequential traces. Avoidance upper bound does not justify a new multi-owner broker once storage/copies/authority/cancellation are charged. Reopen for materially larger repeated-read workload; not universal no-benefit claim.

Next action: Read the supplied local follow-up and verify the named raw record once if accessible. Carry forward its scoped disposition; do not rerun this profile just to populate this ledger. Demonstrated larger repeated-read cost or reusable ownership infrastructure.

## Definition and contract

Delivery · New architecture hypothesis · P1 · Risk: Medium First environment: Demuxe source + browser. Dependencies: None; verify prerequisites locally. Status: Untested hypothesis. Proposed mechanism. Introduce one source-identity-scoped broker for inspection, controlled remux, subtitle extraction and mpv reads. Retire a failed candidate without discarding safe immutable byte ranges or reparsing the same headers. This shares source evidence and bytes, not mutable decoder state. Source basis. Demuxe has a finite admission registry; its media-processing routes do not all have the same transport prerequisites. Streams supplies the backpressure/cancellation primitives, not a ready-made shared media cache. [D1, S1]

Output contract: Source/version identity, requested exact sample/frame, dependency coverage and byte-range accounting.

Primary metric: Total bytes and time to correct startup/target, including cold index/identity acquisition; bounded retained bytes.

Adverse control: Change the source/version or corrupt an offset/proof and cancel one consumer. No stale or unverified bytes may be published.

## Stages

| Stage | Status | Basis |
| --- | --- | --- |
| define | passed | Existing source-grounded definition imported; acceptance criteria must be reviewed before a new run. |
| prepare | pending | Historical evidence retained; stage-specific acceptance has not been reconciled into this checklist. |
| screen | passed | Historical bounded screening disposition recorded. This is completion of screening, not candidate correctness. |
| correctness | pending | Historical evidence retained; stage-specific acceptance has not been reconciled into this checklist. |
| performance | pending | Historical evidence retained; stage-specific acceptance has not been reconciled into this checklist. |
| results | passed | Existing results indexed with current byte identities; historical mismatches are separately retained in the migration record. |
| decision | passed | Historical decision imported verbatim: STOP_CURRENT_VALUE. No integration or qualification inferred. |

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

- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R001.share-source-reads-and-inspection-across-candidates.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R001.share-source-reads-and-inspection-across-candidates.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/evidence/imports/identity-check.json](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/evidence/imports/identity-check.json)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/evidence/imports/runs__caption-boundary-integrated__result.json](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/evidence/imports/runs__caption-boundary-integrated__result.json)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/evidence/imports/runs__follow-up__opportunity-summary.json](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/evidence/imports/runs__follow-up__opportunity-summary.json)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/evidence/imports/runs__module-authority-02__result.json](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/evidence/imports/runs__module-authority-02__result.json)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/evidence/imports/runs__module-maintained-pairs-01__summary.json](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/evidence/imports/runs__module-maintained-pairs-01__summary.json)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/evidence/imports/runs__module-separated-01__result.json](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/evidence/imports/runs__module-separated-01__result.json)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/evidence/imports/runs__r74-packed-cost-01__result.json](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/evidence/imports/runs__r74-packed-cost-01__result.json)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/evidence/imports/runs__r74-packed-cost-01__summary.json](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/evidence/imports/runs__r74-packed-cost-01__summary.json)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/proposals/Demuxe_Routing_Optimization_Ideas.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/proposals/Demuxe_Routing_Optimization_Ideas.md)
- [results/local-screening/README.md](../../../results/local-screening/README.md)
- [results/local-screening/follow-up.md](../../../results/local-screening/follow-up.md)
- [results/local-screening/full-queue-audit.md](../../../results/local-screening/full-queue-audit.md)
- [results/local-screening/runs/module-authority-01/result.json](../../../results/local-screening/runs/module-authority-01/result.json)
