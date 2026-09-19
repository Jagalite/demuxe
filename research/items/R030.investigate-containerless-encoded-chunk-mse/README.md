<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Investigate containerless encoded-chunk MSE

Full identity: `R030.investigate-containerless-encoded-chunk-mse`. Reused R-numbers are separate mechanisms.

Current imported decision: **HOLD_ENV** (full-completion).

appendEncodedChunks is absent in both window and dedicated worker on the current default Chrome configuration; ordinary appendBuffer is present. No encoded-chunk candidate ran. Experimental feature enablement is a separate research configuration, not a negative mechanism result.

Next action: Read the exact appendEncodedChunks/config-based API presence on unmodified Chrome and record flags; if absent, stop as an upstream-watch environment gate.

## Definition and contract

Frontier · New experimental API hypothesis · P3 · Risk: High First environment: Experimental Chromium only. Dependencies: None; verify prerequisites locally. Status: Untested hypothesis. Proposed mechanism. Investigate feeding demuxed EncodedAudioChunk/EncodedVideoChunk objects into MSE so the browser owns A/V playback without an intermediate MP4/WebM mux step. This could sit between raw demux and normal Native presentation. Source basis. Chromium SourceBuffer IDL contains appendEncodedChunks and configuration-based changeType behind MediaSourceExtensionsForWebCodecs. The inspected feature declaration marks it experimental. This is not evidence of a shipped portable API. [C3, C4] First agent experiment. First establish actual exposure in a controlled experimental browser, explicitly recording flags. Start with AVC/AAC and test timestamp reordering, track reconfiguration, bounded queues and destruction. Compare with equivalent fMP4 MSE only after correctness.

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
| decision | passed | Historical decision imported verbatim: HOLD_ENV. No integration or qualification inferred. |

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

- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R030.investigate-containerless-encoded-chunk-mse.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R030.investigate-containerless-encoded-chunk-mse.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/evidence/prerequisites/api-gates.json](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/evidence/prerequisites/api-gates.json)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/proposals/Demuxe_Routing_Optimization_Ideas.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/proposals/Demuxe_Routing_Optimization_Ideas.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_e/audits/R030.investigate-containerless-encoded-chunk-mse.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_e/audits/R030.investigate-containerless-encoded-chunk-mse.md)
