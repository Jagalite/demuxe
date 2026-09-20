<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Upstream characterization — 2026-09-14

> **Historical / superseded.** This document records the former custom streaming
> implementation and `experiments/streaming-modernization` research. It is not the
> current production architecture or a dependency of production playback. See
> [current Shaka streaming architecture](STREAMING.md). Historical evidence and
> experiment artifacts remain unchanged.

This is measured native demux behavior, not qualified browser streaming.
The [architecture decision](STREAMING-ARCHITECTURE.md) remains the implementation
contract; no compatibility adapter was removed from the release pipeline.

## Revisions

| Upstream | Exact commit | Archive SHA-256 |
| --- | --- | --- |
| mpv v0.41.0 | `41f6a645068483470267271e1d09966ca3b9f413` | `ee21092a5ee427353392360929dc64645c54479aefdb5babc5cfbb5fad626209` |
| FFmpeg n9.0.1 | `bf1b838f2ab88b4f8fd83443325c782ea0e0f7fa` | `195d54bebe1a27f84d77f4b989d193466f305b355da92292766a69f16880b18a` |

Official release verification: [mpv 0.41.0](https://github.com/mpv-player/mpv/releases/tag/v0.41.0),
[FFmpeg stable releases](https://ffmpeg.org/download.html). Both source archives
were downloaded from the official GitHub repositories; tag objects and peeled
commit IDs are recorded in the experimental profile. The newest stable pair is
under qualification, not yet the release baseline.

## Controlled observations

Evidence: `build/streaming-modernization/upstream-probe-03/result.json`, packet
dumps and request logs beside it. Fixtures: `build/streaming-modernization/fixtures-02/`.
The generator records all commands, hashes and its actual host encoder version.
The demux probe was compiled from pristine FFmpeg n9.0.1, with native HTTP and
the recorded host libxml2 (not the new browser 2.15.4 build). It does not use the installed mpv's older FFmpeg libraries.

| Case | Observation | Implication |
| --- | --- | --- |
| Full HLS ladder with audio/subtitle groups | Six streams discovered; 22 requests for the two-second packet sample, including all three video variants and both audio renditions | Full-manifest admission alone does not bound discovery to the selected rendition |
| DASH ladder | Five streams discovered; 14 requests for the two-second packet sample, including initialization and first media from every representation | Track discard after discovery cannot eliminate initial rendition traffic |
| Two-period DASH, 6 + 6 seconds | Only `period-1/` resources fetched; 427 packets, final PTS 5.994667 | Actual period support is missing, not a browser transport failure |
| HLS discard switch at PTS 5.124674 | First new video packet is a keyframe at 6.083008 | Demux can continue in one context, but old output/preroll must cover a boundary transition |
| DASH discard switch at PTS 5.041667 | First new video packet is a keyframe at 4.000000 | A discard change alone can regress incoming timestamps; accepted timeline and preroll handling are required |

The switch probe requested the initial and highest-resolution video streams and
then switched back. It retained one `AVFormatContext`. That says nothing about an
mpv engine lifetime, visible frames, audible continuity or seamless playback.
Traffic reported above includes probing and sample reads; it is not a precisely
isolated startup-byte measurement, nor a measurement of browser Fetch overhead.

The first multi-period fixture lacked a `profiles` attribute used by FFmpeg's
format probe and failed admission. That run remains in `upstream-probe-01/` and
`fixtures-01/`. The corrected standards-profile fixture was regenerated into a
new directory before drawing the period-support conclusion.

Additional native evidence: `build/streaming-modernization/upstream-live-01/`.
The server generated rolling manifests from the aligned fixtures, enforced an
eight-second availability window, and saved every served manifest by hash.
The video-only rolling HLS case consumed packets from PTS 2.083008 through
10.041341 over about five seconds, with three playlist loads. This demonstrates
upstream refresh, not browser playback or a qualified live policy.

The dynamic DASH case consumed only PTS 4.0 through 7.958333 and then exhausted
fragment-open retries: 112 requests in about 0.62 seconds, including eight HTTP
503 and 94 HTTP 404 responses as it advanced beyond available media. It did not
complete the requested eight-second packet span. The probe's zero process exit
does not make that a pass. Native `av_seek_frame` to four seconds returned `-1`
for both live fixtures after discovery. Live/DVR seeking therefore needs engine
integration beyond forwarding the manifests unchanged.

## Source corroboration and remedies

Pinned [dashdec.c](https://github.com/FFmpeg/FFmpeg/blob/bf1b838f2ab88b4f8fd83443325c782ea0e0f7fa/libavformat/dashdec.c)
selects a single period during MPD parsing. Its discard-switch path catches a
representation up by segment sequence number. These mechanisms explain the
measured period loss and early packets after a switch. Extend the integrated
demux's period/window model and explicit boundary acceptance; do not regenerate
an HLS manifest in JavaScript or reopen the whole mpv player as the normal path.

Pinned [hls.c](https://github.com/FFmpeg/FFmpeg/blob/bf1b838f2ab88b4f8fd83443325c782ea0e0f7fa/libavformat/hls.c)
opens the sub-demuxers during header discovery. Bound manifest/representation
admission and add lazy eligible-representation preparation at the demux boundary.
Measure unselected traffic again before accepting full-master playback.

The MOV fragment reset and DASH custom I/O routing are present upstream. FFmpeg's
`h264_sei` now selects `itut_t35`, whose object list includes the film-grain helper;
the pristine minimal native H.264 build links without the old helper patch.
The staging profile removes only those redundant changes. Browser HTTP admission,
finite discontinuity mapping, indexed subtitle seek and codec safeguards remain
until their replacement cases pass.

Browser standard live refresh, live seek/window expiry, subtitle continuity, persistent
mpv quality switching, ABR, decoder reconfiguration and incremental browser AVIO
are still open gates. Current evidence must not be presented as those features.

## Baseline restoration failures found by broader qualification

The standard exact-archive consumer, streaming and API/component suites passed
on the first clean baseline, but the additional compatibility suite found a
Native TS remux regression. The FFmpeg 9 extracted SPS ended in one Annex B
`trailing_zero_8bits` byte; the in-band SPS did not. The bridge compared framing
as if it were part of the parameter-set identity and rejected unchanged media.
The prior engine passed the same fixture. The staged fix strips trailing zero
framing only in the Annex B scanner; length-prefixed parameter sets and genuine
configuration changes remain checked. Exact Wasm packet reproduction passed
with the fix; browser and final clean-build qualification remain separate gates.

The broader suite also reproduced playback intent being changed to pause during
an internal Native remux recovery. The staged application fix leaves user intent
owned by playback commands; backend pause observations still update playback
state but no longer overwrite intent. Neither failure is hidden by the passing
standard-suite result. Failed artifacts remain under `baseline-clean-01` and
`baseline-compatibility-01.log`.

## Actual mpv track-switch characterization

A separate browser probe passed the full synthetic masters/MPD to the upgraded
mpv pipeline by explicitly replacing only the compatibility adapter in the test
server. The overrides and hashes are preserved; this is not an exact unmodified
archive result or a public quality feature. Native `web_create` call-boundary
instrumentation recorded one creation throughout repeated switches. Hybrid
presentation instrumentation recorded the dimensions of frames actually drawn.

On the tested three-representation ladder, ordinary mpv video-track selection
changed playing video without recreating the engine. Initial HLS discovery cost
was about 1.43 MB across 20 requests; DASH was about 0.88–1.43 MB across 12–13
requests. These costs include unselected representations and still need an
explicit integrated discovery policy. The paused-switch check failed for Hybrid
HLS and Software HLS/DASH: the displayed position advanced beyond the permitted
quarter-second tolerance. This is a concrete mpv integration limitation, not
proof of seamless manual switching. Audio/subtitle continuity and long runs
remain acceptance gates.

Evidence: `build/streaming-modernization/mpv-switch-probe-01/result.json`.
A tightened follow-up, `mpv-switch-probe-02`, waits for observed pause and a stable
control interval first. It still measured about 0.417 seconds of movement in
Hybrid DASH and Software HLS/DASH, and 0.208 seconds in Hybrid HLS. This rules out
an immediate JavaScript snapshot as the sole explanation. Subsequent switch
checks use a 90 ms bound, rather than the original permissive 250 ms bound.

## XML dependency review

The original libxml2 2.13.8 pin predates security fixes in dictionary/URI overflow
handling and parser paths. The opt-in baseline now selects **2.15.4**, tag commit
`96498992efa48d52b0e8b83058bd88dbdaf153c1`, archive SHA-256
`bb01bd9ac9a7403f9706816fd6d3e7888041d32b0211075feb20e755d2a9f29d`.
This is a security/correctness dependency change, independently built after the
mpv/FFmpeg and Native-remux restoration attempts. Obsolete CMake switches for
removed HTTP/FTP/LZMA implementations are removed; external network access still
belongs to browser transport. Notices retain the upstream license text.

Official release index: <https://download.gnome.org/sources/libxml2/2.15/>.
Release notes and their hashes are preserved in `libxml-audit-01`. Reviewing this
change does not constitute a general dependency security certification.

## Strict resource error propagation

Source inspection found that both manifest demuxers can advance after a nested
resource fails. `avio_feof()` can be true for an error, so testing that bit alone
also loses the distinction between truncation and genuine completion. The new
transport-only FFmpeg patch `0010-strict-stream-resource-errors.patch` adds an
internal `strict_io` policy (default enabled in browser builds). Browser transport
owns bounded retries; after those fail, demux must propagate the error. An accepted
HLS seek resets the retired AVIO error state before reading its new position.

The native HTTP regression serves a declared-length third segment and closes the
connection halfway through it. With strict handling disabled, HLS reports clean
EOF around six seconds, while DASH continues to the end of the 24-second source.
With strict handling enabled, both return `AVERROR(EIO)` around five seconds and
do not request the fourth segment. Evidence: `native-resource-errors-01/result.json`.
This proves native error semantics; the Wasm candidate and post-error seek recovery
still need their own checks.

A second reproducer supplies complete MP4 initialization boxes but closes the HTTP
response before its declared length. `avio_read()` returns a short positive count
while retaining EIO in `AVIOContext.error`; both initialization helpers previously
accepted it. The strict patch now checks that error before closing the input.
`native-init-errors-01` preserves the two failing strict cases, and
`native-init-errors-02` passes their replacements. `native-resource-errors-03`
also confirms media failure propagation and accepted-seek recovery still pass.

## DASH container continuity and candidate blocking

`native-packet-transition-01` decodes real fixture packets through the boundary
prototype with three resolution changes. All 576 video frames are retained in
both formats, with no PTS regressions and a maximum frame interval of 1/24 second.
HLS audio is continuous; DASH loses one AAC frame near each segment boundary.
The equivalent fixed-quality control (`native-packet-fixed-01`) has the same loss.
Concatenating the original initialization/media fragments and using MOV directly
(`dash-audio-container-01`) yields 1,125 audio frames without gaps. Thus the fixture
contains the missing audio and the defect does not require quality switching.

DASH normally reopens the child demuxer for each segment, causing MOV edit-list
priming to be applied repeatedly. The isolated `0011-dash-continuous-fmp4.patch`
keeps the child context for qualified VOD fMP4 fragments with one initialization.
Its private option defaults off and is not part of the Wasm transport profile.
`native-packet-continuous-01` passes both formats: 576 video frames; 1,126 HLS and
1,125 DASH audio frames; three video decoder changes, zero audio decoder changes,
and one format-context lifetime. This is native decode evidence, not mpv playback.

`native-packet-slow-candidate-01` then delays a selected candidate segment by three
seconds. It still passes packet continuity but records roughly 3,008 ms (HLS) and
3,010 ms (DASH) blocked inside one `av_read_frame()`. Candidate preparation shares
the synchronous read path, preventing active audio/video demux progress during
that interval. The packet model's matched-boundary result cannot qualify seamless
switching. Independent bounded candidate preparation, active-stream progress and
deadline-aware boundary selection are required before connecting this to mpv.

## Baseline acceptance

`baseline-clean-03` rebuilt all three engines cleanly with the Native remux/intent
fixes and libxml2 2.15.4. Its exact archive passed Chrome and Firefox consumers,
Chrome and Firefox streaming, API/component/CLI/type checks, all broader Chrome
compatibility cases and the archived deadline regression. The experimental
correspondence verifier passed in `baseline-verification-03`. This accepts the
baseline restoration stage only; it does not qualify the transport/quality/live
overhaul or authorize publication.

## MOV lookbehind with incremental AVIO

The integrated browser startup failure is independently reproduced with the exact
full Wasm FFmpeg library from `integration-03`. Concatenated initialization/media
input with a 4,096-byte read cap retains 46 bytes of AVC extradata
(`wasm-child-codec-01`). A 512-byte cap loses it (`wasm-child-codec-02`).
`mov_parse_stsd_video()` seeks backward to parse the QuickTime palette; a short
refill can replace AVIO's previous buffer before that seek. The initial child
AVIO had no seek callback, so the parser continues from the wrong position.
This is a parser/AVIO integration limitation, not evidence of transport truncation
or a requirement to finish downloading a segment before demuxing it.

The child-container bridge now retains a fixed 64 KiB lookbehind ring. It accepts
backward seeks only within those already-read bytes, does not report a total size,
and keeps `seekable=0`. Forward reads stay incremental; underlying resources are
never reopened to satisfy parser lookbehind. Reads outside the retained window
fail explicitly. Error, timeout, cancellation, starvation and EOF values pass
through unchanged. The ring adds 64 KiB per child container, separately from its
32 KiB outer AVIO buffer, current resource AVIO buffer and packet queue budget.

`rewind-reader-unit-01` passes ASan/UBSan window-wrap, expired/future seek, repeated
read and error-distinction checks. `container-read-native-01` and
`container-read-wasm-01` use the actual MOV parser and H.264 software decoder:
all nine caps (1, 7, 127, 511, 512, 513, 1,024, 4,096, 32,768 bytes) retain the
46-byte AVC configuration and decode all 48 frames of the first fixture segment.
The first standalone rewind Wasm probe had a default-stack overflow; it remains
in `wasm-child-codec-03`. The corrected probe uses the production stack size,
and the maintained decoder regression allocates its ring on the heap.
These results are component evidence; the new mpv candidate needs browser proof.

## Accepted seek and track-refresh retirement

The integrated slow-segment regression on archive 09 exposed a Demuxe error
classification defect: mpv marks an accepted seek with `in->seeking` but does not
cancel the playback session. Testing only `demux_cancel_test()` misclassified the
interrupted child read as fatal. A private cache-mutex-protected query now lets
the demux read owner distinguish that abandoned result from terminal cancellation.

Archive 10 then exposed the separate mpv 0.41.0 cache path in
`switch_to_fresh_cache_range()`. With seekable caching disabled, clearing the
existing range left `ds->refreshing` set by an audio-track refresh. Its old
comparison position was already cleared, but the refresh admission block still
discarded the first new packet. Hybrid consequently waited for the next segment's
keyframe instead of presenting the seek target. The branch that allocates a new
range already retires the marker; the maintained correction does the same for
the in-place branch.

`integrated-accepted-seek-fixed-10` preserves the Hybrid failures and Software
results. `integrated-accepted-seek-trace-10` records native selection and transferred
frame timestamps using explicit diagnostic worker modifications.
`integrated-accepted-seek-{chrome,firefox}-11` passes all eight cases on the corrected
development archive without worker overrides. This is an integration reproducer
with real browser playback, not an unmodified native upstream test or final clean
archive qualification. Both narrow mpv changes are included in generated patch
0018; no upstream submission has been made.

### Live start versus decoder and refresh overlap

The frozen live boundary suite preserves three distinct causes. Software's
worker-level one-second offset caused a valid 7.999674-second HLS target to
reach lavf as 6.999674 seconds (`live-preroll-hls-firefox-software-16`); omitting
the redundant offset for integrated streams passes all four HLS cases in
`preroll-worker-edge-17`. DASH then exposed lavf's AAC delay: a valid 10-second
target arrived as 9.978666 seconds. This is integration behavior, not evidence
that FFmpeg lacks live seeking.

The coordinator now validates the unadjusted target before applying bounded
codec overlap. Invalid user targets remain errors, while available AAC preroll
is retained and unavailable lower overlap clips at the current window start.
mpv's internal cache/track refresh has its own explicit preroll intent and an
immutable per-demux capability. `native-live-preroll-02` passes sanitized strict,
internal-overlap and decoder-overlap cases with actual audio/video packets.
Clean browser requalification remains required; no upstream submission has
been made.

### Short DVR discovery can probe an expired oldest DASH segment

Candidate 21's Firefox Software final-window startup requested the oldest fragment
about 56 ms after its MPD response. The rolling origin crossed its expiry boundary
and returned HTTP 410 (`final-live-21/timeline-dash-firefox-software`). FFmpeg's
`calc_cur_seg_no()` uses a sixty-second lookback for SegmentTimeline discovery;
inside a sixteen-second DVR window this selects its oldest segment. This happens
before the integrated coordinator takes ownership, so its existing six-second
startup target cannot protect the initial probe.

`native-discovery-before-01` deterministically rejects that oldest segment and
fails open with one HTTP 410 request. `native-discovery-after-01` passes against
the same pinned FFmpeg plus patch 0021, with three H.264 qualities, two AAC tracks
and no expired-segment request. The patch uses six-second discovery headroom only
when private integrated sparse discovery is enabled. Compatibility discovery is
unchanged. Real browser startup and persistent-switch cases are separate gates;
native metadata discovery alone does not qualify playback. No upstream submission
has been made.

The first six-second patch still used FFmpeg's next-start helper, which selected
20-second discovery data for an 18-second coordinator target. Candidate 23's new
Chrome Hybrid discovery case avoided HTTP 410 but failed its retained-frame bound
while opening/playing; the failure remains in `final-discovery-23`. The corrected
patch selects the containing segment. `native-discovery-alignment-before-02`
rejects the first patch's segment 11 for video and both audio tracks;
`native-discovery-after-02` passes with segment 10 for all three. Browser frame
ownership remains a separate required check; its resource bound was not increased.

### Decoder resets must preserve explicit seek presentation intent

The aligned candidate 24 still failed Hybrid startup intermittently. Its isolated
`retained-startup-diagnostic-24d` records the actual raw pre-play position as numeric
zero (not null). The decisive error shows decoder generation 7 delivering 16-second
preroll while mpv still selected generation 4 at 18 seconds. The explicit seek
waiter had completed, and `resetPresentation()` cleared its minimum presentation
PTS. Sixteen unpresentable frames then filled the retained-frame bound.

The worker now keeps a separate explicit seek floor across decoder resets. New
sources clear it; new seeks replace it, including backwards seeks. Internal
reset-only seeking remains supported. `retained-floor-before-25` fails the actual
worker ownership functions with 44 injected preroll frames;
`retained-floor-after-25` closes them exactly once, rejects old-generation selection
and draws the accepted target with peak retained count one. This is an injected
ownership test. `final-discovery-25` separately passes real startup and a persistent
quality switch in Chrome/Firefox × Hybrid/Software. The sixteen-frame resource
bound and old-generation checks were not weakened.

## Paused live startup track-refresh reference (candidate 26)

`final-live-25/timeline-hls-firefox-hybrid` records a first retained video frame
at 22.083008 seconds, an unestablished playback clock reporting zero, and an
immediate alternate-audio selection fetching `alternate/005.m4s` after expiry.
mpv initializes `last_seek_pts` to zero during load; `get_current_time()` returns
it until `playback_pts` becomes valid. Its track refresh then subtracts overlap
and the integrated live guard clips that stale target to the oldest window.
For the integrated demux capability only, `reselect_demux_stream()` now uses
mpv's accepted `video_pts` while its playback clock is unset. No external clock,
manifest rewrite or player restart is introduced. A pending seek clears
`video_pts`, retaining seek-target precedence. The extracted actual C function
fails against the old source and passes seven assertions with ASan/UBSan after
this change. This isolates startup reference selection; it does not establish a
general remedy for arbitrary segment expiry races, which still require browser
qualification of the complete lifecycle.
