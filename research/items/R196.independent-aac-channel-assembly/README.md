<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# independent AAC channel assembly

Full identity: `R196.independent-aac-channel-assembly`. Reused R-numbers are separate mechanisms.

Current imported decision: **DEFER_SETUP** (full-completion).

Current mux copies one selected audio stream; there is no AAC raw-element parser/PCE writer or priming alignment owner. Mono AAC channels cannot be arbitrarily concatenated without validating independent syntax.

Next action: Implement only a bounded AAC element/PCE oracle for one synchronized pair with disabled coupling/PNS/TNS/SBR; enable one excluded tool or change priming as an explicit reject control.

## Definition and contract

Two synchronized 48 kHz AAC-LC mono streams were encoded with PNS, TNS, M/S and intensity-stereo tools disabled; there is no SBR or coupling. Each contains 48 aligned raw-data blocks. The assembler retains each source SCE bitstream, changes only the second SCE's element_instance_tag from 0 to 1, authors a Program Config Element declaring two front SCEs (tags 0 and 1), and writes ADTS with channel_configuration=0 so layout authority stays in the PCE. No PCM samples are reconstructed during assembly. The output contains 49,152 decoded samples per channel. FFmpeg decodes channel 0 bit-for-bit identical to source A and channel 1 to source B. Chromium AudioContext.decodeAudioData() independently reports 0 differing float samples and max absolute error 0 for both channels.

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

- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R196.independent-aac-channel-assembly.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R196.independent-aac-channel-assembly.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/reports/R193-R202-report.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/reports/R193-R202-report.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_g/audits/R196.independent-aac-channel-assembly.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_g/audits/R196.independent-aac-channel-assembly.md)
