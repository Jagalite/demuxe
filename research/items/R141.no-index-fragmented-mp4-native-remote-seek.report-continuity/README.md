<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# no-index fragmented MP4 native remote seek

Full identity: `R141.no-index-fragmented-mp4-native-remote-seek.report-continuity`. Original rank: 190.

Current decision: **stop_current_profile** (reconciled from **STOP_PROFILE**). No new media execution.

Removing only the random-access trailer after sidx removal adds no requests or bytes in this tested native seek: both fetch 6656858 bytes and the same target picture. Do not build a trailer-specific optimization from this profile; reopen a longer/costlier trace.

Same-length/payload index variants reach identical target picture; no-sidx and no-index each fetch6656858 bytes/102requests. Trailer removal adds no work on this trace.

Next action: Require a longer or costlier trace before any trailer-specific optimization.

## Stages

| Stage | Status | Basis |
| --- | --- | --- |
| define | passed | Existing source-grounded definition imported; acceptance criteria must be reviewed before a new run. |
| prepare | passed | Read and pinned historical fixture/output/control evidence; no rerun. |
| screen | passed | Existing source/prerequisite/experimental screen reviewed; scientific verdict preserved at its exact scope. |
| correctness | passed | Same-length/payload index variants reach identical target picture; no-sidx and no-index each fetch6656858 bytes/102requests. Trailer removal adds no work on this trace. |
| performance | not_applicable | No performance claim required for scoped profile stop, existing behavior or optional quality/test supplement. |
| results | passed | Referenced evidence read and byte-pinned; historical claims remain imported, no new experiment inferred. |
| decision | passed | Normalized disposition preserves prior scoped scientific verdict and names the next missing gate. |

[Reconciliation](../../shared/runs/20260919T202508Z-r101-250-stage-reconciliation/run.json) · [Current metadata](item.json) · [History](history.jsonl) · [Evidence index](evidence/index.json)

Setup/fixture/environment blocks are not experimental failures. Integration and release qualification remain separate; historical definitions and bytes are retained.
