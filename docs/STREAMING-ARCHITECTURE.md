# Integrated streaming modernization

Status: staged implementation with final qualification pending.
The public modes remain Native, Hybrid and Software. This work must not enter a
release candidate until the stage gates below pass. Existing adapters stay active
until equivalent playback tests pass through their replacements.

## Ownership decision

Extend mpv's libavformat demux integration first. A manifest scheduler in the
browser resource loader is not the target architecture. The current DASH-to-HLS,
fixed representation and concatenated subtitle adapters are compatibility code,
not adaptive playback. Native direct/remux routing remains independent.

| Layer | Authoritative responsibility | Must not own |
| --- | --- | --- |
| Application / component | User intent, source, automatic/manual quality policy, ceilings, route eligibility | Segment order, clocks |
| Streaming controller | Eligible representation set, measured throughput, switch recommendations and live policy | Packet timestamps or playback scheduling |
| Integrated demux | Manifest interpretation, segment order, accepted representation, switch boundary, timestamp mapping, presentation window | Wall-clock playback, UI intent |
| Browser transport | Scoped authentication, redirects, incremental bytes, retry/cancel/deadline state and byte budgets | Manifest rewriting or quality selection |
| mpv | Packet cache, playback clock, synchronization, audio, subtitles, pause/rate/seek | Network throughput estimation |
| Decoder / presenter | Codec reconfiguration and bounded frame ownership within accepted generations | Independent media clock |

The demux thread accepts a switch at a validated boundary. A controller request
does not itself change the active stream. Control messages enter an engine-owned
queue; stream callbacks must never synchronously call back into libmpv. Fetch runs
in an independent worker, never the pthread waiting on the AVIO mailbox.

Before choosing a custom adaptive demux backend, demonstrate concrete limitations
in the selected FFmpeg HLS/DASH implementation with full-manifest fixtures. If a
single backend is necessary, it must replace the conflicting timeline owner and
reuse FFmpeg container demuxers, feeding mpv's existing packet/track interfaces.
Do not run both a JavaScript manifest timeline and a native manifest timeline.

## Independent stages and acceptance

1. **Baseline:** isolate the current dirty source snapshot, upgrade exact upstream
   pins, classify/rebase patches, rebuild all three engines, restore existing
   tests. No new adaptive behavior in this stage.
2. **Upstream characterization:** direct full masters/MPDs, alternate tracks,
   manual stream selection, periods, updates, live seeks and discontinuities.
   Record every requested URL, selected stream and packet timestamp. Classify
   failures as upstream, browser transport, configuration or integration failures.
3. **Incremental AVIO:** headers-before-body open, bounded asynchronous reads,
   explicit error/EOF/cancellation, truthful seekability, large/unknown-length
   segments, root and nested cancellation. Native file/range tests must still pass.
4. **Persistent manual switching:** aligned same-codec ladders in both decoders,
   pause/seek interleavings, audio/subtitle continuity and one mpv engine lifetime.
5. **ABR:** network steps, hysteresis, policy ceilings and decode health. Manual
   policy suppresses automatic switch requests. No initial-selection ABR claim.
6. **Live:** rolling manifests, explicit DVR-window policy, expired positions,
   timestamp/period/init changes and bounded cue retention.
7. **Public integration and qualification:** source-scoped quality state/events,
   conditional component selector, archived browser evidence, memory endurance,
   native regressions and source/license correspondence.

Each stage must retain its failing runs and exact input/artifact hashes. A build
success or passing unit test cannot advance a real-playback gate. Native upstream
tests and injected network tests are labeled separately from browser playback.

## Transport contract and state machine

Identity is `(session, resource, request, generation)`. IDs are never reused in a
live session. Completion publication compares the complete identity before data
or metadata becomes visible to native code. Resource lifetime and request lifetime
are separate; cancelling an old read cannot close a new resource or fulfill a new
seek. Closing a session invalidates all outstanding identities before waking waiters.

Resource states: `opening -> readable -> eof | failed | closed`. Request states:
`pending -> completed | cancelled | timed-out | failed`; exactly one terminal
transition wins. Read starvation remains pending and wakes only when bytes, a
terminal condition or a deadline is available. A positive short read is success;
zero is reserved for verified EOF. Declared-length truncation is an error even if
earlier reads returned useful bytes. An unknown-length response ends only when its
body completes successfully. Native AVIO receives distinct EOF, EXIT, ETIMEDOUT
and I/O error codes, not a generic zero-length success.

