# Explicit HE-AAC extensions

AAC-LC remains the default. The existing AAC Wasm module contains FFmpeg SBR and
parametric-stereo decoding; these additions change admission and configuration,
without creating a new native module or changing Player routing.

| Explicit `aacProfile` | Decoded profile | Proven envelope | Exact ISO ASC | Outputs |
| --- | --- | --- | --- | --- |
| `he` | FFmpeg 4 | 48 kHz stereo | `131056e598` | FLAC24, Opus |
| `he-v2` | FFmpeg 28 | 44.1 kHz stereo | `1388` | FLAC24 |

`AudioDecoderConfiguration.aacProfile`, `AudioRepairComponents.aacProfile`, and
`IsoBmffReader.open(file, signal, {aacProfile})` select the same explicit profile.
The decoder verifies the actual profile on every decoded frame, snapshots caller
configuration, and rejects unqualified rates, layouts, and ASC variants. A wrong
actual profile disposes the decoder owner. ISO composition requires one clear
AVC/HEVC video track and one AAC audio track with an original sample clock.

The proven ISO extensions use 2048 decoded samples per full packet. The reader
retains exact timestamps and permits a bounded final packet trim; no resampling,
alignment search, or guessed packet clock is used. The real qualification copies
omit edit lists using FFmpeg `-use_editlist 0`. Fractional identity edits, extension
priming delays, reordered video, explicit AOT5/AOT29 configurations, other SBR/PS
headers, mono/multichannel HE output, and xHE/USAC remain unqualified and rejected.
The 44.1 kHz HEv2 envelope cannot use the existing stereo48 Opus output policy.

The packet API also qualifies the real HEv2 ADTS fixture: one unprotected frame
with MPEG-2 ID, AAC-LC 22.05 kHz mono core, and decoded 44.1 kHz stereo PS. It does
not provide a standalone ADTS container API. Multi-block and CRC variants reject.

## Reproduce native evidence

```sh
node scripts/prepare-aac-extensions.mjs /tmp/demuxe-aac-extensions
AAC_EXTENSION_FIXTURES=/tmp/demuxe-aac-extensions \
  node --no-maglev --test tests/provider-aac-extensions.mjs
```

Preparation downloads two real FFmpeg FATE AAC fixtures with pinned SHA256,
attaches synthetic no-B-frame AVC through packet copy, and checks complete source
PCM identity or the exact bounded prefix. Temporary media stay outside Git. The
test validates exact build-record/JS/Wasm hashes, actual reader packet identity,
native decoded clock and PCM, complete conversion, AVC decoded frame identity,
output rate/channels/presentation endpoint, deliberate profile/ASC/ADTS failures,
mutable configuration/reset, abort, iterator return, and factory cleanup.

The full HE source contains 1,544,192 stereo samples; HEv2 contains 346,112. Small
browser inputs preserve respectively 70 and 64 complete real packets, around
three seconds. Their manifest retains required `aacProfile` and exact media and
reference hashes. FLAC output quantizes the original lossy decoder samples to
24-bit integer PCM; it does not claim to preserve arbitrary float precision.

Native results are recorded in
`results/media-components/codec-expansion/aac-extensions.json`. Installed package,
browser, portable CI, and public capability qualification are separate gates.

The real HE reference is nearly silent around the default 0.12-second playback
seek. Its browser fixture pins `playbackSeekSeconds: 0.6`, where the original
reference is audible. This preserves codec prediction and original samples.
Portable qualification retains this field, rejects nonfinite/out-of-duration
seeks, and requires the browser result to report the same value. Other fixtures
keep the default seek. Fresh audio peak above 0.001, progress of at least 0.04
seconds, pause and muted post-seek negative controls remain required.
