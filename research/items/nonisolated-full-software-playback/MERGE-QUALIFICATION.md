<!-- SPDX-License-Identifier: CC-BY-4.0 -->
# Qualification for the private Software change

This worktree contains an experimental private Software Backend, cooperative
playback worker, RGB host, bounded stereo PCM transport, separate playback build
profile and provenance-bound installer. The public Player still rejects this
Software route. Full CPU benchmarks are excluded from this qualification run.

## Acceptance boundary

The declared continuous workload is the six ordinary Software-dependent README
fixtures: MPEG-2/AC-3, interlaced MPEG-2/AC-3, MPEG-2/MP2, MPEG-4 Part 2/MP3,
ProRes/PCM and MPEG-2 video-only. They are finite files, 320x180 at 30 fps,
approximately 36 seconds, with optional 48 kHz stereo audio. Chrome JSPI, forced
Chrome Asyncify and actual Firefox Asyncify are separate cases.

Accepted continuous cases require independent RGB seek pictures and full consumed
PCM comparison, at least 90% frame coverage, no steady gap above 250 ms, native
A/V timing within 100 ms, elapsed duration within one second, zero in-source or
unclassified audio underruns, and complete teardown. PCM RMSE must be below
0.002, missing audio at most 100 ms and unmatched tail at most 9,600 samples.
Zero-filled underruns stay outside sample capture and are checked separately.
Native `avsync` is an internal diagnostic, not a physical A/V measurement.

Additional gates cover paused seeks and EOF/replay, long GOPs, bounded 720p/1080p
output, source replacement, settings and track restoration, AudioContext
suspension/resumption, authorization renewal, stale authorization, permission
failures, pending-read cancellation, malformed sources, asset mismatch, repeated
native teardown, source/type checks, and packaging/provenance rejection checks.
HD output checks do not qualify continuous HD playback.

## Current result

The bounded experimental gates passed. **Public Software admission and exact
release consumers remain unqualified.** No commit, push or merge was made.

| Gate | Result and evidence |
| --- | --- |
| Six fixtures continuously, Chrome JSPI/Asyncify and Firefox Asyncify | [18 accepted cases](evidence/20260930T030401Z-accepted-continuous-cases/result.json); exact current host/PCM/worklet/engine hashes matched. All 15 audio cases had zero in-source, unclassified or terminal underruns. |
| Installed loader faults and native lifetime | [23 scenarios per runtime](evidence/20260930T025619Z-lifecycle-no-pcm-current/result.json), including ten create/seek/destroy cycles, HTTP identity/auth/permission, read timeout/cancel and asset corruption/missing/ABI faults. |
| Maintained Backend controls and source replacement | [Current three-browser/runtime suite](evidence/20260930T030002Z-backend-final-retry-suite/result.json); positive controls and malformed-source/pending-HTTP teardown passed on all three combinations. |
| Isolated Software regression baseline | [Six fixture cases](evidence/20260930T003007Z-isolated-baseline/result.json), with seek-picture oracle and cleanup. This baseline did not measure continuous PCM or CPU. |
| Long GOP | [Both runtimes passed](evidence/20260930T011441Z-long-gop-01-rewind/result.json) at 0.5, 7.5 and 9.5 seconds on a six-second GOP fixture. |
| Larger output | [720p](evidence/20260930T020533Z-720p-stable-seek/result.json) and [final 1080p](evidence/20260930T023156Z-1080p-current-output/result.json) tagged BT.709 pictures/output/lifecycle passed both runtimes; continuous HD remains unqualified. |
| Source/type/packaging checks | [Final configured gate](evidence/20260930T030229Z-configured-final-source-validation/result.json): 80 Node tests, 21 focused review checks, Python asset/install checks, TypeScript, core dependency boundary, current new-source license map/SPDX and whitespace checks passed. |

The tests corrected PCM startup ordering, oversized PCM memory views,
frame/restart readiness races, stale authorization ownership, bounded-file
long-GOP seek behavior and diagnostic capture overhead. Malformed input also
exposed a first-load race: source replacement canceled an in-flight context pause
command, which was incorrectly fatal. Context state now survives that expected
cancellation and is restored on the new core. Native decoder errors close the
Backend promptly.

Every failed invocation remains recorded. The Chrome continuous suite still
has a failed MP2 browser-harness stall; its cause is not established. A separate
[phase-logged MP2 retry](evidence/20260930T025453Z-mp2-phased-retry/result.json)
passed both runtimes. This supports the bounded accepted cases, not a claim that
all historical stalls were eliminated or platform endurance is qualified.
Startup-phase logging and an outer evaluation deadline now bound this class of
harness failure. Media thresholds were not relaxed.

The 18 continuous cases use the prototype worker with the maintained host and
transport. The maintained Backend has separate control/error/lifecycle evidence;
these results do not establish continuous playback through a public Player.
Rate/volume/track/settings tests exercise command/readback and playback behavior,
not independent fidelity or cadence at every rate or device configuration.

The earlier full tracked-source license audit passed; the repeated broad scan
was stopped during cadence runs. The final scoped check covers the new source
and generated/harness files, including files not yet in the Git index.

## Public feature and release gates

Passing the bounded Backend/prototype tests supports review of this experimental
implementation. Completing the public feature additionally requires:

1. UnifiedPlayer construction, preparation, feature reporting and finite
   source/feature admission for the private Software route.
2. Actual public Player open/control/replacement and unsupported-feature tests.
3. Browser consumers of the exact assembled archive on both runtimes. The release
   collector requires the distinct playback pair and its runtime closure; the
   release gate requires five private Software consumer cases when that profile
   is shipped. These cases have not yet qualified a public route.

The isolated Software and Hybrid routes retain their existing admission. Named
Hybrid, broader codecs, subtitles/filters/color transforms, arbitrary file
duration, multichannel output, live manifests, Safari/mobile, HD cadence and
performance parity remain outside this six-fixture qualification. Public routing
and CPU qualification must not be inferred from a passing experimental run.

## Reproduce

Run from the dedicated worktree, with the recorded external candidate and
references. Outputs use fresh UTC names; existing evidence is preserved.

```sh
python3 research/items/nonisolated-full-software-playback/tests/run-qualification.py \
  /Volumes/seed2/Projects/demuxe-nonisolated-full-playback-20260929 \
  /Volumes/seed2/Projects/demuxe \
  research/items/nonisolated-full-software-playback/evidence
```

The driver serializes browser correctness runs. The failed historical lifecycle
invocation requested audio capture from a lifecycle host without an audio
transport; its corrected invocation uses `-` as the audio-reference argument.
