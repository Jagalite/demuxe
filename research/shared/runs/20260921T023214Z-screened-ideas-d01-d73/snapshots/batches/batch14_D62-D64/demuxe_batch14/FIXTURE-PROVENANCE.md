<!-- SPDX-License-Identifier: CC-BY-4.0 -->
# Fixture provenance

All PCM inputs and PGS pixel patterns are deterministically authored by this batch's scripts. Video is a three-second FFmpeg testsrc2 pattern. No downloaded film, photography, music, or font is used. Fixture data was generated for this research and may be reused with this package.

Encoding/packaging uses installed FFmpeg. Independent PGS decoding uses its pgssub decoder. Candidate PGS parsing/PNG construction is separate Python code. Pillow writes the independent RGBA-reference PNGs. Native decoding, composition and audio capture use the installed Chromium.

sha256.js is reused from the earlier conversation's batch 13 harness, retaining its MIT SPDX header. No FFmpeg, Chromium, Python, Pillow or font binaries are redistributed.

The partial exploratory probe is preserved under evidence/initial_probe. The clean replay was resumed after a per-tool execution limit; its later output-content failure is documented, not hidden.
