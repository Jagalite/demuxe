<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Streaming modernization evidence

> **Historical / superseded.** This document records the former custom streaming
> implementation and `experiments/streaming-modernization` research. It is not the
> current production architecture or a dependency of production playback. See
> [current Shaka streaming architecture](STREAMING.md). Historical evidence and
> experiment artifacts remain unchanged.

Status: baseline restored; streaming overhaul **not qualified or complete**.
All implementation remains opt-in under `experiments/streaming-modernization/`.
The root release pins, engines and public streaming behavior are unchanged.
This development checkpoint is unqualified and belongs on a separate branch.
No tag, release promotion or publication is authorized. The starting revision is
`51f0792fa6c5229a8695d908006a0a573bfc1c10`; all 550 snapshotted original files still
match their initial hashes, including the pre-existing uncommitted rename work.

See [ownership and integration](STREAMING-ARCHITECTURE.md),
[upstream findings](STREAMING-UPSTREAM-FINDINGS.md), and the
[reproduction instructions](../experiments/streaming-modernization/README.md).

## Current final-candidate corrections

Candidate 26 clean-built all three engines after candidate 25 exposed an
immediate post-open HLS alternate-audio selection failure. mpv had accepted a
22-second video frame while `playback_pts` was still unset and `last_seek_pts`
retained its load-time zero. Track refresh used zero, clipped to the oldest live
boundary, and requested an expired audio preroll segment. The scoped mpv fix uses
its accepted video timestamp only during that startup interval. Pending seeks
(clear video timestamp), established clocks, nonintegrated sources, track offsets
and reverse direction retain explicit regression coverage. The actual extracted
mpv function fails the sanitized before test and passes all seven after assertions
in `startup-track-before-26` / `startup-track-after-26`. Browser proof remains
required; this is not yet a qualified candidate. The packaging output guard
stopped the copied driver before it could reuse candidate 24's directory; all
earlier evidence remains unchanged. Candidate 26 is packaged separately:
`final-runtime-26/demuxe-0.3.0-beta.3.tgz`, 18,442,855 bytes, SHA-256
`4cdbeaf98703294ed6e25ee7d136e114713d01d5b7d33fc6d519f51fe1f571c4`.
The clean-build record is `final-26/build/beta-build.json`. Its final archive
has not yet run through the complete browser/native/unit verification matrix.

Candidate 25 passes all fourteen baseline jobs, both resource-error suites,
four discovery jobs, fourteen network/boundary/seek jobs and all thirty-two
quality cases. Its live group passes the first two Chrome HLS cases but fails
Firefox Hybrid HLS on the startup track-selection path above. Endurance and final
verification did not run. All failures and archive bytes are preserved.

Candidate 25 passes seven native checks, 126 injected unit tests and all four
real browser discovery-expiry cases, including startup and a persistent quality
switch in both browsers and decoder modes. It pairs candidate 24's unchanged
clean-built engines with the corrected retained-frame worker, with explicit reuse
correspondence. Archive SHA-256:
`3f728e147ea787b9d26cd4fcf67868367561cf11c2fd0a40ca68ea7e229850c6`.
Candidate 24's remaining startup failure came from a late decoder reset clearing
the explicit seek presentation floor; the captured failure and deterministic
injected before/after test remain preserved. The subsequent qualification failed on startup track selection as recorded above. Final source/archive verification
and root promotion remain pending.


Candidate 24 is clean-building all three engines with corrected DASH discovery
segment alignment and native live identity independent of window availability.
Candidate 23 passes seven native gates and 125 units but fails the new Chrome
Hybrid discovery case on its retained-frame bound. Its headroom-only patch chose
the segment after the coordinator target. The native alignment reproducer rejects
that implementation and passes the corrected containing-segment selection. The
retained-frame bound is unchanged. Final browser qualification remains required;
no result from an earlier archive qualifies candidate 24.


Candidate 22 is clean-building all three engines with FFmpeg patch 0021. Candidate
21 passed fourteen baseline jobs, both legacy resource-error suites, fourteen
network/boundary/seek jobs and all thirty-two quality API/component/ABR/audio-relay
cases. Its live group exposed a real DASH discovery race: the upstream sixty-second
lookback selected the oldest segment in a short DVR window, which expired while
opening. The native deterministic before/after regression fails on the prior
source and passes with six-second integrated discovery headroom. The full matrix
now has 58 jobs / 128 browser cases and seven native gates. No candidate 21 results
qualify candidate 22's changed runtime bytes. All earlier failure evidence remains.
`preservation-check-24.json` confirms all 550 original working files are unchanged.


Candidate 21 passes all 125 unit tests and all fourteen broad baseline jobs,
including both public API/component suites and the compatibility live-window
regression. Both legacy resource-error suites pass. Its archive is 18,442,598
bytes, SHA-256 `2d21a3c5ad70a98ad77205e8528eda0d9e2740d87951d973b7ecac48f00dc9f4`.
`final-21-output-correction.json` records an assembly output-directory mistake:
the prior candidate was restored byte-for-byte from its preserved consumer copy,
and the new archive retained separately before testing. No evidence was discarded.

`final-network-21` preserves a failed Firefox Software DASH boundary case. Its
supposedly frozen fixture still advertised sixteen-second wall-clock DVR expiry;
a target at the observed start of 10 seconds expired before the native seek
refreshed the manifest, and native correctly rejected it. The outer seek later
failed its presentation deadline. The boundary driver now advertises one-day
retention within its 110-second test while keeping only segments 4..11 in its
explicit timeline and HTTP inventory. The harness requires an unchanged window
at every checkpoint. Standard rolling/expiry tests remain unchanged. This fixes
a test premise, not the runtime; `final-network-21b` and the remaining matrix
requalify the same candidate 21 bytes.


Candidate 20 cleanly builds all three engines and passes six native gates and
121 unit tests. Its archive is 18,442,482 bytes, SHA-256
`4b8b56177fbe00fc775ed00cde32c1f2759c965f4886ee1d355f7bcf79ff3d9f`.
Both consumer, incremental, accepted-seek and standard streaming suites pass,
as do compatibility, archived deadline and integrated-session checks. The public
API regression gate rejects it: inactive native diagnostics include an empty
window object, which incorrectly suppresses compatibility live seekable ranges.
The preferred API now accepts native window authority only when integrated
quality is available; four injected publisher regressions cover inactive, unknown,
live and final windows. Candidate 21 will rebuild the changed TypeScript and
reuse candidate 20's byte-identical clean native artifacts with explicit source
correspondence. This is not a fresh native build or tagged release. All browser,
unit and source/archive gates must run on candidate 21's new archive.


Candidate 19 is rejected for normal local-file playback: its worker setup assumes
`data.options` exists before reading streaming options. Both preferred workers
now handle omitted options. Native/remux and remote streaming checks did not
exercise that missing input, which is why the broad consumer gate is mandatory.
The standard streaming test also still asserted the retired "never interrupt a
seek read" behavior. Its replacement requires prompt demux-accepted cancellation,
operation cancellation reporting, correct presented target and resumed audio;
deadline and destruction gates remain. The release verifier uses the new case
identity. Candidate 20 will include these source/test changes and a fresh clean
build; no candidate 19 result qualifies candidate 20's archive bytes.


