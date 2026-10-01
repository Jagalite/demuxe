# Standalone TTA conversion

`repairTtaAudio` prepares audio-only fMP4 from a finite, unencrypted TTA1 file. `repairTtaAudioFragments` yields owned initialization/fragment bytes. Both use the original-clock integer converter in `archive-repair.ts` with the standalone `TtaReader`, archive-more decoder, and FLAC or Opus encoder.

The maintained envelope is signed 16/24-bit TTA1 at 44.1/48 kHz with mono, stereo, or six channels. No 96 kHz, eight-channel, encrypted, floating-point, or 32-bit modes are admitted. A source frame exceeding 1 MiB is rejected before codec factories; some legitimate six-channel 24-bit encodings exceed this bounded profile. There is no resampling or channel remapping.

FLAC24 preserves the complete original integer PCM, sample rate, channel positions, and exact header-declared sample count. Explicit Opus output is lossy and accepts only stereo 48 kHz, with output pre-skip and terminal duration validated.

```ts
const output = await repairTtaAudio(file, {
  codec: 'tta', container: 'tta',
  channels: 2, sampleRate: 48000, output: 'flac',
  decoder: (codec, signal, configuration) =>
    new PacketAudioDecoder(archiveMoreModule, codec, signal, configuration),
  encoder: (channels, signal, rate) =>
    new PacketFlacEncoder(flacModule, channels, signal, 0, rate),
}, signal);
```

The decoder receives the validated 22-byte TTA1 header. Reader frame indexes/durations must agree with every emitted native frame and with the complete original extent. Header/table CRCs, malformed lengths, unknown modes, and inconsistent metadata reject. Native packet CRC validation belongs to the packet decoder.

The Blob convenience API permits at most 64 MiB input and 96 MiB prepared output. The reader limits reads/frames to 1 MiB and indexes to 100,000 entries. Output queues are limited to 16 MiB/4,096 fragments. Completion, failures, early iterator return, and abort dispose both codec handles; encoder factory and decoder disposal failures preserve cleanup.

Run `node --no-maglev --test tests/provider-tta-repair.mjs`. Qualification covers 13 native FLAC conversions with complete independently decoded integer PCM, two explicit Opus outputs, two unqualified rate/channel controls, two real oversized-frame controls, and ownership/clock/reset/abort controls. The real canonical file is 60.48 seconds. JavaScript/Wasm build identities, sources, media, and reference hashes bind `results/media-components/codec-expansion/tta-compositions.json`.

Installed packages, browser playback, public recipes, and automatic Player routing require separate qualification. Native conversion does not grant those routes.
