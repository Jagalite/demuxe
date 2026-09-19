<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# ROI VideoFrame.copyTo

Full identity: `R272.roi-videoframe-copyto`. Reused R-numbers are separate mechanisms.

Prior imported decision: **STOP_PROFILE** (full-completion).

Current retained presentation transfers complete VideoFrame resources; fallback copy reads the full visible rectangle because downstream playback needs the whole picture. There is no ROI analysis consumer to justify a cropped copy in this profile.

Next action: Reopen for an actual ROI-only analysis request; then compare admitted rectangle copy against full-copy crop with subsampling-alignment negative control. Cropping playback output is not an optimization.

## Definition and contract

Chromium created a 640×360 VideoFrame from a deterministic RGBA canvas. The requested rectangle was x=112, y=73, 257×149. VideoFrame.copyTo() with that rectangle returned 153,172 bytes, exactly matching the same rectangle cropped from a 921,600-byte full-frame copy: zero differing bytes and maximum error zero. That is an 83.38% reduction in application-visible transfer bytes. Across the microprobe, median ROI copy time was ~0.1 ms versus 0.5 ms for the full copy. These are copy/transfer timings in this headless runtime only; they are not claims about full render cost, hardware residency, or all pixel formats.

Output contract: Configuration and ordered codec payloads where copy is intended; requested frames/audio/timeline/features at the declared output boundary.

Primary metric: Correct additional admitted source/destination capability; otherwise full startup and CPU/resource cost.

Adverse control: Alter one admission-critical configuration, remove a required dependency, or preserve video while making selected audio unsupported. Candidate must reject or use a declared fallback.

## Current stage reconciliation

**stop_current_profile** — retained source decision, no new experiment. [Run](../../shared/runs/20260919T200619Z-source-stage-reconciliation/run.json).

## Stages

| Stage | Status | Basis |
|---|---|---|
| define | passed | Existing source-grounded definition imported; acceptance criteria must be reviewed before a new run. |
| prepare | not_applicable | This investigation ended at a source-only stop_current_profile decision. No candidate correctness or performance qualification is claimed; reopen under the item-specific condition. |
| screen | passed | Historical bounded screening disposition recorded. This is completion of screening, not candidate correctness. |
| correctness | not_applicable | This investigation ended at a source-only stop_current_profile decision. No candidate correctness or performance qualification is claimed; reopen under the item-specific condition. |
| performance | not_applicable | This investigation ended at a source-only stop_current_profile decision. No candidate correctness or performance qualification is claimed; reopen under the item-specific condition. |
| results | passed | Existing results indexed with current byte identities; historical mismatches are separately retained in the migration record. |
| decision | passed | Prior scoped decision reconciled into the current checklist: stop_current_profile |

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

- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R272.roi-videoframe-copyto.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R272.roi-videoframe-copyto.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/reports/R268-R275-report.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/reports/R268-R275-report.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_d/audits/R272.roi-videoframe-copyto.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_d/audits/R272.roi-videoframe-copyto.md)
- [results/local-screening/README.md](../../../results/local-screening/README.md)
- [results/local-screening/follow-up.md](../../../results/local-screening/follow-up.md)
- [results/local-screening/full-queue-audit.md](../../../results/local-screening/full-queue-audit.md)
