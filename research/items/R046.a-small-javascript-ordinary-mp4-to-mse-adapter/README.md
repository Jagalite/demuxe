<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# A small JavaScript ordinary-MP4-to-MSE adapter

Current disposition: **pursue**. Historical execution reconciled; no new media run.

Strict bounded JavaScript sample-table adapter preserves all tested packet timing/payload and full decoded output; actual MSE marked A/V reaches EOF. Further profiles need B-frame/tail-moov and edit-list variation.

Correctness: **passed**. Performance: **pending**.

Bounded ordinary MP4 adapter preserves 72 video and 142 audio packet payloads/timing, full decoded pixels/PCM exact; malformed input rejects. Actual generated MSE output has marked audio/video to EOF and cleanup. Accepted only tested sample-table profile.

Next: Extend explicit profile with edit-list/B-frame/tail-moov fixtures before comparing complete JS adapter cost.

[Current record](item.json) · [History](history.jsonl) · [Evidence index](evidence/index.json) · [Acceptance review](../../shared/runs/20260919T201644Z-top100-31-65-reconciliation/analysis.md)
