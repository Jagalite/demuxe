<!-- SPDX-License-Identifier: CC-BY-4.0 -->
# Seven priority codec groups

Status: **local candidates, 2026-09-30**. The seven requested groups add eight
optional packages: AC3/EAC3 full-file JSPI and Asyncify variants, AAC decoding,
Opus/Vorbis decoding, FLAC/ALAC decoding, MP3 decoding, PCM decoding, and Opus
encoding. This brings the inventory to **19 optional packages plus four broad
providers**. mpv remains one atomic provider. Defaults and published packages do
not change through these local builds.

## Finite contracts

| Group | Contract and limits |
| --- | --- |
| AC3/EAC3 full-file | Decoder-specific FFmpeg preparation with copied AVC/HEVC video and FLAC output, using the existing streaming/seek ABI. Both JSPI and Asyncify builds passed the local stereo/5.1 AVC playback matrix below. |
| AAC | FFmpeg AAC-LC decoder; extradata is required. Other AAC profiles reject. |
| Opus/Vorbis input | Codec headers are retained. The decoder consumes Opus pre-skip and Vorbis initial overlap; the composition must not skip those samples twice. Opus Matroska CodecDelay must agree with OpusHead. |
| FLAC/ALAC input | Integer PCM is preserved by the packet adapter. The FLAC24 composition rejects integer samples that need more than 24 bits. |
| MP3 | FFmpeg `mp3float`; no claim that a second MP3 decoder implementation is independently packaged. |
| PCM | Little-endian signed 16/24/32-bit and float 32/64-bit input. FLAC output requires exact signed-24-bit representability. Float PCM outside `[-1, 1)` rejects; explicit Opus output permits quantization within that range. |
| Opus output | Explicitly lossy libopus 1.6.1, 48 kHz mono/stereo, 128/192 kbps respectively. The maintained audio/video composition currently admits stereo only. |

The new maintained compositions accept stereo 48 kHz Matroska, exactly one audio
and one AVC/HEVC video track, and video packets without reordering. Current
composition fixtures exercise AVC. The Blob convenience API limits input to
64 MiB and output to 96 MiB; the fragment iterator delegates buffering and seeking
to its consumer. Packet tests at other rates/layouts do not extend this admission.

**ALAC and float64 MOV fixtures test extracted packets**, not a new MOV container
provider or a MOV-to-MP4 composition. New container/rate/channel combinations and
real-world codec variants remain separate qualification work.

Opus output retains encoder pre-skip (312 samples for this build), negative
initial packet PTS and final packet duration. The MP4 writer shifts coded DTS to
nonnegative values, writes `dOps` and an edit list, and signals roll recovery.
Consumers must retain **at least 80 ms of decode preroll when seeking**, then trim
to the requested presentation time. Final coded padding must respect the declared
presentation end; a raw decoder can emit up to one extra coded packet of samples.
The native seek check explicitly decodes that preroll. Direct FFmpeg seeking
without preroll was not accepted as output-quality evidence.

## Current evidence

| Check | Result | Scope |
| --- | --- | --- |
| Decoder families | **34 checks passed** | Actual Wasm packet decoding against independent references and bounded rejection/reset checks; not 34 distinct codecs |
| Opus encoder | **8 cases passed** | Mono/stereo × short, exact-block and two partial endings; delay/duration, independent decode, flush and abort |
| FLAC regression | **4 cases passed** | 1/2/6/8 channels, byte-exact signed-24-bit roundtrip, partial final block and abort |
| Owner failures | **6 tests passed** | Acquisition/import/factory failures, abort/retry, readiness cleanup, preserving a newer container scope |
| Audio/video compositions | **20 checks passed** | Reference audio and unchanged decoded video; includes **3 expected precision rejections**, not 20 successful conversions |
| Installed browser assets + embedded | **64 checks passed** | 24 packet checks, 34 playback conversions, 6 required precision rejections; ten selective bundles in local Chromium 152 |
| AC3/EAC3 installed browser playback | **12 checks passed** | 10 positive cases and 2 unsupported-AAC controls across JSPI/Asyncify; pause, two seeks, reordered AVC and bounded reads |
| Release/publication | **Not qualified or published** | Local package/source audits do not establish release readiness |

Opus output measured approximately **43–44 dB SNR** against the source tones;
seeking with 80 ms preroll measured **26–29 dB SNR**. These are bounded signal
checks, not listening-test results, speed measurements or transparent-audio claims.
The dedicated encoder uses libopus rather than FFmpeg's experimental native Opus
encoder, whose local host-reference tone test did not meet the signal-quality gate.
The experimental FFmpeg build option remains for research, but the recorder and
package audit reject it for `audio-opus-encoder`; that package requires pinned libopus provenance.

