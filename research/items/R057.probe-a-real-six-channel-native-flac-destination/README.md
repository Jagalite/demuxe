<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Probe a real six-channel Native FLAC destination

Full identity: `R057.probe-a-real-six-channel-native-flac-destination`. Original rank: 15.

Current decision: **pursue**. Scientific verdict preserved from **PURSUE**; stages reconciled 2026-09-19T20:18:43.070415+00:00. No new media execution.

Reconciled completed prior evidence: Direct and MSE FLAC preserve six independently identified channels at the Web Audio boundary; intentional stereo downmix fails the same matrix oracle. Native adaptation work is worth pursuing without assuming physical speaker support.

## Accepted scope

Six channel identities at Web Audio boundary; not sample-exact wholePCM or six physical speaker proof.

Independent six-tone channel matrix stays diagonal for direct and MSE FLAC, while intentional stereo downmix fails the matrix. Both destinations reach EOF and clean up.

Next action: Trace actual input representation, requested tracks/features, current accepted plan and the decoder boundary. Check whether this adapter or destination is already used.

## Stages

| Stage | Status | Basis |
| --- | --- | --- |
| define | passed | Existing source-grounded definition imported; acceptance criteria must be reviewed before a new run. |
| prepare | passed | Historical fixtures, runtime/source manifest and result hashes reviewed and verified; no new execution or fixture generation. |
| screen | passed | Prior bounded screening reviewed; scientific disposition unchanged. |
| correctness | passed | Independent six-tone channel matrix stays diagonal for direct and MSE FLAC, while intentional stereo downmix fails the matrix. Both destinations reach EOF and clean up. |
| performance | pending | No predeclared equivalent-work benchmark and complete cost/sampling analysis in cited evidence; counters and incidental timing do not pass this gate. |
| results | passed | Referenced result bytes and source/runtime manifests verified; reconciliation records acceptance scope without rerunning experiments. |
| decision | passed | Scientific verdict preserved with normalized disposition and explicit scoped gates. |

[Reconciliation](../../shared/runs/20260919T201843Z-top30-stage-reconciliation/run.json) · [Evidence index](evidence/index.json) · [Current state](item.json) · [History](history.jsonl)

Original definitions and historical evidence remain intact. Integration and release qualification are separate.