`final-endurance-19d` passes all eight strict five-minute cases on candidate 19,
with 15 manual changes per case, one engine lifetime, zero additional audio
underruns, bounded resources and normal worker/browser cleanup. All 54 streaming
matrix jobs now pass across `final-network-19`, `final-quality-19`, `final-live-19`
and `final-endurance-19d`. Earlier endurance failures and diagnostic runs remain
preserved; the original isolated underrun's cause is not conclusively established.
Broad baseline consumers and source/archive verification are running next.


All four HLS cases in `final-endurance-19c` completed their strict five-minute
checks, including Firefox Hybrid with no underrun. Its scheduler was deliberately
stopped before DASH; the already-running child finished and closed normally.
`final-endurance-19c/scheduling-stopped.json` records that interruption.
Review found that endurance instrumentation repeatedly cloned its growing frame
history every 200 ms. The preferred harness now uses the ABR harness's bounded
batch pattern, deduplicates delivery, records peak batch size and retains all
strict audio, decoder, draw-gap and resource gates. This fixes a measurement
cost; it does not prove the earlier underrun's cause. `final-endurance-19d` is
the complete eight-case rerun on unchanged runtime bytes, followed by baseline
consumers and final verification.


`final-endurance-19b` passes both Chrome HLS five-minute cases but rejects Firefox
Hybrid HLS at 261 seconds on eight audio underruns. No decoder error, heap growth
or exhausted packet cache accompanied the failure. The separate five-minute
`endurance-audio-observed-19` rerun instruments PCM availability and relay gaps;
it passes with no underruns and a maximum observed relay gap of 33 ms. This does
not establish the cause of the earlier failure. Both records remain preserved.
`final-endurance-19c` repeats all eight strict cases on the unchanged archive,
retaining the zero-additional-underrun gate and collecting every case result.


`final-live-19` passes all 24 jobs: final-window transitions, rolling HLS/DASH,
focused discontinuities/subtitles, large segments and delayed candidate opens.
The first endurance attempt stopped on the conservative ABR health flag after
13 seconds, despite no decoder errors or playback stall. The preserved 60-second
`endurance-health-observed-19` diagnostic records transient output-drop signals
around discontinuities/reconfiguration with continuing audio/video. The endurance
harness now records that signal separately while enforcing actual decoder errors,
render/audio continuity, A/V timing and resource bounds. Archive bytes are unchanged;
`final-endurance-19b` is the full rerun. Broad consumers and final verification
remain pending.


Candidate 19 cleanly builds all three engines. Its archive SHA-256 is
`7efa77d45601e49dc2f0073ee4350de801cbbbb8e7508da352389b2e87ed27fe`.
All six native gates pass, as do all 121 exact-archive unit tests.
`final-network-19` passes fourteen jobs / 44 browser cases: eight live boundaries
and both browsers' network, container-error and accepted-seek cases. `final-quality-19` also passes all eight jobs / 32 cases, including every
120-second ABR workload and manual override in both browsers. All eight ABR
cases retain one engine and report zero additional audio underruns. Maximum
draw gap is 0.26904 seconds; maximum reported mpv A/V estimate is 0.102334 seconds
(not physical output timing). Live/endurance, broad consumers and final source
verification remain pending.


`final-live-edge-18` passes all eight HLS/DASH × Chrome/Firefox × Hybrid/Software
boundary cases on archive `28fba934881333effb1150d74a58012e30054508678eb08c2da7c7c4e9b3de3c`.
It verifies strict end rejection, component headroom, resumed audio/video and
inclusive start seeking without recreating mpv. Candidate 18 is not final: a
source check caught that its generated patch omitted the latest overflow-safe
subtraction. Preferred patch 04 and its input provenance now include that change;
preparation rejects stale task/generator hashes before building. Candidate 19 is
rebuilding all engines, followed by the full serial qualification sequence.


Live-boundary qualification rejected archives 12 through 16. An exact live end
is not a playable timestamp; the public API now rejects that exclusive boundary
without interrupting a valid queued seek. The component uses the existing
six-second return-to-live headroom for its live timeline and seek controls.
The 50-ms experiment in archive 13 was insufficient when a publisher stopped
providing the frames needed for decoder reordering.

Firefox Software HLS then exposed a lower-bound seek failure. Archive 15 records
a requested 7.999674-second position reaching lavf as 6.999674 seconds. Archive
16's private native refresh-preroll distinction alone did not fix it: the
Software worker also configured a blanket one-second demuxer offset. The latest
worker omits that redundant offset for the integrated coordinator, which selects
its own random-access point, and retains direct-file behavior. Native internal
refresh overlap has a separate immutable capability flag and may clip at the
available window start; ordinary native out-of-window seeks remain rejected.
`native-live-preroll-01` passes the sanitized native boundary test. Browser
requalification and a fresh clean candidate remain required. All failures and
development reuse records are preserved. The final matrix now contains 54 jobs
and six separate native gates; earlier smaller matrices are historical evidence.


Clean archive `final-runtime-04` is rejected. Its Chrome Hybrid/HLS quality case
revealed that a future subtitle cue could hide the pending audio head, allowing
video demux to run roughly sixty seconds ahead. The native delayed-audio
reproducer fails on that exact source and passes on the corrected component
coordinator: three switches, maximum video lead 187,675 microseconds. This is a
packet-order test, not a browser A/V measurement.

`container-errors-chrome-old-01` also rejects archive 04: truthful-length but
truncated fMP4 continued to later segments in Software and reached a downstream
decoder error in Hybrid. The preferred task rejects corrupt packets, enables
strict MOV sample EOF checking, and retains the original failure when another
plan arrives after task failure. `container-half-native-fixed-02` and
`container-empty-native-fixed-02` pass with `AVERROR_INVALIDDATA` and no request
for the next video segment. The earlier cancellation-misclassification failure
is preserved in `container-half-native-fixed-01`.

A source-bound native fatal-error mailbox lets the engine worker report demux
failure before forwarding EOF. The sanitized native mailbox test
`native-control-error-01` passes stale-source, reset, sticky-error and close
retention checks. It makes no browser playback claim. The exact-archive matrix
now has 44 jobs, including both container-corruption cases in both decoder paths
and both browsers. Clean candidate `final-05` built all three engines. Archive 05 passes Chrome
container errors but exposed Firefox stack-only serialization: its stack omitted
the original message and timer frames produced a false timeout classification.
That result is retained in `final-container-errors-05`.

`final-worker-errors-06` reuses candidate 05's clean native bytes with three
explicitly recorded JavaScript corrections. Archive 06 SHA-256 is
`8628f379ba0fbe5e1be6bb862c86f6acf1088fa55077617dbe6c804ede23a94f`.
`final-units-06` passes all 117 injected tests. `final-container-errors-06`
passes eight real browser cases across Chrome/Firefox and Hybrid/Software, with
no next-video-segment request and zero remaining workers. The remaining final
matrix, source correspondence and root promotion are still pending.

