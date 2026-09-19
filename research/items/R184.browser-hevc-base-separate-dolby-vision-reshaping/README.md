<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# browser HEVC base + separate Dolby Vision reshaping

Full identity: `R184.browser-hevc-base-separate-dolby-vision-reshaping`. Reused R-numbers are separate mechanisms.

Current imported decision: **HOLD_FIXTURE_SOURCE** (top100).

No trusted RPU-bearing source and independent Dolby reshaping/color reference found in bounded local fixture inventory. Browser HEVC decode alone cannot qualify this transform. This is a media-source gap, not missing report identity or experimental rejection.

Next action: Trace actual input representation, requested tracks/features, current accepted plan and the decoder boundary. Check whether this adapter or destination is already used.

## Definition and contract

The exact card is BLOCKED in this lab. FFmpeg includes dovi_rpu and a libplacebo filter, but there is no trusted Dolby Vision fixture or HDR-capable physical display. Chromium returns an empty support string for the tested hvc1/hev1 configurations, and WebGPU is unavailable on the permitted non-secure page. No synthetic RPU or SDR-only visual approximation was substituted for the intended claim.

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
| decision | passed | Historical decision imported verbatim: HOLD_FIXTURE_SOURCE. No integration or qualification inferred. |

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

- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R184.browser-hevc-base-separate-dolby-vision-reshaping.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R184.browser-hevc-base-separate-dolby-vision-reshaping.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/evidence/prerequisites/result.json](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/evidence/prerequisites/result.json)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/reports/R183-R192-report.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/reports/R183-R192-report.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_a/audits/R184.browser-hevc-base-separate-dolby-vision-reshaping.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_a/audits/R184.browser-hevc-base-separate-dolby-vision-reshaping.md)
- [results/top100/prerequisites/media-inventory.json](../../../results/top100/prerequisites/media-inventory.json)
