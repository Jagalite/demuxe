<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Verify useful BitTorrent-v2 blocks before a whole piece completes

Full identity: `R207.verify-useful-bittorrent-v2-blocks-before-a-whole-piece-completes`. Original rank: 212.

Current decision: **blocked** (reconciled from **DEFER_SETUP**). No new media execution.

Current source authority uses validated HTTP ranges or local File identity, with no BitTorrent peer/hash-request or trusted BEP52 root input. Six verified leaves are a useful primitive but need an authenticated leaf-to-media byte provider.

No matching candidate/reference/control execution for this exact gate. Authenticated BEP52 leaf-to-media provider with root/position/source-identity rejection.

Next action: Define one read-only provider exposing only verified 16KiB leaves for an existing fMP4 prefix; reject wrong root, proof position and changed source before append. Compare the smallest bounded component with its independent output oracle; production API absence alone does not preclude the experiment.

## Stages

| Stage | Status | Basis |
| --- | --- | --- |
| define | passed | Existing source-grounded definition imported; acceptance criteria must be reviewed before a new run. |
| prepare | blocked | Unperformed setup gate: Authenticated BEP52 leaf-to-media provider with root/position/source-identity rejection. |
| screen | passed | Existing source/prerequisite/experimental screen reviewed; scientific verdict preserved at its exact scope. |
| correctness | blocked | No matching candidate/reference/control execution for this exact gate. Authenticated BEP52 leaf-to-media provider with root/position/source-identity rejection. |
| performance | blocked | No relevant candidate correctness pass; no performance inference from source reports or existing-owner counters. |
| results | passed | Referenced evidence read and byte-pinned; historical claims remain imported, no new experiment inferred. |
| decision | passed | Normalized disposition preserves prior scoped scientific verdict and names the next missing gate. |

[Reconciliation](../../shared/runs/20260919T202508Z-r101-250-stage-reconciliation/run.json) · [Current metadata](item.json) · [History](history.jsonl) · [Evidence index](evidence/index.json)

Setup/fixture/environment blocks are not experimental failures. Integration and release qualification remain separate; historical definitions and bytes are retained.
