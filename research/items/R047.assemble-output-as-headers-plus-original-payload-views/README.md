<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Assemble output as headers plus original payload views

Current disposition: **already_implemented**. Historical execution reconciled; no new media run.

Reconciled completed prior evidence: The current dirty worker reuses a sole full owned ArrayBuffer and gathers all other cases. This is only the previously adopted narrow owned-buffer slice, not general scatter/gather or elimination of native mux copies. Current worker hash matches the prior isolated qualified worker. Imported exact captured output and append sizes match for both profiles; application gather bytes decrease 96.20% on the small fixture but only 8.96% on the movie, below its 25% value gate. Prior 100-cycle/1801.927-second run is retained historical evidence, not a v4 execution. Broad scatter/gather, CPU savings and production qualification are not established.

Correctness: **passed**. Performance: **failed**.

Captured remux output hashes and append sizes identical for owned-buffer candidate and baseline on both fixtures; historical 100-cycle/1801.927-second run passes with 142 restarts. Narrow ownership slice only. Gather bytes improve 96.20% small fixture but 8.96% movie, below declared 25% gate; representative value gate fails, not correctness.

Next: Keep already adopted owned-buffer slice and regression; reopen general scatter/gather only for a workload meeting its value gate. No CPU or production qualification inference.

[Current record](item.json) · [History](history.jsonl) · [Evidence index](evidence/index.json) · [Acceptance review](../../shared/runs/20260919T201644Z-top100-31-65-reconciliation/analysis.md)
