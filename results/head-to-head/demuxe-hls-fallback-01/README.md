<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Native HLS compatibility fallback

**Passed.** The test injected `UNSUPPORTED_MEDIA` at Native HLS open, then required
a failed Native selection attempt, the Hybrid route, advancing playback, marked
440/880 Hz stereo output, the displayed timeline marker, and cleanup with no
remaining surfaces or workers. This simulates a compatibility rejection; it is
not qualification on a browser without HLS support.

[Result](result.json) · [Screenshot](fallback.png) · [Asset snapshot](assets-manifest.json) ·
[Captured test](files/harness/hls-fallback.mjs) · [Evidence hashes](manifest.json)

Rerun with `node tests/head-to-head/hls-fallback.mjs <assets> <fresh-output>`.
Source: the exact `assets-native-hls-fix-01` snapshot. Fixture bytes match the
original HLS/TS catalogue case. No default comparison result is replaced by this
injected trial, and no performance measurements ran.

After execution, captured harness files were relocated under `files/harness/` to
use the existing preserved-evidence licensing boundary. Their bytes are unchanged;
the hash inventory records their final paths. Future runs use this layout directly.
