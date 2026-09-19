<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Assemble output as headers plus original payload views

Full identity: `R047.assemble-output-as-headers-plus-original-payload-views`. Reused R-numbers are separate mechanisms.

Current imported decision: **ALREADY_IMPLEMENTED** (top100).

Reconciled completed prior evidence: The current dirty worker reuses a sole full owned ArrayBuffer and gathers all other cases. This is only the previously adopted narrow owned-buffer slice, not general scatter/gather or elimination of native mux copies. Current worker hash matches the prior isolated qualified worker. Imported exact captured output and append sizes match for both profiles; application gather bytes decrease 96.20% on the small fixture but only 8.96% on the movie, below its 25% value gate. Prior 100-cycle/1801.927-second run is retained historical evidence, not a v4 execution. Broad scatter/gather, CPU savings and production qualification are not established.

Next action: Find where bytes/timestamps actually change, are copied, or are withheld. Compare against current persistent mux/parser behavior.

## Definition and contract

New copy-elimination experiment · P1 · PROPOSED / NOT TESTED Extends: R34, R42, R46. Reference primitives: S1, S10, L3. Question. Can new fragment headers and existing compressed spans reach MSE without first flattening the whole fragment into another JavaScript buffer? Mechanism. Represent output as a bounded ordered list of header bytes and views onto owned immutable source spans. Feed those bytes in precisely the same logical order; batch adjacent spans so eliminating copies does not create one append per packet. Smallest useful experiment. Take known-good fMP4 output and split it into headers and payload views. Compare concatenation, pooled concatenation and bounded scatter/gather delivery. Verify reconstructed byte equality before playback; then test cancellation, partial output, reused storage and a large backing-buffer retention case.

Output contract: Independent parsing of sample payload, configuration, PTS/DTS/duration and required output; valid container plus continuing playback when this is the tested claim.

Primary metric: Complete preparation/startup/refill work, bytes and ownership; output parser acceptance alone is not the metric.

Adverse control: Wrong size/offset/configuration or a non-random-access cut must fail specifically; cancellation cannot publish another generation.

## Stages

| Stage | Status | Basis |
| --- | --- | --- |
| define | passed | Existing source-grounded definition imported; acceptance criteria must be reviewed before a new run. |
| prepare | pending | Historical evidence retained; stage-specific acceptance has not been reconciled into this checklist. |
| screen | passed | Historical bounded screening disposition recorded. This is completion of screening, not candidate correctness. |
| correctness | pending | Historical evidence retained; stage-specific acceptance has not been reconciled into this checklist. |
| performance | pending | Historical evidence retained; stage-specific acceptance has not been reconciled into this checklist. |
| results | passed | Existing results indexed with current byte identities; historical mismatches are separately retained in the migration record. |
| decision | passed | Historical decision imported verbatim: ALREADY_IMPLEMENTED. No integration or qualification inferred. |

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

- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R047.assemble-output-as-headers-plus-original-payload-views.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R047.assemble-output-as-headers-plus-original-payload-views.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/evidence/imports/reconciled__runs__engine-baseline__r47-comparison.json](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/evidence/imports/reconciled__runs__engine-baseline__r47-comparison.json)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/evidence/imports/reconciled__runs__engine-baseline__r47-real-media-comparison.json](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/evidence/imports/reconciled__runs__engine-baseline__r47-real-media-comparison.json)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/evidence/imports/reconciled__runs__r47-endurance-01__result.json](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/evidence/imports/reconciled__runs__r47-endurance-01__result.json)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/proposals/Demuxe_R43_R57_Experiment_Backlog.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/proposals/Demuxe_R43_R57_Experiment_Backlog.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_b/audits/R047.assemble-output-as-headers-plus-original-payload-views.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_b/audits/R047.assemble-output-as-headers-plus-original-payload-views.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/reconciliation/local-identity.json](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/reconciliation/local-identity.json)
- [results/local-screening/README.md](../../../results/local-screening/README.md)
- [results/local-screening/follow-up.md](../../../results/local-screening/follow-up.md)
- [results/local-screening/full-queue-audit.md](../../../results/local-screening/full-queue-audit.md)
- [results/local-screening/r47-qualification.md](../../../results/local-screening/r47-qualification.md)