Archive 06 subsequently passes Chrome public API and component quality suites,
but fails all four throttled ABR startup cases. Strict packet-corruption admission
was hiding AVIO cancellation, timeout and I/O failures when FFmpeg returned a
partial packet. `native-read-errors-old-02` reproduces all six header/packet
error-priority failures. `native-read-errors-fixed-01` passes eleven ASan/UBSan
cases: 1/13/8192-byte reads, header/packet cancellation, timeout, I/O failure and
truncation. The original AVIO error now takes precedence over partial-packet
corruption; genuine EOF truncation remains invalid data. `terminal-precedence-abr-chrome-07` passes the full Hybrid/HLS network-step
case: presented phases `[0,2] → [0,1] → [1,2]`, 75 accepted network samples,
112.08 seconds of media progression, zero underruns, maximum draw gap 0.25613
seconds, maximum reported A/V estimate 0.04166 seconds, one engine lifetime and
zero remaining workers. This single development-engine case is not the full
matrix. `final-08` is now rebuilding all three engines cleanly.

Source review while candidate 08 builds identified an empty-read busy loop in
mpv's demux owner when audio has not produced its next head.
`audio-wait-native-old-01` records 253,392 empty reads in 350 ms.
`audio-wait-native-fixed-02` passes with 26 reads using the task condition wait;
`component-order-native-fixed-03` retains three switches and a 187,675-us maximum
video lead. The first fixed attempt's declaration compile failure is preserved.
Candidate 08 predates this correction and cannot be promoted as final bytes.

`network-precedence-08` passes all ten Chrome network cases and nine Firefox
cases. Firefox's Hybrid/truncated case reports the native I/O failure before the
IO worker's richer message, exposing a generic demux description. The preferred
native control now provides portable, source-bound descriptions for I/O, timeout,
cancellation and permission errors without hardcoding Wasm errno values in JS.
`native-control-error-02` passes the sanitized description/source/reset checks.
`final-09` is clean-building all engines with these descriptions and the bounded
component condition wait. No candidate has been promoted.

Candidate 09 built all three engines and passed 118 injected tests, five native
gates and all 28 Chrome/Firefox network and container-error cases. Its Chrome
quality gate then failed Software/DASH ABR startup: an accepted mpv seek interrupted
a child read without setting global cancellation. The fatal guard incorrectly
treated that interruption as terminal. The other three Chrome ABR cases passed;
this does not qualify the candidate.

`integrated-accepted-seek-old-09b` reproduces that cancellation error in all four
HLS/DASH × Hybrid/Software cases while padded video segments are downloading.
Development archive 10 adds a cache-mutex-protected pending-seek query. Its Chrome
run removes the terminal cancellation and passes both Software cases, but exposes
a Hybrid retained-frame seek completion failure in both formats. Those failures
are preserved in `integrated-accepted-seek-fixed-10`; final qualification remains
blocked. The complete matrix now includes 46 jobs, adding accepted-seek checks in
both browsers. No archive or source changes have been promoted to the root.

`read-abandoned-abr-chrome-10` passes the previously failing Software/DASH full
ABR case: presented phases `[0,2] → [2,1,0] → [1,2]`, 75 accepted network samples,
manual override, normal browser close and zero workers. Hybrid's subsequent seek
failure was traced below presentation: mpv retained a track-refresh deduplication
marker after clearing a noncached seek range and discarded the new segment's
first keyframe. The new-range branch already cleared that marker; the preferred
in-place branch now does too. `integrated-accepted-seek-chrome-11` and
`integrated-accepted-seek-firefox-11` pass all eight actual playback cases on the
corrected development archive, including forward/backward seeks after audio-track
changes while nested video responses are downloading. The old diagnostic traces
and failures remain unchanged. `final-12` is clean-building all three engines;
all final-archive gates still need to run on those new bytes.

## Current integration status (2026-09-15)

* Finite aligned HLS/DASH persistent switching: actual Chrome/Firefox playback
  passes with one mpv lifetime, including delayed candidate preparation.
* Public quality API/component: implemented in the opt-in quality overlay;
  actual component matrices and source-identity checks pass on recorded archives.
* ABR: `abr-chrome-27` and `abr-firefox-27` pass all eight 120-second fixture
  cases on archive 04, with 12 → 2 → 8 Mbit/s phases, actual presented changes,
  manual override, zero audio underruns, and zero remaining workers.
* Live HLS archive 12: all four Chrome/Firefox × Hybrid/Software cases pass
  actual playback, three persistent quality switches, paused window updates,
  DVR seeking and expired-pause recovery. Resume follows an explicit six-second
  live-edge target, audio samples advance, the requested quality is presented,
  one mpv instance remains, and worker/browser cleanup completes.
  This covers the aligned fMP4 fixture, not discontinuities or sustained live operation.
* Eight-lane transport checks pass in Chrome and Firefox. These exercise actual
  Fetch and the IO worker with a simulated native producer; they are separate
  from playback proof. Native HLS retirement rejects no still-referenced URL.
* DASH archive 01 passes two-period rendered playback in Chrome and Firefox,
  both decoder paths (`dash-periods-chrome-02`, `dash-periods-firefox-01`).
  Chrome Software and Firefox Software live/expired-pause cases pass. An
  intermittent Firefox Hybrid expired-pause failure is preserved. Archive 03
  changes startup/seek admission to use the current live window; three repeated
  Firefox Hybrid expiry cases and one Chrome Hybrid case pass. This is a
  development rebuild, not final clean qualification.
* Integrated large-segment tests (`integrated-large-chrome-02`,
  `integrated-large-firefox-02`) pass both paths and both length-reporting cases
  on DASH archive 03. Video changes and audio plays before the first segment
  completes, transport bounds hold, and source replacement cancels outstanding
  requests. The fixture appends a valid 9 MiB free box; this is resource-size
  stress, not high-bitrate decoding qualification. Attempts 01 failed because
  the fixture omitted validators; the runtime integrity check remains intact.
* Retained-frame generation checks pass all seven cases in
  `live-retained-generation-02.log`. `live-media-bounds-02` passes normal AAC and
  WebVTT parsing and rejects oversized subtitle input without successful EOF.
* Native HLS discontinuity tests (`hls-discontinuity-session-02`) pass repeated
  timestamp epochs, three switches, audio packets and exact mapped subtitle
  timestamps. WebVTT mapping units pass with ASan/UBSan, including 33-bit wrap.
  `dash-retirement-native-01` passes native rolling resource retirement. These
  tests do not establish rendered discontinuity playback.
* HLS discontinuity archive `subtitles-runtime-01` passes all four browser/path
  cases (`hls-discontinuity-chrome-01`, `hls-discontinuity-firefox-01`), including
  active decoded cues on both sides, one mpv lifetime, zero audio underruns,
  output gaps below 270 ms, and complete worker/browser cleanup.
