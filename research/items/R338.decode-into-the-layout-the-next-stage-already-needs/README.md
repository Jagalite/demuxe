<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Decode into the layout the next stage already needs

Current disposition: **stop_current_profile**. Historical review; no new media execution.

Stride-aware upload already removes all 120 tested JS row-pack bytes with exact output, stride negative and row-state restoration, so decoder allocator modification has no remaining measured opportunity in this profile. Existing alternative is not execution of get_buffer2 candidate.

Prepare: **not_applicable**. Correctness: **not_applicable**. Performance: **not_applicable**.

Next: Reopen for a distinct measured decoder-owned layout cost not removed by stride-aware upload.

[Current record](item.json) · [History](history.jsonl) · [Evidence index](evidence/index.json) · [Review](../../shared/runs/20260919T202334Z-ranks251-392-reconciliation/analysis.md)
