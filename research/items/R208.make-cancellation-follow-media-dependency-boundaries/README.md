<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Make cancellation follow media dependency boundaries

Full identity: `R208.make-cancellation-follow-media-dependency-boundaries`. Reused R-numbers are separate mechanisms.

Current imported decision: **PURSUE** (top100).

Required target GOP remains retained and independently decodes24 exact frames while actual unrelated speculative fetch aborts, observed by server. Stale generation publication rejects. HTTP dependency component, not WebTransport integration.

Next action: Trace actual input representation, requested tracks/features, current accepted plan and the decoder boundary. Check whether this adapter or destination is already used.

## Definition and contract

Exact WebTransport testing is BLOCKED because WebTransport is undefined in the permitted opaque/non-secure browser context. A bounded independent-GOP scheduler model nevertheless validates the critical state rule: after a seek increments the presentation epoch, a deliberately uncancelled old GOP may complete but cannot publish. The model is not transport performance evidence. Its byte accounting also shows independent speculative streams are not automatically better than a clean HTTP-range abort; scheduling policy matters.

Output contract: Configuration and ordered codec payloads where copy is intended; requested frames/audio/timeline/features at the declared output boundary.

Primary metric: Correct additional admitted source/destination capability; otherwise full startup and CPU/resource cost.

Adverse control: Alter one admission-critical configuration, remove a required dependency, or preserve video while making selected audio unsupported. Candidate must reject or use a declared fallback.

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

- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R208.make-cancellation-follow-media-dependency-boundaries.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R208.make-cancellation-follow-media-dependency-boundaries.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/reports/R203-R213-report.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/reports/R203-R213-report.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_a/audits/R208.make-cancellation-follow-media-dependency-boundaries.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_a/audits/R208.make-cancellation-follow-media-dependency-boundaries.md)
- [results/top100/ownership/result.json](../../../results/top100/ownership/result.json)
