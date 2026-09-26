<!-- SPDX-License-Identifier: CC-BY-4.0 -->
# Audio transcoding

Auto keeps browser-playable audio unchanged. When direct playback and packet-copy
preparation are unsuitable, it tries FLAC24 selected-audio preparation before
mpv/AudioWorklet. Video is copied and decoded by the browser; FFmpeg/Wasm decodes
and encodes only the selected audio. Browser decoding of FLAC completes the audio
path. This avoids the mpv PCM bridge and AudioWorklet output graph.

```js
const player = new Player(container, {audioPlayback: 'worklet'});
```

The default is `audioPlayback: 'auto'`. `worklet` keeps the earlier fallback for
audio needing software decoding; playable AAC and other direct/copy audio stay
native. The component has the same `.audioPlayback` property, set before mounting.
Pinned Hybrid/Software modes keep their existing audio output.

FLAC24 is exact for decoded 16/24-bit integer PCM. Float and higher precision
integer PCM is rounded to 24 bits. It adds no perceptual codec generation, but
must not be described as universally lossless. Use `worklet` to avoid this extra
precision conversion, or the existing narrower `automaticAudioAdaptation:
'lossless'` policy. Already-lossy sources cannot regain discarded information.
The transcoder does not resample or remix channels; browser output can still
remix for the device. Atmos/DTS:X object metadata and physical surround output
are not qualified by these decoded-PCM checks.

Admission requires an inspected finite random-access Matroska/WebM or MP4 file,
H.264/HEVC/VP9/AV1 packet-copy video, a selected supported audio decoder, 1–8
channels and 8–192 kHz. These are eligibility bounds, not a claim that every
combination has been tested. Decoder output must establish the speaker layout;
unknown surround layouts fail rather than being guessed. Noncanonical FLAC
speaker maps (for example 3.1) retain AudioWorklet, because FLAC channel count
alone would otherwise relabel the speakers. Source regressions,
decoded sample discontinuities, sample-rate or speaker-layout changes, out-of-range PCM and resource
budget violations reject preparation. The browser must accept the FLAC/MP4 MIME
and produce real output. Incompatible media falls back to the existing eligible
mpv routes. Source permissions, identity changes and network failures retain
normal error behavior.

`native-transcode` owns browser video/audio; `native-transcode-mpv` additionally
uses the existing embedded subtitle service. External caption composition,
unequal selected-track tails over one second, explicit PCM speaker layouts,
non-unity gain, filters and manifest streaming retain their existing alternatives.
Selected audio changes repeat admission and preserve public stream identity.
Seeks into an admitted short video-only tail retain real audio preroll for FLAC
initialization while preserving the requested presentation time; no silence is
inserted and the source timeline is unchanged.
When browser support is inconclusive for a multi-audio file, Direct is excluded:
a browser can otherwise skip an unsupported default track and silently play a
different track. Controlled preparation selects the requested stream.

Build the preparation engine with the maintained pinned-source builder:

```sh
python3 scripts/build-audio-adaptation.py \
  --output build/audio-preparation-new --sdk build/emsdk-4.0.14 \
  --archive build/downloads/ffmpeg-adaptation.tar.gz \
  --transcode --opus --flac-level 0
```

The output's `latest.json` names the engine directory. Install its `remux.mjs`,
`remux.wasm` and manifest under `web/engine-adaptation/` for local serving. Package
with `scripts/package-beta.py --adaptation-build <engine-directory>` to include
verified assets and their source companion. The FLAC24 build preserves the old
strict FLAC and explicit Opus profiles. No video decoders or encoders are enabled.
Missing preparation assets skip transcoding; an older engine that rejects the
new profile falls back. Use matching runtime assets and cross-origin isolation.

The earlier matched CPU pilot is in
[the performance report](../results/audio-transcode-formats/PERFORMANCE.md).
Its figures describe that frozen prototype campaign; the README comparison
cells are not updated by this implementation change.

[Current correctness and integration evidence](../results/audio-transcode-formats/PRODUCTION.md)
records the format matrix, sample comparisons, fallback controls and build hashes.