* libass 0.17.5 is pinned at commit
  `4a05d8127f525943ebf45fdc6497c9e665947f0d`; all three engines were clean-built in
  `subtitles-01`. Exact library Wasm checks (`libass-prune-wasm-04`) keep 1000
  sequential cues to a peak of 32 retained events and preserve/reload spanning
  cues. The cue-admission ledger passes ASan/UBSan; native DASH subtitle tests
  include backward seeking into a spanning cue.
* `timeline-runtime-01` adds MOV subtitle tasks, cue admission/pruning and native
  final-window publication. `dash-subtitle-chrome-01` and
  `dash-subtitle-firefox-01` pass both decoder paths, including active subtitles
  across periods and after seeking. Both Chrome screenshots show the expected
  rendered cue. All eight HLS/DASH final-window browser/path combinations pass,
  including ENDLIST/static-MPD publication, nonzero final DVR starts, duration,
  seeking and real EOF. All four rolling DASH period/paused-expiry cases pass.
  HLS Chrome Hybrid attempts 01/02 passed playback but failed browser shutdown;
  attempt 03 passed with a normal process exit. Those failures remain recorded.
* `dash-rolling-periods-native-01` passes while a dynamic MPD adds/removes periods
  and accepts three persistent switches. `periods-dash-chrome-hybrid-01` passes
  actual playback and paused expiry across those catalog changes.
* Rolling HLS discontinuity/paused-expiry failed all four combinations on archive
  01: a pending rendition lost its live-window anchor while paused. Native
  `pending-seek-native-old-01` reproduces the rejected seek;
  `pending-seek-native-fixed-01` passes after window admission reuses the existing
  overlap-checked anchor inheritance. Clean `timeline-02` builds all three
  engines with that fix and authorization-refresh logical resource identities.
  All four rolling HLS expiry browser/path cases pass on its exact archive
  (`rolling-discontinuity-hls-*-02`). Authorization identity regressions fail on
  the old loader and pass all seven injected Fetch units on the fix.
* `endurance-hls-chrome-hybrid-01` passes 300 seconds and fifteen persistent
  switches on archive 02, including timestamp-cache wrap: heap remains 128 MiB,
  peak logical identities 50, no underruns, maximum output gap 269 ms, and full
  worker/browser cleanup. Remaining format/browser/path endurance cases are open.
* Archive `timeline-runtime-03` changes only stall error text so the public API
  retains `NETWORK_TIMEOUT`. Header/body timeout units fail on the old text and
  pass on the fix. `integrated-network-chrome-02` and
  `integrated-network-firefox-02` pass all twenty real-browser cases: authorization
  refresh, retryable HTTP failures, slow delivery, truncation, stalls, redirects,
  and source replacement during candidate preparation. The initial matrix's
  harness faults and timeout classification failure remain preserved.
* `timeline-units-04` passes all 115 injected units against archive 03. Attempt 03
  exposed two older harness setup assumptions; the updated tests explicitly hold
  the response open and wait for the header request to start. No runtime check
  was weakened. `final-native-bridge-01` passes ASan/UBSan against the final native
  bridge, including independent progress, pool exhaustion and scoped retirement.
* `final-01` clean-built all three engines and reproduced all six native artifacts
  and archive 03 byte-for-byte. Its expanded first browser case failed: with
  alternate audio, a pending quality and an expired pause, ENDLIST made segment
  lookup revert to an old global timestamp instead of its retained window anchor.
  The complete matrix stopped; this candidate remains rejected.
* `final-window-native-old-02` reproduces the ENDLIST failure with alternate
  audio. `final-window-native-fixed-02` passes on the unified anchor and final
  component source. The first native attempt retained default audio and did not
  reproduce it; that passing characterization is not presented as a regression.
  The unified anchor initially exposed a 326-microsecond finite video lead-in
  before audio. Component admission now selects the first finite segment without
  shifting timestamps; it still rejects expired live positions.
  `final-window-finite-native-03` passes 768 video/1500 audio/16 subtitle packets,
  three switches and exact mapped cue positions. Live paused-seek and DASH
  subtitle/period/seek checks also pass. `final-02` clean-built all three engines with both changes. All four HLS
  browser/path finalization cases and Chrome Hybrid DASH pass the strengthened
  expired-pause/ENDLIST test on its archive; all 115 injected units pass.
  Scheduling of the remaining archive-02 matrix was intentionally stopped to
  add npm-facing API documentation; the active DASH child finished normally.
* `final-docs-01` reuses exactly the clean `final-02` native bytes and records
  five documentation-only source changes. `final-runtime-03` has SHA-256
  `beaf4aa6e5a032621105650465b952fb4bd1352b53412cc3427e0192adf8124b`.
  `final-streaming-03` passed all eight finalization cases, then stopped on
  rolling HLS Chrome Hybrid startup and browser-shutdown failure. No pass from
  another archive substitutes for this failed gate.
* The native `live-startup-native-old-04` reproduces live-window-start rejection
  against the exact clean `final-02` component source. Audio starts 16 ms after
  video, so rejecting all earlier component targets loses valid video preroll.
  Component admission now requires overlap with an available video segment; it
  does not shift timestamps or admit an expired video position.
  `live-startup-native-fixed-03` passes 49 video/30 audio/one subtitle packet and
  rejects a position just outside the window. Finite and finalization native
  regressions pass. A diagnostic-only browser retry passed, so it does not prove
  the timing-dependent original browser failure fixed.
* Review also found retired codec decoder-name pointers outliving their wrapper
  after segmented track changes. The candidate clears that published metadata
  before changing codec ownership. `live-overlap-02` is a development rebuild of
  mpv against the clean final-02 dependency libraries, not a new clean build.
* The metadata browser probes on both old and corrected archives instead exposed
  finite startup blocked by a coarse subtitle playlist. The unified anchor had
  required equal subtitle/video segment durations. `coarse-subtitle-native-old-01`
  reproduces that indefinite wait. Complete associated VOD playlists starting at
  the presentation beginning now share the established video origin; rolling or
  truncated windows do not use this rule. `coarse-subtitle-native-fixed-01`,
  `vod-anchor-live-native-01`, `vod-anchor-final-window-native-01`,
  `vod-anchor-discontinuity-native-01` and `vod-anchor-dash-subtitle-native-01`
  pass on the updated native FFmpeg. `final-04` is clean-building all engines with
  the component overlap, metadata ownership and subtitle-anchor fixes.
* Still open: final-archive rolling-discontinuity combinations,
  sustained resource bounds, broader network/track cases and final exact-archive consumer/source verification.

The clean discontinuity archive SHA-256 is
`ad7c8ba592506d8d5ad0b47cb24bcad0f37feb80680d03f64daeb716aab460a6`.
The later development timeline archive SHA-256 is
`79c1f526a55daa7d622e9e12d528f8faad7a7cef8d06bb984b4d1cbf06b469b9`.
The subsequent clean timeline archive SHA-256 is
`8d79b62a83334e16752f0ab46fccb4fcb7056c6e93102a5b591d1db0b747088d`.
The timeout-text archive SHA-256 is
`62c020ece9fb60334e70db393c897e30ab1e287c6cfa8fa30969d828e9ffc8a5`.
These remain separate evidence identities; none is a qualified release candidate.

