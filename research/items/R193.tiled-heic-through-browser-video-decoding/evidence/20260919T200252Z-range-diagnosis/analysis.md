<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# HEIC range diagnosis

Four genuine HEIC tiles decode to limited-range NV12 despite full-range configuration. Luma matches full-to-limited rounding exactly for two tiles and within one code for the others; distinct original luma codes collapse to identical browser codes. Inverse range conversion cannot restore exact host pixels. Strict pixel-fidelity variant is stopped, not a capability or environment block.

For example, host luma 223 and 224 both become browser luma 208. Two host pixels mapping to one output code demonstrates why a pointwise inverse range correction cannot recover exact source values. The fixed fourth-pixel sample grid, independently evaluated with full/limited BT.601 equations, also differs; maximum sampled channel errors are 110–113, with mean absolute errors 0.327–0.522. Deliberately swapping U/V produces mean errors 82.8–93.5, providing a wrong-output control. These are signal-space diagnostics, not a new acceptance tolerance. Grid-overlap rejection and decoder/frame cleanup also pass.

Scope is this ImageIO synthetic 2x2 full-range HEIC on Chrome 152/macOS. Independent BT.601 display-signal samples use declared nearest chroma and do not qualify OS color management or perceptual tolerances. Chroma conversion differences remain unqualified; no universal HEIC rejection.

Reopen with a decoder path preserving full-range values, or explicitly define a separate display-tolerance profile and independent color-managed image oracle; do not loosen this exact-pixel contract silently.
