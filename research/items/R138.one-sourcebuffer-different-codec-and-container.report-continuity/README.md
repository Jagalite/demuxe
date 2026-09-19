<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# one SourceBuffer, different codec and container

Full identity: `R138.one-sourcebuffer-different-codec-and-container.report-continuity`. Original rank: 9.

Current decision: **pursue**. Scientific verdict preserved from **PURSUE**; stages reconciled 2026-09-19T20:18:43.070415+00:00. No new media execution.

Reconciled completed prior evidence: Rendered pictures and selected audio survive a codec/container transition through one SourceBuffer; useful explicit continuity capability, without claiming gapless or application integration.

## Accepted scope

AVC/AAC MP4 to VP9/Opus WebM through one MSE SourceBuffer; not gapless or sample-exact qualification.

Retained changeType and restart controls both render expected red/green pictures and tones with cleanup. Boundary timing/PCM and adverse lifecycle remain open; media log includes splice and encoded-time warnings.

Next action: Trace the precise owner, generation, reset/flush/commit or allocation being changed. Reproduce the present behavior before removing any guard.

## Stages

| Stage | Status | Basis |
| --- | --- | --- |
| define | passed | Existing source-grounded definition imported; acceptance criteria must be reviewed before a new run. |
| prepare | passed | Historical fixtures, runtime/source manifest and result hashes reviewed and verified; no new execution or fixture generation. |
| screen | passed | Prior bounded screening reviewed; scientific disposition unchanged. |
| correctness | pending | Retained changeType and restart controls both render expected red/green pictures and tones with cleanup. Boundary timing/PCM and adverse lifecycle remain open; media log includes splice and encoded-time warnings. |
| performance | pending | No predeclared equivalent-work benchmark and complete cost/sampling analysis in cited evidence; counters and incidental timing do not pass this gate. |
| results | passed | Referenced result bytes and source/runtime manifests verified; reconciliation records acceptance scope without rerunning experiments. |
| decision | passed | Scientific verdict preserved with normalized disposition and explicit scoped gates. |

[Reconciliation](../../shared/runs/20260919T201843Z-top30-stage-reconciliation/run.json) · [Evidence index](evidence/index.json) · [Current state](item.json) · [History](history.jsonl)

Original definitions and historical evidence remain intact. Integration and release qualification are separate.
