# Standalone WavPack component

`WavPackReader` reads finite, local, integer-lossless `.wv` files. `repairWavPackAudio` prepares audio-only fMP4; `repairWavPackAudioFragments` yields owned initialization/fragment bytes without retaining the complete output. Decoder and encoder factories are supplied explicitly, with the existing archive decoder and FLAC or Opus encoder.

## Supported envelope

- WavPack versions `0x403` and `0x410`, complete independent channel block groups, an established positive original sample count, continuous block indexes, and an exact final extent.
- Integer 16/24/32-bit input: 44.1 kHz mono/stereo; 48/96 kHz mono/stereo/5.1/7.1, with explicit native channel masks.
- FLAC24 output preserves every original integer sample and the original sample rate. Input requiring more than 24 significant bits is rejected; it is never silently reduced.
- Explicit Opus output accepts stereo 48 kHz. It is lossy; output pre-skip and terminal duration remain explicit.
- Bounded trailing APEv2 tags are allowed. Unknown totals, changing versions/rates/precision, missing channel groups, discontinuous clocks, hybrid/correction, floating-point, DSD, and unqualified layouts are rejected.

Source blocks and decoded PCM must agree on start sample, duration, sample rate, channel layout, and the complete original extent. No resampling, implicit timestamps, or silence insertion is performed.

## API

```ts
const output = await repairWavPackAudio(file, {
  codec: 'wavpack', container: 'wavpack',
  channels: 2, sampleRate: 48000, output: 'flac',
  decoder: (codec, signal, configuration) =>
    new PacketAudioDecoder(archiveModule, codec, signal, configuration),
  encoder: (channels, signal, rate) =>
    new PacketFlacEncoder(flacModule, channels, signal, 0, rate),
}, signal);
```

The reader supplies empty extradata because native WavPack block headers contain the decoder configuration. Streaming callers control MSE appends, eviction, and seeking; this converter prepares the complete original presentation from sample zero.

## Bounds and lifecycle

The Blob convenience API accepts at most 64 MiB input and 96 MiB prepared output. The reader reads at most 1 MiB per operation and indexes at most 100,000 packet groups. The converter queues at most 16 MiB/4,096 output fragments and validates the encoder block size before allocating PCM. Completion, failure, abort, and early iterator return dispose both codec handles; an encoder factory failure disposes the decoder.

## Qualification

Run `node --no-maglev --test tests/provider-wavpack-repair.mjs` after generating the archive fixtures and building the archive, FLAC, and Opus native modules. The test compiles an isolated source closure, verifies both module JavaScript and Wasm hashes against native build records, and compares complete output with independent original integer PCM. It covers canonical long audio, the maintained rate/channel/precision matrix, required 32-bit/float rejections, explicit Opus quality, repeated preparation, malformed clocks/layouts, factory failure, aborts, and early iterator cleanup.

Native evidence is written to `results/media-components/codec-expansion/wavpack-compositions.json`. Browser, package acquisition, public recipes, and automatic Player routing need separate qualification; this standalone converter does not imply those routes are enabled.
