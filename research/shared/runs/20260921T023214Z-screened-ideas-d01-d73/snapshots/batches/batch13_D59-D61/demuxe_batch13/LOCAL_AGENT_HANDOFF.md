<!-- SPDX-License-Identifier: CC-BY-4.0 -->
# Local-agent handoff — D59–D61

Start with REPORT.md and evidence/analysis.json. These are standalone screens, not automatic integration instructions and not a new production benchmark. Repo lineage was checked at `6feb9b337889bfbaab8c5ac33bbddd0ca5d94f36`; fetch current source before inspecting maintained owners. Do not assign permanent R numbers without checking the catalogue, and do not overwrite an old experiment's different scoped verdict.

## Reproduce

Requires Python 3 with Pillow, NumPy and Playwright, plus installed `ffmpeg` and `/usr/bin/chromium`. No font assets, external media, server access, or network download is used by the experiments. The browser opens a blank page and receives local fixture bytes through Playwright. Do not change browser security restrictions to make a blocked capability look available.

```sh
python scripts/run_all.py --out /tmp/demuxe-b13-fresh
```

Choose a new output path: the runner refuses to overwrite old evidence. It copies the scripts, builds actual media, runs five browser stages, and verifies. Full playback tests use short timeouts; an overloaded machine may produce a lifecycle timeout that should be recorded rather than misclassified as a codec failure. Browser and encoder changes can alter pixel hashes or expected platform-specific failures. Review the raw records, not only the verification exit code.

## D59: JPEG-in-TIFF

Candidate: scripts/build_tiff.py `parse_tiff`, scripts/browser.js `tiffTest` and `tiffRegionTest`.

Actual capability: native JPEG decoding of 42 reconstructed strips yields seven exact TIFF page references; four region requests also match. Host parser never reconstructs pixels for the candidate. Host TIFF decoding is an independent reference only. This is a file-format subset, not general TIFF.

Keep explicit: classic TIFF, baseline JPEG, unsigned 8-bit contiguous strips, bounded IFDs/geometry, table ownership, RGB/grayscale/default 1:1 YCbCr, no unsupported color/ICC/alpha/orientation. Do not drop color properties to admit more files. Existing JPEG-in-transport reconstruction may already supply useful pieces.

Next experiment: selected-strip range reads from a source-bound index, exactly matching full-page reference pixels, including short final strips and source replacement during an image decode. Compare complete cost with the maintained software source, including parser/setup, duplicate tables, browser images and compositor. The current screen loads the complete TIFF; it did not demonstrate fewer remote bytes.

## D60: false non-sync flags

Candidate: scripts/build_video.py `info`, `require_idr`, `repair`.

Exactly eight byte values restore direct-native seeks in the authored damaged source. Original and repaired canonical files are identical. MSE already handles the unchanged damaged representation, even from the third GOP. Do not install a mandatory rewriting stage for MSE on this evidence.

The IDR classifier is restricted and relies on known parameter configuration and source-bound packet hashes. It is not a complete AVC validator. Never promote a non-IDR recovery picture by trusting an inherited keyframe flag. Actual 76 dependent-sample guard calls are in the manifest.

Next experiment: inspect maintained sample/index ownership, demonstrate a real need, and compare repaired direct-native with the cheapest already-correct route. The direct and MSE pixel hashes differ in this screen: they are NOT qualified as exactly interchangeable. Each candidate is compared against its own destination reference. Initial unsigned-CTS evidence is retained separately; the final signed-CTS control is an authored fixture, not a general timestamp repair.

## D61: exact decoded-audio loops

Candidate: scripts/browser.js `loopRender`, `loopTest`, `loopFollowup`.

Use the isolated-cycle mode for the demonstrated same-rate contract. It copies only the requested cycle, then uses native AudioBufferSourceNode looping. There is no repeated input waveform allocation in the candidate. Do not mistake this for compressed-domain looping or a measured speedup.

Keep the one-frame, phase-shift, off-by-one, and after-loop-neighbor controls. Full-buffer subrange loops are not exact in all tested cases. Rate-doubling isolated output matches the explicit periodic reference; 44.1↔48 kHz remains nonexact even after isolation. The tiny residual is not an exactness pass.

Next experiment: maintained start/stop/seek/cancel ownership and captured live same-rate output, charged against the cheapest correct buffer/scheduler. Avoid decoding an entire otherwise-native file merely to enable this feature. Different-rate and tolerance-permitted workflows require independent contracts.

## Evidence hygiene

Preserve `evidence/initial_video`, loop failures, cross-endpoint image differences, and replay records. A passing verification suite includes assertions that incorrect routes fail. It does not promote the whole player or establish hardware/CPU/energy benefit.
