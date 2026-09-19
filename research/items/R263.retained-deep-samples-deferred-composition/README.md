<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# retained deep samples / deferred composition

Full identity: `R263.retained-deep-samples-deferred-composition`. Reused R-numbers are separate mechanisms.

Current imported decision: **DEFER_SETUP** (full-completion).

Current surfaces represent flat images; no deep-sample parser, retained sample lists or ROI compositor exists. Historical CPU synthetic deep result does not supply OpenEXR I/O or GPU implementation.

Next action: Define one bounded real deep input/sample-list adapter and independent ROI oracle; test sparse and full-frame views and reject changed depth/sample order. Charge initial parsing and storage.

## Definition and contract

Three synthetic 384×384 deep frames with 1–6 samples/pixel were displayed through 36 sparse 96×96 viewports. The eager baseline flattened the full frame for every view; the deferred route composited only the requested deep ROI. Result. Maximum absolute output error was 0.0. Median CPU time fell from 0.498s to 0.034s (14.8×) for this sparse-viewport workload. Blocked gate. Chromium reports WebGPU=false, WebGL=false, WebGL2=false in this environment. This proves the retained/deferred algorithm on CPU only, not the intended GPU presenter. No OpenEXR/deep-image parser or real deep sequence I/O was exercised.

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

- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R263.retained-deep-samples-deferred-composition.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R263.retained-deep-samples-deferred-composition.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/evidence/prerequisites/result.json](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/evidence/prerequisites/result.json)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/reports/R261-R267-report.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/reports/R261-R267-report.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_g/audits/R263.retained-deep-samples-deferred-composition.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_g/audits/R263.retained-deep-samples-deferred-composition.md)
