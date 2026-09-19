<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Separate audio-clock drift from an audio-latency jump

Current decision: **pursue**. Controlled clock observations distinguish100ppm drift from50ms output-latency step and ignore120ms callback-delivery delay. Uses actual AudioContext timestamp schema/anchor but injections are synthetic; physical device drift/jump and integrated correction remain unqualified.

Historical stage reconciliation; no new experiment.

| Stage | Status | Basis |
| --- | --- | --- |
| define | passed | Existing source-grounded definition imported; acceptance criteria must be reviewed before a new run. |
| prepare | passed | Existing fixture/tool/runtime results and archived output/control identities reconciled; no new setup claimed. |
| screen | passed | Historical bounded screening disposition recorded. This is completion of screening, not candidate correctness. |
| correctness | passed | Controlled60s observation oracle distinguishes100ppm drift,50ms step and combined traces;120ms delayed callback leaves drift diagnosis unchanged. Pure classifier correctness only, real timestamp schema anchor. |
| performance | not_applicable | Capability/classifier scope; physical device behavior and integrated correction separately unqualified. |
| results | passed | Archived observations and hashes reconciled, prior mismatches retained explicitly; no new execution. |
| decision | passed | Normalized historical scoped decision with stage-specific acceptance and remaining limitations. |

Next: Trace the precise owner, generation, reset/flush/commit or allocation being changed. Reproduce the present behavior before removing any guard.

[Definition and state](item.json) · [History](history.jsonl) · [Evidence](evidence/index.json)
