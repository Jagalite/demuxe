<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Expose prepared fragments as a native HLS presentation

Full identity: `R363.expose-prepared-fragments-as-a-native-hls-presentation`. Original rank: 7.

Current decision: **pursue**. Scientific verdict preserved from **PURSUE**; stages reconciled 2026-09-19T20:18:43.070415+00:00. No new media execution.

Actual Demuxe-produced fMP4 fragments served as native HLS byte ranges reach marked A/V, seek and EOF; misaligned ranges fail. Tiny loopback delivery prototype only; not a generic source-authorized production resource service.

## Accepted scope

Tiny loopback byte-range HLS view over generated fragments; production authorization/resource service excluded.

Maintained remux capture preserves48 video/95 audio packets, and native HLS serves marked A/V through seek/EOF; wrong range boundary rejects and resources clean up.

Next action: Trace actual input representation, requested tracks/features, current accepted plan and the decoder boundary. Check whether this adapter or destination is already used.

## Stages

| Stage | Status | Basis |
| --- | --- | --- |
| define | passed | Existing source-grounded definition imported; acceptance criteria must be reviewed before a new run. |
| prepare | passed | Historical fixtures, runtime/source manifest and result hashes reviewed and verified; no new execution or fixture generation. |
| screen | passed | Prior bounded screening reviewed; scientific disposition unchanged. |
| correctness | passed | Maintained remux capture preserves48 video/95 audio packets, and native HLS serves marked A/V through seek/EOF; wrong range boundary rejects and resources clean up. |
| performance | pending | No predeclared equivalent-work benchmark and complete cost/sampling analysis in cited evidence; counters and incidental timing do not pass this gate. |
| results | passed | Referenced result bytes and source/runtime manifests verified; reconciliation records acceptance scope without rerunning experiments. |
| decision | passed | Scientific verdict preserved with normalized disposition and explicit scoped gates. |

[Reconciliation](../../shared/runs/20260919T201843Z-top30-stage-reconciliation/run.json) · [Evidence index](evidence/index.json) · [Current state](item.json) · [History](history.jsonl)

Original definitions and historical evidence remain intact. Integration and release qualification are separate.
