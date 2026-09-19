<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Native video with an independent generated-PCM clock

Full identity: `R086.native-video-with-an-independent-generated-pcm-clock`. Reused R-numbers are separate mechanisms.

Current imported decision: **PURSUE_CLOCK_CONTROL** (top100).

Actual maintained PCM AudioWorklet with native video survives seek/rate epochs and injected producer starvation. Active phase clock errors up to80ms, starvation grows to253ms and rebase recovers below18ms; correct generated tone observed. Needs tighter output-time feedback before sync qualification; not acoustic or arbitrary decoded-audio proof.

Next action: Trace actual input representation, requested tracks/features, current accepted plan and the decoder boundary. Check whether this adapter or destination is already used.

## Definition and contract

AudioContext.audioWorklet is not exposed on the permitted opaque page, so the intended AudioWorklet implementation is blocked. A ScriptProcessor fallback generated a 440 Hz PCM signal whose phase was derived from an explicit media-time mapping. Native video remained on its own media element. The controller rebased the audio mapping after the first video frame, after a seek to 5 s, and again when playback rate changed to 1.5×. Across three runs, median absolute drift summaries were: This measures agreement between the two browser clocks/models, not acoustic speaker output. ScriptProcessor is only a fallback feasibility tool. Still, the result weakens the assumption that a second browser audio clock is intrinsically unusable: with explicit synchronization transactions, the modeled drift stayed in the low-millisecond range here.

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
| decision | passed | Historical decision imported verbatim: PURSUE_CLOCK_CONTROL. No integration or qualification inferred. |

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

- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R086.native-video-with-an-independent-generated-pcm-clock.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R086.native-video-with-an-independent-generated-pcm-clock.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/reports/R82-R87-report.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/reports/R82-R87-report.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_a/audits/R086.native-video-with-an-independent-generated-pcm-clock.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_a/audits/R086.native-video-with-an-independent-generated-pcm-clock.md)
- [results/top100/independent-audio-result.json](../../../results/top100/independent-audio-result.json)
