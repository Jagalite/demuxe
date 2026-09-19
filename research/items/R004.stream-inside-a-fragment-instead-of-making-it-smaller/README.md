<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Stream inside a fragment instead of making it smaller

Full identity: `R004.stream-inside-a-fragment-instead-of-making-it-smaller`. Reused R-numbers are separate mechanisms.

Current imported decision: **STOP_PROFILE** (full-completion).

Reported 26-second trace: media first-emission-to-flush max 0.320 ms, peak queue depth one; no material withholding demonstrated at this boundary. Later browser delays not measured. Actual local raw records and prior manifest identity were inspected in this v4 import.

Next action: A trace exposing material producer/worker withholding or another specific boundary.

## Definition and contract

Delivery · New optimization hypothesis · P1 · Risk: Medium First environment: Host FFmpeg + browser. Dependencies: None; verify prerequisites locally. Status: Untested hypothesis. Proposed mechanism. Keep already-correct fragment timing and deliver bytes to MSE incrementally, rather than waiting in JavaScript for the entire fragment response. Distinguish transport chunks, muxer flush boundaries and video random-access points. Source basis. The inspected Chromium MP4 parser can send parsed samples with all_samples_in_segment_received=false. That supports investigating partial delivery; it does not prove a particular fragment will render before all interleaved dependencies arrive. [C2] First agent experiment. Feed identical prebuilt fMP4 bytes as whole fragments versus bounded pieces crossing moof/mdat/sample boundaries. Then inspect when live FFmpeg actually releases those bytes. Preserve all packet timing and compare startup, append calls and CPU.

Output contract: Independent parsing of sample payload, configuration, PTS/DTS/duration and required output; valid container plus continuing playback when this is the tested claim.

Primary metric: Complete preparation/startup/refill work, bytes and ownership; output parser acceptance alone is not the metric.

Adverse control: Wrong size/offset/configuration or a non-random-access cut must fail specifically; cancellation cannot publish another generation.

## Stages

| Stage | Status | Basis |
| --- | --- | --- |
| define | passed | Existing source-grounded definition imported; acceptance criteria must be reviewed before a new run. |
| prepare | pending | Historical evidence retained; stage-specific acceptance has not been reconciled into this checklist. |
| screen | passed | Historical bounded screening disposition recorded. This is completion of screening, not candidate correctness. |
| correctness | pending | Historical evidence retained; stage-specific acceptance has not been reconciled into this checklist. |
| performance | pending | Historical evidence retained; stage-specific acceptance has not been reconciled into this checklist. |
| results | passed | Existing results indexed with current byte identities; historical mismatches are separately retained in the migration record. |
| decision | passed | Historical decision imported verbatim: STOP_PROFILE. No integration or qualification inferred. |

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

- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R004.stream-inside-a-fragment-instead-of-making-it-smaller.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R004.stream-inside-a-fragment-instead-of-making-it-smaller.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/evidence/imports/identity-check.json](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/evidence/imports/identity-check.json)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/evidence/imports/runs__caption-boundary-integrated__result.json](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/evidence/imports/runs__caption-boundary-integrated__result.json)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/evidence/imports/runs__follow-up__opportunity-summary.json](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/evidence/imports/runs__follow-up__opportunity-summary.json)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/evidence/imports/runs__module-authority-02__result.json](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/evidence/imports/runs__module-authority-02__result.json)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/evidence/imports/runs__module-maintained-pairs-01__summary.json](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/evidence/imports/runs__module-maintained-pairs-01__summary.json)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/evidence/imports/runs__module-separated-01__result.json](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/evidence/imports/runs__module-separated-01__result.json)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/evidence/imports/runs__r74-packed-cost-01__result.json](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/evidence/imports/runs__r74-packed-cost-01__result.json)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/evidence/imports/runs__r74-packed-cost-01__summary.json](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/evidence/imports/runs__r74-packed-cost-01__summary.json)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/proposals/Demuxe_Routing_Optimization_Ideas.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/proposals/Demuxe_Routing_Optimization_Ideas.md)
- [results/local-screening/README.md](../../../results/local-screening/README.md)
- [results/local-screening/follow-up.md](../../../results/local-screening/follow-up.md)
- [results/local-screening/full-queue-audit.md](../../../results/local-screening/full-queue-audit.md)
