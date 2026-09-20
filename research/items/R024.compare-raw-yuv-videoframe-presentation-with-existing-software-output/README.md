<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Compare raw-YUV VideoFrame presentation with existing Software output

Current disposition: **pursue** for the scoped capability. Correctness **passed**; performance **passed**; other research gates passed.

Thirty prepared 1280x720 black/white limited-range I420 frames; actual maintained YUVPresenter versus fresh raw VideoFrames/Canvas2D. Complete owner allocation, row packing/upload/draw, final readback and teardown. Source decode and fixture preparation excluded. No general color/HDR/rotation claim. Full final image independently exact; invalid stride rejects and frame resources close. Earlier overlapping mock metadata failure and interleaved-generation timing variant retained; final measurement prepares all source heaps before tasks. Measured saving 35.36% with bootstrap95 [28.612157796762162, 41.9975882093255]; predeclared performance gate passed.

Research component gates complete in this profile; a separately authorized production integration must qualify actual ownership, representative media, color and lifecycle contracts.

[Current record](item.json) · [History](history.jsonl) · [Evidence](evidence/index.json) · [Run analysis](../../shared/runs/20260919T203737Z-presentation-performance/analysis.md)