Archive 12 is `live-runtime-12/demuxe-0.3.0-beta.3.tgz`, SHA-256
`e0967b081ee7fc66f6ae8e230ffd853bbe32cd6e8c8d15d5454a70b95be18899`.
The passing cases are `live-chrome-hybrid-expiry-03`,
`live-chrome-software-expiry-01`, `live-firefox-hybrid-expiry-01`, and
`live-firefox-software-expiry-01`. It combines clean live-09 dependencies with
recorded live-12 native development changes; it is not a final clean release.

Archive 04 is `quality-runtime-04/demuxe-0.3.0-beta.3.tgz`, SHA-256
`1dc4c6473e8a49891fd2ac09db9d78b60499e827216f37356298e9168b65a895`.
It reuses clean candidate 14 native bytes; it is not final release qualification.
The remainder of this document retains the chronological evidence and failures.

## Accepted baseline restoration

Current stable candidates verified against official upstreams: mpv **0.41.0**,
FFmpeg **9.0.1**, and libxml2 **2.15.4**. Exact commits, archive hashes, patch
classification and security rationale are recorded in `baseline/profile.json`.
Emscripten remains **4.0.14**. The build records the actual macOS toolchain;
historical Linux qualification is not claimed for this host.

Evidence root: `build/streaming-modernization/`.

| Workload on final baseline archive | Result |
| --- | --- |
| Chrome consumer | Passed |
| Firefox consumer | Passed |
| Chrome streaming | Passed |
| Firefox streaming | Passed |
| API, component, CLI, TypeScript consumers | Passed, including both browsers where the suite provides them |
| Broader Chrome compatibility | Passed |
| Archived range-reader deadline | Passed |
| Experimental source/runtime correspondence verifier | Passed |

Exact results: `baseline-clean-checks-03/result.json` and
`baseline-verification-03/result.json`. Clean engine evidence:
`baseline-clean-03/build/beta-build.json`, SHA-256
`840f2c6ea2fc0c9b951ca6bd88208c88b74107d64f6579968776a2897e7da329`.
Build log: `baseline-clean-03.log`. Full compiled capabilities, configurations,
license records and all engine hashes are retained in the verification record.

| Artifact | Bytes | SHA-256 |
| --- | ---: | --- |
| `baseline-clean-checks-03/demuxe-0.3.0-beta.3.tgz` | 18,369,033 | `9a7f14edbe4d8b0db32284aa6ccd8b0e6db744405fcf76c0f4a9f38722c3d937` |
| `baseline-source-04/demuxe-modernization-source.tar.gz` | 98,425,429 | `a9cf48f2b952f548d18028c25039e9809a4e2cab6523aaa8f80d2e4d94615957` |

The runtime contains 105 files, 49,769,317 unpacked bytes. `npm pack --dry-run`
reported the identical file inventory and unpacked size; npm's hypothetical
recompressed size is 18,509,245 bytes. That hypothetical archive is not the
qualified archive. SHA256SUMS is in `baseline-verification-03/`.

The source companion includes preferred source, exact upstream archives, maintained
patches, notices, SDK sources and clean-build evidence. It is an **uncommitted
experimental correspondence archive**, not a clean tagged release candidate.
The root release verifier/publication rules remain unchanged.

Earlier standard-suite successes did not hide broader failures. The first clean
baseline failed Native TS remux parameter-set identity and playback intent during
remux recovery. Both failures, the diagnostic builds and the successful targeted
reproductions are preserved. The final baseline above contains their fixes.

## Transport and switching evidence

These results belong to different explicitly hashed experimental bytes. They do
not inherit baseline qualification merely because they use the same upstream pins.

| Evidence | What it demonstrates | Limit |
| --- | --- | --- |
| `transport-playback-chrome-03/` | Actual Hybrid/Software video and audio start before a greater-than-8-MiB segment finishes; known/unknown length; all workers retire | Transport archive 03, before later native race/error changes |
| `transport-playback-firefox-01/` | Same early-start scenarios in Firefox | Earlier transport archive 01 |
| `mailbox-chrome-05/`, `mailbox-firefox-04/` | Real Fetch/I/O worker; native epoch cancellation observed while a read waits | Simulated native mailbox producer |
| `native-bridge-02/` | Stale session callbacks, claimed-writer retirement, short reads, error/EOF distinctions, unknown size; ASan/UBSan pass | Native bridge with injected peer, not browser playback |
| `native-resource-errors-01/` | HLS/DASH truncation returns EIO rather than clean completion or advancing to the next segment | Native HTTP, explicit strict policy |
| `native-resource-errors-02/` | Accepted seek after that error restores packet progression beyond eight seconds | Native packet proof, not A/V playback |
| `transport-cancel-engine-04/` | Actual accepted native seek aborts abandoned reads, then displays/plays the correct target; Hybrid and Software | Engine-level calls intentionally bypass the public FIFO queue |
| `transport-cancel-public-prototype-06/` | Superseded public seek reaches mpv and recovers actual playback | Archive 04 plus a hashed generated-JS override; not final archive evidence |
| `mpv-switch-probe-04/` | Three playing rendition changes and a settled paused change, one mpv instance; all four format/decoder cases pass these assertions | Explicit adapter bypass; A/V samples still show transition disturbances |
| `transport-checks-06/` | Both consumer suites, both early-start suites, Firefox cancellation, current API/component/CLI/types, broad Chrome compatibility and archive deadline regression passed | Chrome deadline test sampled TCP close before its event arrived; original aggregate remains failed |
| `transport-cancel-chrome-06-recheck/` | All six Chrome cancellation/deadline/destruction cases passed on unchanged archive 06, with bounded TCP-close observation before teardown | Does not overwrite the failed original run |
| `native-init-errors-01/`, `native-init-errors-02/` | Valid MP4 initialization bytes in an incomplete HTTP response were wrongly accepted; explicit nested AVIO error propagation rejects them for HLS/DASH | Native HTTP regression; fix is newer than archive 06 |
| `native-transition-02/` | ASan/UBSan packet ownership, bounded preparation and rational boundary tests | Synthetic packets, no playback integration |
| `native-packet-transition-01/` | Three real decoded resolution changes, 576 video frames, no video gaps/regressions, one format and audio decoder lifetime | Native experiment; DASH audio continuity assertion failed |
| `native-packet-fixed-01/`, `dash-audio-container-01/` | Same DASH audio gaps without switching; original concatenated fragments decode without gaps | Isolates an existing DASH demux behavior, not yet a qualified fix |
| `native-packet-continuous-01/` | Continuous child fMP4 context removes measured DASH audio gaps; both native decoded transition workloads pass | Native-only option, off by default; not connected to mpv |
| `native-packet-slow-candidate-01/` | Candidate delay blocks the synchronous parent read for roughly three seconds | Proves packet-continuity assertions alone are insufficient for seamless playback |
| `transport-replacement-chrome-06/` | New source waited behind obsolete seek settlement and inherited deadline errors | Failed real Wasm regression preserved |
| `transport-replacement-chrome-prototype-08/` | New open supersedes obsolete seek wait; both decoder paths replace source and retire workers | Archive 06 plus hashed JS override; final archive qualification still required |
| `transport-replacement-firefox-prototype-08/` | Same replacement/cancellation checks pass in Firefox | Same explicit archive/JS-override limitation |
| `transport-checks-08/`, `transport-resource-errors-{chrome,firefox}-08/` | Both consumers, both incremental/cancellation suites, compatibility/deadlines and all 16 actual browser resource-error cases pass | Aggregate fails on intermittent Firefox public-consumer page closures; no verification promotion |
| `public-api-firefox-08-recheck.log`, `public-api-firefox-08-debug.log` | Unchanged archive first reproduces a page closure, then passes all eight checks with browser diagnostics | Intermittence is not a root-cause fix; original failures remain |
| `public-api-firefox-baseline-control-01.log` | Same workload passes against the accepted baseline | Does not prove the transport archive's intermittent closure is harmless |
| `resource-loader-unit-09b.log` | Bounded short-read manifest assembly and shared scratch reservation, all 15 resource-loader tests pass | JavaScript-only change, newer than archive 08 |
| `firefox-crashes-08/` | Three matching Firefox DOM-worker SIGSEGV summaries from the failed consumer runs | Unsymbolicated native frames; cause not proven from the stack alone |
| `mailbox-close-old-firefox-09/` | Old close acknowledgement retains two asynchronous waiters | Deterministic protocol failure; simulated native producer |
| `mailbox-close-firefox-10/`, `mailbox-close-chrome-10/` | Revised close acknowledgement waits for zero outstanding asynchronous waiters | Real Fetch worker with wait-count instrumentation; playback tests remain separate |