Open returns headers and a handle without accumulating an entire media segment.
Bounded manifest parsing may await a complete size-limited manifest. Size is
unknown until established by valid response metadata or successful completion.
Forward-only resources do not advertise `AVIO_SEEKABLE_NORMAL`; seeking outside a
retained window requires validated range support and immutable representation
identity. A range has absolute offsets, including AVIO's initial position.

The bridge mailbox is a bounded transfer buffer, not a segment store. Fetch
consumption stops at its high-water mark and resumes when native reads release
chunks. Budget accounting includes active response chunks, retained rewind bytes,
in-flight mailbox bytes, manifests, initialization data and subtitles. Report
mpv packet cache, decoded frames and audio queues separately; browser socket and
decoder allocations are measured estimates, not application-enforced limits.

Root and nested requests share origin/credential policy, safe redirect handling,
bounded concurrency, absolute deadlines and stalled-read deadlines. Authentication
refresh is scoped to the requested origin; a refreshed URL cannot silently carry
credentials across origins. Do not log URL secrets. Rolling manifests are mutable;
immutable segment/range identity uses validators where available and rejects
inconsistent resumes. Retry after partial consumption must never replay bytes as
new bytes. Backpressure pauses and cache hits are excluded from throughput samples.

Seek cancellation must be coupled to demux flush acceptance. A pending byte read
cannot simply be interrupted before the demuxer has abandoned its partially read
packet. Preserve the existing seek-corruption/deadline regression and add races
at request completion, header receipt and decoder generation retirement.

## Switch state machine

`requested -> preparing -> boundary-ready -> accepted -> demuxed -> presented`;
before acceptance, cancellation or failure retains the current representation.
After acceptance, failures are playback errors or explicitly reported recovery.
The switch request identifies a source-scoped representation and policy revision.
Preparation fetches initialization data and validates codec/output eligibility.
Demux chooses a random-access boundary, retains required preroll, maps timestamps,
and invalidates obsolete packets through mpv's normal queues. Reconfigure only
affected demux/decoder/filter state. Resolution/extradata changes need separate
tests from same-configuration bitrate changes.

Hybrid frames carry session and decoder generation. Closing obsolete VideoFrames
is mandatory on flush, rejected output, source replacement and destroy. A new
decoder generation must not present before timeline acceptance. Software follows
mpv's codec/filter reinitialization rules. Engine creation/destruction counters
prove that switching did not conceal a whole-player restart.

Preserve intent, clock position, audio/subtitle selection, active cues, volume,
mute and rate. A controlled reopen is an explicitly observable fallback for an
unsupported transition, never the normal seamless-switch or ABR mechanism.

## Quality and live policy

Proposed public quality state uses source-scoped opaque IDs, not FFmpeg stream
indexes. Initial preference, fixed manual selection and an automatic adaptation
ceiling are separate concepts. Expose requested, fetching, demuxed and presented
quality only at observed transitions; unknown presented quality stays unknown.
The existing `Player` owns the public state/events/capabilities. The component
delegates policy and only shows an Auto/quality selector when supported.

Automatic policy begins conservatively, applies a throughput safety margin,
downswitches promptly on starvation, upswitches slowly with hysteresis and stays
within qualified codec families. Forward playable buffer must come from actual
packet/presentation coverage, never seekable duration or cached byte count.

Integrated demux publishes presentation-window revisions and discontinuity maps.
Live policy explicitly handles a paused position expiring, temporary segment
unavailability versus expiry, and return-to-live. Seek targets are checked against
the accepted window revision; recovery emits a reason rather than silently jumping.
Live edge and latency are exposed only with established measurement semantics.
Subtitle retention follows the DVR window plus bounded active-cue overlap.

LL-HLS, low-latency DASH and encryption/DRM remain unsupported follow-on work.
Safari/mobile and physical output qualification require their own evidence.

## Maintenance

Keep upstream-derived fixes separate from browser-only seams. Record original
upstream revision, exact patch bytes, rationale and regression for each change.
Submit generally applicable demux/timestamp/I/O fixes upstream after a native
reproducer passes; retain browser ABI code locally with native bridge tests.
Every upstream update reruns patch replay and the relevant native/browser cases.
No source patch is removed solely because a newer demuxer registers successfully.

