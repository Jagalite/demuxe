<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Schedule H.264 deblocking as a dependency graph

Full identity: `R303.schedule-h-264-deblocking-as-a-dependency-graph`. Reused R-numbers are separate mechanisms.

Current imported decision: **DEFER_SETUP** (full-completion).

Maintained Wasm SIMD deblocks CPU-resident samples with existing kernel ordering. No captured full edge graph or GPU-resident reconstruction owner exists, and readback may erase GPU benefit. Historical schedule graph is component-only.

Next action: Capture one actual single-slice edge trace with unfiltered plane and parameters; verify dependency schedule against optimized output plus unsafe reverse-order control before any GPU dispatch pipeline.

## Definition and contract

Type: Controlled GPU reconstruction experiment; exact-output follow-on distinct from R291's no-op elimination. Represent each deblocking edge operation by conservative sample read and write sets. Preserve the reference ordering between operations whenever a read-after-write, write-after-read, or write-after-write conflict exists. Execute only independent operations together; use valid dispatch-level ordering between dependent batches. FFmpeg's implementation provides explicit edge order and integer kernels. The kernels modify samples on both sides of an edge, and strong filtering can reach farther than its nearest samples. Thus merely assigning one GPU invocation per visible edge is not a correctness argument. [H1–H2]

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

- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R303.schedule-h-264-deblocking-as-a-dependency-graph.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R303.schedule-h-264-deblocking-as-a-dependency-graph.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/evidence/prerequisites/result.json](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/evidence/prerequisites/result.json)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/proposals/Demuxe_R301_R306_Proposals.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/proposals/Demuxe_R301_R306_Proposals.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/reports/R301-R306-report.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/reports/R301-R306-report.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_g/audits/R303.schedule-h-264-deblocking-as-a-dependency-graph.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_g/audits/R303.schedule-h-264-deblocking-as-a-dependency-graph.md)
