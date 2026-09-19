<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Reconstruct gain-map HDR using browser-decoded component images

Full identity: `R241.reconstruct-gain-map-hdr-using-browser-decoded-component-images.report-a`. Original rank: 228.

Current decision: **blocked** (reconciled from **DEFER_SETUP**). No new media execution.

The shared current probe exposes a nonfallback Apple GPU, so the historical no-GPU blocker is stale. A conforming gain-map fixture/reference and an UltraHDR metadata/reconstruction path remain unprovided; current SDR YUV shader is not that implementation.

No matching candidate/reference/control execution for this exact gate. Conforming gain-map HDR image plus pinned reconstruction reference and metadata; current GPU availability is not the blocker.

Next action: Acquire one pinned conforming gain-map image and decoded HDR reference, then audit metadata and browser component decode before a reconstruction shader. Compare the smallest bounded component with its independent output oracle; production API absence alone does not preclude the experiment.

## Stages

| Stage | Status | Basis |
| --- | --- | --- |
| define | passed | Existing source-grounded definition imported; acceptance criteria must be reviewed before a new run. |
| prepare | blocked | Unperformed fixture gate: Conforming gain-map HDR image plus pinned reconstruction reference and metadata; current GPU availability is not the blocker. |
| screen | passed | Existing source/prerequisite/experimental screen reviewed; scientific verdict preserved at its exact scope. |
| correctness | blocked | No matching candidate/reference/control execution for this exact gate. Conforming gain-map HDR image plus pinned reconstruction reference and metadata; current GPU availability is not the blocker. |
| performance | blocked | No relevant candidate correctness pass; no performance inference from source reports or existing-owner counters. |
| results | passed | Referenced evidence read and byte-pinned; historical claims remain imported, no new experiment inferred. |
| decision | passed | Normalized disposition preserves prior scoped scientific verdict and names the next missing gate. |

[Reconciliation](../../shared/runs/20260919T202508Z-r101-250-stage-reconciliation/run.json) · [Current metadata](item.json) · [History](history.jsonl) · [Evidence index](evidence/index.json)

Setup/fixture/environment blocks are not experimental failures. Integration and release qualification remain separate; historical definitions and bytes are retained.
