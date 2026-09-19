<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Keep display-only transformations out of CPU video filters

Full identity: `R008.keep-display-only-transformations-out-of-cpu-video-filters`. Reused R-numbers are separate mechanisms.

Current imported decision: **PURSUE** (full-completion).

Existing retained presenter produces exact independently indexed 90-degree pixel rotation; unchanged orientation fails the pixel oracle. Pursue a distinct explicitly display-only operation API. Software filter semantics, subtitle/pointer geometry, HDR and arbitrary transforms are not qualified.

Next action: Identify the CPU/GPU representation boundary and actual useful work removed. Check existing renderer fusions, caches, kernel fast paths and hardware gates.

## Definition and contract

Presentation · New policy/implementation hypothesis · P1 · Risk: Medium First environment: Browser + reference images. Dependencies: None; verify prerequisites locally. Status: Untested hypothesis. Proposed mechanism. Compile a small explicit set of requested display operations into browser metadata or presentation transforms: rotation, mirror and display aspect. Use decoded-frame processing only when the requested operation truly modifies sample content. Source basis. Chromium’s MP4 parser computes rotation from track/movie matrices. FFmpeg has metadata bitstream filters. These mechanisms can carry truthful geometry; they are not substitutes for arbitrary filtering. [C2, F2] First agent experiment. Compare one rotation/mirror/aspect request through the current Software filter and a metadata/presentation path. Check screenshots, subtitle coordinates, pointer geometry, resize and destination behavior.

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

- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R008.keep-display-only-transformations-out-of-cpu-video-filters.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R008.keep-display-only-transformations-out-of-cpu-video-filters.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/proposals/Demuxe_Routing_Optimization_Ideas.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/proposals/Demuxe_Routing_Optimization_Ideas.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_e/audits/R008.keep-display-only-transformations-out-of-cpu-video-filters.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_e/audits/R008.keep-display-only-transformations-out-of-cpu-video-filters.md)
- [results/full-completion/frame-boundaries/result.json](../../../results/full-completion/frame-boundaries/result.json)
