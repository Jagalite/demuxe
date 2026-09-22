<!-- SPDX-License-Identifier: CC-BY-4.0 -->
# Fixture and code provenance

All media in this batch is synthetic. FFmpeg's `testsrc2` generator supplies moving test pictures; the alternate source applies a horizontal flip. NumPy-generated analytic stereo tones supply the audio. No camera footage, copyrighted entertainment content, personal media, fonts, or third-party benchmark file is bundled.

AVC/AAC encoders and decoders are installed FFmpeg 7.1.5 components. Encoder output is reference input, not an optimization result. Constructors retain encoded packet bytes and author restricted ISO BMFF metadata. The scripts and fixtures can be regenerated locally.

`common.py` and `browser_common.py` adapt MIT-licensed helpers from the previously delivered batch 21 archive. All new scripts carry SPDX MIT identifiers. Reports are marked CC-BY-4.0. No FFmpeg, browser, codec-library or font binaries are distributed. The software tools used to produce/read files keep their own licenses.

The GitHub review is read-only and pinned at 3bfeac8178bd34047e5396d1618e09a31cf8618a. Only paths/links and derived lineage notes are included; this package is not a repository checkout.
