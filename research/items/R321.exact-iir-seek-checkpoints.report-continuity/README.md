<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Exact IIR seek checkpoints

Full identity: `R321.exact-iir-seek-checkpoints.report-continuity`.

Current decision: **blocked** (2026-09-19T19:59:33.240223+00:00).

Maintained adaptation FIFO and PCMOutput expose no requested IIR recurrence/checkpoint ABI. Historical float64 biquad report remains imported evidence, not correctness of arbitrary maintained filters.

## Contract

A stable biquad was run in a fixed float64 direct-form recurrence. Storing its complete two-value state every 1024 samples allowed later segment requests to resume from the nearest checkpoint and reproduce the sequential oracle bit-for-bit for all tested positions. For the measured seeks, processed input fell from 143,790 to 4,526 samples and runtime from 73.77 to 2.28 ms. The checkpoint state occupied only 1104 bytes in this fixture. Coefficient, precision, denormal, and processing-order identity are part of the cache key.

Next action: Select one actual fixed-coefficient IIR consumer and expose complete recurrence/precision state; test resumed output plus coefficient/order/source invalidation.

## Stages

| Stage | Status | Basis |
| --- | --- | --- |
| define | passed | Source-grounded contract retained; current scope and falsifier narrowed in run analysis. |
| prepare | blocked | Setup: no admitted IIR checkpoint interface exists in the audited audio path. |
| screen | passed | Maintained adaptation FIFO and PCMOutput expose no requested IIR recurrence/checkpoint ABI. Historical float64 biquad report remains imported evidence, not correctness of arbitrary maintained filters. |
| correctness | blocked | Depends on selecting a faithful maintained implementation/consumer. |
| performance | blocked | No executable candidate or correctness gate; not a negative numerical result. |
| results | passed | Commands, output identities, source/runtime manifest, limitations and expected adverse outcomes captured. |
| decision | passed | Scoped disposition recorded; integration and release qualification remain separate. |

[Run and environment](evidence/20260919T195933Z-iir-gate/run.json) · [Results](evidence/20260919T195933Z-iir-gate/results.json) · [Manifest](evidence/20260919T195933Z-iir-gate/manifest.json) · [Current metadata](item.json) · [History](history.jsonl) · [All evidence](evidence/index.json)

No production integration or release qualification is claimed. Historical bytes and original definition retained.