The concrete upstreaming candidates are nested AVIO error propagation (including
short-positive initialization reads) and continuous DASH fMP4 container handling.
Keep their native HTTP/decoded-frame reproducers independent of browser ABI changes.
Before proposing the latter upstream, add edit-list variants, nonzero starts,
segment ranges, seeking, changed initialization, and bounded long-duration MOV
index retention. The current VOD experiment is deliberately narrower than a general
DASH fix. Source-scoped mailbox cancellation and retained-frame generation hooks
remain local integration seams with separately recorded native/browser evidence.

## Refined switch integration decision

The actual track-switch probe keeps one mpv instance and the paused-refresh fix
preserves settled position. Its sampled A/V difference still reaches roughly
0.3–0.43 seconds during some playing changes, and one Hybrid HLS sample increments
audio underruns. Therefore generic `vid` changes are characterization, not the
qualified manual-quality mechanism. `uninit_video_chain()` resets video timing and
the ordinary demux refresh can clear other selected streams' packet queues.

The next implementation will keep **one logical mpv video stream** for an eligible
rendition group. Representation streams remain private to the integrated lavf
adapter. FFmpeg owns manifest parsing and segment order. During preparation both
the current and candidate representation are admitted; candidate packets are
bounded and held until a valid keyframe boundary is known. The adapter continues
emitting the old representation until that boundary, then emits the new one with
its codec parameters using mpv's existing segmented-packet decoder transition.
It must not reset the player clock or rebuild the complete video output chain.

This uses the existing `demux_packet.segmented/codec/start/end` and decoder-wrapper
transition path. It does not create a second segment scheduler. A bounded native
control queue accepts source-scoped policy requests on the demux thread, never
through a libmpv call from an AVIO callback. Eligible grouping needs explicit
manifest group metadata; matching dimensions/codecs alone cannot identify a
rendition group or distinguish alternate camera tracks. Unsupported groups retain
an explicit fallback until qualified.

Acceptance requires continuous old output through preparation, no timestamp
regression at the accepted keyframe, audio/subtitle preservation, bounded candidate
packets and generation-tagged new output. Demuxed quality and actually presented
quality remain distinct. The sampled track-switch successes do not waive this gate.

The transport stage separately allows newer Wasm seeks to cancel queued/settling
seek waiters. Superseded promises reject with the existing `ABORTED` operation
error. This does not itself abort byte reads: the next seek reaches mpv, which
cancels a ticket only after accepting abandonment under the demux lock. Native
seek ordering remains unchanged. Source replacement still follows the public
operation/AbortSignal/close lifecycle; this is not a new playback API.

Native decoded-packet tests now establish two additional integration requirements:

- Preserve a continuous child fMP4 demux context within a representation. Per-segment
  MOV reopening reapplies audio priming in the DASH fixture. The isolated VOD patch
  fixes the measured gap without replacing the manifest/timeline owner.
- Candidate preparation must not block the active stream. A three-second candidate
  delay blocks the current synchronous HLS/DASH `av_read_frame()` for three seconds,
  even though the final packet timestamps pass continuity assertions. Preparation
  needs an independently serviced, bounded container-demux task, supplied with
  segment plans by the authoritative manifest owner. The active demux path must
  continue old output if preparation misses a boundary; it must not withhold old
  output indefinitely waiting for a candidate keyframe.

An implementation must provide exclusive context ownership per demux task, explicit
transfer of packet ownership, per-resource mailbox concurrency and cancellation,
and source/window revisions on candidate segment plans. It must not parse the same
HLS/DASH timeline independently in a second JavaScript scheduler. These requirements
remain unimplemented; the native packet prototype is deliberately not wired into
the player. Retained adapters remain until that integration passes its own cases.

### Concurrency boundary for candidate preparation

The qualified transport has one native mailbox guarded for the entire transaction.
Its Fetch transport's four-open limit is a ceiling, not evidence of four concurrent
native requests. `ResourceLoader` also serializes opens, and its epoch cancellation
retires all pending resource operations. Adding a preparation pthread alone would
therefore still block audio/video behind its candidate request.

The next ABI must change these pieces together:

