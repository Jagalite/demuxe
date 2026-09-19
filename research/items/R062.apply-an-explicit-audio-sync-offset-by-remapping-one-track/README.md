<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Apply an explicit audio-sync offset by remapping one track

Full identity: `R062.apply-an-explicit-audio-sync-offset-by-remapping-one-track`.

Current decision: **pursue** (2026-09-19T20:07:16.715931+00:00).

Actual split-MSE +0.35/-0.25 second audio offsets preserve video ownership and move known tone windows. Paused remove/reappend to the opposite offset passes. Property-only timestampOffset change correctly leaves accepted audio ranges unchanged. Negative prefix clipping is explicit and only silent source prefix is tested.

## Tested contract

Stereo AAC pulse 0.5-1.3s at 660Hz; static +0.35/-0.25s mapping and paused replacement; silent negative prefix clipped

Next action: Qualify non-silent leading/tail policy and sample-exact PCM boundaries before exposing a user-facing offset controller.

## Stages

| Stage | Status | Basis |
| --- | --- | --- |
| define | passed | Source contract refined to explicit component profile and exclusions in current decision. |
| prepare | passed | Generated fixtures, source/runtime identities, baseline/oracle and adverse controls pinned in shared run. |
| screen | passed | Actual split-MSE +0.35/-0.25 second audio offsets preserve video ownership and move known tone windows. Paused remove/reappend to the opposite offset passes. Property-only timestampOffset change correctly leaves accepted audio ranges unchanged. Negative prefix clipping is explicit and only silent source prefix is tested. |
| correctness | passed | Scoped silent-prefix marker timing, unchanged video ownership, property-only adverse control, paused replacement, EOF and cleanup passed. Exact sample boundary/non-silent clipping fidelity excluded. |
| performance | not_applicable | Requested timing transformation; no throughput or power claim in this component gate. |
| results | passed | Positive, negative and setup-failure observations preserved with source/output manifest and commands. |
| decision | passed | Scoped pursue decision; no production integration or release qualification. |

[Shared run](../../shared/runs/20260919T200716Z-audio-mse/run.json) · [Browser results](../../shared/runs/20260919T200716Z-audio-mse/browser-result.json) · [Analysis](../../shared/runs/20260919T200716Z-audio-mse/analysis.md) · [Manifest](../../shared/runs/20260919T200716Z-audio-mse/manifest.json) · [Current metadata](item.json) · [History](history.jsonl) · [Evidence index](evidence/index.json)

Historical definitions and evidence remain preserved. Production integration and release qualification are separate.
