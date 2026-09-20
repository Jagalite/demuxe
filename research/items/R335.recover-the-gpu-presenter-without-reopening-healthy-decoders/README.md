<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Recover the GPU presenter without reopening healthy decoders

Current disposition: **pursue** for the scoped capability. Correctness **passed**; performance **passed**; other research gates passed.

64x48 software-preferred H264 two closed GOPs, synthetic WebGPU device.destroy loss. Recovery, synchronized held redraw, next GOP independent host hashes and teardown included; preloss setup recorded separately. Real driver loss and player integration excluded. Held GPU redraw exact and all subsequent decoded planes match independent host hashes; stale presenter epoch rejected, next frame differs, cleanup completes. Planned corrupted-hash control was implemented as different subsequent-picture hash rather than deliberate hash mutation; stale generation is the explicit adverse control. Measured saving 15.58% with bootstrap95 [11.62512483607504, 19.182913579677084]; predeclared performance gate passed.

Research component gates complete in this profile; a separately authorized production integration must qualify actual ownership, representative media, color and lifecycle contracts.

[Current record](item.json) · [History](history.jsonl) · [Evidence](evidence/index.json) · [Run analysis](../../shared/runs/20260919T203737Z-presentation-performance/analysis.md)
