<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Standalone HEVC HLS differential

The exact frozen `assets-shaka-production-01` HEVC/AAC HLS fMP4 fixture was loaded through standalone Shaka 5.2.11 and a plain browser video element. Neither arm imports the Demuxe Player, adapter, backend, network policy, or previous scheduler. Runtime/manifest/init/first two segment hashes are in `result.json`.

| Arm | Observation |
| --- | --- |
| Shaka with matched pause/resume/rate controls | Media decoder error 3 at 1.974332 s: `VTDecompressionOutputCallback`, OSStatus -17694; Shaka error 3016. |
| Browser Native with the same controls | Advanced through rate 1.25 and seeks to 6, 1, and 10 seconds; no media error. |
| Shaka uninterrupted | Identical media error at 1.974332 s, with no pause or rate change. |

The isolated Shaka result reproduces the production failure independently of Demuxe's wrapper and network policy. Uninterrupted playback also fails, so pause/resume/rate is not necessary to trigger this failure. The evidence localizes it to the fixture and Shaka/MSE/browser playback interaction; it does not establish which upstream component causes the invalid decode state.

Fixture inspection reports HEVC Main, `hvc1`, 8-bit yuv420p, B-frames, AAC-LC and two-second HLS media segments. No fixture was changed, no decoder workaround was introduced, and no performance claim is made. Native Direct remains the verified route for this specific fixture. An explicit adaptive-quality constraint must not be silently discarded to obtain that route.

Reproduce: `node tests/shaka-hevc-differential.mjs`. This launches headed Chrome and must run serially with other browser tests/CPU measurements.
