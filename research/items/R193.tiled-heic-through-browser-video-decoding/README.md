<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# tiled HEIC through browser video decoding

Current disposition: **stop_current_profile**. Correctness **failed** for exact pixels; performance **not applicable**. Define, prepare, screen, results and decision passed as research gates.

Four genuine HEIC tiles decode to limited-range NV12 despite full-range configuration. Luma matches full-to-limited rounding exactly for two tiles and within one code for the others; distinct original luma codes collapse to identical browser codes. Inverse range conversion cannot restore exact host pixels. Strict pixel-fidelity variant is stopped, not a capability or environment block.

Scope is this ImageIO synthetic 2x2 full-range HEIC on Chrome 152/macOS. Independent BT.601 display-signal samples use declared nearest chroma and do not qualify OS color management or perceptual tolerances. Chroma conversion differences remain unqualified; no universal HEIC rejection.

Next: Reopen with a decoder path preserving full-range values, or explicitly define a separate display-tolerance profile and independent color-managed image oracle; do not loosen this exact-pixel contract silently.

[Current record](item.json) · [History](history.jsonl) · [Diagnosis](evidence/20260919T200252Z-range-diagnosis/analysis.md) · [Results](evidence/20260919T200252Z-range-diagnosis/results.json)