### Accepted incremental transport archive

`transport-checks-10/result.json` passes all nine workload groups: Chrome and
Firefox consumers, both incremental startup suites, both accepted-seek/source
replacement suites, current API/component/CLI/types, broader Chrome compatibility,
and the archived deadline regression. Both `transport-resource-errors-*-10/`
suites pass all eight initialization/media truncation cases per browser.
`consumer-rechecks-10.json` records two additional passing uninstrumented Firefox
public-consumer runs, eight checks each. These runs observed no content-process
crash; the earlier failed runs and unsymbolicated crash evidence remain intact.

`transport-verification-10/result.json` passes source/runtime correspondence and
npm inventory checks, with `releaseQualified: false`. SHA256SUMS is alongside it.

| Artifact | Bytes | SHA-256 |
| --- | ---: | --- |
| `transport-checks-10/demuxe-0.3.0-beta.3.tgz` | 18,376,193 | `4cc4a34079c006c1cdd5c5dea38640b438c43e9008443192f7a03f3225320b6b` |
| `transport-source-10/demuxe-modernization-source.tar.gz` | 98,485,468 | `633b9eac0bcfeddf12b2c7e8262c3edac3d0abb6b4a63cebbd6079fe825ba6c0` |

The runtime contains 107 files and 49,791,766 unpacked bytes. npm dry-run reports
the same inventory; its hypothetical recompressed size is 18,517,278 bytes.
Scanned runtime text candidates contain no local workspace/home path.

This snapshot reuses the exact engines from clean `transport-08`. The explicit
`transport-10/build/native-build-reuse.json` binds compiled inputs, configurations
and artifacts to build record SHA-256
`89b47fba691b3de9465b32b69328d400b0194553b28048662b8d42f8b1b3b049`.
Build log: `transport-build-08.log`. Exactly two external JavaScript files change:
`web/resource-loader.js` bounds short-read assembly/scratch accounting, and
`web/io-worker.js` drains pending waits and pumps before acknowledging close.
This is not a fresh native build. All archive suites were rerun on the final bytes.
Parser strings and browser allocations remain outside enforced byte accounting.

The old large-segment startup failure was retained: its single MP4 fragment placed
all audio after almost all video bytes. The replacement fixture uses interleaved
fragments within one large HLS segment and records its generator and hashes.
Neither fixture claims real-world codec/device coverage.

The paused-switch fix holds the same reported position in the tested Chrome cases.
It does **not** complete the manual switching milestone. Generic `vid` changes
still reset the video chain; measured transition A/V differences and one underrun
sample motivate the one-logical-video-stream integration described in the ADR.

## Open acceptance gates

- Expanded long-running source replacement/cancellation races beyond the qualified
  finite-source scenarios; independent per-resource native concurrency.
- Non-range paused-resource deadline policy and live identity-record retirement.
- Prepared/accepted packet-boundary switching with continuous A/V and cues; qualified
  resolution/configuration changes and actual presented-quality generations.
- Integrated eligible-group discovery and a measured discovery traffic budget.
- Inspectable ABR with measured network samples, real forward-buffer coverage,
  ceilings, decoder eligibility and the 12 → 2 → 8 Mbit/s workload.
- Rolling HLS and dynamic DASH live/DVR policy, expiry recovery, multi-period DASH,
  discontinuity mapping and bounded long-running resource/cue retention.
- Source-scoped public quality state/events/capabilities and optional component UI.
- Long-running aggregate memory/frame/handle/request/worker qualification.

Existing `streaming.representation`, `streaming.maxBandwidth` and `streaming.live`
remain compatibility options. No fixed selection is relabeled as ABR. No new
public quality API is shipped yet. LL-HLS, low-latency DASH, encryption/DRM,
Safari/mobile and physical HDR/surround qualification remain separate follow-ons.

## Concurrent preparation and shared-session stage

The release path remains unchanged. These results are newer than transport10 and
must not be attributed to that archive or treated as complete streaming support.
All paths below are under `build/streaming-modernization/`.

- `concurrent-native-02/result.json`: ASan/UBSan injected native peer passes lane
  independence, scoped cancellation, source replacement and interruption during
  a pending resource open. Each child AVIO captures its own interrupt callback.
- `concurrent-mailbox-chrome-02/` and `concurrent-mailbox-firefox-01/`: real Fetch
  workers with simulated native producers pass active reads during a delayed
  candidate and close with zero pending waiters. These are bridge tests.
- `concurrent-01/build/beta-build.json`: clean build of all three engines with the
  first concurrent bridge revision. The later per-context interrupt callback is
  newer than those engine bytes.
- `concurrent-checks-01/result.json`: aggregate **failed**. Both consumers, both
  incremental playback suites, compatibility and archived deadlines passed. The
  accepted-seek commands used a nonexistent fixture; the API/component aggregate
  also failed after a browser page closed during the component suite. The original
  failure remains. No full qualification claim applies to this archive.
- `concurrent-cancel-{chrome,firefox}-01/result.json`: reruns with the correctly
  hashed 248,805,945-byte fixture pass all eight actual playback cancellation
  cases per browser, against the same concurrent archive. These do not clear the
  separate component failure.
