<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Audio bitstream component results

Real mono16 48kHz FLAC cut 41737:105565 reconstructs only two edge frames, preserves 12 interior subframe payloads, and rewrites variable sample numbering plus CRCs. All 63828 PCM samples and five independent libFLAC seeks match. Wrong fixed numbering fails two late seeks. Repeat-concat output and crossing-boundary seek are exact. STREAMINFO MD5 explicitly unknown.

- Repeat-concat tested; distinct-format concat and browser playback unqualified
- Only mono 16-bit fixture and supported FLAC header field grammar
- No performance claim; source full decode exists only as independent oracle

Original output directory renamed after capture; replay with a new output directory. No production integration or performance claim.
