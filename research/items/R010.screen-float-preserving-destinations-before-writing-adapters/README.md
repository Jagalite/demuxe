<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Screen float-preserving destinations before writing adapters

Full identity: `R010.screen-float-preserving-destinations-before-writing-adapters`. Reused R-numbers are separate mechanisms.

Current imported decision: **HOLD_ENV** (full-completion).

Actual finite Float32 WAV reaches EOF and preserves 1.25 sample headroom in direct audio, despite empty canPlayType hints. All four exact tested PCM/WAV streaming MIME queries reject MSE. No unified native streaming A/V float destination established; hold the streaming adapter, not float audio generally.

Next action: Trace actual input representation, requested tracks/features, current accepted plan and the decoder boundary. Check whether this adapter or destination is already used.

## Definition and contract

Audio · Follow-on feasibility gate · P2 · Risk: High First environment: Browser capability/source study first. Dependencies: None; verify prerequisites locally. Status: Untested hypothesis. Proposed mechanism. Investigate ordinary float-decoder output only against explicitly viable destinations: raw float in a direct-play container, a supported streaming representation, or an experimental raw-audio sink. This is a destination feasibility study, not another fixed-to-FLAC benchmark. Source basis. The inspected MP4/MSE audio-entry gate has no raw PCM entry. Chromium direct-source demuxing is separate. Therefore, a direct float-PCM success cannot establish float PCM in MSE. [C1, C2] First agent experiment. Enumerate exact parser/sample-entry paths in the target build, then perform tiny destination probes. Continue to progressive transport, bounded output and seeking only if an unmodified browser actually accepts the intended representation.

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

- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R010.screen-float-preserving-destinations-before-writing-adapters.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R010.screen-float-preserving-destinations-before-writing-adapters.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/proposals/Demuxe_Routing_Optimization_Ideas.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/proposals/Demuxe_Routing_Optimization_Ideas.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_e/audits/R010.screen-float-preserving-destinations-before-writing-adapters.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_e/audits/R010.screen-float-preserving-destinations-before-writing-adapters.md)
- [results/full-completion/r10/result.json](../../../results/full-completion/r10/result.json)
