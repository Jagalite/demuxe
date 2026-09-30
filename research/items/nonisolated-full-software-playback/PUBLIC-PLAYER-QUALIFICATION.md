<!-- SPDX-License-Identifier: CC-BY-4.0 -->
# Public private Software qualification progress

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

## Remaining qualification

Firefox, continuous PCM fidelity/cadence, broader codecs and filters, subtitles
and fonts, Hybrid, long/large inputs, multichannel and exact release archive
consumers remain pending. Public admission still enforces the bounded codec,
stereo, source-byte, duration and feature profile. The full dependency build and
unit-tested retained decoder adapters do not establish those missing outcomes.

Full CPU comparisons are excluded from this completion scope. Source and static
build checks are recorded separately from browser playback and release proof.