- `native-plans-04/build-record.json`: pinned native FFmpeg with the private
  manifest-to-segment-plan seam, strict resource errors and continuous DASH fMP4.
- `native-session-02/result.json`: the shared `adaptive-session.c` coordinator
  passes HLS and DASH, three resolution changes each with delayed candidate
  preparation. Both decode 576 video frames; HLS decodes 1,126 audio frames and
  DASH 1,125. Neither audio decoder restarts; maximum decoded timestamp gaps are
  one video/audio frame. Maximum paced video-output wall gaps are 129.009 ms and
  128.835 ms. This uses real native containers/decoders and paced callbacks, **not
  mpv's clock, a physical audio device, or browser playback**.
- `integrated-loader-01.log`: three injected JavaScript tests pass unchanged full
  manifest delivery, active-segment opening during delayed candidate headers, and
  independent cancellation/shared manifest byte accounting.

The new opt-in mpv patch maps prepared video packets to one logical video stream
and uses mpv segmented codec transitions. It is undergoing build and playback
qualification; this is not yet a manual-switching milestone pass. The plan seam
currently admits finite, separated, same-family fMP4 video groups only. Sparse
rendition discovery, live/DVR, period replacement, ABR and public quality API/UI
remain unfinished. The first native session test's assertion failure from buffered
unselected parent packets is preserved in `native-session-01/`; the coordinator
now discards those packets at its boundary.

### Browser startup investigation and bounded parser rewind

- `integration-03/build/beta-build.json`: all three engines build cleanly with
  the shared mpv session and independent native resource lanes. Build success
  does not imply playback qualification.
- `integration-runtime-04/demuxe-0.3.0-beta.3.tgz`: SHA-256
  `c760ddec8e287933e4d78152176ccbec5a1d0ee8b92212c51d663697320fe6ee`.
  Reuses the exact `integration-03` native bytes, with recorded external Hybrid
  presentation ownership fix. `mpv-session-chrome-04/result.json` fails all four
  HLS/DASH × Hybrid/Software startup cases. No switching pass is claimed.
- `mpv-session-debug-05/result.json`: the same archive shows a second Hybrid
  configuration with zero AVC extradata. The independent short-read reproducer
  and remedy are documented in `STREAMING-UPSTREAM-FINDINGS.md`.
- `native-session-codec-01/result.json`: both paced native sessions pass using
  the actual prepared child codec parameters, not the parent's probed headers.
- `container-read-{native,wasm}-01/result.json`: nine short-read sizes each pass
  actual MOV parsing and complete 48-frame H.264 decoding with bounded rewind.
- `integration-05` preserves a separate diagnostic build without the rewind fix.
  `integration-06` is the next clean build snapshot with the fix; its acceptance
  must be determined from its own archive, not the preceding decoder tests.

### Persistent playback, presentation identity and candidate 11

- `mpv-session-refresh-debug-01/result.json`: Chrome Hybrid/HLS passes three
  resolution changes, paused selection, seek, track/settings preservation and
  worker cleanup. The measured mpv lifetime is one creation and zero recreations;
  maximum output callback gap is 67.45 ms, reported A/V estimate is 30.99 ms,
  and AudioWorklet underruns are zero. This uses the explicitly diagnostic
  candidate-08 archive, not a qualified release artifact or physical A/V test.
- `mpv-session-chrome-10/result.json`: normal packaging succeeds; Hybrid/HLS
  passes again. The aggregate fails: both DASH startup cases and Software/HLS
  switching remain blocked on these bytes. Runtime SHA-256:
  `5b45b033123be792e4ad366c4da4b005388b090fda8390f3f233ef51299fac7d`.
- The refresh-seek fix clamps mpv's internal negative preroll/start request to
  the first available finite segment. Previously mpv discarded queued packets
  while the rejected native seek left the old producer ahead. Child-container
  byte positions are not reported as global file offsets.
- Patch 0017 carries source/request/representation tags through demux packets,
  reordered decoded frames and filters. Presentation is acknowledged only after
  the selected frame is drawn. Ambiguous, evicted and untagged output reports
  unknown; a requested representation is not reported as already presented.
- `session-units-02/result.json`: six ASan/UBSan native tests pass, including
  retained-history ambiguity and DASH identity surviving AVStream metadata
  transfer. `native-session-identity-01/result.json`: both paced decode sessions
  pass with a three-second candidate delay. These are not browser playback tests.
- `mpv-dash-events-01` reproduces the lost ID after mpv moves stream metadata.
  Patch 0012 now retains the representation-owned ID and gives consumers a copy.
- `mpv-software-threads-01` measures eight busy workers and no spare worker when
  candidate preparation fails. Candidate 11 increases the fixed Hybrid/Software
  pools to twelve, retaining strict pool exhaustion behavior and 2 MiB stacks.
  This is a capacity correction pending browser verification, not a memory leak
  workaround or an unbounded pool.
- `integration-11` is a fresh three-engine build snapshot containing these fixes.
  Its results must be assessed from its own archive. All failed builds, rejected
  packaging attempts and diagnostic archives remain preserved.

### Decoder-domain identity correction

- Candidate 11's Chrome matrix passes HLS in Hybrid and Software. Maximum drawn
  frame gaps are 98.73 ms and 50.24 ms respectively, with no audio underruns or
  remaining workers. Both DASH cases start and switch decoded resolution, but
  fail because presented identity remains unknown; the aggregate fails.
- Candidate 12 moves Software identity matching after `mp_set_av_packet`'s
  timestamp conversion. This avoids comparing pre-conversion mpv doubles with
  decoder-quantized timestamps. Its Chrome Software/HLS and Software/DASH cases
  pass (maximum callback gaps 50.35 ms and 49.23 ms, no underruns). Hybrid remains
  a failure because its separate `vd_browser` hook needs its own accepted-packet
  association. The failed aggregate is preserved.
- Candidate 13 adds that association in `vd_browser`, including WebCodecs'
  integer-microsecond conversion. It reuses candidate 11's pinned dependency
  libraries and rebuilds mpv/bridges; it is not a fresh three-engine build.
- The held-frame redraw regression initially reports the new selection's tag
  for an old image with the same PTS. `retained-redraw-before-01` preserves that
  failure. The corrected worker retains the image's tag; all four injected
  ownership tests pass in `retained-redraw-after-01/test.log`. Its initial JSON
  parser incorrectly expected TAP output; `result-parser-fix.json` records the
  actual Node spec-reporter result without replacing the erroneous record.

### Persistent switching and bounded discovery qualified in staging

Candidate 13 passes the four-case manual switching matrix in Chrome and Firefox.
Its delayed-candidate Firefox run also passes all four cases: a three-second
initialization delay leaves the old video drawing (71–72 callbacks during the
wait). Chrome's first delayed run passes playback but hangs during browser
shutdown; its aggregate is incomplete and preserved. The bounded-shutdown repeat
`mpv-session-delayed-chrome-14` passes all four cases against candidate 13 bytes.
This does not establish the cause of the original shutdown hang.

