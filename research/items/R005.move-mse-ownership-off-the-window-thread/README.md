<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Move MSE ownership off the window thread

Full identity: `R005.move-mse-ownership-off-the-window-thread`. Original rank: 10.

Current decision: **pursue**. Scientific verdict preserved from **PURSUE**; stages reconciled 2026-09-19T20:18:43.070415+00:00. No new media execution.

Reconciled completed prior evidence: Worker-owned MediaSourceHandle produces actual A/V through EOF with malformed-input rejection and teardown; localized scheduler integration merits testing, not proven UI/CPU improvement.

## Accepted scope

Worker-owned MSE component only; production scheduler and main-thread responsiveness not measured.

Actual worker MediaSourceHandle renders A/V to EOF, seeks, rejects malformed input and terminates after a frame; transferred input detaches and every tested case cleans up.

Next action: Specify one concrete wrong-output or provenance failure the proposed tool must detect beyond the existing harness.

## Stages

| Stage | Status | Basis |
| --- | --- | --- |
| define | passed | Existing source-grounded definition imported; acceptance criteria must be reviewed before a new run. |
| prepare | passed | Historical fixtures, runtime/source manifest and result hashes reviewed and verified; no new execution or fixture generation. |
| screen | passed | Prior bounded screening reviewed; scientific disposition unchanged. |
| correctness | passed | Actual worker MediaSourceHandle renders A/V to EOF, seeks, rejects malformed input and terminates after a frame; transferred input detaches and every tested case cleans up. |
| performance | pending | No predeclared equivalent-work benchmark and complete cost/sampling analysis in cited evidence; counters and incidental timing do not pass this gate. |
| results | passed | Referenced result bytes and source/runtime manifests verified; reconciliation records acceptance scope without rerunning experiments. |
| decision | passed | Scientific verdict preserved with normalized disposition and explicit scoped gates. |

[Reconciliation](../../shared/runs/20260919T201843Z-top30-stage-reconciliation/run.json) · [Evidence index](evidence/index.json) · [Current state](item.json) · [History](history.jsonl)

Original definitions and historical evidence remain intact. Integration and release qualification are separate.
