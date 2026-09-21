<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Move MSE ownership off the window thread

## Production integration — 2026-09-21

**production_integrated**. Worker-owned MSE reuses the maintained scheduler, preserves separate producer/read owners, transfers fragments directly, and retains checked window fallback. Scoped Player/package lifecycle and contention comparisons pass; costs are mixed, not a general throughput win.

[Maintained implementation](../../../docs/PRODUCTION-PIPELINE.md) · [Current qualification and tradeoffs](../../shared/runs/20260921T203100Z-production-pipeline/analysis.md). Release not published.

## Retained earlier research evidence


Full identity: `R005.move-mse-ownership-off-the-window-thread`.

Current decision: **pursue** (actual_component_performance).

Actual matched worker/window MSE benchmark:11 alternating pairs, same bytes/pixels and lifecycle. Under512-byte/8ms paced ingress and45ms/60ms main-thread load, median append completion window1672.4ms versus worker647.9ms; paired savings1023.7ms, bootstrap95% [972.4000000357628, 1025.300000011921]. Predeclared positive-savings gate passes. Unpaced variant adds worker startup cost and finishes before load begins; retained as a scope control.

Next action: Research component gates complete for paced ingress under UI load. Separate integration project: apply ownership protocol to maintained scheduler and reproduce workload before production admission.

## Stages

| Stage | Status | Basis |
|---|---|---|
| define | passed | Existing source-grounded definition imported; acceptance criteria must be reviewed before a new run. |
| prepare | passed | Historical fixtures, runtime/source manifest and result hashes reviewed and verified; no new execution or fixture generation. |
| screen | passed | Prior bounded screening reviewed; scientific disposition unchanged. |
| correctness | passed | Actual worker MediaSourceHandle renders A/V to EOF, seeks, rejects malformed input and terminates after a frame; transferred input detaches and every tested case cleans up. |
| performance | passed | Actual matched worker/window MSE benchmark:11 alternating pairs, same bytes/pixels and lifecycle. Under512-byte/8ms paced ingress and45ms/60ms main-thread load, median append completion window1672.4ms versus worker647.9ms; paired savings1023.7ms, bootstrap95% [972.4000000357628, 1025.300000011921]. Predeclared positive-savings gate passes. Unpaced variant adds worker startup cost and finishes before load begins; retained as a scope control. |
| results | passed | Actual matched worker/window MSE benchmark:11 alternating pairs, same bytes/pixels and lifecycle. Under512-byte/8ms paced ingress and45ms/60ms main-thread load, median append completion window1672.4ms versus worker647.9ms; paired savings1023.7ms, bootstrap95% [972.4000000357628, 1025.300000011921]. Predeclared positive-savings gate passes. Unpaced variant adds worker startup cost and finishes before load begins; retained as a scope control. |
| decision | passed | Actual matched worker/window MSE benchmark:11 alternating pairs, same bytes/pixels and lifecycle. Under512-byte/8ms paced ingress and45ms/60ms main-thread load, median append completion window1672.4ms versus worker647.9ms; paired savings1023.7ms, bootstrap95% [972.4000000357628, 1025.300000011921]. Predeclared positive-savings gate passes. Unpaced variant adds worker startup cost and finishes before load begins; retained as a scope control. |

[New run](../../shared/runs/20260919T204100Z-worker-paced/run.json) · [Evidence index](evidence/index.json) · [Complete history](history.jsonl) · [Item contract](item.json)
