# Demuxe standalone route lab results

Date: 2026-09-17
Environment: system Chromium 144 headless + Python Playwright + native FFmpeg 7.1.5.
Demuxe production code was not modified.

## Executive findings

### R04 — Partial delivery within existing fMP4 fragments: PROMISING

Using the same 90,419-byte first H.264 video fragment and unchanged timestamps:

- Whole-fragment append: first buffered range only after 90,419 bytes.
- 16 KiB delivery: buffered output appeared after 16,384 bytes.
- 4 KiB delivery: buffered output appeared after 12,288 bytes.
- 1 KiB delivery: buffered output appeared after 9,216 bytes.

Final buffered range was identical (about 0.066666–1.066666 s).

Interpretation: Chromium can expose complete samples before the complete mux fragment has arrived. Demuxe can test smaller *transport chunks* without changing fragment/GOP timing. The real integration question is whether its worker/transport currently withholds already-emitted mux bytes.

Raw: results/r04-partial.json
Harness: harness/r04_partial.py

### R09 — Pass already-fragmented MP4 through unchanged: PROMISING / NARROW

A fragmented H.264/AAC MP4 was appended to MSE as its existing init segment and unchanged moof+mdat units. Playback began after the first fragment, and the appended playable prefix was byte-for-byte identical to the source prefix. The only omitted source bytes were the final 528-byte `mfra` index, not media payload.

This validates a narrow pass-through candidate for already-compatible fragmented media. It does not justify writing a second general MP4 parser.

Raw: results/r09-passthrough.json
Harness: harness/r09_passthrough.py

### R15 — Transactional split-buffer audio switching: STRONG PROMISE

One MediaSource, one video SourceBuffer and one audio SourceBuffer were retained. The audio SourceBuffer was cleared, `changeType()` was used, and replacement audio was appended. All six directions succeeded:

- AAC → FLAC
- FLAC → AAC
- AAC → Opus
- Opus → AAC
- FLAC → Opus
- Opus → FLAC

The same video buffer remained 0.066666–12.066666 s throughout. Web Audio analysis confirmed actual dominant-frequency changes approximately 441 Hz (AAC), 657 Hz (FLAC), and 883 Hz (Opus). No new video element or MediaSource was required.

A separate attempt to remove the audio SourceBuffer and add a replacement hit Chromium's SourceBuffer-count limit. `changeType()` was the successful mechanism.

This is a strong candidate for alternate-audio selection, original↔adapted-audio transitions, and avoiding video rebuilds.

Raw: results/r15-split-switch.json
Harness: harness/r15_split_switch.py

### R17 — Unequal track lifetimes: PROMISING, WITH AN IMPORTANT API BOUNDARY

With 12 s video + 4 s AAC audio:

- Leaving both SourceBuffers active stalled the clock at about 3.98 s.
- Removing the exhausted audio SourceBuffer expanded the media-element buffered range to the full video range and playback advanced past 5 s.

With 12 s video + 16 s audio, Chromium's clock advanced beyond the video buffered end even without removing the video SourceBuffer. Removing video exposed the full 16 s audio range explicitly.

A reversible version was also demonstrated with Chromium's `AudioVideoTracks` feature enabled: disabling the audio track reduced `activeSourceBuffers` from 2 to 1 and exposed the full video range; re-enabling it restored the audio-limited range and a backward seek again produced the expected AAC tone.

Important: `SourceBuffer.audioTracks` was not exposed in this Chromium without `--enable-blink-features=AudioVideoTracks`. Therefore the reversible mechanism is experimental here. The production-safe default mechanism (removeSourceBuffer) is forward-only and would require a presentation rebuild to restore that track for a backward seek.

Raw: results/r17-tails.json, results/r17-track-toggle.json, results/r17-toggle-restore.json
Harness: harness/r17_tails.py, harness/r17_track_toggle.py, harness/r17_toggle_restore.py

### R10 — Float-preserving destination screen: NEGATIVE FOR MSE, POSITIVE FOR DIRECT AUDIO

Float32 WAV played directly in Chromium (4 s duration, playback advanced). Float32 CAF failed to demux. MSE rejected tested raw/WAV/CAF/PCM MIME candidates.

Conclusion: direct float audio is real, but it does not currently provide the single browser-owned MSE A/V clock Demuxe wants. Do not build a float-to-MSE adapter for these MIME paths. Revisit only if another unified browser-owned sink is demonstrated.

Raw: results/r10-float-pcm.json
Harness: harness/r10_float_pcm.py

## Environment-limited/frontier probes

### R05 — Worker-owned MSE: SURFACE PRESENT, ATTACHMENT BLOCKED BY THIS SANDBOX

`MediaSource.canConstructInDedicatedWorker` is true. A worker successfully created a MediaSource and transferred a MediaSourceHandle. Attaching that handle from this sandbox's opaque `about:blank` page was rejected by Chromium's media safety check. Local HTTP/HTTPS/file navigation is blocked by administrator policy, so a normal same-origin page could not be established here.

This is an environment block, not a route failure. Test in the local agent's normal origin.

Raw: results/r05-worker-mse-debug.json

### R07 — HEVC/AAC TS → browser MSE: BLOCKED ON THIS LINUX CHROMIUM

This Chromium reports HEVC MP4 MSE unsupported. The user's Apple/Chrome environment should test it instead. Keep this with the local agent.

### R12 — Browser AudioEncoder: UNAVAILABLE IN THIS PAGE CONTEXT

`AudioEncoder` is not exposed in the sandbox page context. Because secure-origin navigation is blocked here, this is not a browser-wide support conclusion. Local agent should probe it on a normal secure origin.

### R22 — Document Picture-in-Picture: UNAVAILABLE IN THIS PAGE CONTEXT

`documentPictureInPicture` is undefined here. Hand off to a normal desktop Chrome secure-origin test.

### R25 — MediaStreamTrackGenerator presenter: INCONCLUSIVE / UNSTABLE HERE

The API is exposed, but the standalone Playwright probe stalled/crashed its transport while writing generated video frames. No Demuxe conclusion should be drawn. Re-run in a normal browser origin/process before investing further.

### R30 — MSE-for-WebCodecs: FRONTIER ONLY

`SourceBuffer.appendEncodedChunks` is absent by default and appears when Chromium is launched with `--enable-blink-features=MediaSourceExtensionsForWebCodecs`. Chromium source defines a SourceBufferConfig carrying AudioDecoderConfig or VideoDecoderConfig. This is a viable research surface but is experimental and should not influence production routing yet.

Raw: results/r30-api-flag.json

## Priority recommendation

1. R15 split-buffer `changeType()` audio transitions.
2. R04 progressive delivery inside unchanged fragments.
3. R17 explicit track-lifetime handling; production path first, reversible AudioVideoTracks variant only if target Chrome exposes it.
4. R09 narrow fMP4 pass-through.
5. Local-agent qualification of R05 on a real origin.
6. Keep R30 frontier-only.
7. Drop/deprioritize R10 for MSE unless a new unified sink appears.

