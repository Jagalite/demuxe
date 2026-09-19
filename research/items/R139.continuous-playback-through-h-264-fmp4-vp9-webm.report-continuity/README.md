<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# continuous playback through H.264/fMP4 → VP9/WebM

`R139.continuous-playback-through-h-264-fmp4-vp9-webm.report-continuity`

Current decision: **pursue**. Actual Chrome H264/fMP4 to VP9/WebM video-only transition reaches EOF, renders both expected colors, seeks backward and forward across codec boundary and cleans up. Invalid MIME rejects. Preserved extra-audio-track variant fails append as expected for track contract mismatch. Existing exact A/V transition evidence reconciled, not rerun.

| Stage | Status | Basis |
| --- | --- | --- |
| define | passed | Existing source-grounded definition imported; acceptance criteria must be reviewed before a new run. |
| prepare | passed | Generated or reused hashed synthetic fixtures, executable harness and independent FFprobe/reference evidence for the bounded component. |
| screen | passed | Actual Chrome H264/fMP4 to VP9/WebM video-only transition reaches EOF, renders both expected colors, seeks backward and forward across codec boundary and cleans up. Invalid MIME rejects. Preserved extra-audio-track variant fails append as expected for track contract mismatch. Existing exact A/V transition evidence reconciled, not rerun. |
| correctness | pending | Color observation and cross-boundary seek pass, but numbered-frame exactness and failed-append rollback ownership are not yet established. |
| performance | pending | Equivalent-work performance not measured; relevant complete correctness and real owner workload remain prerequisites. |
| results | passed | Positive and negative variants preserved in immutable runs with manifests. |
| decision | passed | Scoped pursue decision; integration and production qualification separate. |

Next: Run numbered/full-frame independent image oracle, failed second-init recovery with old ownership preserved, and integrated queue cancellation.

Original contract and definition: [item.json](item.json). [History](history.jsonl). [Evidence index](evidence/index.json).

- [Run 20260919T200000Z-codec-transition](evidence/20260919T200000Z-codec-transition/run.json)
- [Run 20260919T200000Z-video-only-transition](evidence/20260919T200000Z-video-only-transition/run.json)

Research decision only; production integration and release qualification remain unassessed.
