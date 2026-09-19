<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Extract in-band closed captions from compressed video headers

Current disposition: **pursue**. Historical execution reconciled; no new media run.

Actual registered A53 SEI extraction from authored H264 yields CEA608 pop-on HI matching independent FFmpeg SRT decoder. Existing compressed NALs and all decoded video pixels remain exact; bad parity rejects. Restricted caption state component, not full608/708 renderer or seek restoration.

Correctness: **passed**. Performance: **pending**.

Authored H.264 registered A53 SEI yields restricted pop-on HI matching independent FFmpeg SRT; existing NAL bytes and all video pixels unchanged. Wrong parity rejects. Accepted extraction component, not CEA608/708 renderer or seek state restoration.

Next: Define caption state/seek restoration before integration; preserve original compressed video without mutation.

[Current record](item.json) · [History](history.jsonl) · [Evidence index](evidence/index.json) · [Acceptance review](../../shared/runs/20260919T201644Z-top100-31-65-reconciliation/analysis.md)
