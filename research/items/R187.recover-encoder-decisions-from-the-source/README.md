<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# recover encoder decisions from the source

Full identity: `R187.recover-encoder-decisions-from-the-source`. Reused R-numbers are separate mechanisms.

Current imported decision: **DEFER_SETUP** (full-completion).

Current player exposes packet/frame flow, not source encoder decision logs or a target transcoder search interface. Historical x264 first-pass hints guided a separate block-matching model and did not demonstrate actual bitstream extraction or AVC-to-HEVC quality/cost.

Next action: Identify one available source hint and a real target encoder hook, then compare complete rate-distortion output to its own search baseline, including scene changes.

## Definition and contract

The pilot encoded a controlled source with x264 first-pass statistics, then used the recovered frame-level motion-bit and intra/partition decisions to choose a constrained search radius in a separate block-matching transcoder model. The model operates on frames decoded from that H.264 source. Against a ±6 exhaustive search, the hint-driven policy reduced candidate evaluations 30.38% while increasing total prediction SSE only 0.0685% on the controlled slow/fast-motion plus scene-change fixture. This is evidence that source codec decisions can usefully steer later search. It is not an AVC→HEVC encoding benchmark: source vectors/partitions were not injected into x265, no HEVC bitrate/quality comparison was produced, and the model's residual proxy is not a complete encoder cost function.

Output contract: Exact integer planes or an explicitly defined numerical/altered-output contract; compare the final requested region and later references where relevant.

Primary metric: Complete decode/process/present cost, transfers, command work or peak live storage for identical requested output.

Adverse control: Change stride, crop, phase, alpha, edge neighborhood or resource generation; exercise a case where the proposed shortcut is ineligible.

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

- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R187.recover-encoder-decisions-from-the-source.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R187.recover-encoder-decisions-from-the-source.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/reports/R183-R192-report.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/reports/R183-R192-report.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_h/audits/R187.recover-encoder-decisions-from-the-source.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_h/audits/R187.recover-encoder-decisions-from-the-source.md)
