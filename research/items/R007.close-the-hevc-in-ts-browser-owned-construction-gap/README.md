<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Close the HEVC-in-TS browser-owned construction gap

Full identity: `R007.close-the-hevc-in-ts-browser-owned-construction-gap`. Reused R-numbers are separate mechanisms.

Current imported decision: **PURSUE** (top100).

Actual isolated Wasm gate extension plays HEVC/AAC TS and seeks; current bridge rejects it. Complete output video and PCM match independent host decode with passthrough frame timing; AVC control still passes. Additional codec-aware adverse timestamp/configuration cases remain before integration.

Next action: Trace actual input representation, requested tracks/features, current accepted plan and the decoder boundary. Check whether this adapter or destination is already used.

## Definition and contract

Packaging · Follow-on route expansion · P1 · Risk: High First environment: Host FFmpeg + browser; Wasm later. Dependencies: None; verify prerequisites locally. Status: Untested hypothesis. Proposed mechanism. Construct a qualified HEVC/AAC TS-to-fMP4 plan rather than falling to Hybrid solely because the maintained TS repair is AVC-specific. Preserve original video/audio and extend only the missing timestamp/configuration logic. Source basis. FFmpeg supports codec configuration extraction and fragmented MP4 controls; the previous user-supplied comparison identified a working competitor MSE alternative. Neither establishes correctness of Demuxe’s HEVC adaptation. [F1, F2; prior qualification report]

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

- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R007.close-the-hevc-in-ts-browser-owned-construction-gap.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R007.close-the-hevc-in-ts-browser-owned-construction-gap.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/evidence/prerequisites/result.json](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/evidence/prerequisites/result.json)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/proposals/Demuxe_Routing_Optimization_Ideas.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/proposals/Demuxe_Routing_Optimization_Ideas.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/root/audits/R007.close-the-hevc-in-ts-browser-owned-construction-gap.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/root/audits/R007.close-the-hevc-in-ts-browser-owned-construction-gap.md)
- [results/top100/transport/browser-result.json](../../../results/top100/transport/browser-result.json)
- [results/top100/transport/build-commands.json](../../../results/top100/transport/build-commands.json)
- [results/top100/transport/hevc-remux.c](../../../results/top100/transport/hevc-remux.c)
