<!-- SPDX-License-Identifier: CC-BY-4.0 -->

Actual software entropy-parsed MPEG2 I/P payload moves inverseDC and32resident motion predictions onto WebGPU. All33pictures exactly match independent FFmpeg; all22timed outputs exact, wrong reference differs, stale source/fractional motion rejected, resources destroyed. Eleven paired complete cold-GPU reconstruction jobs cost 2.130x CPU at64x64. This is a measured negative for the admitted DC-I/chroma-alignedP profile, not a proof against all GPU decoders.

Reuses actual MPEG2 entropy parser and independently FFmpeg-decoded DC-I/chroma-aligned motion P profile. GPU inverse DC and resident prediction replace CPU software reconstruction, not video presentation only. R081 title-derived scope, not recovery of an original detailed report.