Candidate 14 is a fresh clean build of all three engines. Archive SHA-256:
`2a6bcdce7448cfa459469b66e1e95a93f6c5488117d13b25509277f60c0f4861`.
`mpv-session-chrome-discovery-14` and `mpv-session-firefox-discovery-14` each pass
four cases, with three presented resolution changes, one native engine creation,
no engine recreation, preserved playback settings/tracks, and no remaining page
workers. All eight cases fetch zero unselected media-segment bytes at startup.
This scope is aligned finite separated H.264/fMP4 ladders, not live or ABR.

FFmpeg patch 0013 bounds sparse discovery and uses real initialization codec
parameters. Patch 0014 corrects native HTTP chunked completion while preserving
truncation errors. `discovery-init-fixed-01.json` passes seven initialization
response cases for each protocol. Earlier failed fixtures and native runs remain
preserved; the corrected truncation fixture has consistent range/length headers.
The official development source at commit
`5bb1b180bca31cbf102e88d8b0c2d7d8e56d22f4` retains the HTTP behavior corrected here;
the retrieved source and hash are in `upstream-http-review-01`.

### ABR controller under playback qualification

The source-bound policy uses measured network timing, mpv forward packet-cache
duration, conservative startup, prompt downswitching and sustained upswitch
hysteresis. Network timing, policy, and controller unit tests pass; these are
injected checks, not playback qualification. Candidate 15 omits the new worker
modules and fails engine startup in the first actual ABR test. Candidate 16's
new static dependency check rejects an optional experimental YUV import; that
rejected packaging attempt is preserved. Candidate 17 includes the modules and
limits the static check to static imports. It reuses exact candidate 14 native
engine bytes with explicit source/packaging correspondence and is not a fresh
native build. Actual network-step results remain pending.

Public quality API/UI, standard live/DVR, discontinuity/period integration and
final full archive/source qualification remain open. The release runtime is
unchanged and this staging work is not release-qualified.

### ABR measurement and first actual pass

The first actual Chrome Hybrid/HLS ABR pass is `abr-chrome-hls-22`, against the
candidate 21 runtime. It presents high quality, downswitches during the slow
phase, recovers high quality, preserves one mpv lifetime, and accepts a manual
override. Full browser/protocol/decoder qualification is still running.

Failed attempts 17–21 remain preserved. They exposed missing end-of-response
measurements, consumption delay being counted after network completion, and
application backpressure suppressing useful samples. Candidate 21 uses progressive
bounded read-ahead for known responses from 32 KiB through 1 MiB in Auto mode;
large/unknown bodies remain demand-driven. Fixed storage plus a 512 KiB producer
workspace is charged to the aggregate transport budget before allocation.
The response must finish successfully before it produces a network sample.
Resource Timing duration is never shortened to manufacture bandwidth.

The original ABR harness unintentionally limited a single response to one 8 KiB
write per tick. Harness 22 corrects that while retaining aggregate round-robin
backpressure and the configured 12 → 2 → 8 Mbit/s ceilings. Earlier attempts are
useful diagnostics but do not qualify those intended network ceilings.

The public quality API/component is in a separate `quality/files` overlay. Its
TypeScript build and six source-identity/policy unit checks pass; real API and
component playback testing is pending. `prepare.py --quality` includes it without
altering the root runtime. Source correspondence now records a changed runtime
packager separately and preserves its original engine-build input bytes.

### Public controls and audio relay qualification in progress

`quality-runtime-01` passes all four Chrome ABR cases in `abr-chrome-24`, using
120-second fixtures and 12 → 2 → 8 Mbit/s phases. Firefox passes three cases;
Software/DASH reports audio underruns. The same-archive repeat in
`abr-firefox-software-dash-25` still underruns after reducing measurement copying.
These failures remain preserved and are not relabeled as passes.

A dedicated worker now relays the existing native AO ring to the existing fixed
AudioWorklet ring. It adds no playback clock. Source reset epochs, 2/6/8-channel
PCM, shared memory growth, capacity errors and seek gating have unit coverage.
`quality-runtime-02` SHA-256
`3c90e361535c744330ce56b34e83c20660f49968fa6cc9f5836c3edadfdc2d09`
passes the formerly failing Firefox Software/DASH long ABR case in run 26:
zero underruns, maximum draw gap 0.10948 seconds, reported mpv A/V estimate below
0.04 seconds, one engine lifetime, and zero remaining workers. This is one case,
not final matrix qualification. The preferred source subsequently adds a direct
AudioWorklet seek-gate check; that change requires new archive testing.

`quality-runtime-03` SHA-256
`7d94e35bdacee9f3c1409851dc0bff57bb1aa0946ed3b33d4d52c4f668f0177c`
passes all four Chrome component quality/focus cases. Firefox passes three;
Hybrid/HLS has a 10.09-second drawing gap coincident with the first screenshot
operation, while audio stays continuous. A revised harness captures screenshots
only while paused; its result is pending. The failed result is retained.
Nineteen policy/controller units pass, including observed decoder drops/errors,
seek-retirement grace, stale samples and transactional policy rejection.

`hls-window-probe-03` passes native parser/window characterization: multiple
rolling reloads, an advancing 16-second timestamp-anchored window and no expired
or future segment requests. Earlier failed fixture URL/range attempts remain.
This hook does not yet provide browser live playback, DVR, period transitions or
live adaptation. The live plan/refresh extension is a separate native experiment.

### Archive 04 focused checks

`quality-runtime-04` SHA-256
`1dc4c6473e8a49891fd2ac09db9d78b60499e827216f37356298e9168b65a895`
includes the consumer-side seek gate. `component-quality-firefox-02` passes all
four actual component cases. Both `audio-relay-chrome-01` and
`audio-relay-firefox-01` pass four injected-stall cases, including zero remaining
workers. `abr-chrome-27` passes all four long network-step cases; Firefox is still
running. Archive 04 reuses clean candidate 14 native bytes and is not a new clean
native build or final release qualification.

`live-media-tasks-01` parses 282 AAC packets from three real fMP4 segments and
three WebVTT cues through the generalized native task. Peak queued packet bytes
are 13,210 and 478 respectively, under separate 256 KiB limits. These are packet
executor tests, not rendered playback. The live coordinator build/probe is queued
behind the browser matrix to avoid compilation load during timing measurements.

`quality-verification-04/result.json` passes all eight suite groups: direct public
API, optional component, long ABR and injected PCM-relay stall, in Chrome and
Firefox, on archive 04. The verifier reconstructs allowed measurement overrides
from the archive rather than trusting only report hashes. Its result remains
`releaseQualified: false`; final clean-build/source/transport release gates are
still required.

The first live build snapshot accidentally copied the older serialized-open
worker while extending the mailbox to eight lanes. Source review caught that
regression before live browser qualification. The preferred live worker now uses
the integration worker's independent media opens. `live-01` is preserved unchanged;
a new assembly must carry the corrected worker and record the exact native reuse.
