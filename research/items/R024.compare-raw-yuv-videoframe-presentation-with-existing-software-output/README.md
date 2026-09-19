<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Compare raw-YUV VideoFrame presentation with existing Software output

Full identity: `R024.compare-raw-yuv-videoframe-presentation-with-existing-software-output`. Original rank: 21.

Current decision: **pursue**. Scientific verdict preserved from **PURSUE**; stages reconciled 2026-09-19T20:18:43.070415+00:00. No new media execution.

Reconciled completed prior evidence: Raw I420 VideoFrame preserves padded strides/crop and black/white oracle exactly at the current display boundary. A scoped SDR performance comparison is now feasible; general color/HDR/rotation remain unqualified.

## Accepted scope

Tiny SDR fixture only; color/chroma/HDR/rotation and production playback excluded. Diagnostic draw times are not a benchmark.

Raw VideoFrame black/white SDR pixels match existing YUVPresenter oracle with maximum error0; padded stride/crop handled, bad stride rejected, VideoFrame closed.

Next action: Trace actual input representation, requested tracks/features, current accepted plan and the decoder boundary. Check whether this adapter or destination is already used.

## Stages

| Stage | Status | Basis |
| --- | --- | --- |
| define | passed | Existing source-grounded definition imported; acceptance criteria must be reviewed before a new run. |
| prepare | passed | Historical fixtures, runtime/source manifest and result hashes reviewed and verified; no new execution or fixture generation. |
| screen | passed | Prior bounded screening reviewed; scientific disposition unchanged. |
| correctness | passed | Raw VideoFrame black/white SDR pixels match existing YUVPresenter oracle with maximum error0; padded stride/crop handled, bad stride rejected, VideoFrame closed. |
| performance | pending | No predeclared equivalent-work benchmark and complete cost/sampling analysis in cited evidence; counters and incidental timing do not pass this gate. |
| results | passed | Referenced result bytes and source/runtime manifests verified; reconciliation records acceptance scope without rerunning experiments. |
| decision | passed | Scientific verdict preserved with normalized disposition and explicit scoped gates. |

[Reconciliation](../../shared/runs/20260919T201843Z-top30-stage-reconciliation/run.json) · [Evidence index](evidence/index.json) · [Current state](item.json) · [History](history.jsonl)

Original definitions and historical evidence remain intact. Integration and release qualification are separate.
