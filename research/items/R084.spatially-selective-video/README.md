<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Spatially selective video

Full identity: `R084.spatially-selective-video`. Reused R-numbers are separate mechanisms.

Current imported decision: **DEFER_SETUP** (full-completion).

Current playback decodes one full representation; no authored quadrant catalogue, viewport tile selection or synchronized compositor exists. Historical prepared tiles are near-equivalent lossy output, not same-pixel optimization.

Next action: Define one prepared-tile manifest and viewport request contract; compare one tile against original crop and all-four reconstruction, rejecting claims of byte/pixel equality when encode boundaries differ.

## Definition and contract

A 4 s, 640×360 H.264 source was represented as four independently encoded 320×180 quadrants. All four tile streams play in Chromium. At three sampled times per tile, the tile output closely matched the corresponding region of the full-frame decode; mean absolute RGB error stayed below 0.97/255 in all twelve comparisons. Compositing all four decoded tiles back into one 640×360 canvas at 2 s produced 0.509/255 mean absolute RGB error versus the full-frame source. The largest per-channel error was concentrated in local compression/boundary differences, so this is a near-equivalent prepared representation rather than byte/pixel identity. Host FFmpeg software-decode medians provide a component-cost screen:

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

- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R084.spatially-selective-video.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R084.spatially-selective-video.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/reports/R82-R87-report.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/reports/R82-R87-report.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_g/audits/R084.spatially-selective-video.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_g/audits/R084.spatially-selective-video.md)