- A bounded mailbox lane pool, with exclusive payload ownership and independent
  request identities. An active-stream lane must remain available while candidate
  preparation waits. A source's AVIO position still has one exclusive owner.
- Source retirement cancels every lane; candidate retirement cancels only the
  candidate's resource/request identities. An accepted seek retires the applicable
  timeline revision before any replacement packet is admitted.
- Concurrent Fetch pulls reserve their maximum retained chunk allocation before
  awaiting delivery. Checking only currently retained bytes before several
  asynchronous pulls would over-admit their combined allocations.
- Manifest interpretation remains with the native demux owner. Preparation receives
  immutable, revision-tagged segment plans and owns only its child container
  context, byte requests and bounded candidate packet queue. It does not parse a
  second copy of the manifest or advance an independent presentation timeline.
- Missed switching boundaries leave the old representation flowing. Preparation
  may advance to a later eligible boundary or fail explicitly, without withholding
  the active stream indefinitely.

Require native race tests plus actual browser playback with a delayed candidate
while active audio/video requests continue. Neither the existing single-mailbox
archive nor the native synchronous packet prototype passes that acceptance gate.

## Worker retirement boundary

Native source cancellation and JavaScript worker retirement are separate steps.
The native epoch first abandons accepted I/O. The Fetch worker stops admitting
requests, aborts readers and authorization refreshes, wakes both mailbox/epoch
wait queues, and awaits its pump and watcher tasks. Only then does it acknowledge
closure. The parent terminates that worker before reusing or releasing the shared
mailbox. A bounded parent containment timeout remains a failure fallback.

The prior implementation acknowledged closure while two `Atomics.waitAsync`
promises were outstanding. An instrumented browser protocol test reproduces that
condition; the revised handshake reports zero pending waiters in Chrome and
Firefox. Three Firefox content-process crashes were also captured during the
consumer investigation. The wait-retirement defect is proven; the native crash
stack is not fully symbolicated, so its exact upstream cause must not be overstated.

## Implemented experimental preparation boundary

The concurrent ABI provides four bounded mailboxes: lane zero for the direct-file
reader and three leased lanes for nested AVIO. No pool mutex remains held during
network waits. A candidate task's interrupt callback cancels only its current
request; retiring a source cancels its entire accepted session. This callback also
works while resource open is pending, before an AVIO pointer can be returned.

The integrated path bypasses legacy manifest rewriting and permits independent
resource opens. Compatibility mode still serializes adapter mutation. Both modes
share origin/authentication policy, byte reservations and terminal-error semantics.
Manifests remain capped at 1 MiB; their interpretation is exclusively FFmpeg's.

The private FFmpeg seam copies representation descriptions and segment plans on
the owning demux thread. `container-task` executes those immutable plans in bounded
child contexts. `adaptive-session` owns active/preparing/accepted video selection
and packet ordering; it interleaves video with the original demuxer's selected
audio/subtitle packets. It does not run a clock. Matching random-access timestamps
accept a candidate; missing a boundary keeps the old stream flowing. Candidate
failure leaves the old stream active and records failure without infinite retries.

External quality intent enters a bounded source-scoped control mailbox. Only the
mpv demux owner consumes it. A request may stay pending while paused and the packet
cache is full; requested quality is never reported as already presented. The mpv
adapter emits one logical video track and segmented codec parameters for actual
configuration changes. Audio, subtitles, packet caching and playback timing remain
inside mpv. Full A/V qualification remains an acceptance requirement, not a
consequence inferred from these interfaces.

## Parser rewind and resource memory

The per-segment MOV reader advertises no arbitrary seekability. Its read callback
has a 64 KiB retained ring and permits backward reads only within that window.
This supports MOV's bounded `stsd` lookbehind even when Fetch supplies short reads.
Unknown total length stays unknown; future and expired offsets fail. The ring,
32 KiB container AVIO buffer and resource AVIO buffer are separate from each
task's 4 MiB packet queue. At most two packet tasks coexist, including during
seek replacement. Browser response buffering and decoded frame/audio allocations
are measured separately and are not claimed to obey the packet-queue budget.

## Presented quality identity

Every prepared video packet carries an internal source, request and representation
tag. Each decoder records accepted packets in its own timestamp domain, after
mpv's rational conversion and, for Hybrid, the WebCodecs microsecond round trip.
A bounded 512-entry PTS history associates reordered decoder output with its
input tag; ambiguity, eviction and missing identity produce unknown. Tags survive
mpv image copies and FFmpeg filter frames. They are not video format parameters
and therefore do not trigger format reconfiguration themselves.

