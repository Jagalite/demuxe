<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# JSPI-backed synchronous Wasm I/O

Full identity: `R176.jspi-backed-synchronous-wasm-i-o`. Reused R-numbers are separate mechanisms.

Current imported decision: **PURSUE** (top100).

Actual isolated JSPI build produced browser-playable A/V with host decoded-output oracle. Nonisolated delayed reads and cancellation passed; Matroska zlib profile passed. Ordinary AAC MP4 priming/trim negative retained separately; not general route qualification.

Next action: Trace actual input representation, requested tracks/features, current accepted plan and the decoder boundary. Check whether this adapter or destination is already used.

## Definition and contract

Chromium exposes both WebAssembly.Suspending and WebAssembly.promising. A tiny Wasm function that appears synchronous from inside Wasm performed an async read at offset 2,000 and then a distant async read at 1,002,000. The single exported call resumed after both waits and returned the expected value 1,004 in about 31 ms, consistent with two injected 15 ms delays. A cancellation control rejected with Error: aborted, and closing the page during a deliberately pending call rejected rather than leaving the harness hung. Integration implication: JSPI is a credible way to adapt synchronous demux I/O to browser asynchronous byte providers. The next gate is an actual FFmpeg/libmpv reader with reentrancy, parallel demux activity, teardown, and cost measurements.

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

- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R176.jspi-backed-synchronous-wasm-i-o.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R176.jspi-backed-synchronous-wasm-i-o.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/reports/R172-R182-report.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/reports/R172-R182-report.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_a/audits/R176.jspi-backed-synchronous-wasm-i-o.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_a/audits/R176.jspi-backed-synchronous-wasm-i-o.md)
- [results/top100/destinations/result.json](../../../results/top100/destinations/result.json)
- [results/top100/jspi-build.log](../../../results/top100/jspi-build.log)
- [results/top100/jspi-commands.json](../../../results/top100/jspi-commands.json)
- [results/top100/jspi/result.json](../../../results/top100/jspi/result.json)