[Compact evidence](../results/media-components/codec-expansion/summary.json) retains exact package, source and fixture hashes. Binary outputs and complete local logs stay under ignored `build/codec-expansion/`:
`decoder-results.json`, `decoder-fixtures/`, `opus-results/report.json`, `flac-results/report.json`,
`compositions/results.json`, native provenance, and audited package archives.
The browser matrix checks exact integer/float64 packet precision, required precision-loss rejection, exact integer FLAC conversion, nonzero audio, visible video, pause, seek and disposal in both delivery forms. Assets request only the selected decoder family and encoder; embedded runs make no external Wasm requests. Post-seek checks discard the earlier analyser window and require fresh audio plus clock progression; a deliberate post-seek silence control must fail. Opus fragment roll groups use fragment-local indices and have a dedicated parser regression test. These are short synthetic stereo 48 kHz composition fixtures, not long-duration or current Firefox qualification.

AC3/EAC3 large-file cases used 69,824,002-byte, 20-second sources: 786,432 bytes fetched and 131,072 bytes peak owned input. The initial 8-second padded fixture reached EOF during seek/preload and scanned its trailing padding; memory stayed bounded. That failed fetch-budget attempt is retained in the AC3 evidence. Test-only installed qualification identities do not update the production registry.

The historical 11 package identities keep their historical evidence; it is not
transferred to these new builds or to changed core/container bytes.

## Build and test

Use the locked FFmpeg and libopus archives from `sources.lock.json`, Emscripten
**4.0.14**, Node, Python and host FFmpeg. Set `DEMUXE_SDK` to that SDK directory.
Native outputs below are disposable build products; no command publishes them.

```sh
for profile in aac opus-vorbis lossless mp3 pcm flac; do
  python3 scripts/build-audio-providers.py \
    --sdk "$DEMUXE_SDK" --archive build/downloads/ffmpeg-adaptation.tar.gz \
    --profile "$profile" --out build/codec-expansion/decoder-families
done
python3 scripts/build-opus-provider.py \
  --sdk "$DEMUXE_SDK" --archive build/downloads/opus-audio.tar.gz \
  --out build/codec-expansion/opus-encoder
cp build/codec-expansion/opus-encoder/opus-encoder.json \
  build/codec-expansion/decoder-families/opus-encoder.json

for runtime in jspi asyncify; do
  python3 scripts/build-codec-preparation.py --profile ac3-eac3 \
    --suspension "$runtime" --sdk "$DEMUXE_SDK" --jobs 2 \
    --output "build/codec-expansion/ac3-eac3-$runtime"
done

npm run build
npm run build:components
python3 tests/decoder-family-fixtures.py
DECODER_BUILD_ROOT=build/codec-expansion/decoder-families node tests/decoder-families.mjs
node tests/provider-opus-encoder.mjs
node tests/provider-flac-regression.mjs
node --test tests/provider-owner-failures.mjs tests/codec-expansion-contracts.mjs
node tests/codec-expansion-compositions.mjs
```

Use separate normalization runs for the FFmpeg families and libopus:
`record-audio-provider-build.py` checks the actual SDK inventory and locked source;
`package-provider-source.py` retains matching source; `prepare-provider-package.py`
assembles and audits each candidate. The source-companion argument to the last
script is the generated `.tar.json` descriptor. Keep FFmpeg and libopus source
records separate. See [source terms](OPUS-PROVIDER-SOURCE.md) and the existing
[provider source/relink workflow](PROVIDER-RELINK.md).

After audited core, container and audio archives exist under
`build/codec-expansion/packages/`, prepare the installed delivery matrix:

```sh
node scripts/setup-codec-expansion-consumer.mjs
node tests/codec-expansion-browser.mjs
```

The second command starts the local test server; run its page in the supported
browser and retain the resulting report. A listening server alone is not a pass.
The AC3/EAC3 equivalent is `tests/ac3-fullfile-consumer.mjs` followed by
`tests/ac3-fullfile-browser.mjs`, with `AC3_BUILDS` and `AC3_CONSUMER` pointing to
the tested builds and installed consumer.

The libopus source is pinned as `opus-audio` and retains the exact upstream
[BSD notice](../LICENSES/BSD-3-Clause-opus.txt). Its original bridge/build recipe
are Apache-2.0; Emscripten runtime material retains MIT terms. Candidate packages
include audited provenance and matching source. Browser, release CI and publication
remain independent gates.
