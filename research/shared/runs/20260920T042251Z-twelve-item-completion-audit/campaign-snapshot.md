<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Twelve-item research qualification

All 12 have completed all seven applicable research stages: **5 scoped positives and 7 profiles stopped after failed performance gates**. Every profile passed its final bounded correctness contract. No item in this campaign remains pending, blocked or inconclusive. A failed gate is a completed negative experiment, not positive qualification.

Cost ratios are candidate divided by the named baseline: below 1 is cheaper. R101 and R295 share one experiment and must not be counted as two independent gains.

| Item | Decision | Measured result | Qualified or tested scope |
|---|---|---|---|
| [R028](../items/R028.make-streaming-representation-choices-aware-of-complete-plan-feasibility/README.md) — Complete-plan-aware adaptation | Stop profile | 1.012× cost versus the fair selective-owner baseline; 14/31 pairs faster. No declared 5% benefit. | 24 SDR VP8/VP9 segments, selected PCM/cues, rollback, cancellation and seeks; research controller, not shipping HLS/DASH. |
| [R076](../items/R076.definition-not-recovered/README.md) — Thin nonreference frames before decoding | Pursue | 0.808× full-job cost; all 7 pairs faster (19.25% median saving). | 720p closed-GOP H264; 107 of 240 frames retained with exact pixels and original PTS. Not arbitrary constant-frame-rate conversion. |
| [R077](../items/R077.definition-not-recovered/README.md) — Frame-accurate local re-encoding | Pursue | 0.657× full-job cost; all 7 pairs faster (34.29% median saving). | Uniform lossless H264: 46 edge frames re-encoded and 60 interior frames copied. Mixed lossy/lossless splice failed and is excluded. |
| [R078](../items/R078.definition-not-recovered/README.md) — Texture-native video | Pursue | 0.839× full-job cost; all 9 pairs faster; 8× smaller texture upload/storage. | 32-frame Hap/BC1 profile, visible WebGPU canvas. RGB error at most one level, exact alpha; strict bit-exact profile failed. |
| [R079](../items/R079.definition-not-recovered/README.md) — Float audio through integer FLAC | Stop profile | 20.286× decode/reconstruction cost versus float WAV. | 96,000 finite Float32 samples preserved and rendered exactly. Codec payload smaller, but native float WAV already works; no all-format claim. |
| [R080](../items/R080.definition-not-recovered/README.md) — Reconstruct video alpha | Pursue | Alpha capability passed; prepared first-frame API job 0.242× tested correct native load/seek baseline. | Three 32×32 frames, exact alpha, bounded premultiplied RGB, actual canvas and decoder lifecycle controls. Not a general playback or physical-display speedup; prefer suitable native alpha. |
| [R081](../items/R081.definition-not-recovered/README.md) — Partial GPU video decoding | Stop profile | GPU slower in every larger-profile pair: cold 1.888–2.079×, reused device 1.656–1.818×. | Actual MPEG2 entropy parsing included; 256×256 and 512×512, 33 pictures each, exact FFmpeg oracle. Browser startup excluded from both paths. |
| [R101](../items/R101.keep-decoded-video-on-the-native-overlay-display-path/README.md) — Native video display path | Stop profile | Final A/V CPU median 0.838×; 8/9 pairs faster, worst 1.109×. Failed the predeclared every-pair-faster gate. | Native CALayer and all 73 source IDs measured at WindowServer; A/V cue and UI lifecycle checks passed. Not proof of hardware-plane promotion, photons, energy or physical speaker latency. |
| [R120](../items/R120.entropy-only-transcoding/README.md) — Entropy-only transcoding | Pursue | 0.824× complete-job cost; all 8 pairs faster (17.58% median saving). | CABAC to CAVLC syntax translation; 78 independently decoded pictures exact across four progressive 8-bit 4:2:0 I/P profiles. No browser-tier claim. |
| [R134](../items/R134.sidecars-that-let-decoding-start-halfway-through-an-entropy-coded-slice/README.md) — Entropy-slice restart sidecars | Stop profile | 1.477× complete-job cost; checkpoint records 5.55 MB versus 63.4 KB source. | Fresh-process complete CABAC state restoration and full independent picture reconstruction. Prefix reconstruction costs included; not a standalone DPB capsule. |
| [R169](../items/R169.make-custom-presentation-aware-of-display-cadence/README.md) — Display-cadence-aware presentation | Stop profile | 0.103% median improvement in primary p95 phase error; required 15%. | Actual WindowServer display timestamps and identifying source pixels, not predicted Chrome feedback. Six normal trials retained all 72 frames. |
| [R295](../items/R295.preserve-hardware-overlay-eligibility-through-subtitle-and-ui-composition/README.md) — Composition preserving native surfaces | Stop profile | Final A/V CPU median 0.838×; 8/9 pairs faster. Same shared robustness failure as R101. | Matched captions, controls, scrolling, resizing, fullscreen and multivideo checks. Native-surface eligibility only; hardware promotion and system energy remain unqualified. |

## Interpretation

The six recovered titles use newly authored explicit contracts; they are not reconstructed original reports. Failed early variants and baseline corrections remain in the evidence. R028 lost its apparent advantage against the cheaper correct baseline. R080 demonstrates alpha reconstruction; its API timings do not establish faster physical presentation. R101/R295 retain an average CPU-saving trend despite failing the stricter consistency gate.

These conclusions do not authorize production routing changes or imply new shipping playback tiers. The positive profiles are candidates for separately scoped integration and broader input/platform qualification. The seven stopped profiles can be revisited only with a new justified hypothesis or workload.

The full catalogue separately retains 27 administrative closures for permanently missing sources and 32 older inconclusive findings; neither group is converted into an experimental negative by this campaign.

Canonical stages and complete histories are linked above. See [catalogue status](../STATUS.md), [machine-readable campaign](2026-09-20-twelve-item-qualification.json), and [artifact storage policy](../ARTIFACT-STORAGE.md). Reproducible bulk files remain local and are omitted from Git through the exact-path inventory. Historical measurements, failed variants and source provenance are retained.
