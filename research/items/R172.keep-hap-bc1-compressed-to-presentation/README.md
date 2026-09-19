<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# keep Hap BC1 compressed to presentation

Full identity: `R172.keep-hap-bc1-compressed-to-presentation`. Reused R-numbers are separate mechanisms.

Current imported decision: **PURSUE** (top100).

Actual Hap1 packet with BC1 texture payload renders through WebGPU compression support and matches independently decoded host RGBA:16 compressed bytes vs128 RGBA bytes for tiny fixture. Uncompressed Hap transport only; Snappy/larger corpus/seek/cost not qualified.

Next action: Trace actual input representation, requested tracks/features, current accepted plan and the decoder boundary. Check whether this adapter or destination is already used.

## Definition and contract

Two four-frame Hap fixtures were authored with the same BC1 image sequence: one used uncompressed Hap texture payloads and one used Hap's Snappy wrapper. Parsing and Snappy-unwrapping the compressed form produced exactly the same 1,536 BC1 bytes per frame as the raw form for all four frames. FFmpeg RGBA decodes match, and the 0.5-second seek control resolves to the same decoded frame. This proves the useful source-side component: Demuxe can unwrap Hap compression while retaining GPU-compressed BC1 rather than expanding it on the CPU. It does not prove the browser texture-upload/presentation half. On the permitted Chromium page, navigator.gpu and WebGL are both unavailable; S3TC therefore cannot be qualified here.

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

- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R172.keep-hap-bc1-compressed-to-presentation.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R172.keep-hap-bc1-compressed-to-presentation.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/evidence/prerequisites/result.json](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/evidence/prerequisites/result.json)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/reports/R172-R182-report.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/reports/R172-R182-report.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_a/audits/R172.keep-hap-bc1-compressed-to-presentation.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_a/audits/R172.keep-hap-bc1-compressed-to-presentation.md)
- [results/top100/gpu/input.json](../../../results/top100/gpu/input.json)
- [results/top100/gpu/result.json](../../../results/top100/gpu/result.json)
