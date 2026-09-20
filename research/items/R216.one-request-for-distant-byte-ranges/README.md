<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# one request for distant byte ranges

Full identity: `R216.one-request-for-distant-byte-ranges`.

Current decision: **inconclusive** (actual_parallel_http_cost).

Eleven alternating actual HTTP jobs compare one multipart response with three CONCURRENT ordinary requests, each yielding three exact independently decoded source movies. Median latency17.28ms parallel versus17.05ms multipart; paired saving2.30%,95%bootstrap [1.04,14.50] misses declared5% lower-bound gate. One request replaces three but carries extra multipart bytes; no material latency benefit established for this local15ms-delay workload.

Next action: Bounded latency gate concluded without sufficient benefit. Reopen only for request-limited/high-latency capable origin where equivalent concurrent ranges are measured; retain correct optional multipart parser.

## Stages

| Stage | Status | Basis |
|---|---|---|
| define | passed | Existing source-grounded definition imported; acceptance criteria must be reviewed before a new run. |
| prepare | passed | Existing fixture/tool/runtime results and archived output/control identities reconciled; no new setup claimed. |
| screen | passed | Historical bounded screening disposition recorded. This is completion of screening, not candidate correctness. |
| correctness | passed | Actual multipart HTTP bytes match two independent single-range bodies; truncation rejects. One request/575body bytes for384payload documented. Restricted capable-origin parser component. |
| performance | failed | Eleven alternating actual HTTP jobs compare one multipart response with three CONCURRENT ordinary requests, each yielding three exact independently decoded source movies. Median latency17.28ms parallel versus17.05ms multipart; paired saving2.30%,95%bootstrap [1.04,14.50] misses declared5% lower-bound gate. One request replaces three but carries extra multipart bytes; no material latency benefit established for this local15ms-delay workload. |
| results | passed | Eleven alternating actual HTTP jobs compare one multipart response with three CONCURRENT ordinary requests, each yielding three exact independently decoded source movies. Median latency17.28ms parallel versus17.05ms multipart; paired saving2.30%,95%bootstrap [1.04,14.50] misses declared5% lower-bound gate. One request replaces three but carries extra multipart bytes; no material latency benefit established for this local15ms-delay workload. |
| decision | passed | Eleven alternating actual HTTP jobs compare one multipart response with three CONCURRENT ordinary requests, each yielding three exact independently decoded source movies. Median latency17.28ms parallel versus17.05ms multipart; paired saving2.30%,95%bootstrap [1.04,14.50] misses declared5% lower-bound gate. One request replaces three but carries extra multipart bytes; no material latency benefit established for this local15ms-delay workload. |

[New run](../../shared/runs/20260919T210400Z-range-cost/run.json) · [Evidence index](evidence/index.json) · [Complete history](history.jsonl) · [Item contract](item.json)
