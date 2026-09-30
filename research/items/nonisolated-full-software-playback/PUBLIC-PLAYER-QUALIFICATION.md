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
requests or timers. These feature results are direct Backend evidence; expanded
public feature admission remains pending.

## Remaining qualification

Current public Chromium coverage is bounded: the original six Software fixtures
plus five additional Software/Hybrid codec fixtures, stereo, finite sources up
to 64 MiB and 60 seconds, without public filters or subtitle/font features.
Firefox, other existing audio/format rows, public features, HD continuous output,
long/large inputs, multichannel, faults, isolated/native regressions and exact
release archive consumers remain pending. Full non-isolated support and
production merge readiness are not established.

The clean release recipe now builds and binds full cooperative playback assets;
its exact assembled archive still needs consumer qualification. Full CPU
comparisons are excluded from this completion scope.
