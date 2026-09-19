<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Offer a non-pthread remux path without isolation

Full identity: `R006.offer-a-non-pthread-remux-path-without-isolation`. Reused R-numbers are separate mechanisms.

Current imported decision: **PURSUE** (top100).

Actual isolated JSPI build produced browser-playable A/V with host decoded-output oracle. Nonisolated delayed reads and cancellation passed; Matroska zlib profile passed. Ordinary AAC MP4 priming/trim negative retained separately; not general route qualification.

Next action: Trace actual input representation, requested tracks/features, current accepted plan and the decoder boundary. Check whether this adapter or destination is already used.

## Definition and contract

Deployment · New execution-plan hypothesis · P2 · Risk: High First environment: Matching Emscripten build + browser. Dependencies: None; verify prerequisites locally. Status: Untested hypothesis. Proposed mechanism. Build a small remux/preparation worker that suspends asynchronous AVIO through JSPI, with a separately assessed Asyncify alternative. This may make browser-native remux usable where the current shared-memory/pthread deployment is unavailable. Source basis. Demuxe’s preparation admission currently requires isolation. Emscripten documents synchronous C suspension around async JavaScript using JSPI/Asyncify. That does not mean MSE itself inherently requires cross-origin isolation. [D1, E1]

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

- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R006.offer-a-non-pthread-remux-path-without-isolation.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R006.offer-a-non-pthread-remux-path-without-isolation.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/proposals/Demuxe_Routing_Optimization_Ideas.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/proposals/Demuxe_Routing_Optimization_Ideas.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_a/audits/R006.offer-a-non-pthread-remux-path-without-isolation.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_a/audits/R006.offer-a-non-pthread-remux-path-without-isolation.md)
- [results/top100/destinations/result.json](../../../results/top100/destinations/result.json)
- [results/top100/jspi-build.log](../../../results/top100/jspi-build.log)
- [results/top100/jspi-commands.json](../../../results/top100/jspi-commands.json)
- [results/top100/jspi/result.json](../../../results/top100/jspi/result.json)
