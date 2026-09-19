<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# progressively refine one preview

Full identity: `R185.progressively-refine-one-preview`. Reused R-numbers are separate mechanisms.

Current imported decision: **DEFER_SETUP** (full-completion).

The existing seek UI and retained video draw have no progressive-image preview resource owner. The report relies on compositor-visible progressive JPEG states that canvas did not expose; piping through current canvas drawing would not reproduce that mechanism.

Next action: Specify one image-element preview owner and source-generation token before using a progressive JPEG; inspect compositor refinement and cancel before final scan.

## Definition and contract

The controlled progressive JPEG is 196,597 bytes and contains ten scans. Its HTTP response was released in four stages. Chromium compositor screenshots showed a coarse/incomplete presentation before completion and later an intermediate refinement whose mean absolute RGB error to the final image was 7.30 / 255, before converging to 0 at final detail. A second probe started the slow image, replaced it before completion with a different complete progressive JPEG, and observed the replacement as the committed image. The abandoned server write ended with a broken pipe, providing a concrete cancellation signal. One useful implementation detail surfaced: canvas.drawImage() did not expose the intermediate refinements in this build, while browser compositor screenshots did. Provisional preview state and final decoded-image state should therefore remain distinct concepts.

Output contract: Correct source/time/target and agreed fidelity. Approximate results cannot populate exact caches or qualify normal playback.

Primary metric: Time to the requested exact or explicitly approximate preview, total prerequisite work and retained state.

Adverse control: Move backward, request a non-RAP dependency, change source or cancel a pending request; stale previews must never become current.

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

- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R185.progressively-refine-one-preview.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R185.progressively-refine-one-preview.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/reports/R183-R192-report.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/reports/R183-R192-report.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_f/audits/R185.progressively-refine-one-preview.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_f/audits/R185.progressively-refine-one-preview.md)
