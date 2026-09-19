<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# preserve FLIC indices plus palette

Current disposition: **pursue**. Historical execution reconciled; no new media run.

Actual two-frame FLC with palette-only second update renders exact independent RGBA through index+palette GPU textures. Restricted COLOR256/COPY chunks establish representation feasibility; other FLIC opcodes and seek checkpoints remain future work.

Correctness: **pending**. Performance: **pending**.

Two actual FLC frames including palette-only update render exact independent RGBA on GPU and clean up. No executed malformed FLIC control or seek/checkpoint reconstruction is recorded; GPU recovery belongs to another case and cannot substitute.

Next: Execute a malformed chunk and backward checkpoint reconstruction for COLOR256/COPY scope before correctness acceptance.

[Current record](item.json) · [History](history.jsonl) · [Evidence index](evidence/index.json) · [Acceptance review](../../shared/runs/20260919T201644Z-top100-31-65-reconciliation/analysis.md)
