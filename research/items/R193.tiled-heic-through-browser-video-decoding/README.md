<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# tiled HEIC through browser video decoding

Full identity: `R193.tiled-heic-through-browser-video-decoding`. Reused R-numbers are separate mechanisms.

Current imported decision: **INCONCLUSIVE_FIDELITY** (top100).

Genuine ImageIO2x2 HEIC yields four browser-decoded HEVC tiles and valid nonoverlapping grid. All raw pixel hashes differ from host oracle; full-range source becomes limited-range NV12 even with explicit full-range config. Decoding capability exists, but color/range/chroma fidelity needs resolved display-space oracle; not an API blocker or successful faithful route.

Next action: Trace actual input representation, requested tracks/features, current accepted plan and the decoder boundary. Check whether this adapter or destination is already used.

## Definition and contract

The intended route requires a tiled HEIC item graph, extraction of independently decodable HEVC tile access units, browser VideoDecoder, and tile composition. Four controlled tile images were generated for the planned 2×2 oracle, but heif-enc --list-encoders reports no HEIC encoder plugin in this lab; the tiled HEIC construction therefore stops before the coded-media gate. Chromium on the permitted page also exposes VideoDecoder as undefined. This is BLOCKED, not a negative result about tiled HEIC or WebCodecs. No AVIF or uncompressed substitute was accepted as equivalent evidence. Evidence: results/r193.json, results/browser-capabilities.json, work/r193_enc.log.

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
| decision | passed | Historical decision imported verbatim: INCONCLUSIVE_FIDELITY. No integration or qualification inferred. |

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

- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R193.tiled-heic-through-browser-video-decoding.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R193.tiled-heic-through-browser-video-decoding.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/evidence/prerequisites/result.json](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/evidence/prerequisites/result.json)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/reports/R193-R202-report.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/reports/R193-R202-report.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_a/audits/R193.tiled-heic-through-browser-video-decoding.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_a/audits/R193.tiled-heic-through-browser-video-decoding.md)
- [results/top100/heic/groups.json](../../../results/top100/heic/groups.json)
- [results/top100/heic/implicit-full-range-failure.json](../../../results/top100/heic/implicit-full-range-failure.json)
- [results/top100/heic/result.json](../../../results/top100/heic/result.json)
