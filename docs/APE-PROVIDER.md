# Standalone APE conversion

`repairApeAudio` prepares audio-only FLAC fMP4 from a finite local APE file. `repairApeAudioFragments` yields owned initialization/fragment bytes. The converter uses `ApeReader`, the archive packet decoder, and the FLAC encoder through explicit factories.

The maintained conversion envelope is narrower than the reader: APE 3990, compression 2000, signed 16-bit stereo 44.1 kHz. This matches the independently qualified real canonical file. Other versions, compression modes, precision, sample rates, and channel counts are rejected before codec factories. Output is FLAC only; no implicit resampling or Opus conversion is performed.

```ts
const output = await repairApeAudio(file, {
  codec: 'ape', container: 'ape',
  channels: 2, sampleRate: 44100, output: 'flac',
  decoder: (codec, signal, configuration) =>
    new PacketAudioDecoder(archiveModule, codec, signal, configuration),
  encoder: (channels, signal, rate) =>
    new PacketFlacEncoder(flacModule, channels, signal, 0, rate),
}, signal);
```

The decoder receives the reader's six-byte version/compression/format header. Every decoded frame must preserve the original sample clock, block extent, integer PCM, channel layout, rate, and complete original sample count. APE and WavPack share the bounded original-clock integer conversion implementation in `archive-repair.ts`.

The Blob convenience API is limited to 64 MiB input and 96 MiB prepared output. The reader limits packet reads to 1 MiB and indexes to 100,000 frames; the converter queues at most 16 MiB/4,096 fragments. Completion, failure, cancellation, and early iterator return dispose both codec handles. A decoder disposal exception still triggers encoder disposal.

Run `node --no-maglev --test tests/provider-ape-repair.mjs`. Native qualification compares the complete 60.48-second original integer PCM and 2667168 stereo sample frames byte for byte, validates the FLAC stream rate/channels/duration, and exercises repeated preparation, wrong source profiles, malformed clocks/layouts, factory failure, disposal failure, and aborts. Module JavaScript/Wasm, source files, input media, and reference hashes bind the compact evidence in `results/media-components/codec-expansion/ape-compositions.json`.

Public provider recipes, installed packages, browser playback, and automatic Player routing require separate qualification. This native converter does not establish those routes.
