<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Expose an HDR10-compatible Dolby Vision base without video re-encoding

Full identity: `R099.expose-an-hdr10-compatible-dolby-vision-base-without-video-re-encoding`.

Current decision: **pursue** (component_test).

Genuine published Dolby8.1 fixture obtained from Chromium test corpus with documented Dolby origin. Explicit HDR10-base extraction removes120RPU NALs and DV configuration, preserves all VCL/otherSEI bytes, exact parameter-set bytes after hvcC relocation, all120packet timestamps/durations and all120decoded10-bit frame hashes. BT.2020/PQ/limited-range metadata preserved. Profile5 guard rejects. Default timestamp normalization failed and was corrected using copyts. Host adapter viable for explicitly requested HDR10; Dolby rendering, native HDR display and performance unqualified.

Next action: Implement the strict metadata/NAL gate at a maintained destination and test actual browser HDR10 frames/seek before route admission.

## Definition and contract

Question. Can a browser play a supported compatible base when full Dolby Vision signaling blocks or complicates the route? What differs from earlier work. Video counterpart to compatible-core exploration, not software tone mapping or full Dolby Vision preservation. Input scope. Verified clear Dolby Vision profile 8.1 first; retained base must actually be HDR10-compatible. Mechanism to test. Preserve the coded base picture data, selectively remove Dolby-specific signaling when appropriate, and author a truthful HDR10 destination description and required metadata. Smallest experiment. 1. Verify a profile 8.1 fixture and establish a trusted HDR10-base reference. 2. Apply a version-checked metadata/bitstream transformation and preserve base picture hashes. 3. Test native Chrome HEVC/HDR behavior on a capable display; reject profile 5 as a compatibility negative control.

Output contract: Configuration and ordered codec payloads where copy is intended; requested frames/audio/timeline/features at the declared output boundary.

Primary metric: Correct additional admitted source/destination capability; otherwise full startup and CPU/resource cost.

Adverse control: Alter one admission-critical configuration, remove a required dependency, or preserve video while making selected audio unsupported. Candidate must reject or use a declared fallback.

## Stages

| Stage | Status | Basis |
|---|---|---|
| define | passed | Explicit HDR10-compatible base output for validated profile8/compatibility1/single-layer HEVC, unchanged coded pictures and timeline. |
| prepare | passed | Pinned inputs, actual commands, tool identities and independent references captured in run manifest. |
| screen | passed | Genuine published Dolby8.1 fixture obtained from Chromium test corpus with documented Dolby origin. Explicit HDR10-base extraction removes120RPU NALs and DV configuration, preserves all VCL/otherSEI bytes, exact parameter-set bytes after hvcC relocation, all120packet timestamps/durations and all120decoded10-bit frame hashes. BT.2020/PQ/limited-range metadata preserved. Profile5 guard rejects. Default timestamp normalization failed and was corrected using copyts. Host adapter viable for explicitly requested HDR10; Dolby rendering, native HDR display and performance unqualified. |
| correctness | passed | Exact coded VCL/SEI and configuration identity, rational packet time comparison, complete independent HEVC decoded hashes; incompatible DV5 admission control. Host explicit HDR10-base component only. |
| performance | not_applicable | Current endpoint is scoped feasibility, not a measured performance claim; reopen for a predeclared equivalent-work benchmark after complete relevant correctness. |
| results | passed | Positive/negative evidence and limitations captured in immutable run. |
| decision | passed | pursue: Genuine published Dolby8.1 fixture obtained from Chromium test corpus with documented Dolby origin. Explicit HDR10-base extraction removes120RPU NALs and DV configuration, preserves all VCL/otherSEI bytes, exact parameter-set bytes after hvcC relocation, all120packet timestamps/durations and all120decoded10-bit frame hashes. BT.2020/PQ/limited-range metadata preserved. Profile5 guard rejects. Default timestamp normalization failed and was corrected using copyts. Host adapter viable for explicitly requested HDR10; Dolby rendering, native HDR display and performance unqualified. |

[New run](../../shared/runs/20260919T200800Z-dolby/run.json) · [Evidence index](evidence/index.json) · [Complete history](history.jsonl) · [Item contract](item.json)
