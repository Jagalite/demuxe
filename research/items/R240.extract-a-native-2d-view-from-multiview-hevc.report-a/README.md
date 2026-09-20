<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Extract a native 2D view from multiview HEVC

Current decision: **pursue**. Genuine Apple MV-HEVC base extraction preserves124codedVCL/timing packets and122presented pictures after single-layerVPS and presentation-edit restoration. Independent two-eye oracle shows124different eye pairs. NativeChrome eight fullRGBA seeks plus reverse/forward andEOF exactly match originalMOV2D output. Dependent-only negative decodes zero. Scoped video-only capability, no3D or audio preservation claim.

| Stage | Status | Basis |
| --- | --- | --- |
| define | passed | Existing source-grounded definition imported; acceptance criteria must be reviewed before a new run. |
| prepare | passed | New executable probe and declared workload/controls registered with source/input/runtime evidence. |
| screen | passed | Genuine Apple MV-HEVC base extraction preserves124codedVCL/timing packets and122presented pictures after single-layerVPS and presentation-edit restoration. Independent two-eye oracle shows124different eye pairs. NativeChrome eight fullRGBA seeks plus reverse/forward andEOF exactly match originalMOV2D output. Dependent-only negative decodes zero. Scoped video-only capability, no3D or audio preservation claim. |
| correctness | passed | Independent FFmpeg124packet/VCL/timestamp proof,122displayed framehash oracle,124picture two-eye decoding, dependent-only0picture negative; native1280x1280RGBA equality at8queries plus reverse/forward/EOF andcleanup. Guarded source-specific VPS rewrite and timeline edits explicit. |
| performance | not_applicable | Source-defined base-view extraction capability, no latency/CPU/energy claim; correctness setup and whole-source preparation included in recorded provenance. No performance benchmark required for this endpoint. |
| results | passed | Actual new execution raw outcomes, controls and scoped interpretation retained. |
| decision | passed | pursue: Genuine Apple MV-HEVC base extraction preserves124codedVCL/timing packets and122presented pictures after single-layerVPS and presentation-edit restoration. Independent two-eye oracle shows124different eye pairs. NativeChrome eight fullRGBA seeks plus reverse/forward andEOF exactly match originalMOV2D output. Dependent-only negative decodes zero. Scoped video-only capability, no3D or audio preservation claim. |

Next/reopen: Preserve source/configuration guards and base-view identity; extend sources and audio/timecode retention before whole-file integration. Do not infer generic MV-HEVC or3D support.

[Current contract](item.json) · [History](history.jsonl) · [Evidence](evidence/index.json)
