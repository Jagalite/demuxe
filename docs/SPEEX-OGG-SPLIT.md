# Finite Ogg Speex packet qualification

The optional speech decoder retains its existing headerless FLV 16 kHz mono
profile. The new `ogg-mono-cbr` offer is separate: it accepts an actual 80-byte
Speex identification header for 8 kHz narrowband or 32 kHz ultrawideband mono,
bitstream version 4, one frame per packet, CBR, and no extra headers. The header
must declare version 1, its exact native rate/mode/frame geometry, bitrate -1,
and zero reserved fields. Other rates, stereo, VBR, multiple frames, and extended
headers remain unqualified.

## Fixtures and independent references

- Narrowband: the [official Xiph male speech PCM](https://www.speex.org/samples/)
  is encoded with pinned libspeex 1.2.1, quality 5, one frame per packet. This is
  generated coded media from real speech, rather than an original coded sample.
  Its 301 packets decode to 48,160 samples at 8 kHz.
- Ultrawideband: the original [VideoLAN developer sample](https://people.videolan.org/~tmatth/samples/uwb_male_speex.spx)
  has 334 packets and 213,760 complete decoded samples at 32 kHz.
- FFmpeg's original `talk109-q5.spx` declares a nonstandard 48 kHz rate. It is
  retained as an explicit reader rejection and does not qualify the 32 kHz offer.

`tests/speex-ogg-fixtures.py` checks original SHA256 identities, actual header
bytes, original packet/frame clocks, complete coded PCM extent, and independent
reference binary identities. It emits native, browser, standard audio, and
container descriptors. Media and reference binaries remain ignored artifacts.
The source encoder's libogg dependency is recorded as an observed installed
dependency; it is not claimed as a reconstructed production dependency.

`scripts/build-speex-ogg-reference.py` builds the pinned FFmpeg n9.0.2 native
decoder with Ogg demuxing. The scalar reference disables compiler FMA contraction
and vectorization as well as runtime SIMD. Runtime `-cpuflags 0` alone does not
prevent AArch64 compiler FMA contraction: the initial narrowband reference had
maximum error 1.05426e-4 despite SNR 82.845 dB. Explicit scalar compilation
resolves that difference without relaxing the existing speech gate: maximum
absolute error below 7e-5 and whole-stream SNR above 80 dB. Mandatory actual
silent output and all-original-packet-byte corruption controls remain enabled.

## Original Ogg clock and coded padding

| Fixture | First original packet PTS | Final granule | Original extent | Full coded PCM |
| --- | ---: | ---: | ---: | ---: |
| Narrowband 8 kHz | -40 | 48,000 | 48,040 | 48,160 |
| Ultrawideband 32 kHz | -349 | 212,948 | 213,297 | 213,760 |

The reader preserves the negative initial packet position and original granules.
It exposes `firstSample`, `sampleCount = finalGranule - firstSample`, original
signed packet `startSample`, and the header's complete coded frame duration
(160 or 640 samples). The last granule bounds presentation independently of the
last complete coded packet. These values are checked against native ffprobe;
they are not inferred through waveform alignment.

The synchronous packet decoder accepts the original signed Ogg clock only for
these validated 80-byte headers. Its lower bound is strictly greater than one
negative coded frame (-160 or -640 samples), and its upper bound preserves a safe
integer decoded end clock. Headerless FLV and AMR still reject negative packet
PTS. The original packet and frame reference JSON remains unchanged. Native
decoded duration remains **0**; the tests check actual frame sample counts
separately. Full coded padding remains in the packet reference. No presentation
trimming, timestamp shifting, or readdition is hidden in the reader, decoder,
or maintained qualification harness.

## Evidence and limits

The focused native proof covers two complete streams, exact predictor reset,
eight original-stream restart/discard seek checks, and 92 malformed configuration,
packet clock, corrupt/silent output, native bypass, and cancellation controls.
The reader proof covers both original packet byte streams and signed clocks,
ownership/repeat/early return, and 47 header/granule/comment/cancellation controls.
See [native evidence](../results/media-components/codec-expansion/speex-ogg-audio.json)
and [reader evidence](../results/media-components/codec-expansion/speex-ogg-reader.json).

Installed standard conformance and browser qualification require the subsequently
assembled package identities; focused native/reader evidence does not imply
those gates passed. Existing Ogg audio repair recipes reject Speex. Float
quantization, Ogg-to-FLAC conversion, FLV timestamp-gap conversion, Player routing,
and broad Speex mode coverage remain outside this offer. mpv stays atomic.
