<!-- SPDX-License-Identifier: CC-BY-4.0 -->
# Public cooperative playback qualification progress

This is a bounded correctness result, not full format support or production
release qualification. Work continues under the production completion contract
in `docs/NONISOLATED-PLAYBACK-COMPLETION.md`.

## Accepted public construction

The T3 collaborative Chromium browser completed six fixtures through each of
JSPI and forced Asyncify in `evidence/20260930T132540Z-t3-public-bitmap-01`.
Each case used the exported public Player, source inspection, explicit Software
selection, engine preparation, three independently referenced seek pictures,
play/pause/progress, rate/volume/gain/delay, source replacement, unsupported-filter
rejection/recovery, AudioContext suspension/resumption, and destruction with
closed audio context and 24 recovered scheduler slots.

The profiles were MPEG-2/AC-3, interlaced MPEG-2/AC-3, MPEG-2/MP2,
MPEG-4 Part 2/MP3, ProRes/PCM16 and MPEG-2 without audio. The installed engines
were `playback-install-02`, with private memory and a 32768-frame stereo ring.
No COOP/COEP headers were served. Results retain browser identity, asset hashes,
fixture/reference identities and copies of served JavaScript.

## Presentation failure and repair

The earlier `20260930T131030Z-t3-public-preview-02` failed the first Asyncify
seek: current time reached 0.5053 seconds while public canvas pixels matched the
initial frame. The diagnostic run `20260930T131658Z-t3-asyncify-seek-diagnostic-01`
passed two repetitions and then reproduced a canvas mismatch. The worker
snapshot matched the independent 0.5-second reference while the public canvas
readback differed; the render count remained four across those observations.

The worker now sends an owned ImageBitmap and limits presentation to one pending
bitmap. The main canvas draws and closes that bitmap before recording presentation
readiness. Seek completion requires the actual presented count to catch up with
the worker render count. Replacement discards old-generation bitmaps and closes
their resources. The accepted 12-case run exercises this repaired presentation.
Five additional repetitions of the previously failing MPEG-2/AC-3 Asyncify
case also passed in the same source-bound run (17 cases total). Failed evidence
remains intact.

## Full codec profile and Hybrid integration

The maintained dependency profile now includes the full LGPL FFmpeg decoder and
filter build plus synchronous dav1d, portable zimg and XML support. JSPI and
Asyncify static audits passed. Build inputs, configuration, adaptation sources,
link commands and installed manifests are retained in
`evidence/20260930T1513-parity-build-materials-01`. This does not establish broad
format or release qualification by itself.

Twenty direct Backend codec cases passed in
`evidence/20260930T142816Z-t3-parity-backends-01`: Software and Hybrid, each on
JSPI and Asyncify, for H.264/AC-3, HEVC/AC-3, VP8/Vorbis, VP9/Opus and AV1/FLAC.
Ten public Software cases then passed in
`evidence/20260930T-public-expanded-codecs-01`. Public Hybrid initially failed
because its diagnostics did not expose the decoder and position contract used
by Player startup verification. After repairing that contract, all ten public
Hybrid cases passed in `evidence/20260930T-public-hybrid-contract-02`.

Public admission now checks installed decoder inventory. In particular, the
presence of FFmpeg's AV1 wrapper does not prove a usable software AV1 decoder;
Software AV1 requires the installed dav1d decoder. Older bounded assets retain
their original admission limits. Hybrid additionally requires the retained
browser decoder asset contract and complete inspected browser configuration.

Four direct Backend feature/continuous cases passed in
`evidence/20260930T1508-features-pcm-02`. ASS vector cues obey visibility, delay,
clear and source replacement; snapshots work; Software hflip matches mirrored
reference pixels. Six-second continuous playback presented 179–180 frames,
reached EOF, replayed and matched 577,024 consumed PCM samples against FFmpeg.
Normalized RMS error was below 0.00000008, with a one-frame alignment offset.
Recorded underruns were confined to the exhausted tail; no interior underruns
occurred. Hybrid destruction closed all retained frames and left no decoder
requests or timers. These initial feature results are direct Backend evidence. Later public
qualification is summarized below.

## Expanded public evidence

The full profile now has additional public evidence in Chromium:

- 24 compressed/additional audio codec cases.
- Eight long/large source cases (132 seconds and 84 MiB, with bounded reads).
- Four subtitle/filter/snapshot/continuous consumed-PCM cases.
- Twelve resampling and 5.1/7.1-to-stereo cases; eight audio-only/mono cases.
- Four custom-font/SRT/VTT styling cases and 24 embedded SRT, mov_text, ASS,
  PGS, VobSub and subtitle-track switching cases.
- Four repaired dual-audio cases, matching both tracks' consumed PCM exactly.
- Eight full-size 720p/1080p 30 fps output cases, presenting 179–180 pictures
  with exact consumed PCM, no interior underruns and under 8 ms native A/V offset.
- Four 4K HEVC Main10 5 fps cases, with 29–30 pictures and about 10 ms A/V offset.
  This is a 5 fps correctness profile, not higher-frame-rate 4K qualification.

Firefox Asyncify passed the six original Software fixtures, five expanded
Software codecs and four supported Hybrid codecs. Forced HEVC Hybrid rejected
an unsupported browser configuration. Two public feature/PCM cases also passed.

These results use the full profile. Older bounded assets keep their original
limits. Multi-track sources require the installed seek-repair feature; 4K
admission requires the installed 512 MiB heap profile. The failed pre-fix seek,
128 MiB 4K, and HDR cadence runs remain preserved.

## Remaining qualification

HDR continuous playback remains a blocker. A numeric-checked gamma candidate is
building; public tone mapping is still blocked. Current fault/lifetime tests,
decode-policy controls, automatic fallback, Native/isolated regressions, and
exact archive/source companion consumers remain in progress. Full non-isolated
production merge readiness is not established. See the [completion contract](../../../docs/NONISOLATED-PLAYBACK-COMPLETION.md)
for the authoritative remaining work and evidence references.

The clean release recipe builds and binds full cooperative playback assets;
its exact assembled archive still needs consumer qualification. Full CPU
comparisons are excluded from this completion scope.