The existing renderer selects a tagged frame. Hybrid captures that tag with the
scheduled retained frame, and Software reads the selected frame's tag. Each
acknowledges presentation only after drawing. A later demux switch cannot relabel
an already scheduled frame. Source retirement rejects stale acknowledgements.
An older request within the same source may still be presented from mpv's cache;
this is truthful output state, not a request rollback. No second clock is added.

## Bounded discovery

The opt-in pinned FFmpeg integration reads real fMP4 initialization data for
unselected video representations and defers their media reads. Admission is
bounded to sixteen video variants and thirty-two components, with a 1 MiB
initialization limit per component. Unsupported muxed/protected discovery is
rejected by this seam; existing compatibility routes remain separate. FFmpeg
retains representation IDs independently of metadata transferred to mpv.

## Network measurement and adaptation

A dedicated source I/O worker observes Resource Timing. It admits only complete,
non-retried, non-cache responses with matching byte counts and useful timing.
Application backpressure disqualifies samples; it is never subtracted to invent
network capacity. Missing or cross-origin-redacted timing yields unknown capacity.
Timing records and completed samples have fixed bounds, and URLs stay private.

The controller owns quality intent only. It consumes these samples and mpv's
forward packet-cache duration; neither seekable duration nor cached bytes are
substituted for forward playable time. Conservative startup, a 0.75 throughput
margin, prompt downswitching, sustained upswitch headroom and hysteresis drive
requests to the existing native coordinator. Manual selection disables automatic
requests. The native demux owner still chooses/accepts packet boundaries; decoder
tags and actual drawing acknowledgements still determine presented quality.
Controller playback qualification is pending. This policy is not a second
manifest parser, timeline or playback clock.

### PCM relay ownership refinement

The rendering/command worker no longer copies audio PCM. A dedicated worker copies
from mpv's native AO ring into the fixed AudioWorklet ring and returns consumption
feedback. mpv still owns sample production, timing and synchronization. Both rings
retain their existing 8,192-frame capacities; the relay adds no audio queue or
clock. The AudioWorklet checks reset epochs and the independent seek gate before
and after copying a block. Source destruction stops the relay before native AO
memory can be destroyed; the source worker owner remains the final containment
boundary for failed shutdowns.

This removes rendering/diagnostics scheduling from audio delivery. Actual Chrome
and Firefox tests inject a 750 ms rendering-worker stall and verify continuing
PCM frames, zero added underruns, and zero remaining workers. Physical device
latency and A/V measurements remain separate qualification work.

### Buffer accounting boundaries

The current transport enforces 16 MiB aggregate retained bytes, 2 MiB maximum
accepted response chunks, 16 handles, eight admitted resource-open lanes and four concurrent Fetch opens (additional admitted opens wait in a bounded queue). Auto-mode measured
read-ahead is limited to known 32 KiB–1 MiB responses; it charges the entire fixed
storage and a 2 MiB producer workspace before allocation. Larger or unknown bodies
use demand-driven reads. Retired readers stay charged until their pending reads
settle. Network samples exclude failed/truncated/cache responses and application
backpressure; no idle interval is subtracted to invent higher throughput.

Native video preparation has at most two 4 MiB packet queues. The experimental
live component group adds at most three 256 KiB audio/subtitle packet queues.
These are separate from mpv's configured 32 MiB forward and 8 MiB backward packet
limits, container/parser allocations, decoded frames and the fixed audio rings.
FFmpeg's per-allocation cap is not an aggregate native-memory cap. Browser-owned
Fetch buffers, compositor surfaces and codec allocations are measured where
observable and must not be represented as application-enforced limits.


### Later live/window and subtitle stages

DASH uses the existing FFmpeg parser to build one transactional period catalog.
Its stable source-local period serials survive refresh; logical AVStream identities
remain fixed while periods enter and leave the DVR window. HLS carries absolute
discontinuity identities in immutable plans. The active video establishes each
new timestamp offset; audio/subtitles and prepared video reuse it. Neither the
browser loader nor component interprets those timelines.

