<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Compare whole frames on the graphics side and read back only the witness

Full identity: `R213.compare-whole-frames-on-the-graphics-side-and-read-back-only-the-witness`. Reused R-numbers are separate mechanisms.

Current imported decision: **PURSUE** (top100).

Actual GPU atomic difference witness scans all 15360 resident RGBA pixels with four-byte readback. Equal frame and first/middle/last changed pixels match CPU oracle. Opportunity restricted to pixels already on GPU; no measured whole-player savings.

Next action: Trace the precise owner, generation, reset/flush/commit or allocation being changed. Reproduce the present behavior before removing any guard.

## Definition and contract

WebGL2/float blending compared two complete 1024×576 RGBA textures by drawing one point per pixel into three 1×1 reductions: mismatch count, maximum channel error, and first mismatch position. With 37 injected fault pixels, the graphics result exactly matched the CPU oracle: count 37, maximum error 236, first index 12345. The no-difference control also passed. Only 12 bytes of result data were read back instead of a 2,359,296-byte full frame. But SwiftShader took ~411.2 ms versus ~4.1 ms for the JS CPU oracle, so this is a readback/observer mechanism—not a performance win in this environment. Physical-GPU qualification remains open.

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

- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R213.compare-whole-frames-on-the-graphics-side-and-read-back-only-the-witness.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R213.compare-whole-frames-on-the-graphics-side-and-read-back-only-the-witness.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/reports/R203-R213-report.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/reports/R203-R213-report.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_c/audits/R213.compare-whole-frames-on-the-graphics-side-and-read-back-only-the-witness.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_c/audits/R213.compare-whole-frames-on-the-graphics-side-and-read-back-only-the-witness.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_h/active-owner-reconciliation.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_h/active-owner-reconciliation.md)
- [results/top100/gpu/witness-result.json](../../../results/top100/gpu/witness-result.json)
