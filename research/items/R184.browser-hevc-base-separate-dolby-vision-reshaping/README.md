<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# browser HEVC base + separate Dolby Vision reshaping

Full identity: `R184.browser-hevc-base-separate-dolby-vision-reshaping`.

Current decision: **blocked** (prerequisite_probe).

Trusted RPU-bearing Dolby8.1 source is now available (120 genuine RPU NALs, documented Chromium/Dolby origin). The missing-source part is resolved. Independent Dolby reshaping/color reference remains unavailable: ordinary HEVC decoding used by R099 deliberately ignores RPU and cannot validate a separate Dolby transform. Do not count HDR10-base equivalence as Dolby appearance success.

Next action: Obtain an authorized independent Dolby color/reshaping oracle with a nontrivial mapping fixture; then compare browser base plus separate transform against that declared signal boundary.

## Definition and contract

The exact card is BLOCKED in this lab. FFmpeg includes dovi_rpu and a libplacebo filter, but there is no trusted Dolby Vision fixture or HDR-capable physical display. Chromium returns an empty support string for the tested hvc1/hev1 configurations, and WebGPU is unavailable on the permitted non-secure page. No synthetic RPU or SDR-only visual approximation was substituted for the intended claim.

Output contract: Configuration and ordered codec payloads where copy is intended; requested frames/audio/timeline/features at the declared output boundary.

Primary metric: Correct additional admitted source/destination capability; otherwise full startup and CPU/resource cost.

Adverse control: Alter one admission-critical configuration, remove a required dependency, or preserve video while making selected audio unsupported. Candidate must reject or use a declared fallback.

## Stages

| Stage | Status | Basis |
|---|---|---|
| define | passed | Prerequisite gate for browser HEVC base plus separately applied Dolby reshaping. |
| prepare | blocked | Genuine RPU-bearing source acquired and hashed, but independent Dolby reshaping/color oracle remains missing. |
| screen | passed | Trusted RPU-bearing Dolby8.1 source is now available (120 genuine RPU NALs, documented Chromium/Dolby origin). The missing-source part is resolved. Independent Dolby reshaping/color reference remains unavailable: ordinary HEVC decoding used by R099 deliberately ignores RPU and cannot validate a separate Dolby transform. Do not count HDR10-base equivalence as Dolby appearance success. |
| correctness | blocked | No candidate Dolby transform executed; required independent Dolby-rendered reference missing. |
| performance | blocked | Performance remains blocked until the Dolby transform has an independent fidelity reference and passes correctness. |
| results | passed | Positive/negative evidence and limitations captured in immutable run. |
| decision | passed | blocked: Trusted RPU-bearing Dolby8.1 source is now available (120 genuine RPU NALs, documented Chromium/Dolby origin). The missing-source part is resolved. Independent Dolby reshaping/color reference remains unavailable: ordinary HEVC decoding used by R099 deliberately ignores RPU and cannot validate a separate Dolby transform. Do not count HDR10-base equivalence as Dolby appearance success. |

[New run](evidence/20260919T201300Z-reference-gate/run.json) · [Evidence index](evidence/index.json) · [Complete history](history.jsonl) · [Item contract](item.json)