Window discovery for a pending aligned HLS rendition uses the same packet-derived,
sequence/duration/discontinuity-checked anchor inheritance as segment planning.
This matters when a paused pending rendition has not refreshed for a full window.
A known final window overrides an initial application live hint. mpv receives
finite-duration changes through its existing demux event under the cache mutex.

The subtitle stage pins libass 0.17.5, configures 60-second event pruning, clears
cues on seeks, and charges a bounded per-component cue-admission ledger. It keeps
long-lived cues charged and rejects exhaustion instead of silently dropping them.
The ledger measures encoded cue cost; libass, decoded bitmap and browser allocation
measurements remain separate. See `live/subtitles/OWNERSHIP.md` in the experiment
for limits and exact-library tests.

The transport distinguishes a logical requested resource from its effective
Fetch URL after scoped authorization refresh. Validator comparison, pending-open
tracking and manifest retirement use the logical identity; range reopens use the
current effective URL and the retained strong validator. Signed-URL rotation
cannot bypass consistency checks or leave an unretirable open record.

## Component starvation and terminal error delivery

The native component group retains future subtitle heads while a selected audio
head is unresolved. Audio is a packet-ordering barrier: the owning demux thread
waits on that task's condition variable for at most 10 ms rather than spinning
on empty successful demux reads. Subtitle tasks remain nonblocking while video
can progress, and may use the same bounded wait after video EOF. This wait is
for producer progress, not a playback clock; mpv still owns timing and caching.

A short FFmpeg packet can carry both `AV_PKT_FLAG_CORRUPT` and an underlying
AVIO failure. Header and packet error handling preserves a negative non-EOF AVIO
error first, so cancellation, timeout and transport failure remain distinct.
Only otherwise successful corrupt packets and sample payload EOF become invalid
data. Strict MOV sample checking is enabled for these integrated child demuxers.

The owning native demux thread records a terminal failure in the accepted-source
control mailbox. Stale sources cannot set or read the current failure. The engine
worker polls it before forwarding EOF; stream callbacks never invoke libmpv or
JavaScript synchronously. Worker error messages use the exception message rather
than its stack, because Firefox stacks omit the message and timer frame names
are not evidence of a network timeout. Source configuration clears the sticky
error; close retains it long enough for final error delivery.

Accepted mpv seeks set the cache owner's pending-seek state and interrupt obsolete
nested reads without cancelling the playback session. The demux read callback
queries that state under the cache mutex after returning from child AVIO. An
`AVERROR_EXIT` from an abandoned read is retired by the pending seek, not published
as a terminal source error. Global source cancellation remains distinct; arbitrary
child cancellation without an accepted seek remains an error. The query runs only
on the demux read owner while the cache mutex is otherwise released.

A fresh noncached seek also retires the stream's track-refresh deduplication
marker. mpv's existing new-range path already resets it; its in-place cleared-range
path must do the same. Keeping the marker after clearing its comparison position
would discard the first incoming packet, including the random-access video packet
needed to initialize a reset WebCodecs decoder. This correction changes cache
state ownership, not decoder admission or the playback clock.

### Live seek boundaries and decoder preroll

The integrated demuxer owns random-access selection. Its public live window has
an inclusive start and exclusive end. The API rejects the exact end before
cancelling any accepted seek. Built-in live controls use the same six-second
headroom as expired-pause recovery; this is an explicit policy, not a measured
latency or a low-latency capability claim.

The Software worker does not add its direct-file one-second demux offset to
integrated seeks. The native coordinator selects the segment random-access point. lavf passes its
codec overlap separately, so the coordinator validates the original target
before subtracting and clipping that overlap at the available window start.
mpv cache/track-refresh seeks carry a private internal-preroll flag, guarded by a
capability set once during demux open. Only this internal overlap may be clipped
to the available live start; ordinary out-of-window native requests remain
errors. The capability is immutable across ENDLIST/static-MPD conversion, so
cache readers do not race with the demux owner's mutable live-status field.

For immediate track selection after a paused live open, the refresh reference
also stays within mpv. Before `playback_pts` is established, an already accepted
`video_pts` takes precedence over the load-time `last_seek_pts=0`. This applies
only to the integrated demux capability. A pending seek clears the video timestamp,
so normal seek precedence remains intact; track offsets still apply afterward.
The browser does not infer a new clock from the live edge or renderer wall time.
