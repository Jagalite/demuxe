<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Browser-side video normalization

Full identity: `R082.browser-side-video-normalization`. Reused R-numbers are separate mechanisms.

Current imported decision: **PURSUE** (top100).

Actual browser VP9 decode to AVC VideoEncoder to decoder: all72 frames and timestamps retained, every visible RGB frame exceeds32dB PSNR for explicitly lossy output. Wrong timestamp order rejected. Component viability only; source audio/mux/route costs not qualified.

Next action: Trace actual input representation, requested tracks/features, current accepted plan and the decoder boundary. Check whether this adapter or destination is already used.

## Definition and contract

The exact proposed WebCodecs path cannot run on the permitted page because VideoEncoder/VideoDecoder are not exposed. A fallback experiment used browser-native H.264 playback as the decoder, canvas.captureStream() as the frame bridge and MediaRecorder as the browser encoder. Three runs produced 89–90 source frame callbacks from a 90-frame source. Median generated size was 276,085 bytes, versus 146,513 bytes for the source. The generated VP9/WebM appended successfully to an MSE SourceBuffer, supported a seek to 1.8 s and reached EOF. Median MSE duration was 3.032 s for the 3.000 s source. The result is not a transparent normalizer yet. Nearest-frame comparisons usually matched the generated frame to a source frame about 2 frames earlier, and downscaled RGB mean absolute error was roughly 4–5/255 at the sampled points. This proves a browser-only decode→encode→MSE loop, but also exposes timeline control as a first-class problem. A secure-context WebCodecs test should use explicit input/output timestamps rather than inheriting MediaRecorder's realtime clock.

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

- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R082.browser-side-video-normalization.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R082.browser-side-video-normalization.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/evidence/prerequisites/result.json](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/evidence/prerequisites/result.json)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/reports/R82-R87-report.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/reports/R82-R87-report.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_a/audits/R082.browser-side-video-normalization.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_a/audits/R082.browser-side-video-normalization.md)
- [results/top100/normalize-result.json](../../../results/top100/normalize-result.json)
