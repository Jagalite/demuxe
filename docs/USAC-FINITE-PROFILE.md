# Finite USAC AAC profile

The existing AAC Wasm module decodes the real FFmpeg FATE sample
`aac/usac/Fd_1_c1_0x03.mp4`. Explicit `aacProfile: 'usac'` qualifies its exact
seven-byte ASC `f946232110c000`, 48 kHz mono layout, actual FFmpeg profile 41,
and FLAC24 output. Default AAC-LC and the existing HE profiles remain unchanged.

This ASC uses a 1024-sample core without SBR, one single-channel element with
time-warping and noise filling disabled, and a fill extension. The admission
guard accepts only these exact bytes. Different element layouts, SBR variants,
time-warping, DRC or other extension configurations reject before decoder
acquisition. This is a finite real-sample envelope, not all xHE-AAC support.
The original source's `prol` recovery groups remain unqualified; the maintained
AV composition fixtures use FFmpeg's bounded `roll` group. No seeking contract
for USAC preroll is claimed.

## Presentation samples

Native decoding produces 940 × 1024 = 962,560 samples. The file declares 2,220
initial priming samples and a final 684-sample presentation packet. Composition
skips the initial 2,220 once and clips the final 340, yielding **960,000 samples**
at zero presentation start. Raw host FFmpeg decoding produces 960,340 samples;
that raw extent is not the movie's declared presentation endpoint.

The bounded browser fixture has 143 packets, the same initial priming, and 20
final samples to clip. Its declared endpoint is 144,192 samples (3.004 seconds).
Reference audio comes from the original source's independently decoded PCM,
clipped to this explicit metadata endpoint, without alignment search or resampling.

```sh
node scripts/prepare-usac-fixtures.mjs /tmp/demuxe-usac-fixtures
USAC_FIXTURES=/tmp/demuxe-usac-fixtures \
  node --no-maglev --test tests/provider-usac.mjs
USAC_FIXTURES=/tmp/demuxe-usac-fixtures \
  node --no-maglev --test tests/provider-usac-owner.mjs
```

Preparation pins the real original SHA256 and checks complete source/prefix PCM
identity. Tests bind exact native artifacts and wrapper/reader sources; compare
actual packets, native clock, decoded video and audio; assert the independently
declared endpoint; and exercise malformed ASC, profile/rate/layout/priming
controls, factory failure, iterator return, abort and maintained-owner overlap.
Evidence lives in `results/media-components/codec-expansion/usac.json` and
`usac-owners.json`. Native conversion, installed browser evidence, source/package
audits, and publication remain separate qualification gates.
