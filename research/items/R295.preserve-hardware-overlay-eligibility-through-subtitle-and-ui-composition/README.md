<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Preserve hardware-overlay eligibility through subtitle and UI composition

Full identity: `R295.preserve-hardware-overlay-eligibility-through-subtitle-and-ui-composition`. Original rank: 12.

Current decision: **blocked**. Scientific verdict preserved from **HOLD_ENV**; stages reconciled 2026-09-19T20:18:43.070415+00:00. No new media execution.

Current headless Chrome can exercise browser APIs but supplies no physical display overlay promotion, compositor scanout or refresh-cadence evidence. Physical fixed-display diagnostic run remains required; this is not an experimental negative.

## Accepted scope

Fixed physical display/compositor diagnostic required.

No physical overlay-promotion/compositor scanout evidence exists in headless environment. This is an environment prerequisite, not a failed overlay experiment.

Next action: Identify the CPU/GPU representation boundary and actual useful work removed. Check existing renderer fusions, caches, kernel fast paths and hardware gates.

## Stages

| Stage | Status | Basis |
| --- | --- | --- |
| define | passed | Existing source-grounded definition imported; acceptance criteria must be reviewed before a new run. |
| prepare | blocked | Physical display environment absent; no candidate setup falsely accepted. |
| screen | passed | Prior bounded screening reviewed; scientific disposition unchanged. |
| correctness | blocked | No physical overlay-promotion/compositor scanout evidence exists in headless environment. This is an environment prerequisite, not a failed overlay experiment. |
| performance | blocked | Depends on unavailable physical correctness environment. |
| results | passed | Referenced result bytes and source/runtime manifests verified; reconciliation records acceptance scope without rerunning experiments. |
| decision | passed | Scientific verdict preserved with normalized disposition and explicit scoped gates. |

[Reconciliation](../../shared/runs/20260919T201843Z-top30-stage-reconciliation/run.json) · [Evidence index](evidence/index.json) · [Current state](item.json) · [History](history.jsonl)

Original definitions and historical evidence remain intact. Integration and release qualification are separate.
