# Installed Safari qualification

Safari 26.5.2 (21624.2.5.11.8), controlled with safaridriver after the user enabled
remote automation. These are installed-Safari results, separate from Playwright WebKit.
Reproduce with `node tests/browser-media-capability-safari.mjs`.

Four deterministic 320x180/24fps, stereo 48 kHz fixtures passed open, play, seek to
1 second, and measured 1.25x playback-rate checks. Measured rate uses a 2-second
window after a 1-second warm-up, tolerance +/-0.2x; this is a bounded lifecycle
check, not long-run synchronization or bit-exact output qualification.

| Fixture | Direct static result | Selected route | Independent audio | Measured rate |
|---|---|---|---|---|
| aac.mp4 | supported | native-direct | observed | 1.253x |
| aac.mkv | unknown | native-remux | unobservable | 1.254x |
| pcm24.mkv | unknown | hybrid | observed | 1.291x |
| ac3.mkv | unknown | native-video-mpv-audio | observed | 1.313x |

AAC/MKV MSE audio could not be captured through the media-element analyzer. Runtime
track-presence evidence is retained as presence, not decoded-sample proof. This route
is not independently audio-output-qualified by this run. Other rows exposed nonzero
PCM through the analyzer or worklet; none establishes end-to-end lossless fidelity.

Fixture hashes, static answers, runtime evidence and measured rates are in
SAFARI-SUMMARY.json; the complete diagnostic capture remains local at its recorded
path and SHA-256. Earlier runs remain available, including shorter rate checks.
