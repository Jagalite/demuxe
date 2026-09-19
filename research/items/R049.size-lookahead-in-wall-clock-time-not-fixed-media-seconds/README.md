<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Size lookahead in wall-clock time, not fixed media seconds

Current decision: **pursue**. Reconciled completed prior evidence: At 0.5x startup, peak buffered media changed 5.503999s to 3.007999s, fetched bytes 2359296 to 1572864. Actual 4x after seek is explicitly asserted; frame progress, source replacement rejection and worker cleanup pass. Worth a bounded rate-aware preparation policy; no generalized high-speed improvement claimed.

Historical stage reconciliation; no new experiment.

| Stage | Status | Basis |
| --- | --- | --- |
| define | passed | Existing source-grounded definition imported; acceptance criteria must be reviewed before a new run. |
| prepare | passed | Existing fixture/tool/runtime results and archived output/control identities reconciled; no new setup claimed. |
| screen | passed | Historical bounded screening disposition recorded. This is completion of screening, not candidate correctness. |
| correctness | pending | Actual0.5x/4x route progress, source replacement rejection and worker cleanup recorded; no complete independent picture/PCM oracle for rate-policy changes. |
| performance | pending | Buffered time and fetched-byte work counts improve startup; no equivalent-work statistical latency/CPU gate. |
| results | passed | Archived observations and hashes reconciled, prior mismatches retained explicitly; no new execution. |
| decision | passed | Normalized historical scoped decision with stage-specific acceptance and remaining limitations. |

Next: Trace the precise owner, generation, reset/flush/commit or allocation being changed. Reproduce the present behavior before removing any guard.

[Definition and state](item.json) · [History](history.jsonl) · [Evidence](evidence/index.json)
