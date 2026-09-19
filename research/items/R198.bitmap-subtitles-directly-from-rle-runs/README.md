<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# bitmap subtitles directly from RLE runs

Full identity: `R198.bitmap-subtitles-directly-from-rle-runs`. Original rank: 163.

Current decision: **blocked** (reconciled from **DEFER_SETUP**). No new media execution.

Native subtitle overlay accepts libass bitmap tiles, not PGS RLE spans. Historical exact integer span composition uses a packet model and does not provide demux/PGS lifetime ownership.

No matching candidate/reference/control execution for this exact gate. Direct RLE-span composition path with palette/clear/seek lifetime and bounds controls; existing raster PGS evidence alone is insufficient.

Next action: Build only a bounded run parser/compositor oracle for real selected PGS events before GPU integration; palette-only/clear/seek state and oversized run must be decisive controls. Compare the smallest bounded component with its independent output oracle; production API absence alone does not preclude the experiment.

## Stages

| Stage | Status | Basis |
| --- | --- | --- |
| define | passed | Existing source-grounded definition imported; acceptance criteria must be reviewed before a new run. |
| prepare | blocked | Unperformed setup gate: Direct RLE-span composition path with palette/clear/seek lifetime and bounds controls; existing raster PGS evidence alone is insufficient. |
| screen | passed | Existing source/prerequisite/experimental screen reviewed; scientific verdict preserved at its exact scope. |
| correctness | blocked | No matching candidate/reference/control execution for this exact gate. Direct RLE-span composition path with palette/clear/seek lifetime and bounds controls; existing raster PGS evidence alone is insufficient. |
| performance | blocked | No relevant candidate correctness pass; no performance inference from source reports or existing-owner counters. |
| results | passed | Referenced evidence read and byte-pinned; historical claims remain imported, no new experiment inferred. |
| decision | passed | Normalized disposition preserves prior scoped scientific verdict and names the next missing gate. |

[Reconciliation](../../shared/runs/20260919T202508Z-r101-250-stage-reconciliation/run.json) · [Current metadata](item.json) · [History](history.jsonl) · [Evidence index](evidence/index.json)

Setup/fixture/environment blocks are not experimental failures. Integration and release qualification remain separate; historical definitions and bytes are retained.
