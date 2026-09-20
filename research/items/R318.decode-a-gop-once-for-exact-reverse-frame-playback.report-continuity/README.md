<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Decode a GOP once for exact reverse-frame playback

Disposition: **pursue**. Correctness **passed**, performance **passed**; other research gates passed.

Twelve exact64x48 H264 frames reversed within one closed GOP. One decoder/cache of12frames versus12 decoder owners replaying78 total packets. Full output plane hashes match independent FFmpeg source; dependent entry and >12-frame cache inputs reject. Cache closes12 retained frames;55,296 visible plane bytes, not native surface memory. Complete owner wall-time saving87.40%, bootstrap95[85.4166663993426, 89.38193316847808]; predeclared performance gate passed.

Scoped component research gates complete. Production integration requires a separate owner/workload contract and representative media validation.

[Current record](item.json) · [History](history.jsonl) · [Analysis](../../shared/runs/20260919T204922Z-presentation-ownership/analysis.md)
