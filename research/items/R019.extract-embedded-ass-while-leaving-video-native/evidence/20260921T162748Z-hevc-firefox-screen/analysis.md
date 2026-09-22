# HEVC + ASS native-route feasibility screen

Decision: **stop this Firefox 146.0.1 profile at visual correctness; no qualified performance result.** The native-media route accepts the file but outputs corrupt video. This does not invalidate R019's prior H.264/Chrome scope.

## What was tested

Original `/Volumes/seed2/Projects/startup-repro/software_test_slow.mkv`: HEVC Main10 1280x720 23.976fps, AAC stereo, embedded ASS and six fonts. Full-file offline FFmpeg packet-copy MP4 (`hvc1`, faststart), ASS extraction and font extraction. Pinned SubtitlesOctopus/libass overlays on a browser video element with the video's clock. Default Playwright Firefox 146.0.1, headed, fresh profile, with no HEVC WebCodecs preference override. This is a browser destination test; offline extraction is not production browser extraction.

## Findings

- All 23,112 video and 45,190 audio packet payload hashes match in order between source and remux. See `packet-integrity.json`.
- Full-file remux preparation: 12.163 s. Subtitle extraction: 0.166 s; font extraction was separately recorded. These are observed warm/uncategorized host wall times, not cold-start benchmarks.
- Isolated Firefox repeat: initialization 898.3 ms after page setup, 2.976 s media progress in a 3 s check, 71 frames and 0 reported drops, nonzero audio signal. Seeks to 30, 34 and back to 30 succeeded. Subtitle overlay at the active 34 s cue had 15192 nontransparent pixels. This confirms activity, not full subtitle fidelity.
- **Firefox picture failure:** canvas copy and page capture both show severe color/geometry corruption. Mean absolute RGB error at 30 s versus independent FFmpeg decode: 100.76/255. Screenshots from the first attempt and isolated repeat agree on failure. The precise decoder/pixel-format root cause is unproven.
- Chrome 152.0.7977.83 native control: same prepared assets, nonzero audio, working seeks, 15192 nontransparent subtitle pixels at 34 s. RGB mean absolute error against the 30 s FFmpeg reference: 1.82/255 (different browser/color conversion is not bit-exact). This localizes the observed failure to the Firefox test path rather than changed compressed packets.

## Performance status

The first harness continued some diagnostic sampling during stop/cleanup, and other diagnostic work overlapped portions of that run. Its raw `result.json` and intermediate copies are retained, but **all performance samples are excluded**: the candidate failed picture correctness, sampling was not cleanly isolated, and the software baseline did not sustain real time. Harness `passed` booleans indicate successful API execution only and must not be read as picture correctness. No CPU reduction, energy, or memory advantage is claimed.

The observed realtime native progress establishes potential, not viability. The successful earlier HEVC WebCodecs preference test also established frame delivery, not pixel fidelity.

## Limits and next step

Firefox here is Playwright's bundled 146.0.1 build, not a verification of the user's installed release. Test the prepared MP4 on the user's actual Firefox build and isolate the Main10 decoder/output path before another paired performance test. Once picture correctness passes, compare the original Software route and candidate sequentially on the same subtitle-active interval, charging preparation separately. Production still needs bounded browser extraction/remux, subtitle/font lifecycle, clock/seek fidelity and broader validation. Source media and production code were unchanged.
