<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# coded-sample identity across containers

Current disposition: **blocked** — **setup** prerequisite. Historical review; no new media execution.

Current cache keys are per-source byte offsets and FFmpeg copies selected packet payloads; no container-independent immutable sample cache exists. Equal AVC hashes across MP4/MKV do not identify common timestamps, codec config, color or authorization.

Prepare: **blocked**. Correctness: **blocked**. Performance: **blocked**.

Next: Define one canonical packet object key across two authorized containers and compare payload/config identity with a changed-color or timing control.

[Current record](item.json) · [History](history.jsonl) · [Evidence index](evidence/index.json) · [Review](../../shared/runs/20260919T202334Z-ranks251-392-reconciliation/analysis.md)
