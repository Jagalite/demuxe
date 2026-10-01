# Bounded WAV ADPCM reader

`AdpcmWaveReader` reads Microsoft ADPCM and IMA WAV ADPCM from local RIFF/WAVE blobs. This reader qualification does not enable a public playback or conversion route.

The tested envelope is mono/stereo at 8, 16, 22.05, 32, 44.1 and 48 kHz, coded four-bit ADPCM with decoded signed sixteen-bit PCM. Microsoft ADPCM requires the seven standard coefficient pairs; IMA requires complete four-byte channel groups. Each packet owns one complete original block. Predictor, delta, index and reserved header fields are validated before codec allocation.

The `fact` sample count determines presentation duration. Only the final complete block may contain padding. Packets expose `decodedDurationSamples`, `durationSamples` and `discardPaddingSamples`; a decoder returns the complete block, and a qualified converter must discard only the explicit final tail. The WAV average byte rate is retained as metadata and is not used to calculate the sample clock: actual FFmpeg-generated headers can differ from block geometry.

Limits are 64 MiB input, 65,536 bytes per block, 100,000 blocks and 4,096 chunks. Unknown chunks, additional timelines, partial blocks, nonstandard coefficient tables and an inconsistent declared extent are rejected. Descriptive LIST/INFO, JUNK and PAD chunks are admitted.

`tests/provider-adpcm-wave.mjs` checks two hash-pinned official samples plus 24 generated codec/rate/channel cases. Independent native FFmpeg decoding verifies complete stream PCM and single-block restart PCM; original compressed block bytes, final fact trimming, seek intervals, ownership, malformed inputs and cancellation are checked separately. Compact source-bound evidence is saved in `results/media-components/codec-expansion/adpcm-wave-reader.json`.

## Native packet slice and finite conversion

The `adpcm-wave` decoder build enables only `adpcm_ms` and `adpcm_ima_wav`. Append-only native ABI kinds 29 and 30 require the validated WAV extension, block alignment, coded four-bit width and original average bit rate. Both native and TypeScript adapters reject partial/grouped blocks and invalid block headers. Returned PCM is an owned, left-justified `Int32Array` with exact decoded signed sixteen-bit precision.

`repairAdpcmWaveAudio` and its fragment iterator provide a bounded audio-only FLAC conversion at **8/16/22.05/32/44.1/48 kHz, mono/stereo**. Low-rate output requires the separate `audio.encode.flac/low-rate-s24` capability. No resampling or Opus output is offered. The converter validates every complete decoded block, then discards only the explicitly declared final `fact` tail. Native frame duration can be absent (zero); output duration is obtained from validated block geometry, actual decoded samples and the independent fact extent. A nonzero conflicting native duration is rejected.

`tests/adpcm-wave-audio.mjs` proves all 26 packet cases against independent complete-block integer references, including recreation/reset and original-block restarts. `tests/provider-adpcm-repair.mjs` proves all 26 admitted complete conversions with byte-exact original PCM and exact MP4 duration, streaming equivalence, output seek intervals, malformed-input preallocation rejection and resource cancellation/failure/early-return controls. Compact reports are `adpcm-wave-audio.json` and `adpcm-wave-compositions.json` in the same evidence directory.

`tests/adpcm-wave-browser-fixtures.py` prepares ignored supplemental manifests. Packet references include full padded decoder output; composition references contain only the original fact presentation extent. These two references are deliberately separate. Native proof does not establish installed browser delivery qualification.
