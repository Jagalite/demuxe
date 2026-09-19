<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# one request for distant byte ranges

Current decision: **pursue**. Actual HTTP multipart range response matches two independent single-range reads; truncated multipart rejects. One request replaces two for capable test origin, with575 response bytes for384 payload bytes. Production origin capability remains prerequisite.

Historical stage reconciliation; no new experiment.

| Stage | Status | Basis |
| --- | --- | --- |
| define | passed | Existing source-grounded definition imported; acceptance criteria must be reviewed before a new run. |
| prepare | passed | Existing fixture/tool/runtime results and archived output/control identities reconciled; no new setup claimed. |
| screen | passed | Historical bounded screening disposition recorded. This is completion of screening, not candidate correctness. |
| correctness | passed | Actual multipart HTTP bytes match two independent single-range bodies; truncation rejects. One request/575body bytes for384payload documented. Restricted capable-origin parser component. |
| performance | pending | Origin capability, header/latency/CPU and cancellation/fallback overhead not performance-qualified. |
| results | passed | Archived observations and hashes reconciled, prior mismatches retained explicitly; no new execution. |
| decision | passed | Normalized historical scoped decision with stage-specific acceptance and remaining limitations. |

Next: Locate one real repeated read/index/validation boundary and its trusted source identity. Separate logical requests from transferred or physical-disk bytes.

[Definition and state](item.json) · [History](history.jsonl) · [Evidence](evidence/index.json)
